using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using TimeSheets.Api.Data;

namespace TimeSheets.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CalendarController : ControllerBase
{
    private readonly TimeSheetsDbContext _db;
    private readonly ILogger<CalendarController> _logger;

    public CalendarController(TimeSheetsDbContext db, ILogger<CalendarController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>Valid range for all-day calendar dates; excludes corrupt DB values (e.g. 0000-00-00, MinValue).</summary>
    private static bool IsValidAllDayDate(DateTime dt)
        => dt.Year >= 1900 && dt.Year <= 2100;

    /// <summary>Returns workdays (Mon–Fri) in range, excluding weekends and holidays.</summary>
    private static List<DateTime> GetWorkdaysInRange(DateTime start, DateTime end, HashSet<DateTime> holidayDates)
    {
        var workdays = new List<DateTime>();
        for (var d = start.Date; d <= end.Date; d = d.AddDays(1))
        {
            if (d.DayOfWeek == DayOfWeek.Saturday || d.DayOfWeek == DayOfWeek.Sunday) continue;
            if (holidayDates.Contains(d)) continue;
            workdays.Add(d);
        }
        return workdays;
    }

    /// <summary>
    /// Returns the current user's calendar token (authenticated).
    /// </summary>
    [Authorize]
    [HttpGet("token")]
    public async Task<IActionResult> GetMyCalendarToken()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (email == null) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return NotFound();

        // Generate token if user doesn't have one yet
        if (string.IsNullOrEmpty(user.CalendarToken))
        {
            user.CalendarToken = Guid.NewGuid().ToString("N");
            await _db.SaveChangesAsync();
        }

        return Ok(new { token = user.CalendarToken });
    }

    /// <summary>
    /// Returns an iCalendar (.ics) feed with company holidays and approved PTO requests.
    /// Authenticated by unguessable token in URL — no JWT required.
    /// Supports GET and HEAD; calendar clients often HEAD first and need 200 to proceed.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("feed/{token}/team.ics")]
    [HttpHead("feed/{token}/team.ics")]
    [Produces("text/calendar")]
    public async Task<IActionResult> GetTeamCalendarFeed(string token)
    {
        // Set cache headers to force frequent refreshes (5 minutes)
        Response.Headers["Cache-Control"] = "public, max-age=300"; // 5 minutes
        Response.Headers["Expires"] = DateTime.UtcNow.AddMinutes(5).ToString("R");
        
        // Validate token belongs to any active user
        var tokenUser = await _db.Users.FirstOrDefaultAsync(u => u.CalendarToken == token);
        if (tokenUser == null) return NotFound();

        var today = DateTime.UtcNow.Date;
        var startWindow = today.AddDays(-30);
        var endWindow = today.AddMonths(18);
        var currentYear = today.Year;

        var holidays = await _db.Holidays
            .Where(h => h.HolidayDate.Year == currentYear || h.HolidayDate.Year == currentYear + 1)
            .OrderBy(h => h.HolidayDate)
            .ToListAsync();

        var approvedPtoRequests = await _db.PtoRequests
            .Where(p => p.Status == 1) // Approved only
            .Where(p => (p.EndDate ?? p.DateOfLeave) >= startWindow && p.DateOfLeave <= endWindow)
            .Join(_db.Users,
                pto => pto.UserId,
                user => user.Id,
                (pto, user) => new
                {
                    pto.Id,
                    pto.DateOfLeave,
                    pto.EndDate,
                    pto.Hours,
                    pto.Reason,
                    UserName = user.FirstName + " " + user.LastName,
                    user.Department,
                    pto.RequestedAt,
                    pto.ApprovedDeniedAt
                })
            .OrderBy(p => p.DateOfLeave)
            .ToListAsync();

        var sb = new StringBuilder();

        // iCalendar header
        sb.AppendLine("BEGIN:VCALENDAR");
        sb.AppendLine("VERSION:2.0");
        sb.AppendLine("PRODID:-//AFH TimeSheets//Calendar Feed//EN");
        sb.AppendLine("CALSCALE:GREGORIAN");
        sb.AppendLine("METHOD:PUBLISH");
        sb.AppendLine("X-WR-CALNAME:AFH Time Off Calendar");
        sb.AppendLine("X-WR-TIMEZONE:America/New_York");

        // Add holidays as all-day events
        foreach (var holiday in holidays)
        {
            var dateStr = holiday.HolidayDate.ToString("yyyyMMdd");
            var uid = $"holiday-{holiday.Id}@afh-timesheets";

            sb.AppendLine("BEGIN:VEVENT");
            sb.AppendLine($"UID:{uid}");
            sb.AppendLine($"DTSTART;VALUE=DATE:{dateStr}");
            sb.AppendLine($"DTEND;VALUE=DATE:{holiday.HolidayDate.AddDays(1):yyyyMMdd}");
            sb.AppendLine($"SUMMARY:{EscapeICalText(holiday.Name)}");
            sb.AppendLine("CATEGORIES:Holiday");
            sb.AppendLine("TRANSP:TRANSPARENT");
            sb.AppendLine($"DTSTAMP:{DateTime.UtcNow:yyyyMMddTHHmmssZ}");
            sb.AppendLine("END:VEVENT");
        }

        var holidayDates = new HashSet<DateTime>(holidays.Select(h => h.HolidayDate.Date));

        // Add approved PTO - one VEVENT per workday (excludes weekends and holidays)
        foreach (var pto in approvedPtoRequests)
        {
            var start = pto.DateOfLeave;
            var end = pto.EndDate ?? start;

            if (!IsValidAllDayDate(start) || !IsValidAllDayDate(end) || end < start)
            {
                _logger.LogWarning("Skipping PTO {PtoId} - invalid dates: Start={Start} End={End}",
                    pto.Id, start, end);
                continue;
            }

            var workdays = GetWorkdaysInRange(start, end, holidayDates);
            if (workdays.Count == 0) continue;

            var hoursPerDay = (decimal)pto.Hours / workdays.Count;
            var lastModified = pto.ApprovedDeniedAt ?? pto.RequestedAt;
            var dtstamp = lastModified.ToUniversalTime().ToString("yyyyMMddTHHmmssZ");
            var created = pto.RequestedAt.ToUniversalTime().ToString("yyyyMMddTHHmmssZ");
            var description = string.IsNullOrEmpty(pto.Reason)
                ? $"Department: {pto.Department ?? "Unknown"}"
                : $"Reason: {pto.Reason}\\nDepartment: {pto.Department ?? "Unknown"}";

            for (var i = 0; i < workdays.Count; i++)
            {
                var d = workdays[i];
                var dateStr = d.ToString("yyyyMMdd");
                var endDateStr = d.AddDays(1).ToString("yyyyMMdd");
                var uid = $"pto-{pto.Id}-{i}@afh-timesheets";
                var summary = $"{pto.UserName} - Time Off ({hoursPerDay:F0}h)";

                sb.AppendLine("BEGIN:VEVENT");
                sb.AppendLine($"UID:{uid}");
                sb.AppendLine($"DTSTAMP:{dtstamp}");
                sb.AppendLine($"CREATED:{created}");
                sb.AppendLine($"LAST-MODIFIED:{dtstamp}");
                sb.AppendLine($"DTSTART;VALUE=DATE:{dateStr}");
                sb.AppendLine($"DTEND;VALUE=DATE:{endDateStr}");
                sb.AppendLine($"SUMMARY:{EscapeICalText(summary)}");
                sb.AppendLine($"DESCRIPTION:{EscapeICalText(description)}");
                sb.AppendLine($"CATEGORIES:PTO,{EscapeICalText(pto.Department ?? "Unknown")}");
                sb.AppendLine("TRANSP:TRANSPARENT");
                sb.AppendLine($"SEQUENCE:0");
                sb.AppendLine($"STATUS:CONFIRMED");
                sb.AppendLine("END:VEVENT");
            }
        }

        sb.AppendLine("END:VCALENDAR");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        Response.ContentType = "text/calendar; charset=utf-8";
        if (HttpMethods.IsHead(Request.Method))
            return Ok();

        return File(bytes, "text/calendar", "afh-timeoff-calendar.ics");
    }

    /// <summary>
    /// Returns an iCalendar feed for a specific user's PTO requests only.
    /// Authenticated by unguessable token in URL — no JWT required.
    /// Supports GET and HEAD; calendar clients often HEAD first and need 200 to proceed.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("feed/{token}/my.ics")]
    [HttpHead("feed/{token}/my.ics")]
    [Produces("text/calendar")]
    public async Task<IActionResult> GetUserCalendarFeed(string token)
    {
        // Set cache headers to force frequent refreshes (5 minutes)
        Response.Headers["Cache-Control"] = "public, max-age=300"; // 5 minutes
        Response.Headers["Expires"] = DateTime.UtcNow.AddMinutes(5).ToString("R");
        
        var user = await _db.Users.FirstOrDefaultAsync(u => u.CalendarToken == token);
        if (user == null) return NotFound();

        var today = DateTime.UtcNow.Date;
        var startWindow = today.AddDays(-30);
        var endWindow = today.AddMonths(18);
        var currentYear = today.Year;

        var holidays = await _db.Holidays
            .Where(h => h.HolidayDate.Year == currentYear || h.HolidayDate.Year == currentYear + 1)
            .OrderBy(h => h.HolidayDate)
            .ToListAsync();

        var userPtoRequests = await _db.PtoRequests
            .Where(p => p.UserId == user.Id && p.Status == 1) // Approved only
            .Where(p => (p.EndDate ?? p.DateOfLeave) >= startWindow && p.DateOfLeave <= endWindow)
            .Select(p => new {
                p.Id,
                p.DateOfLeave,
                p.EndDate,
                p.Hours,
                p.Reason,
                p.RequestedAt,
                p.ApprovedDeniedAt
            })
            .OrderBy(p => p.DateOfLeave)
            .ToListAsync();

        var sb = new StringBuilder();

        sb.AppendLine("BEGIN:VCALENDAR");
        sb.AppendLine("VERSION:2.0");
        sb.AppendLine("PRODID:-//AFH TimeSheets//Calendar Feed//EN");
        sb.AppendLine("CALSCALE:GREGORIAN");
        sb.AppendLine("METHOD:PUBLISH");
        sb.AppendLine($"X-WR-CALNAME:{user.FirstName}'s Time Off Calendar");
        sb.AppendLine("X-WR-TIMEZONE:America/New_York");

        // Add holidays
        foreach (var holiday in holidays)
        {
            var dateStr = holiday.HolidayDate.ToString("yyyyMMdd");
            var uid = $"holiday-{holiday.Id}@afh-timesheets";

            sb.AppendLine("BEGIN:VEVENT");
            sb.AppendLine($"UID:{uid}");
            sb.AppendLine($"DTSTART;VALUE=DATE:{dateStr}");
            sb.AppendLine($"DTEND;VALUE=DATE:{holiday.HolidayDate.AddDays(1):yyyyMMdd}");
            sb.AppendLine($"SUMMARY:{EscapeICalText(holiday.Name)}");
            sb.AppendLine("CATEGORIES:Holiday");
            sb.AppendLine("TRANSP:TRANSPARENT");
            sb.AppendLine($"DTSTAMP:{DateTime.UtcNow:yyyyMMddTHHmmssZ}");
            sb.AppendLine("END:VEVENT");
        }

        var holidayDates = new HashSet<DateTime>(holidays.Select(h => h.HolidayDate.Date));

        // Add user's approved PTO - one VEVENT per workday (excludes weekends and holidays)
        foreach (var pto in userPtoRequests)
        {
            var start = pto.DateOfLeave;
            var end = pto.EndDate ?? start;

            if (!IsValidAllDayDate(start) || !IsValidAllDayDate(end) || end < start)
            {
                _logger.LogWarning("Skipping PTO {PtoId} - invalid dates: Start={Start} End={End}",
                    pto.Id, start, end);
                continue;
            }

            var workdays = GetWorkdaysInRange(start, end, holidayDates);
            if (workdays.Count == 0) continue;

            var hoursPerDay = (decimal)pto.Hours / workdays.Count;
            var lastModified = pto.ApprovedDeniedAt ?? pto.RequestedAt;
            var dtstamp = lastModified.ToUniversalTime().ToString("yyyyMMddTHHmmssZ");
            var created = pto.RequestedAt.ToUniversalTime().ToString("yyyyMMddTHHmmssZ");

            for (var i = 0; i < workdays.Count; i++)
            {
                var d = workdays[i];
                var dateStr = d.ToString("yyyyMMdd");
                var endDateStr = d.AddDays(1).ToString("yyyyMMdd");
                var uid = $"pto-{pto.Id}-{i}@afh-timesheets";
                var summary = $"Time Off ({hoursPerDay:F0}h)";

                sb.AppendLine("BEGIN:VEVENT");
                sb.AppendLine($"UID:{uid}");
                sb.AppendLine($"DTSTAMP:{dtstamp}");
                sb.AppendLine($"CREATED:{created}");
                sb.AppendLine($"LAST-MODIFIED:{dtstamp}");
                sb.AppendLine($"DTSTART;VALUE=DATE:{dateStr}");
                sb.AppendLine($"DTEND;VALUE=DATE:{endDateStr}");
                sb.AppendLine($"SUMMARY:{EscapeICalText(summary)}");
                if (!string.IsNullOrEmpty(pto.Reason))
                {
                    sb.AppendLine($"DESCRIPTION:{EscapeICalText(pto.Reason)}");
                }
                sb.AppendLine("CATEGORIES:PTO");
                sb.AppendLine("TRANSP:TRANSPARENT");
                sb.AppendLine($"SEQUENCE:0");
                sb.AppendLine($"STATUS:CONFIRMED");
                sb.AppendLine("END:VEVENT");
            }
        }

        sb.AppendLine("END:VCALENDAR");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        Response.ContentType = "text/calendar; charset=utf-8";
        if (HttpMethods.IsHead(Request.Method))
            return Ok();

        return File(bytes, "text/calendar", $"{user.FirstName}-timeoff-calendar.ics");
    }

    private static string EscapeICalText(string text)
    {
        if (string.IsNullOrEmpty(text)) return text;

        return text
            .Replace("\\", "\\\\")
            .Replace(",", "\\,")
            .Replace(";", "\\;")
            .Replace("\n", "\\n")
            .Replace("\r", "");
    }
}
