using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TimeSheets.Api.Data;
using TimeSheets.Api.Models;
using TimeSheets.Api.Services;

namespace TimeSheets.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PtoRequestsController : ControllerBase
{
    private const int SettingsId = 1;
    private readonly TimeSheetsDbContext _db;
    private readonly IAppEmailSender _emailSender;
    private readonly ILogger<PtoRequestsController> _logger;

    public PtoRequestsController(TimeSheetsDbContext db, IAppEmailSender emailSender, ILogger<PtoRequestsController> logger)
    {
        _db = db;
        _emailSender = emailSender;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetByUser(int userId)
    {
        var requests = await _db.PtoRequests
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.DateOfLeave)
            .ToListAsync();

        return Ok(requests);
    }

    // GET: api/ptorequests/user/{userId} - Get PTO requests for a specific user with user info
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetByUserWithInfo(int userId)
    {
        var requests = await _db.PtoRequests
            .Where(pto => pto.UserId == userId)
            .Join(_db.Users,
                pto => pto.UserId,
                user => user.Id,
                (pto, user) => new
                {
                    pto.Id,
                    pto.UserId,
                    UserName = $"{user.FirstName} {user.LastName}",
                    user.Department,
                    pto.DateOfLeave,
                    pto.EndDate,
                    pto.Hours,
                    pto.Reason,
                    pto.PtoTypeId,
                    pto.Status,
                    pto.RequestedAt,
                    pto.ApprovedDeniedAt,
                    pto.ApprovedDeniedBy,
                    pto.DenyReason
                })
            .OrderByDescending(r => r.DateOfLeave)
            .ToListAsync();

        return Ok(requests);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePtoRequestRequest request)
    {
        if (request.UserId <= 0)
            return BadRequest(new { message = "UserId is required" });
        if (request.PtoTypeId <= 0)
            return BadRequest(new { message = "PtoTypeId is required" });

        // Validate that the referenced User exists
        var userExists = await _db.Users.AnyAsync(u => u.Id == request.UserId);
        if (!userExists)
            return BadRequest(new { message = "User not found" });

        // Validate that the referenced PtoType exists
        var ptoTypeExists = await _db.PtoTypes.AnyAsync(t => t.Id == request.PtoTypeId);
        if (!ptoTypeExists)
            return BadRequest(new { message = "Invalid PTO type" });

        var start = request.DateOfLeave.Date;
        var end = request.EndDate.HasValue ? request.EndDate.Value.Date : start;
        if (end < start)
            return BadRequest(new { message = "End date cannot be before start date" });
        if (request.Hours <= 0)
            return BadRequest(new { message = "Hours must be greater than 0" });

        var holidayDates = await _db.Holidays
            .Where(h => h.HolidayDate >= start && h.HolidayDate <= end)
            .Select(h => h.HolidayDate.Date)
            .ToListAsync();

        var hasWorkday = false;
        for (var d = start; d <= end; d = d.AddDays(1))
        {
            var dayOfWeek = d.DayOfWeek;
            if (dayOfWeek == DayOfWeek.Saturday || dayOfWeek == DayOfWeek.Sunday)
                continue; // Skip weekends in date ranges
            if (holidayDates.Contains(d))
                continue; // Skip holidays in date ranges
            hasWorkday = true;
        }

        // For single-day requests, validate the specific day
        if (start == end)
        {
            if (start.DayOfWeek == DayOfWeek.Saturday || start.DayOfWeek == DayOfWeek.Sunday)
                return BadRequest(new { message = "PTO cannot be requested on weekends. Please select a workday." });
            if (holidayDates.Contains(start))
                return BadRequest(new { message = $"PTO cannot be requested on company holidays. {start:MMMM d, yyyy} is a holiday." });
        }
        else if (!hasWorkday)
        {
            return BadRequest(new { message = "The selected date range contains no workdays. Please select a range that includes at least one workday." });
        }

        // Check for overlapping approved or pending PTO requests
        var existingRequests = await _db.PtoRequests
            .Where(r => r.UserId == request.UserId && (r.Status == 0 || r.Status == 1)) // Pending or Approved
            .ToListAsync();

        foreach (var existing in existingRequests)
        {
            var existingStart = existing.DateOfLeave.Date;
            var existingEnd = existing.EndDate?.Date ?? existingStart;

            // Check if date ranges overlap
            if (start <= existingEnd && end >= existingStart)
            {
                var statusText = existing.Status == 0 ? "pending" : "approved";
                var dateText = existingStart == existingEnd
                    ? existingStart.ToString("MMMM d, yyyy")
                    : $"{existingStart:MMMM d, yyyy} – {existingEnd:MMMM d, yyyy}";
                return BadRequest(new { message = $"You already have a {statusText} time off request for {dateText}. Please cancel the existing request first or choose different dates." });
            }
        }

        var entity = new PtoRequest
        {
            UserId = request.UserId,
            DateOfLeave = start,
            EndDate = end > start ? end : (DateTime?)null,
            Hours = request.Hours,
            Reason = request.Reason,
            PtoTypeId = request.PtoTypeId,
            RequestedAt = DateTime.UtcNow,
            Status = 0,
        };
        _db.PtoRequests.Add(entity);
        await _db.SaveChangesAsync();

        await TrySendPtoRequestCreatedNotificationAsync(entity);
        return CreatedAtAction(nameof(GetByUser), new { userId = entity.UserId }, entity);
    }

    [HttpGet("all")]
    public async Task<IActionResult> GetAllWithUsers()
    {
        try
        {
            var allRequests = await _db.PtoRequests
                .Where(pto => pto.Status == 1)
                .Join(_db.Users,
                    pto => pto.UserId,
                    user => user.Id,
                    (pto, user) => new
                    {
                        pto.Id,
                        pto.UserId,
                        UserName = $"{user.FirstName} {user.LastName}",
                        user.Department,
                        pto.DateOfLeave,
                        pto.EndDate,
                        pto.Hours,
                        pto.Reason,
                        pto.PtoTypeId,
                        pto.Status,
                        pto.RequestedAt,
                        pto.ApprovedDeniedAt,
                        pto.ApprovedDeniedBy,
                        pto.DenyReason
                    })
                .OrderByDescending(r => r.DateOfLeave)
                .ToListAsync();

            var deduplicated = allRequests
                .GroupBy(r => new { r.UserName, r.DateOfLeave, r.EndDate, r.Department })
                .Select(g => g.First())
                .OrderByDescending(r => r.DateOfLeave)
                .ToList();

            return Ok(deduplicated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetAllWithUsers failed");
            return StatusCode(503, new
            {
                message = "Failed to load PTO requests. If you recently added multi-day time off, ensure the PtoRequests table has an EndDate column.",
                hint = "Run Scripts/AddPtoRequestEndDate.sql against your database, or run: dotnet ef database update",
            });
        }
    }

    // GET: api/ptorequests/pending - Get all pending PTO requests with user info
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        var pendingRequests = await _db.PtoRequests
            .Where(pto => pto.Status == 0) // Pending requests
            .Join(_db.Users,
                pto => pto.UserId,
                user => user.Id,
                (pto, user) => new
                {
                    pto.Id,
                    pto.UserId,
                    UserName = $"{user.FirstName} {user.LastName}",
                    user.Department,
                    pto.DateOfLeave,
                    pto.EndDate,
                    pto.Hours,
                    pto.Reason,
                    pto.PtoTypeId,
                    pto.Status,
                    pto.RequestedAt,
                    pto.ApprovedDeniedAt,
                    pto.ApprovedDeniedBy,
                    pto.DenyReason
                })
            .OrderBy(r => r.DateOfLeave)
            .ToListAsync();

        return Ok(pendingRequests);
    }

    // GET: api/ptorequests/manager/pending - Pending requests for the current manager's direct reports
    [HttpGet("manager/pending")]
    public async Task<IActionResult> GetManagerPending()
    {
        var (currentUserId, isAdmin) = GetCurrentUserContext();
        if (currentUserId == null)
            return Unauthorized();

        IQueryable<PtoRequest> query = _db.PtoRequests.Where(pto => pto.Status == 0);

        if (!isAdmin)
        {
            var teamIds = _db.UserManagers
                .Where(um => um.ManagerId == currentUserId.Value)
                .Select(um => um.UserId);
            query = query.Where(pto => teamIds.Contains(pto.UserId));
        }

        var pendingRequests = await query
            .Join(_db.Users,
                pto => pto.UserId,
                user => user.Id,
                (pto, user) => new
                {
                    pto.Id,
                    pto.UserId,
                    UserName = $"{user.FirstName} {user.LastName}",
                    user.Department,
                    pto.DateOfLeave,
                    pto.EndDate,
                    pto.Hours,
                    pto.Reason,
                    pto.PtoTypeId,
                    pto.Status,
                    pto.RequestedAt,
                    pto.ApprovedDeniedAt,
                    pto.ApprovedDeniedBy,
                    pto.DenyReason
                })
            .OrderBy(r => r.DateOfLeave)
            .ToListAsync();

        return Ok(pendingRequests);
    }

    // GET: api/ptorequests/history - Get all PTO requests (all statuses) with user info
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int? status = null)
    {
        var query = _db.PtoRequests.AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(pto => pto.Status == status.Value);
        }

        var requests = await query
            .Join(_db.Users,
                pto => pto.UserId,
                user => user.Id,
                (pto, user) => new
                {
                    pto.Id,
                    pto.UserId,
                    UserName = $"{user.FirstName} {user.LastName}",
                    user.Department,
                    pto.DateOfLeave,
                    pto.EndDate,
                    pto.Hours,
                    pto.Reason,
                    pto.PtoTypeId,
                    pto.Status,
                    pto.RequestedAt,
                    pto.ApprovedDeniedAt,
                    pto.ApprovedDeniedBy,
                    pto.DenyReason
                })
            .OrderByDescending(r => r.RequestedAt)
            .ToListAsync();

        return Ok(requests);
    }

    // GET: api/ptorequests/manager/history - PTO request history for the current manager's direct reports
    [HttpGet("manager/history")]
    public async Task<IActionResult> GetManagerHistory([FromQuery] int? status = null)
    {
        var (currentUserId, isAdmin) = GetCurrentUserContext();
        if (currentUserId == null)
            return Unauthorized();

        IQueryable<PtoRequest> query = _db.PtoRequests;

        if (status.HasValue)
        {
            query = query.Where(pto => pto.Status == status.Value);
        }

        if (!isAdmin)
        {
            var teamIds = _db.UserManagers
                .Where(um => um.ManagerId == currentUserId.Value)
                .Select(um => um.UserId);
            query = query.Where(pto => teamIds.Contains(pto.UserId));
        }

        var requests = await query
            .Join(_db.Users,
                pto => pto.UserId,
                user => user.Id,
                (pto, user) => new
                {
                    pto.Id,
                    pto.UserId,
                    UserName = $"{user.FirstName} {user.LastName}",
                    user.Department,
                    pto.DateOfLeave,
                    pto.EndDate,
                    pto.Hours,
                    pto.Reason,
                    pto.PtoTypeId,
                    pto.Status,
                    pto.RequestedAt,
                    pto.ApprovedDeniedAt,
                    pto.ApprovedDeniedBy,
                    pto.DenyReason
                })
            .OrderByDescending(r => r.RequestedAt)
            .ToListAsync();

        return Ok(requests);
    }

    // PATCH: api/ptorequests/{id}/approve - Approve a PTO request
    [HttpPatch("{id}/approve")]
    public async Task<IActionResult> Approve(int id, [FromQuery] int approvedBy)
    {
        var request = await _db.PtoRequests.FindAsync(id);
        if (request == null)
        {
            return NotFound();
        }

        if (request.Status != 0)
        {
            return BadRequest("Request has already been processed");
        }

        // Validate that the approver exists
        var approverExists = await _db.Users.AnyAsync(u => u.Id == approvedBy);
        if (!approverExists)
            return BadRequest(new { message = "Approver user not found" });

        request.Status = 1; // Approved
        request.ApprovedDeniedAt = DateTime.UtcNow;
        request.ApprovedDeniedBy = approvedBy;

        await _db.SaveChangesAsync();
        await TrySendPtoDecisionNotificationAsync(request, approved: true);
        return Ok(request);
    }

    // PATCH: api/ptorequests/{id}/deny - Deny a PTO request
    [HttpPatch("{id}/deny")]
    public async Task<IActionResult> Deny(int id, [FromQuery] int deniedBy, [FromBody] DenyRequest denyRequest)
    {
        var request = await _db.PtoRequests.FindAsync(id);
        if (request == null)
        {
            return NotFound();
        }

        if (request.Status != 0)
        {
            return BadRequest("Request has already been processed");
        }

        // Validate that the denier exists
        var denierExists = await _db.Users.AnyAsync(u => u.Id == deniedBy);
        if (!denierExists)
            return BadRequest(new { message = "Denier user not found" });

        request.Status = 2; // Denied
        request.ApprovedDeniedAt = DateTime.UtcNow;
        request.ApprovedDeniedBy = deniedBy;
        request.DenyReason = denyRequest.Reason;

        await _db.SaveChangesAsync();
        await TrySendPtoDecisionNotificationAsync(request, approved: false, denyReason: denyRequest.Reason);
        return Ok(request);
    }

    // GET: api/ptorequests/summary/{userId} - Server-side PTO balance calculation
    [HttpGet("summary/{userId}")]
    public async Task<IActionResult> GetPtoSummary(int userId, [FromQuery] int? year = null)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;

        var yearStart = new DateTime(targetYear, 1, 1);
        var yearEnd = new DateTime(targetYear, 12, 31);

        // Load user for hire date
        var userRecord = await _db.Users.FindAsync(userId);

        // Load all PTO types with their allowances
        var ptoTypes = await _db.PtoTypes.OrderBy(t => t.Id).ToListAsync();

        // Load approved requests for this user in this year
        var approvedRequests = await _db.PtoRequests
            .Where(r => r.UserId == userId && r.Status == 1
                && r.DateOfLeave >= yearStart && r.DateOfLeave <= yearEnd)
            .ToListAsync();

        // Load system settings for defaults and tier configuration
        var settings = await _db.SystemSettings.FindAsync(SettingsId);
        var maxCarryover = settings?.MaxPtoCarryover ?? 40m;
        var standardHours = settings?.StandardWorkHoursPerDay ?? 8m;
        var tier1MaxYears = settings?.PtoTier1MaxYears ?? 5;
        var tier1Days = settings?.PtoTier1AnnualDays ?? 18;
        var tier2MaxYears = settings?.PtoTier2MaxYears ?? 10;
        var tier2Days = settings?.PtoTier2AnnualDays ?? 23;
        var tier3Days = settings?.PtoTier3AnnualDays ?? 28;
        var accrualEnabled = settings?.PtoAccrualEnabled ?? true;

        // Calculate tenure and determine tier
        var hireDate = userRecord?.HireDate;
        int yearsOfService = 0;
        int currentTier = 1;
        int tierAnnualDays = tier1Days;
        bool isFirstYearAccrual = false;
        decimal accruedHours = 0;

        if (hireDate.HasValue)
        {
            // Years of service relative to the target year
            yearsOfService = targetYear - hireDate.Value.Year;
            if (new DateTime(targetYear, hireDate.Value.Month, Math.Min(hireDate.Value.Day, DateTime.DaysInMonth(targetYear, hireDate.Value.Month))) > new DateTime(targetYear, 12, 31))
                yearsOfService--;
            yearsOfService = Math.Max(0, yearsOfService);

            if (yearsOfService < tier1MaxYears)
            {
                currentTier = 1;
                tierAnnualDays = tier1Days;
            }
            else if (yearsOfService < tier2MaxYears)
            {
                currentTier = 2;
                tierAnnualDays = tier2Days;
            }
            else
            {
                currentTier = 3;
                tierAnnualDays = tier3Days;
            }

            // First-year accrual check: hired in the target year
            if (hireDate.Value.Year == targetYear && accrualEnabled)
            {
                isFirstYearAccrual = true;
                // Derive accrual rate from the tier: annual hours / 26 biweekly periods
                var annualHoursForRate = tierAnnualDays * standardHours;
                var accrualRate = annualHoursForRate / 26m;
                // Calculate reference date for accrual
                var referenceDate = targetYear == DateTime.UtcNow.Year
                    ? DateTime.UtcNow.Date
                    : new DateTime(targetYear, 12, 31);
                var daysSinceHire = Math.Max(0, (referenceDate - hireDate.Value.Date).Days);
                var periodsElapsed = daysSinceHire / 14;
                var annualHours = tierAnnualDays * standardHours;
                accruedHours = Math.Min(periodsElapsed * accrualRate, annualHours);
            }
        }

        var annualAllowanceHours = tierAnnualDays * standardHours;

        // Group approved hours by PtoTypeId
        var approvedByType = approvedRequests
            .GroupBy(r => r.PtoTypeId)
            .ToDictionary(g => g.Key, g => g.Sum(r => r.Hours));

        var balances = new List<object>
        {
            new
            {
                typeName = $"{targetYear - 1} Vacation Carryover* (max {maxCarryover}h)",
                hoursAllowed = 0m,
                hoursApproved = 0m,
                hoursRemaining = 0m,
            }
        };

        decimal totalAllowed = 0;
        decimal totalApproved = 0;

        foreach (var pt in ptoTypes.Where(t => t.IsSelectable))
        {
            decimal allowed;
            if (pt.Id == 1)
            {
                // Use tenure-based allowance for PTO type 1
                allowed = isFirstYearAccrual ? accruedHours : annualAllowanceHours;
            }
            else
            {
                allowed = pt.AnnualAllowance > 0 ? pt.AnnualAllowance : 0m;
            }

            var approved = approvedByType.GetValueOrDefault(pt.Id, 0m);

            balances.Add(new
            {
                typeName = pt.Name,
                hoursAllowed = allowed,
                hoursApproved = approved,
                hoursRemaining = Math.Max(0, allowed - approved),
            });
            totalAllowed += allowed;
            totalApproved += approved;
        }

        // Next upcoming approved time off
        var today = DateTime.UtcNow.Date;
        var nextApproved = await _db.PtoRequests
            .Where(r => r.UserId == userId && r.Status == 1 && r.DateOfLeave >= today)
            .Join(_db.Users,
                pto => pto.UserId,
                user => user.Id,
                (pto, user) => new
                {
                    pto.Id,
                    pto.UserId,
                    UserName = $"{user.FirstName} {user.LastName}",
                    user.Department,
                    pto.DateOfLeave,
                    pto.EndDate,
                    pto.Hours,
                    pto.Reason,
                    pto.PtoTypeId,
                    pto.Status,
                    pto.RequestedAt,
                    pto.ApprovedDeniedAt,
                    pto.ApprovedDeniedBy,
                    pto.DenyReason
                })
            .OrderBy(r => r.DateOfLeave)
            .FirstOrDefaultAsync();

        // Paid Time Off remaining (type 1 specifically)
        var pto1Allowed = isFirstYearAccrual ? accruedHours : annualAllowanceHours;
        var pto1Approved = approvedByType.GetValueOrDefault(1, 0m);

        return Ok(new
        {
            userId,
            year = targetYear,
            balances,
            totalAllowed,
            totalApproved,
            totalRemaining = Math.Max(0, totalAllowed - totalApproved),
            paidTimeOffRemaining = Math.Max(0, pto1Allowed - pto1Approved),
            nextApprovedTimeOff = nextApproved,
            currentTier,
            annualAllowanceHours,
            isFirstYearAccrual,
            accruedHours,
        });
    }

    // DELETE: api/ptorequests/{id} - Cancel/delete a pending PTO request
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var request = await _db.PtoRequests.FindAsync(id);
        if (request == null)
            return NotFound();

        if (request.Status != 0)
            return BadRequest(new { message = "Only pending requests can be cancelled." });

        var (currentUserId, isAdmin) = GetCurrentUserContext();
        if (currentUserId == null)
            return Unauthorized();

        if (!isAdmin && request.UserId != currentUserId.Value)
        {
            var isManagerOfRequester = await _db.UserManagers.AnyAsync(
                um => um.UserId == request.UserId && um.ManagerId == currentUserId.Value);
            if (!isManagerOfRequester)
                return Forbid();
        }

        _db.PtoRequests.Remove(request);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private (int? userId, bool isAdmin) GetCurrentUserContext()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "";
        return (int.TryParse(userIdClaim, out var userId) ? userId : null, string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase));
    }

    private async Task TrySendPtoRequestCreatedNotificationAsync(PtoRequest request)
    {
        try
        {
            var settings = await _db.SystemSettings.FindAsync(SettingsId);
            if (settings == null || !settings.EmailNotificationsEnabled || !settings.NotifyManagerOnPtoRequest)
                return;

            var employee = await _db.Users.FindAsync(request.UserId);
            if (employee == null || string.IsNullOrWhiteSpace(employee.Email))
                return;

            var employeeName = $"{employee.FirstName} {employee.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(employeeName))
                employeeName = employee.Email;

            var dateRange = request.EndDate.HasValue && request.EndDate.Value > request.DateOfLeave
                ? $"{request.DateOfLeave:MMM d, yyyy} – {request.EndDate.Value:MMM d, yyyy}"
                : request.DateOfLeave.ToString("MMM d, yyyy");

            List<string> managerEmails;
            try
            {
                var managerIds = await _db.UserManagers
                    .Where(um => um.UserId == request.UserId)
                    .Select(um => um.ManagerId)
                    .ToListAsync();
                managerEmails = await _db.Users
                    .Where(u => managerIds.Contains(u.Id) && !string.IsNullOrWhiteSpace(u.Email))
                    .Select(u => u.Email!)
                    .Distinct()
                    .ToListAsync();
            }
            catch
            {
                managerEmails = new List<string>();
            }

            if (managerEmails.Count == 0)
                return;

            var subject = "PTO request submitted – " + employeeName;
            var body = $@"
<p><strong>{employeeName}</strong> has submitted a time off request.</p>
<ul>
<li><strong>Dates:</strong> {dateRange}</li>
<li><strong>Hours:</strong> {request.Hours}</li>
</ul>
<p>Please review and approve or deny in the timesheet app.</p>";
            foreach (var to in managerEmails)
            {
                try
                {
                    await _emailSender.SendAsync(to.Trim(), subject, body.Trim());
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send PTO-request notification to manager {Email}", to);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send PTO request-created notifications");
        }
    }

    private async Task TrySendPtoDecisionNotificationAsync(PtoRequest request, bool approved, string? denyReason = null)
    {
        try
        {
            var settings = await _db.SystemSettings.FindAsync(SettingsId);
            if (settings == null || !settings.EmailNotificationsEnabled || !settings.NotifyEmployeeOnPtoDecision)
                return;

            var employee = await _db.Users.FindAsync(request.UserId);
            if (employee == null || string.IsNullOrWhiteSpace(employee.Email))
                return;

            var dateRange = request.EndDate.HasValue && request.EndDate.Value > request.DateOfLeave
                ? $"{request.DateOfLeave:MMM d, yyyy} – {request.EndDate.Value:MMM d, yyyy}"
                : request.DateOfLeave.ToString("MMM d, yyyy");

            var subject = approved ? "Your PTO request was approved" : "Your PTO request was denied";
            var body = approved
                ? $@"<p>Your time off request for <strong>{dateRange}</strong> ({request.Hours} hours) has been <strong>approved</strong>.</p>"
                : $@"<p>Your time off request for <strong>{dateRange}</strong> ({request.Hours} hours) has been <strong>denied</strong>.</p>"
                  + (string.IsNullOrWhiteSpace(denyReason) ? "" : $"<p><strong>Reason:</strong> {System.Net.WebUtility.HtmlEncode(denyReason)}</p>");

            await _emailSender.SendAsync(employee.Email.Trim(), subject, body.Trim());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send PTO decision notification to employee");
        }
    }
}

public class DenyRequest
{
    public string? Reason { get; set; }
}

public class CreatePtoRequestRequest
{
    public int UserId { get; set; }
    public DateTime DateOfLeave { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal Hours { get; set; }
    public string? Reason { get; set; }
    public int PtoTypeId { get; set; }
}
