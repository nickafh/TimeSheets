-- Run this script to create the SystemSettings table (single row for app-wide settings).
-- If you use EF migrations: dotnet ef migrations add AddSystemSettings && dotnet ef database update

CREATE TABLE IF NOT EXISTS SystemSettings (
    Id INT NOT NULL PRIMARY KEY,
    CompanyName VARCHAR(255) NOT NULL DEFAULT '',
    CompanyAddress VARCHAR(500) NOT NULL DEFAULT '',
    CompanyPhone VARCHAR(50) NOT NULL DEFAULT '',
    CompanyEmail VARCHAR(255) NOT NULL DEFAULT '',
    StandardWorkHoursPerDay DECIMAL(10,2) NOT NULL DEFAULT 8,
    WorkWeekStartDay INT NOT NULL DEFAULT 1,
    FiscalYearStartMonth INT NOT NULL DEFAULT 1,
    DefaultPtoAllowance DECIMAL(10,2) NOT NULL DEFAULT 120,
    PtoAccrualEnabled TINYINT(1) NOT NULL DEFAULT 1,
    PtoAccrualRate DECIMAL(10,2) NOT NULL DEFAULT 4.62,
    MaxPtoCarryover DECIMAL(10,2) NOT NULL DEFAULT 40,
    RequirePtoApproval TINYINT(1) NOT NULL DEFAULT 1,
    MinAdvanceNoticeDays INT NOT NULL DEFAULT 3,
    AllowFutureTimeEntries TINYINT(1) NOT NULL DEFAULT 0,
    MaxPastEditDays INT NOT NULL DEFAULT 14,
    RequireDailyTimeEntry TINYINT(1) NOT NULL DEFAULT 0,
    LockEntriesAfterApproval TINYINT(1) NOT NULL DEFAULT 1,
    EmailNotificationsEnabled TINYINT(1) NOT NULL DEFAULT 1,
    NotifyManagerOnPtoRequest TINYINT(1) NOT NULL DEFAULT 1,
    NotifyEmployeeOnPtoDecision TINYINT(1) NOT NULL DEFAULT 1,
    SendWeeklyReminders TINYINT(1) NOT NULL DEFAULT 1,
    ReminderDayOfWeek INT NOT NULL DEFAULT 5
);

INSERT IGNORE INTO SystemSettings (Id, CompanyName, CompanyAddress, CompanyPhone, CompanyEmail,
    StandardWorkHoursPerDay, WorkWeekStartDay, FiscalYearStartMonth,
    DefaultPtoAllowance, PtoAccrualEnabled, PtoAccrualRate, MaxPtoCarryover,
    RequirePtoApproval, MinAdvanceNoticeDays, AllowFutureTimeEntries, MaxPastEditDays,
    RequireDailyTimeEntry, LockEntriesAfterApproval, EmailNotificationsEnabled,
    NotifyManagerOnPtoRequest, NotifyEmployeeOnPtoDecision, SendWeeklyReminders, ReminderDayOfWeek)
VALUES (1,
    'Atlanta Fine Homes Sotheby''s International Realty',
    '3290 Northside Parkway NW, Suite 200, Atlanta, GA 30327',
    '(404) 237-5000', 'hr@atlantafinehomes.com',
    8, 1, 1, 120, 1, 4.62, 40, 1, 3, 0, 14, 0, 1, 1, 1, 1, 1, 5);
