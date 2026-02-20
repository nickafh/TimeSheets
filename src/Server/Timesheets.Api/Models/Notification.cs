namespace TimeSheets.Api.Models;

public class Notification
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public sbyte IsActive { get; set; } = 1;
    public int CreatedByUserId { get; set; }

    public User CreatedByUser { get; set; } = null!;
}
