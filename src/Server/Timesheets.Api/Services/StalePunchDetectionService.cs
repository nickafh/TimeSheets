using Microsoft.EntityFrameworkCore;
using TimeSheets.Api.Data;

namespace TimeSheets.Api.Services;

/// <summary>
/// Periodic background service that detects stale open clock punches (employees who forgot
/// to clock out on previous days) and flags them as NeedsAttention, optionally sending
/// email notifications to both employees and their managers.
/// </summary>
public class StalePunchDetectionService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<StalePunchDetectionService> _logger;
    private readonly TimeSpan _interval;

    public StalePunchDetectionService(
        IServiceScopeFactory scopeFactory,
        ILogger<StalePunchDetectionService> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;

        var hours = configuration.GetValue("StalePunchDetection:IntervalHours", 2);
        _interval = TimeSpan.FromHours(Math.Max(hours, 0.5));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Run immediately on startup, then on interval
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DetectAndNotify(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Stale punch detection failed");
            }

            _logger.LogInformation("Next stale punch detection in {Interval}", _interval);
            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task DetectAndNotify(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TimeSheetsDbContext>();

        // Find Active non-ClockOut punches from past days
        var stalePunches = await db.ClockPunches
            .Where(p => p.PunchDate < DateTime.UtcNow.Date
                && p.Status == "Active"
                && p.PunchType != "ClockOut")
            .ToListAsync(ct);

        var staleGroups = stalePunches
            .GroupBy(p => new { p.UserId, p.PunchDate })
            .ToList();

        var newlyFlagged = new List<(int UserId, DateTime PunchDate)>();

        foreach (var group in staleGroups)
        {
            var hasClockOut = await db.ClockPunches
                .AnyAsync(p => p.UserId == group.Key.UserId
                    && p.PunchDate == group.Key.PunchDate
                    && p.PunchType == "ClockOut"
                    && p.Status == "Active", ct);

            if (!hasClockOut)
            {
                var dayPunches = await db.ClockPunches
                    .Where(p => p.UserId == group.Key.UserId
                        && p.PunchDate == group.Key.PunchDate
                        && p.Status == "Active")
                    .ToListAsync(ct);

                foreach (var dp in dayPunches)
                    dp.Status = "NeedsAttention";

                newlyFlagged.Add((group.Key.UserId, group.Key.PunchDate));
            }
        }

        await db.SaveChangesAsync(ct);

        _logger.LogInformation("Stale punch detection complete: {Count} new items flagged", newlyFlagged.Count);

        if (newlyFlagged.Count > 0)
        {
            await SendNotificationEmails(scope.ServiceProvider, db, newlyFlagged, ct);
        }
    }

    private async Task SendNotificationEmails(
        IServiceProvider sp,
        TimeSheetsDbContext db,
        List<(int UserId, DateTime PunchDate)> newlyFlagged,
        CancellationToken ct)
    {
        try
        {
            var settings = await db.SystemSettings.FindAsync(new object[] { 1 }, ct);
            if (settings == null || !settings.EmailNotificationsEnabled)
                return;

            var emailSender = sp.GetRequiredService<IAppEmailSender>();
            var templateService = sp.GetRequiredService<EmailTemplateService>();

            // Collect user info for flagged items
            var userIds = newlyFlagged.Select(f => f.UserId).Distinct().ToList();
            var users = await db.Users
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, ct);

            // Send employee emails (one per missed day)
            foreach (var (userId, punchDate) in newlyFlagged)
            {
                if (!users.TryGetValue(userId, out var emp) || string.IsNullOrWhiteSpace(emp.Email))
                    continue;

                try
                {
                    var dateStr = punchDate.ToString("dddd, MMMM d, yyyy");
                    var body = templateService.BuildMissedClockOutEmployeeEmail(emp.FirstName ?? "Team Member", dateStr);
                    await emailSender.SendAsync(emp.Email, "Missed Clock-Out", body, true, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send missed clock-out email to user {UserId}", userId);
                }
            }

            // Group by manager and send summary emails
            var managerMappings = await db.UserManagers
                .Where(um => userIds.Contains(um.UserId))
                .ToListAsync(ct);

            var managerGroups = managerMappings
                .GroupBy(um => um.ManagerId)
                .ToList();

            foreach (var mgrGroup in managerGroups)
            {
                var managerId = mgrGroup.Key;
                var manager = await db.Users.FindAsync(new object[] { managerId }, ct);
                if (manager == null || string.IsNullOrWhiteSpace(manager.Email))
                    continue;

                var managedUserIds = mgrGroup.Select(um => um.UserId).ToHashSet();
                var items = newlyFlagged
                    .Where(f => managedUserIds.Contains(f.UserId))
                    .Select(f =>
                    {
                        var name = users.TryGetValue(f.UserId, out var u)
                            ? $"{u.FirstName} {u.LastName}".Trim()
                            : $"User #{f.UserId}";
                        return (EmployeeName: name, DateStr: f.PunchDate.ToString("MMM d, yyyy"));
                    })
                    .ToList();

                if (items.Count == 0) continue;

                try
                {
                    var body = templateService.BuildMissedClockOutManagerEmail(
                        manager.FirstName ?? "Manager", items);
                    await emailSender.SendAsync(manager.Email,
                        $"{items.Count} Employee(s) with Incomplete Clock Entries", body, true, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send missed clock-out summary to manager {ManagerId}", managerId);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send stale punch notification emails");
        }
    }
}
