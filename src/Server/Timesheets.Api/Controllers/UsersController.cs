using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TimeSheets.Api.Data;
using TimeSheets.Api.Models;

namespace TimeSheets.Api.Controllers;

public class SetManagersRequest
{
    public List<int> ManagerIds { get; set; } = new();
}

public class SetPasswordRequest
{
    public string Password { get; set; } = string.Empty;
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private static readonly string[] AllowedRoles = { "Employee", "Manager", "Admin" };
    private static readonly string[] AllowedPayTypes = { "Salary", "Hourly" };
    private static readonly string[] AllowedExemptionStatuses = { "Exempt", "NonExempt" };

    private readonly TimeSheetsDbContext _db;

    public UsersController(TimeSheetsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] bool includeInactive = false)
    {
        var query = _db.Users.AsQueryable();

        if (!includeInactive)
        {
            query = query.Where(u => u.IsActive == 1);
        }

        var users = await query
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .ToListAsync();

        await PopulateManagerIds(users);
        return Ok(users);
    }

    /// <summary>Get distinct department and category values for dropdowns.</summary>
    [HttpGet("lookup")]
    public async Task<IActionResult> GetDepartmentAndCategoryLookup()
    {
        var departments = await _db.Users
            .Where(u => u.Department != null && u.Department != "")
            .Select(u => u.Department!)
            .Distinct()
            .OrderBy(d => d)
            .ToListAsync();

        var categories = await _db.Users
            .Where(u => u.Category != null && u.Category != "")
            .Select(u => u.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

        return Ok(new { departments, categories });
    }

    /// <summary>Get users who can be assigned as managers (Role = Manager or Admin).</summary>
    [HttpGet("managers")]
    public async Task<IActionResult> GetManagers()
    {
        var managers = await _db.Users
            .Where(u => u.IsActive == 1 && (u.Role == "Manager" || u.Role == "Admin"))
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .Select(u => new { u.Id, u.FirstName, u.LastName, u.Email, u.Role })
            .ToListAsync();
        return Ok(managers);
    }

    /// <summary>Get active direct reports for the current manager. Admin receives all active users.</summary>
    [HttpGet("team")]
    public async Task<IActionResult> GetMyTeam()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "";
        if (!int.TryParse(userIdClaim, out var currentUserId))
            return Unauthorized();

        IQueryable<User> query = _db.Users.Where(u => u.IsActive == 1);
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            var teamIds = _db.UserManagers
                .Where(um => um.ManagerId == currentUserId)
                .Select(um => um.UserId);
            query = query.Where(u => teamIds.Contains(u.Id));
        }

        var users = await query
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .ToListAsync();

        await PopulateManagerIds(users);
        return Ok(users);
    }

    private async Task PopulateManagerIds(List<User> users)
    {
        if (users.Count == 0) return;
        try
        {
            var userIds = users.Select(u => u.Id).ToList();
            var managerAssignments = await _db.UserManagers
                .Where(um => userIds.Contains(um.UserId))
                .Select(um => new { um.UserId, um.ManagerId })
                .ToListAsync();
            var byUser = managerAssignments.GroupBy(x => x.UserId).ToDictionary(g => g.Key, g => g.Select(x => x.ManagerId).ToList());
            foreach (var user in users)
            {
                user.ManagerIds = byUser.TryGetValue(user.Id, out var ids) ? ids : new List<int>();
            }
        }
        catch
        {
            // UserManagers table may not exist yet; leave ManagerIds empty
            foreach (var user in users)
                user.ManagerIds = new List<int>();
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { message = $"User with ID {id} not found" });
        }
        try
        {
            user.ManagerIds = await _db.UserManagers
                .Where(um => um.UserId == id)
                .Select(um => um.ManagerId)
                .ToListAsync();
        }
        catch
        {
            user.ManagerIds = new List<int>();
        }
        return Ok(user);
    }

    /// <summary>Set the list of managers for a user. Only users with Role Manager or Admin can be assigned.</summary>
    [HttpPut("{id}/managers")]
    public async Task<IActionResult> SetManagers(int id, [FromBody] SetManagersRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { message = $"User with ID {id} not found" });
        }
        var managerIds = request?.ManagerIds ?? new List<int>();
        managerIds = managerIds.Distinct().ToList();
        if (managerIds.Count > 0)
        {
            var validManagers = await _db.Users
                .Where(u => managerIds.Contains(u.Id) && (u.Role == "Manager" || u.Role == "Admin"))
                .Select(u => u.Id)
                .ToListAsync();
            var invalid = managerIds.Except(validManagers).ToList();
            if (invalid.Count > 0)
            {
                return BadRequest(new { message = "All manager IDs must be users with Role Manager or Admin.", invalidIds = invalid });
            }
            if (validManagers.Contains(id))
            {
                return BadRequest(new { message = "A user cannot be their own manager." });
            }
        }
        try
        {
            var existing = await _db.UserManagers.Where(um => um.UserId == id).ToListAsync();
            _db.UserManagers.RemoveRange(existing);
            foreach (var managerId in managerIds)
            {
                _db.UserManagers.Add(new UserManager { UserId = id, ManagerId = managerId });
            }
            await _db.SaveChangesAsync();
        }
        catch
        {
            // UserManagers table may not exist yet; return success with empty managers so the rest of the save (e.g. role change) is not blocked
            return Ok(new { managerIds = new List<int>(), warning = "Manager assignments could not be saved. Run the database migration (AddUserManagers) or Scripts/CreateUserManagersTable.sql to enable multiple managers." });
        }
        user.ManagerIds = managerIds;
        return Ok(new { managerIds = user.ManagerIds });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] User user)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
        {
            return BadRequest(new { message = "Email is required" });
        }

        // Check for duplicate email
        var existingUser = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == user.Email);
        if (existingUser != null)
        {
            return Conflict(new { message = "A user with this email already exists" });
        }

        // Validate role if provided; otherwise default to Employee
        var role = string.IsNullOrWhiteSpace(user.Role) ? "Employee" : user.Role.Trim();
        if (!AllowedRoles.Contains(role, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Role must be Employee, Manager, or Admin" });
        }
        user.Role = role;

        // Pay type classification
        var payType = string.IsNullOrWhiteSpace(user.PayType) ? "Salary" : user.PayType.Trim();
        if (!AllowedPayTypes.Contains(payType, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "PayType must be Salary or Hourly" });
        }

        // Enforce: Hourly => always NonExempt
        var exemptionStatus = string.Equals(payType, "Hourly", StringComparison.OrdinalIgnoreCase)
            ? "NonExempt"
            : (string.IsNullOrWhiteSpace(user.ExemptionStatus) ? "Exempt" : user.ExemptionStatus.Trim());

        if (!AllowedExemptionStatuses.Contains(exemptionStatus, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "ExemptionStatus must be Exempt or NonExempt" });
        }

        user.PayType = payType;
        user.ExemptionStatus = exemptionStatus;

        // Set default values
        user.Id = 0; // Let database generate ID
        user.IsActive = 1; // New users are active by default

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] User user)
    {
        if (id != user.Id)
        {
            return BadRequest(new { message = "ID mismatch" });
        }

        var existingUser = await _db.Users.FindAsync(id);
        if (existingUser == null)
        {
            return NotFound(new { message = $"User with ID {id} not found" });
        }

        // Check for duplicate email (excluding current user)
        if (!string.IsNullOrWhiteSpace(user.Email) && user.Email != existingUser.Email)
        {
            var duplicateEmail = await _db.Users
                .AnyAsync(u => u.Email == user.Email && u.Id != id);
            if (duplicateEmail)
            {
                return Conflict(new { message = "A user with this email already exists" });
            }
        }

        // Validate role
        var role = string.IsNullOrWhiteSpace(user.Role) ? existingUser.Role : user.Role.Trim();
        if (!AllowedRoles.Contains(role, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Role must be Employee, Manager, or Admin" });
        }

        // Update fields
        existingUser.LegacyEmployeeId = user.LegacyEmployeeId;
        existingUser.FirstName = user.FirstName;
        existingUser.LastName = user.LastName;
        existingUser.Email = user.Email;
        existingUser.Department = user.Department;
        existingUser.Category = user.Category;
        existingUser.ManagerName = user.ManagerName;
        existingUser.HireDate = user.HireDate;
        existingUser.TerminationDate = user.TerminationDate;
        existingUser.IsActive = user.IsActive;
        existingUser.Role = role;
        existingUser.IsWfh = user.IsWfh;
        existingUser.IsPartTime = user.IsPartTime;
        existingUser.IsIntern = user.IsIntern;

        // Pay type classification
        var payType = string.IsNullOrWhiteSpace(user.PayType) ? existingUser.PayType : user.PayType.Trim();
        if (!AllowedPayTypes.Contains(payType, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "PayType must be Salary or Hourly" });
        }

        // Enforce: Hourly => always NonExempt
        var exemptionStatus = string.Equals(payType, "Hourly", StringComparison.OrdinalIgnoreCase)
            ? "NonExempt"
            : (string.IsNullOrWhiteSpace(user.ExemptionStatus) ? existingUser.ExemptionStatus : user.ExemptionStatus.Trim());

        if (!AllowedExemptionStatuses.Contains(exemptionStatus, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "ExemptionStatus must be Exempt or NonExempt" });
        }

        existingUser.PayType = payType;
        existingUser.ExemptionStatus = exemptionStatus;

        await _db.SaveChangesAsync();

        return Ok(existingUser);
    }

    [HttpPatch("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { message = $"User with ID {id} not found" });
        }

        user.IsActive = 0;
        user.TerminationDate = DateTime.Now;

        await _db.SaveChangesAsync();

        return Ok(user);
    }

    [HttpPatch("{id}/activate")]
    public async Task<IActionResult> Activate(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { message = $"User with ID {id} not found" });
        }

        user.IsActive = 1;
        user.TerminationDate = null;

        await _db.SaveChangesAsync();

        return Ok(user);
    }

    [HttpPut("{id}/password")]
    public async Task<IActionResult> SetPassword(int id, [FromBody] SetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            return BadRequest(new { message = "Password must be at least 6 characters" });
        }

        var user = await _db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { message = $"User with ID {id} not found" });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { message = $"User with ID {id} not found" });
        }

        // Soft delete - just deactivate instead of hard delete
        user.IsActive = 0;
        user.TerminationDate = DateTime.Now;

        await _db.SaveChangesAsync();

        return NoContent();
    }
}
