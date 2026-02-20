using Azure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Graph;
using TimeSheets.Api.Data;
using TimeSheets.Api.Models;
using TimeSheets.Api.Services;

namespace TimeSheets.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SystemSettingsController : ControllerBase
{
    private const int SettingsId = 1;
    private readonly TimeSheetsDbContext _db;
    private readonly IAppEmailSender _emailSender;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;

    public SystemSettingsController(TimeSheetsDbContext db, IAppEmailSender emailSender, IWebHostEnvironment env, IConfiguration config)
    {
        _db = db;
        _emailSender = emailSender;
        _env = env;
        _config = config;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        try
        {
            var settings = await _db.SystemSettings.FindAsync(SettingsId);
            if (settings == null)
            {
                settings = new SystemSettings { Id = SettingsId };
                _db.SystemSettings.Add(settings);
                await _db.SaveChangesAsync();
            }
            return Ok(settings);
        }
        catch
        {
            // Table may not exist yet; return defaults so the app still loads
            return Ok(new SystemSettings { Id = SettingsId });
        }
    }

    [HttpPut]
    public async Task<IActionResult> Put([FromBody] SystemSettings model)
    {
        try
        {
            var settings = await _db.SystemSettings.FindAsync(SettingsId);
            if (settings == null)
            {
                settings = new SystemSettings { Id = SettingsId };
                _db.SystemSettings.Add(settings);
                await _db.SaveChangesAsync();
            }

            settings.CompanyName = model.CompanyName ?? settings.CompanyName;
            settings.CompanyAddress = model.CompanyAddress ?? settings.CompanyAddress;
            settings.CompanyPhone = model.CompanyPhone ?? settings.CompanyPhone;
            settings.CompanyEmail = model.CompanyEmail ?? settings.CompanyEmail;
            settings.StandardWorkHoursPerDay = model.StandardWorkHoursPerDay;
            settings.WorkWeekStartDay = model.WorkWeekStartDay;
            settings.FiscalYearStartMonth = model.FiscalYearStartMonth;
            settings.DefaultPtoAllowance = model.DefaultPtoAllowance;
            settings.PtoAccrualEnabled = model.PtoAccrualEnabled;
            settings.PtoAccrualRate = model.PtoAccrualRate;
            settings.MaxPtoCarryover = model.MaxPtoCarryover;
            settings.RequirePtoApproval = model.RequirePtoApproval;
            settings.MinAdvanceNoticeDays = model.MinAdvanceNoticeDays;
            settings.AllowFutureTimeEntries = model.AllowFutureTimeEntries;
            settings.MaxPastEditDays = model.MaxPastEditDays;
            settings.RequireDailyTimeEntry = model.RequireDailyTimeEntry;
            settings.LockEntriesAfterApproval = model.LockEntriesAfterApproval;
            settings.EmailNotificationsEnabled = model.EmailNotificationsEnabled;
            settings.NotifyManagerOnPtoRequest = model.NotifyManagerOnPtoRequest;
            settings.NotifyEmployeeOnPtoDecision = model.NotifyEmployeeOnPtoDecision;
            settings.SendWeeklyReminders = model.SendWeeklyReminders;
            settings.ReminderDayOfWeek = model.ReminderDayOfWeek;

            // Keep PtoTypes(Id=1) "Paid Time Off" allowance in sync with
            // the system-level DefaultPtoAllowance so that the dashboard
            // balance calculation uses the admin-configured value.
            var ptoType1 = await _db.PtoTypes.FindAsync(1);
            if (ptoType1 != null)
            {
                ptoType1.AnnualAllowance = settings.DefaultPtoAllowance;
            }

            await _db.SaveChangesAsync();
            return Ok(settings);
        }
        catch
        {
            return StatusCode(503, new { message = "SystemSettings table may not exist. Run Scripts/CreateSystemSettingsTable.sql or add migration AddSystemSettings." });
        }
    }

    /// <summary>
    /// Sends a test email to the given address. Only available in Development.
    /// </summary>
    [HttpGet("test-email")]
    public async Task<IActionResult> TestEmail([FromQuery] string to, CancellationToken cancellationToken = default)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        if (string.IsNullOrWhiteSpace(to))
            return BadRequest(new { message = "Query parameter 'to' is required (e.g. ?to=you@example.com)" });

        try
        {
            await _emailSender.SendAsync(
                to.Trim(),
                "Timesheets – test email",
                "<p>This is a test email from your timesheet application. If you received this, Microsoft Graph API and System Email are configured correctly.</p>",
                isBodyHtml: true,
                cancellationToken);
            return Ok(new { message = "Test email sent to " + to });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to send test email", detail = ex.Message, inner = ex.InnerException?.Message });
        }
    }

    /// <summary>
    /// Diagnose Microsoft Graph API connectivity. Development only.
    /// </summary>
    [HttpGet("test-graph")]
    public async Task<IActionResult> TestGraph(CancellationToken cancellationToken = default)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        var settings = await _db.SystemSettings.FindAsync(new object[] { SettingsId }, cancellationToken);
        var senderEmail = settings?.CompanyEmail?.Trim();

        var tenantId = _config["Smtp:TenantId"]?.Trim();
        var clientId = _config["Smtp:ClientId"]?.Trim();
        var clientSecret = _config["Smtp:ClientSecret"]?.Trim();

        if (string.IsNullOrWhiteSpace(tenantId) || string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
        {
            return BadRequest(new
            {
                message = "Missing config",
                tenantId = string.IsNullOrWhiteSpace(tenantId) ? "MISSING" : "set",
                clientId = string.IsNullOrWhiteSpace(clientId) ? "MISSING" : "set",
                clientSecret = string.IsNullOrWhiteSpace(clientSecret) ? "MISSING" : "set",
                senderEmail = string.IsNullOrWhiteSpace(senderEmail) ? "MISSING (set in Admin > System Settings)" : senderEmail,
            });
        }

        if (string.IsNullOrWhiteSpace(senderEmail))
        {
            return BadRequest(new { message = "System Email not configured. Set it in Admin > System Settings > Company Information." });
        }

        try
        {
            var credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
            var graphClient = new GraphServiceClient(credential, new[] { "https://graph.microsoft.com/.default" });

            // Try to get the user/mailbox to verify access
            var user = await graphClient.Users[senderEmail].GetAsync(cancellationToken: cancellationToken);

            return Ok(new
            {
                message = "Microsoft Graph connection successful!",
                mailbox = senderEmail,
                displayName = user?.DisplayName,
                mail = user?.Mail,
                hint = "Graph API is working. Test sending email with /api/systemsettings/test-email?to=your@email.com"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Failed to connect to Microsoft Graph",
                exceptionType = ex.GetType().Name,
                detail = ex.Message,
                inner = ex.InnerException?.Message,
                hint = "Check Azure Portal: App registrations → your app → API permissions. Ensure Mail.Send (Application permission) is added and admin consent granted."
            });
        }
    }
}
