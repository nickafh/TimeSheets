using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeSheets.Api.Data;
using TimeSheets.Api.Models;

namespace TimeSheets.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly TimeSheetsDbContext _db;

    public NotificationsController(TimeSheetsDbContext db)
    {
        _db = db;
    }

    // GET: api/notifications - Get all active, non-expired notifications for users
    [HttpGet]
    public async Task<IActionResult> GetActive()
    {
        var now = DateTime.Now;
        var notifications = await _db.Notifications
            .Where(n => n.IsActive == 1 && (n.ExpiresAt == null || n.ExpiresAt > now))
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return Ok(notifications);
    }

    // GET: api/notifications/all - Get all notifications (for admin)
    [HttpGet("all")]
    public async Task<IActionResult> GetAll()
    {
        var notifications = await _db.Notifications
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return Ok(notifications);
    }

    // GET: api/notifications/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var notification = await _db.Notifications.FindAsync(id);
        if (notification == null)
        {
            return NotFound();
        }
        return Ok(notification);
    }

    // POST: api/notifications - Create new notification
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Notification notification)
    {
        notification.CreatedAt = DateTime.Now;
        notification.IsActive = 1;

        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = notification.Id }, notification);
    }

    // PUT: api/notifications/{id} - Update notification
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Notification notification)
    {
        if (id != notification.Id)
        {
            return BadRequest("ID mismatch");
        }

        var existing = await _db.Notifications.FindAsync(id);
        if (existing == null)
        {
            return NotFound();
        }

        existing.Title = notification.Title;
        existing.Message = notification.Message;
        existing.ExpiresAt = notification.ExpiresAt;
        existing.IsActive = notification.IsActive;

        await _db.SaveChangesAsync();
        return Ok(existing);
    }

    // PATCH: api/notifications/{id}/deactivate - Deactivate notification
    [HttpPatch("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var notification = await _db.Notifications.FindAsync(id);
        if (notification == null)
        {
            return NotFound();
        }

        notification.IsActive = 0;
        await _db.SaveChangesAsync();
        return Ok(notification);
    }

    // PATCH: api/notifications/{id}/activate - Activate notification
    [HttpPatch("{id}/activate")]
    public async Task<IActionResult> Activate(int id)
    {
        var notification = await _db.Notifications.FindAsync(id);
        if (notification == null)
        {
            return NotFound();
        }

        notification.IsActive = 1;
        await _db.SaveChangesAsync();
        return Ok(notification);
    }

    // DELETE: api/notifications/{id} - Delete notification
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var notification = await _db.Notifications.FindAsync(id);
        if (notification == null)
        {
            return NotFound();
        }

        _db.Notifications.Remove(notification);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
