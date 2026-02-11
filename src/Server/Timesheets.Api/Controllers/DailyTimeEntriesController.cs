using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeSheets.Api.Data;
using TimeSheets.Api.Models;

namespace TimeSheets.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DailyTimeEntriesController : ControllerBase
{
    private readonly TimeSheetsDbContext _db;

    public DailyTimeEntriesController(TimeSheetsDbContext db)
    {
        _db = db;
    }

    /// <summary>Gets the current user's ID and role. Returns (null, null) if not authenticated.</summary>
    private (int? UserId, string Role) GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "";
        return (int.TryParse(userIdClaim, out var id) ? id : null, role);
    }

    [HttpGet]
    public async Task<IActionResult> Get(int userId, DateTime start, DateTime end)
    {
        var entries = await _db.DailyTimeEntries
            .Where(x => x.UserId == userId && x.WorkDate >= start && x.WorkDate <= end)
            .OrderBy(x => x.WorkDate)
            .ToListAsync();

        return Ok(entries);
    }

    [HttpPut("bulk")]
    public async Task<IActionResult> SaveBulk([FromBody] List<DailyTimeEntry> entries)
    {
        foreach (var entry in entries)
        {
            var existing = await _db.DailyTimeEntries
                .FirstOrDefaultAsync(x => x.UserId == entry.UserId && x.WorkDate == entry.WorkDate);

            if (existing == null)
            {
                _db.DailyTimeEntries.Add(entry);
            }
            else
            {
                existing.WorkedHours = entry.WorkedHours;
                existing.PtoHours = entry.PtoHours;
                existing.DayType = entry.DayType;
                existing.Notes = entry.Notes;
            }
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/dailytimeentries/team - Get time entries for manager's team (or all users for Admin)
    [HttpGet("team")]
    public async Task<IActionResult> GetTeamEntries(DateTime start, DateTime end)
    {
        var (currentUserId, role) = GetCurrentUser();
        if (currentUserId == null) return Unauthorized();

        IQueryable<int> allowedUserIds = _db.Users.Where(u => u.IsActive == 1).Select(u => u.Id);
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            var teamIds = _db.UserManagers
                .Where(um => um.ManagerId == currentUserId)
                .Select(um => um.UserId);
            allowedUserIds = teamIds;
        }

        var entries = await _db.DailyTimeEntries
            .Where(x => x.WorkDate >= start && x.WorkDate <= end)
            .Where(x => allowedUserIds.Contains(x.UserId))
            .Join(_db.Users,
                entry => entry.UserId,
                user => user.Id,
                (entry, user) => new
                {
                    entry.Id,
                    entry.UserId,
                    UserName = $"{user.FirstName} {user.LastName}",
                    user.Department,
                    entry.WorkDate,
                    entry.WorkedHours,
                    entry.PtoHours,
                    entry.DayType,
                    entry.Notes
                })
            .OrderBy(x => x.WorkDate)
            .ThenBy(x => x.UserName)
            .ToListAsync();

        return Ok(entries);
    }

    // GET: api/dailytimeentries/summary - Get weekly summary for manager's team (or all users for Admin)
    [HttpGet("summary")]
    public async Task<IActionResult> GetWeeklySummary(DateTime weekStart)
    {
        var (currentUserId, role) = GetCurrentUser();
        if (currentUserId == null) return Unauthorized();

        var weekEnd = weekStart.AddDays(6);

        IQueryable<int> allowedUserIds = _db.Users.Where(u => u.IsActive == 1).Select(u => u.Id);
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            var teamIds = _db.UserManagers
                .Where(um => um.ManagerId == currentUserId)
                .Select(um => um.UserId);
            allowedUserIds = teamIds;
        }

        var entries = await _db.DailyTimeEntries
            .Where(x => x.WorkDate >= weekStart && x.WorkDate <= weekEnd)
            .Where(x => allowedUserIds.Contains(x.UserId))
            .Join(_db.Users.Where(u => u.IsActive == 1),
                entry => entry.UserId,
                user => user.Id,
                (entry, user) => new
                {
                    entry.UserId,
                    UserName = $"{user.FirstName} {user.LastName}",
                    user.Department,
                    entry.WorkDate,
                    entry.WorkedHours,
                    entry.PtoHours
                })
            .ToListAsync();

        // Group by user and calculate totals
        var summary = entries
            .GroupBy(x => new { x.UserId, x.UserName, x.Department })
            .Select(g => new
            {
                g.Key.UserId,
                g.Key.UserName,
                g.Key.Department,
                TotalWorkedHours = g.Sum(x => x.WorkedHours),
                TotalPtoHours = g.Sum(x => x.PtoHours),
                TotalHours = g.Sum(x => x.WorkedHours + x.PtoHours),
                DaysWorked = g.Count(x => x.WorkedHours > 0),
                DaysPto = g.Count(x => x.PtoHours > 0)
            })
            .OrderBy(x => x.UserName)
            .ToList();

        return Ok(summary);
    }
}