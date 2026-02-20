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

        request.Status = 1; // Approved
        request.ApprovedDeniedAt = DateTime.Now;
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

        request.Status = 2; // Denied
        request.ApprovedDeniedAt = DateTime.Now;
        request.ApprovedDeniedBy = deniedBy;
        request.DenyReason = denyRequest.Reason;

        await _db.SaveChangesAsync();
        await TrySendPtoDecisionNotificationAsync(request, approved: false, denyReason: denyRequest.Reason);
        return Ok(request);
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
