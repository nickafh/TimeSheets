namespace TimeSheets.Api.Models;

/// <summary>
/// Single-row system-wide settings. Id is always 1.
/// </summary>
public class SystemSettings
{
    public int Id { get; set; } = 1;

    // Company Info
    public string CompanyName { get; set; } = "";
    public string CompanyAddress { get; set; } = "";
    public string CompanyPhone { get; set; } = "";
    /// <summary>System/sender email for all outbound notifications (PTO, reminders, etc.).</summary>
    public string CompanyEmail { get; set; } = "";

    // Work Schedule
    public decimal StandardWorkHoursPerDay { get; set; } = 8;
    public int WorkWeekStartDay { get; set; } = 1; // 0 = Sunday, 1 = Monday
    public int FiscalYearStartMonth { get; set; } = 1; // 1-12

    // PTO Configuration
    public decimal DefaultPtoAllowance { get; set; } = 120; // hours
    public bool PtoAccrualEnabled { get; set; } = true;
    public decimal PtoAccrualRate { get; set; } = 4.62m; // hours per pay period
    public decimal MaxPtoCarryover { get; set; } = 40;

    // Tenure-based PTO tiers
    public int PtoTier1MaxYears { get; set; } = 5;
    public int PtoTier1AnnualDays { get; set; } = 18;
    public int PtoTier2MaxYears { get; set; } = 10;
    public int PtoTier2AnnualDays { get; set; } = 23;
    public int PtoTier3AnnualDays { get; set; } = 28;

    public bool RequirePtoApproval { get; set; } = true;
    public int MinAdvanceNoticeDays { get; set; } = 3;

    // Time Entry Rules
    public bool AllowFutureTimeEntries { get; set; } = false;
    public int MaxPastEditDays { get; set; } = 14;
    public bool RequireDailyTimeEntry { get; set; } = false;
    public bool LockEntriesAfterApproval { get; set; } = true;

    // Notifications
    public bool EmailNotificationsEnabled { get; set; } = true;
    public bool NotifyManagerOnPtoRequest { get; set; } = true;
    public bool NotifyEmployeeOnPtoDecision { get; set; } = true;
    public bool SendWeeklyReminders { get; set; } = true;
    public int ReminderDayOfWeek { get; set; } = 5; // Friday
}
