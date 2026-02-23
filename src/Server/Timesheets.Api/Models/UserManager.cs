namespace TimeSheets.Api.Models;

/// <summary>
/// Junction entity: ManagerId is a manager of UserId (the employee).
/// A user can have multiple managers.
/// </summary>
public class UserManager
{
    public int UserId { get; set; }
    public int ManagerId { get; set; }

    [System.Text.Json.Serialization.JsonIgnore]
    public User? User { get; set; }
    [System.Text.Json.Serialization.JsonIgnore]
    public User? Manager { get; set; }
}
