namespace TimeSheets.Api.Models;

public class DailyTimeEntry
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime WorkDate { get; set; }
    public decimal WorkedHours { get; set; }
    public decimal PtoHours { get; set; }
    public string DayType { get; set; } = "Work";
    public string? Notes { get; set; }
}