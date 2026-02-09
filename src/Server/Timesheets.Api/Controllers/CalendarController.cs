using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using TimeSheets.Api.Data;

namespace TimeSheets.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CalendarController : ControllerBase
{
    private readonly TimeSheetsDbContext _db;

    public CalendarController(TimeSheetsDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Returns an iCalendar (.ics) feed with company holidays and approved PTO requests.
    /// Use this URL in Outlook or other calendar apps to subscribe.
    /// </summary>
    [HttpGet("feed.ics")]
    [Produces("text/calendar")]
    public async Task<IActionResult> GetCalendarFeed()
    {
        var holidays = await _db.Holidays
            .OrderBy(h => h.HolidayDate)
            .ToListAsync();

        var approvedPtoRequests = await _db.PtoRequests
            .Where(p => p.Status == 1) // Approved only
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
                    user.Department
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

        // Add approved PTO requests (multi-day: one event from DateOfLeave through EndDate)
        foreach (var pto in approvedPtoRequests)
        {
            var start = pto.DateOfLeave;
            var end = pto.EndDate ?? start;
            var dateStr = start.ToString("yyyyMMdd");
            var endDateStr = end.AddDays(1).ToString("yyyyMMdd");
            var uid = $"pto-{pto.Id}@afh-timesheets";
            var summary = $"{pto.UserName} - Time Off ({pto.Hours}h)";
            var description = string.IsNullOrEmpty(pto.Reason)
                ? $"Department: {pto.Department ?? "Unknown"}"
                : $"Reason: {pto.Reason}\\nDepartment: {pto.Department ?? "Unknown"}";

            sb.AppendLine("BEGIN:VEVENT");
            sb.AppendLine($"UID:{uid}");
            sb.AppendLine($"DTSTART;VALUE=DATE:{dateStr}");
            sb.AppendLine($"DTEND;VALUE=DATE:{endDateStr}");
            sb.AppendLine($"SUMMARY:{EscapeICalText(summary)}");
            sb.AppendLine($"DESCRIPTION:{EscapeICalText(description)}");
            sb.AppendLine($"CATEGORIES:PTO,{EscapeICalText(pto.Department ?? "Unknown")}");
            sb.AppendLine("TRANSP:TRANSPARENT");
            sb.AppendLine($"DTSTAMP:{DateTime.UtcNow:yyyyMMddTHHmmssZ}");
            sb.AppendLine("END:VEVENT");
        }

        sb.AppendLine("END:VCALENDAR");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/calendar", "afh-timeoff-calendar.ics");
    }

    /// <summary>
    /// Returns an iCalendar feed for a specific user's PTO requests only.
    /// </summary>
    [HttpGet("feed/{userId}.ics")]
    [Produces("text/calendar")]
    public async Task<IActionResult> GetUserCalendarFeed(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound("User not found");
        }

        var holidays = await _db.Holidays
            .OrderBy(h => h.HolidayDate)
            .ToListAsync();

        var userPtoRequests = await _db.PtoRequests
            .Where(p => p.UserId == userId && p.Status == 1) // Approved only
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

        // Add user's approved PTO (multi-day: one event from DateOfLeave through EndDate)
        foreach (var pto in userPtoRequests)
        {
            var start = pto.DateOfLeave;
            var end = pto.EndDate ?? start;
            var dateStr = start.ToString("yyyyMMdd");
            var endDateStr = end.AddDays(1).ToString("yyyyMMdd");
            var uid = $"pto-{pto.Id}@afh-timesheets";
            var summary = $"Time Off ({pto.Hours}h)";

            sb.AppendLine("BEGIN:VEVENT");
            sb.AppendLine($"UID:{uid}");
            sb.AppendLine($"DTSTART;VALUE=DATE:{dateStr}");
            sb.AppendLine($"DTEND;VALUE=DATE:{endDateStr}");
            sb.AppendLine($"SUMMARY:{EscapeICalText(summary)}");
            if (!string.IsNullOrEmpty(pto.Reason))
            {
                sb.AppendLine($"DESCRIPTION:{EscapeICalText(pto.Reason)}");
            }
            sb.AppendLine("CATEGORIES:PTO");
            sb.AppendLine("TRANSP:TRANSPARENT");
            sb.AppendLine($"DTSTAMP:{DateTime.UtcNow:yyyyMMddTHHmmssZ}");
            sb.AppendLine("END:VEVENT");
        }

        sb.AppendLine("END:VCALENDAR");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
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
