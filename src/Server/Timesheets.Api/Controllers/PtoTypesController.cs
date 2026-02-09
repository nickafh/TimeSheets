using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeSheets.Api.Data;

namespace TimeSheets.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PtoTypesController : ControllerBase
{
    private readonly TimeSheetsDbContext _db;

    public PtoTypesController(TimeSheetsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var types = await _db.PtoTypes
            .Where(t => t.IsSelectable)
            .OrderBy(t => t.Name)
            .ToListAsync();

        return Ok(types);
    }
}