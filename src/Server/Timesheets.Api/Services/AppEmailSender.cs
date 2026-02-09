using Azure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Graph;
using Microsoft.Graph.Models;
using Microsoft.Graph.Users.Item.SendMail;
using TimeSheets.Api.Data;
using TimeSheets.Api.Models;

namespace TimeSheets.Api.Services;

/// <summary>
/// Sends email via Microsoft Graph API using the system email (System Settings) as the From address.
/// Uses client credentials (app-only) authentication with Azure AD.
/// </summary>
public class AppEmailSender : IAppEmailSender
{
    private const int SettingsId = 1;
    private readonly TimeSheetsDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AppEmailSender> _logger;

    public AppEmailSender(TimeSheetsDbContext db, IConfiguration config, ILogger<AppEmailSender> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(string toEmail, string subject, string body, bool isBodyHtml = true, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
            return;

        SystemSettings? settings = null;
        try
        {
            settings = await _db.SystemSettings.FindAsync(new object[] { SettingsId }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "SystemSettings not available; skipping email send");
            return;
        }

        if (settings == null || !settings.EmailNotificationsEnabled || string.IsNullOrWhiteSpace(settings.CompanyEmail))
            return;

        var tenantId = _config["Smtp:TenantId"]?.Trim();
        var clientId = _config["Smtp:ClientId"]?.Trim();
        var clientSecret = _config["Smtp:ClientSecret"]?.Trim();

        if (string.IsNullOrWhiteSpace(tenantId) || string.IsNullOrWhiteSpace(clientId) ||
            string.IsNullOrWhiteSpace(clientSecret))
        {
            _logger.LogDebug("Graph API credentials not configured (TenantId, ClientId, or ClientSecret missing); skipping email send");
            return;
        }

        var senderEmail = settings.CompanyEmail.Trim();

        try
        {
            var credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
            var graphClient = new GraphServiceClient(credential, new[] { "https://graph.microsoft.com/.default" });

            var message = new Message
            {
                Subject = subject,
                Body = new ItemBody
                {
                    ContentType = isBodyHtml ? BodyType.Html : BodyType.Text,
                    Content = body
                },
                ToRecipients = new List<Recipient>
                {
                    new Recipient
                    {
                        EmailAddress = new EmailAddress { Address = toEmail.Trim() }
                    }
                }
            };

            var sendMailRequest = new SendMailPostRequestBody
            {
                Message = message,
                SaveToSentItems = false
            };

            await graphClient.Users[senderEmail].SendMail.PostAsync(sendMailRequest, cancellationToken: cancellationToken);

            _logger.LogInformation("Email sent via Graph API to {To} re: {Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send email via Graph API to {To} re: {Subject}", toEmail, subject);
            throw;
        }
    }
}
