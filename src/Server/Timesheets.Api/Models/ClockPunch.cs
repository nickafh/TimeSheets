namespace TimeSheets.Api.Models;

public class ClockPunch
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime PunchDate { get; set; }       // DATE only - the work day this punch belongs to
    public DateTime PunchTime { get; set; }        // Full UTC timestamp
    public string PunchType { get; set; } = "";    // ClockIn, LunchOut, LunchIn, ClockOut
    public string Status { get; set; } = "Active"; // Active, NeedsAttention, Voided

    // Audit trail for corrections
    public DateTime? OriginalPunchTime { get; set; }  // Set when a manager corrects the punch
    public int? CorrectedByUserId { get; set; }       // FK to Users - who corrected
    public DateTime? CorrectedAt { get; set; }        // When corrected

    [System.Text.Json.Serialization.JsonIgnore]
    public User? User { get; set; }
}
