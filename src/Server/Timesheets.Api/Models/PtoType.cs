namespace TimeSheets.Api.Models;

public class PtoType
{
    public int Id { get; set; }
    public int? LegacyTimeTypeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsSelectable { get; set; }
    public bool CreateYearRecord { get; set; }
}