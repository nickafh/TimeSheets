namespace TimeSheets.Api.Models;

public class PtoRequest
{
    public int Id { get; set; }
    public int? LegacyRequestId { get; set; }
    public int UserId { get; set; }
    public DateTime DateOfLeave { get; set; }
    /// <summary>If set, this request spans multiple days (DateOfLeave through EndDate).</summary>
    public DateTime? EndDate { get; set; }
    public decimal Hours { get; set; }
    public string? Reason { get; set; }
    public int PtoTypeId { get; set; }
    public DateTime RequestedAt { get; set; }
    public sbyte Status { get; set; }
    public DateTime? ApprovedDeniedAt { get; set; }
    public int? ApprovedDeniedBy { get; set; }
    public string? DenyReason { get; set; }

    public User User { get; set; } = null!;
    public PtoType PtoType { get; set; } = null!;
    public User? ApproverUser { get; set; }
}