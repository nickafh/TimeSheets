using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeSheets.Api.Data;
using TimeSheets.Api.Models;

namespace TimeSheets.Api.Controllers;

public class PunchRequest
{
    public string PunchType { get; set; } = "";
}

public class CorrectRequest
{
    public DateTime CorrectedPunchTime { get; set; }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ClockPunchesController : ControllerBase
{
    private readonly TimeSheetsDbContext _db;

    public ClockPunchesController(TimeSheetsDbContext db)
    {
        _db = db;
    }

    /// <summary>Gets the current user's ID and role from JWT claims.</summary>
    private (int? UserId, string Role) GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "";
        return (int.TryParse(userIdClaim, out var id) ? id : null, role);
    }

    /// <summary>State machine: returns valid next punch actions based on the last punch type.</summary>
    private static string[] GetValidNextActions(string? lastPunchType)
    {
        return lastPunchType switch
        {
            null => ["ClockIn"],
            "ClockIn" => ["LunchOut", "ClockOut"],
            "LunchOut" => ["LunchIn"],
            "LunchIn" => ["ClockOut"],
            "ClockOut" => [],
            _ => [],
        };
    }

    /// <summary>Calculates worked hours from a complete set of punches.</summary>
    private static decimal CalculateWorkedHours(List<ClockPunch> punches)
    {
        var clockIn = punches.FirstOrDefault(p => p.PunchType == "ClockIn");
        var clockOut = punches.FirstOrDefault(p => p.PunchType == "ClockOut");
        if (clockIn == null || clockOut == null)
            return 0m;

        var totalSpan = clockOut.PunchTime - clockIn.PunchTime;

        var lunchOut = punches.FirstOrDefault(p => p.PunchType == "LunchOut");
        var lunchIn = punches.FirstOrDefault(p => p.PunchType == "LunchIn");
        var lunchSpan = (lunchOut != null && lunchIn != null)
            ? lunchIn.PunchTime - lunchOut.PunchTime
            : TimeSpan.Zero;

        var workedHours = Math.Round((decimal)(totalSpan - lunchSpan).TotalHours, 2);
        return Math.Max(workedHours, 0m); // Guard against negative values
    }

    /// <summary>Builds the standard status response DTO.</summary>
    private object BuildStatusResponse(List<ClockPunch> todayPunches)
    {
        var lastPunch = todayPunches.LastOrDefault();
        var lastPunchType = lastPunch?.PunchType;

        var currentState = lastPunchType switch
        {
            null => "not_started",
            "ClockIn" => "clocked_in",
            "LunchOut" => "lunch_out",
            "LunchIn" => "lunch_in",
            "ClockOut" => "clocked_out",
            _ => "unknown",
        };

        var validNextActions = GetValidNextActions(lastPunchType);

        decimal? totalHoursToday = null;
        if (todayPunches.Any(p => p.PunchType == "ClockOut"))
        {
            totalHoursToday = CalculateWorkedHours(todayPunches);
        }

        var clockInPunch = todayPunches.FirstOrDefault(p => p.PunchType == "ClockIn");
        var clockInTime = clockInPunch?.PunchTime;

        var lunchOut = todayPunches.FirstOrDefault(p => p.PunchType == "LunchOut");
        var lunchIn = todayPunches.FirstOrDefault(p => p.PunchType == "LunchIn");
        double? lunchMinutes = null;
        if (lunchOut != null && lunchIn != null)
            lunchMinutes = Math.Round((lunchIn.PunchTime - lunchOut.PunchTime).TotalMinutes, 1);

        return new
        {
            currentState,
            validNextActions,
            todayPunches = todayPunches.Select(p => new
            {
                p.Id,
                p.UserId,
                punchDate = p.PunchDate.ToString("yyyy-MM-dd"),
                p.PunchTime,
                p.PunchType,
                p.Status,
                p.OriginalPunchTime,
                p.CorrectedByUserId,
                p.CorrectedAt,
            }),
            totalHoursToday,
            clockInTime,
            lunchMinutes,
        };
    }

    /// <summary>POST /api/clockpunches/punch - Record a punch (ClockIn, LunchOut, LunchIn, ClockOut).</summary>
    [HttpPost("punch")]
    public async Task<IActionResult> Punch([FromBody] PunchRequest request)
    {
        var (currentUserId, _) = GetCurrentUser();
        if (currentUserId == null) return Unauthorized();

        // Validate user exists and is hourly
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == currentUserId && u.IsActive == 1);
        if (user == null) return NotFound(new { message = "User not found" });
        if (user.PayType != "Hourly")
            return BadRequest(new { message = "Clock punches are only available for hourly employees" });

        var now = DateTime.UtcNow;
        var punchDate = now.Date;

        // Get today's Active punches ordered by time
        var todayPunches = await _db.ClockPunches
            .Where(p => p.UserId == currentUserId && p.PunchDate == punchDate && p.Status == "Active")
            .OrderBy(p => p.PunchTime)
            .ToListAsync();

        var lastPunchType = todayPunches.LastOrDefault()?.PunchType;
        var validActions = GetValidNextActions(lastPunchType);

        if (!validActions.Contains(request.PunchType))
        {
            return BadRequest(new
            {
                message = $"Invalid punch type '{request.PunchType}'. Valid actions: {string.Join(", ", validActions)}",
                validNextActions = validActions,
            });
        }

        // Create the punch
        var punch = new ClockPunch
        {
            UserId = currentUserId.Value,
            PunchDate = punchDate,
            PunchTime = now,
            PunchType = request.PunchType,
            Status = "Active",
        };

        _db.ClockPunches.Add(punch);
        await _db.SaveChangesAsync();

        // If ClockOut, calculate hours and upsert DailyTimeEntry
        if (request.PunchType == "ClockOut")
        {
            todayPunches.Add(punch); // Include the new ClockOut
            var workedHours = CalculateWorkedHours(todayPunches);

            var dailyEntry = await _db.DailyTimeEntries
                .FirstOrDefaultAsync(d => d.UserId == currentUserId && d.WorkDate == punchDate);

            if (dailyEntry == null)
            {
                dailyEntry = new DailyTimeEntry
                {
                    UserId = currentUserId.Value,
                    WorkDate = punchDate,
                    WorkedHours = workedHours,
                    PtoHours = 0,
                    DayType = "Work",
                };
                _db.DailyTimeEntries.Add(dailyEntry);
            }
            else
            {
                // Preserve existing PtoHours and Notes
                dailyEntry.WorkedHours = workedHours;
                dailyEntry.DayType = "Work";
            }

            await _db.SaveChangesAsync();
        }
        else
        {
            todayPunches.Add(punch);
        }

        return Ok(BuildStatusResponse(todayPunches));
    }

    /// <summary>GET /api/clockpunches/status - Get current punch status for today.</summary>
    [HttpGet("status")]
    public async Task<IActionResult> Status([FromQuery] int? userId)
    {
        var (currentUserId, role) = GetCurrentUser();
        if (currentUserId == null) return Unauthorized();

        var targetUserId = userId ?? currentUserId.Value;

        // If looking at another user, must be Manager or Admin
        if (targetUserId != currentUserId.Value
            && !string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var punchDate = DateTime.UtcNow.Date;

        var todayPunches = await _db.ClockPunches
            .Where(p => p.UserId == targetUserId && p.PunchDate == punchDate && p.Status == "Active")
            .OrderBy(p => p.PunchTime)
            .ToListAsync();

        return Ok(BuildStatusResponse(todayPunches));
    }

    /// <summary>DELETE /api/clockpunches/{id}/undo - Undo the most recent punch within 30 seconds.</summary>
    [HttpDelete("{id}/undo")]
    public async Task<IActionResult> Undo(int id)
    {
        var (currentUserId, _) = GetCurrentUser();
        if (currentUserId == null) return Unauthorized();

        var punch = await _db.ClockPunches.FindAsync(id);
        if (punch == null) return NotFound(new { message = "Punch not found" });

        // Must belong to current user
        if (punch.UserId != currentUserId.Value)
            return Forbid();

        // Must be within undo window (30 seconds)
        var elapsed = DateTime.UtcNow - punch.PunchTime;
        if (elapsed.TotalSeconds > 30)
            return BadRequest(new { message = "Undo window has expired (30 seconds)" });

        // Must be the most recent Active punch for this user + date
        var mostRecent = await _db.ClockPunches
            .Where(p => p.UserId == currentUserId && p.PunchDate == punch.PunchDate && p.Status == "Active")
            .OrderByDescending(p => p.PunchTime)
            .FirstOrDefaultAsync();

        if (mostRecent == null || mostRecent.Id != id)
            return BadRequest(new { message = "Can only undo the most recent punch" });

        // If the undone punch was a ClockOut, revert the DailyTimeEntry WorkedHours
        if (punch.PunchType == "ClockOut")
        {
            var dailyEntry = await _db.DailyTimeEntries
                .FirstOrDefaultAsync(d => d.UserId == currentUserId && d.WorkDate == punch.PunchDate);

            if (dailyEntry != null)
            {
                dailyEntry.WorkedHours = 0;
                // Keep the entry if it has PtoHours; otherwise leave it with WorkedHours=0
            }
        }

        // Hard delete the punch
        _db.ClockPunches.Remove(punch);
        await _db.SaveChangesAsync();

        // Return updated status
        var todayPunches = await _db.ClockPunches
            .Where(p => p.UserId == currentUserId && p.PunchDate == punch.PunchDate && p.Status == "Active")
            .OrderBy(p => p.PunchTime)
            .ToListAsync();

        return Ok(BuildStatusResponse(todayPunches));
    }

    /// <summary>GET /api/clockpunches/needs-attention - Get flagged punches (Manager/Admin only).</summary>
    [HttpGet("needs-attention")]
    public async Task<IActionResult> NeedsAttention()
    {
        var (currentUserId, role) = GetCurrentUser();
        if (currentUserId == null) return Unauthorized();

        if (!string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        IQueryable<ClockPunch> query = _db.ClockPunches
            .Include(p => p.User)
            .Where(p => p.Status == "NeedsAttention");

        // Managers only see their managed users
        if (string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase))
        {
            var managedUserIds = _db.UserManagers
                .Where(um => um.ManagerId == currentUserId)
                .Select(um => um.UserId);

            query = query.Where(p => managedUserIds.Contains(p.UserId));
        }

        var punches = await query
            .OrderBy(p => p.PunchDate)
            .ThenBy(p => p.PunchTime)
            .ToListAsync();

        var grouped = punches
            .GroupBy(p => new { p.UserId, p.PunchDate })
            .Select(g => new
            {
                userId = g.Key.UserId,
                userName = $"{g.First().User?.FirstName} {g.First().User?.LastName}".Trim(),
                punchDate = g.Key.PunchDate.ToString("yyyy-MM-dd"),
                punches = g.Select(p => new
                {
                    p.Id,
                    p.PunchType,
                    p.PunchTime,
                    p.Status,
                    p.OriginalPunchTime,
                    p.CorrectedByUserId,
                    p.CorrectedAt,
                }).ToList(),
            })
            .ToList();

        return Ok(grouped);
    }

    /// <summary>PUT /api/clockpunches/{id}/correct - Correct a punch time (Manager/Admin only).</summary>
    [HttpPut("{id}/correct")]
    public async Task<IActionResult> Correct(int id, [FromBody] CorrectRequest request)
    {
        var (currentUserId, role) = GetCurrentUser();
        if (currentUserId == null) return Unauthorized();

        if (!string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var punch = await _db.ClockPunches.FindAsync(id);
        if (punch == null) return NotFound(new { message = "Punch not found" });

        // Set audit trail
        punch.OriginalPunchTime = punch.PunchTime;
        punch.PunchTime = request.CorrectedPunchTime;
        punch.CorrectedByUserId = currentUserId.Value;
        punch.CorrectedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Check if this correction completes a full day - recalculate hours
        var dayPunches = await _db.ClockPunches
            .Where(p => p.UserId == punch.UserId
                && p.PunchDate == punch.PunchDate
                && (p.Status == "Active" || p.Status == "NeedsAttention"))
            .OrderBy(p => p.PunchTime)
            .ToListAsync();

        var hasClockIn = dayPunches.Any(p => p.PunchType == "ClockIn");
        var hasClockOut = dayPunches.Any(p => p.PunchType == "ClockOut");

        if (hasClockIn && hasClockOut)
        {
            // Recalculate worked hours
            var workedHours = CalculateWorkedHours(dayPunches);

            var dailyEntry = await _db.DailyTimeEntries
                .FirstOrDefaultAsync(d => d.UserId == punch.UserId && d.WorkDate == punch.PunchDate);

            if (dailyEntry == null)
            {
                dailyEntry = new DailyTimeEntry
                {
                    UserId = punch.UserId,
                    WorkDate = punch.PunchDate,
                    WorkedHours = workedHours,
                    PtoHours = 0,
                    DayType = "Work",
                };
                _db.DailyTimeEntries.Add(dailyEntry);
            }
            else
            {
                dailyEntry.WorkedHours = workedHours;
                dailyEntry.DayType = "Work";
            }

            // Resolve NeedsAttention -> Active
            foreach (var dp in dayPunches.Where(p => p.Status == "NeedsAttention"))
                dp.Status = "Active";

            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            punch.Id,
            punch.UserId,
            punchDate = punch.PunchDate.ToString("yyyy-MM-dd"),
            punch.PunchTime,
            punch.PunchType,
            punch.Status,
            punch.OriginalPunchTime,
            punch.CorrectedByUserId,
            punch.CorrectedAt,
        });
    }

    /// <summary>GET /api/clockpunches/history - Get punch history for a date range.</summary>
    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] int? userId, [FromQuery] DateTime start, [FromQuery] DateTime end)
    {
        var (currentUserId, role) = GetCurrentUser();
        if (currentUserId == null) return Unauthorized();

        var targetUserId = userId ?? currentUserId.Value;

        // If looking at another user, must be Manager or Admin
        if (targetUserId != currentUserId.Value
            && !string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var punches = await _db.ClockPunches
            .Where(p => p.UserId == targetUserId
                && p.PunchDate >= start.Date
                && p.PunchDate <= end.Date)
            .OrderBy(p => p.PunchDate)
            .ThenBy(p => p.PunchTime)
            .Select(p => new
            {
                p.Id,
                p.UserId,
                punchDate = p.PunchDate.ToString("yyyy-MM-dd"),
                p.PunchTime,
                p.PunchType,
                p.Status,
                p.OriginalPunchTime,
                p.CorrectedByUserId,
                p.CorrectedAt,
            })
            .ToListAsync();

        return Ok(punches);
    }
}
