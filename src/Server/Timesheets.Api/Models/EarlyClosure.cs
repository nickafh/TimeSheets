namespace TimeSheets.Api.Models;

public class EarlyClosure
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime ClosureDate { get; set; }
    public string CloseTime { get; set; } = string.Empty; // e.g., "2:00 PM"
}
