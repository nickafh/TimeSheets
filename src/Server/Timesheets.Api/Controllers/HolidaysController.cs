using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeSheets.Api.Data;
using TimeSheets.Api.Models;

namespace TimeSheets.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class HolidaysController : ControllerBase
{
    private readonly TimeSheetsDbContext _db;

    public HolidaysController(TimeSheetsDbContext db)
    {
        _db = db;
    }

    // GET: api/holidays - Get all holidays
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var holidays = await _db.Holidays
            .OrderBy(h => h.HolidayDate)
            .ToListAsync();

        return Ok(holidays);
    }

    // GET: api/holidays/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var holiday = await _db.Holidays.FindAsync(id);
        if (holiday == null)
        {
            return NotFound();
        }
        return Ok(holiday);
    }

    // POST: api/holidays - Create new holiday
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Holiday holiday)
    {
        _db.Holidays.Add(holiday);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = holiday.Id }, holiday);
    }

    // PUT: api/holidays/{id} - Update holiday
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Holiday holiday)
    {
        if (id != holiday.Id)
        {
            return BadRequest("ID mismatch");
        }

        var existing = await _db.Holidays.FindAsync(id);
        if (existing == null)
        {
            return NotFound();
        }

        existing.Name = holiday.Name;
        existing.HolidayDate = holiday.HolidayDate;

        await _db.SaveChangesAsync();
        return Ok(existing);
    }

    // DELETE: api/holidays/{id} - Delete holiday
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var holiday = await _db.Holidays.FindAsync(id);
        if (holiday == null)
        {
            return NotFound();
        }

        _db.Holidays.Remove(holiday);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
