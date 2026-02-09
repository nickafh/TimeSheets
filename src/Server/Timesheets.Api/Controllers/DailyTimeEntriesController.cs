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

    // GET: api/dailytimeentries/team - Get time entries for all users in a date range
    [HttpGet("team")]
    public async Task<IActionResult> GetTeamEntries(DateTime start, DateTime end)
    {
        var entries = await _db.DailyTimeEntries
            .Where(x => x.WorkDate >= start && x.WorkDate <= end)
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

    // GET: api/dailytimeentries/summary - Get weekly summary for all users
    [HttpGet("summary")]
    public async Task<IActionResult> GetWeeklySummary(DateTime weekStart)
    {
        var weekEnd = weekStart.AddDays(6);

        var entries = await _db.DailyTimeEntries
            .Where(x => x.WorkDate >= weekStart && x.WorkDate <= weekEnd)
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