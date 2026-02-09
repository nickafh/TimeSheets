using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeSheets.Api.Data;
using TimeSheets.Api.Models;

namespace TimeSheets.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class EarlyClosuresController : ControllerBase
{
    private readonly TimeSheetsDbContext _db;

    public EarlyClosuresController(TimeSheetsDbContext db)
    {
        _db = db;
    }

    // GET: api/earlyclosures - Get all early closures
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var closures = await _db.EarlyClosures
            .OrderBy(c => c.ClosureDate)
            .ToListAsync();

        return Ok(closures);
    }

    // GET: api/earlyclosures/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var closure = await _db.EarlyClosures.FindAsync(id);
        if (closure == null)
        {
            return NotFound();
        }
        return Ok(closure);
    }

    // POST: api/earlyclosures - Create new early closure
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EarlyClosure closure)
    {
        _db.EarlyClosures.Add(closure);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = closure.Id }, closure);
    }

    // PUT: api/earlyclosures/{id} - Update early closure
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] EarlyClosure closure)
    {
        if (id != closure.Id)
        {
            return BadRequest("ID mismatch");
        }

        var existing = await _db.EarlyClosures.FindAsync(id);
        if (existing == null)
        {
            return NotFound();
        }

        existing.Name = closure.Name;
        existing.ClosureDate = closure.ClosureDate;
        existing.CloseTime = closure.CloseTime;

        await _db.SaveChangesAsync();
        return Ok(existing);
    }

    // DELETE: api/earlyclosures/{id} - Delete early closure
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var closure = await _db.EarlyClosures.FindAsync(id);
        if (closure == null)
        {
            return NotFound();
        }

        _db.EarlyClosures.Remove(closure);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
