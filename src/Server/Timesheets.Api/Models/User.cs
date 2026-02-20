using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace TimeSheets.Api.Models;

public class User
{
    public int Id { get; set; }
    public int? LegacyEmployeeId { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Department { get; set; }
    public string? Category { get; set; }
        public string? ManagerName { get; set; }
    public DateTime? HireDate { get; set; }
    public DateTime? TerminationDate { get; set; }
    public sbyte IsActive { get; set; }
    public sbyte IsWfh { get; set; }
    public sbyte IsPartTime { get; set; }
    public sbyte IsIntern { get; set; }
    public string Role { get; set; } = "Employee"; // Employee, Manager, Admin
    public string PayType { get; set; } = "Salary"; // Salary, Hourly
    public string ExemptionStatus { get; set; } = "Exempt"; // Exempt, NonExempt

    [JsonIgnore]
    public string? PasswordHash { get; set; }

    /// <summary>Unguessable token for anonymous calendar feed access.</summary>
    [JsonIgnore]
    public string? CalendarToken { get; set; }

    /// <summary>IDs of users who are managers of this user. Not mapped to DB; populated from UserManagers.</summary>
    [NotMapped]
    public List<int> ManagerIds { get; set; } = new();
}