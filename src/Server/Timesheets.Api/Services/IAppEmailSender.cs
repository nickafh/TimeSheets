namespace TimeSheets.Api.Services;

/// <summary>
/// Sends email using SMTP with the system email (from System Settings) as the sender.
/// Only sends when email notifications are enabled and SMTP is configured.
/// </summary>
public interface IAppEmailSender
{
    /// <summary>
    /// Sends an email to the given address. From address is taken from System Settings (System Email).
    /// No-op if email notifications are disabled, system email is empty, or SMTP is not configured.
    /// </summary>
    Task SendAsync(string toEmail, string subject, string body, bool isBodyHtml = true, CancellationToken cancellationToken = default);
}
