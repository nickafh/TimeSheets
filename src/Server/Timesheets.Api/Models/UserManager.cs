namespace TimeSheets.Api.Models;

/// <summary>
/// Junction entity: ManagerId is a manager of UserId (the employee).
/// A user can have multiple managers.
/// </summary>
public class UserManager
{
    public int UserId { get; set; }
    public int ManagerId { get; set; }

    public User User { get; set; } = null!;
    public User Manager { get; set; } = null!;
}
