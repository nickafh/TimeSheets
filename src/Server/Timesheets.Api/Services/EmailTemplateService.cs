using System.Net;

namespace TimeSheets.Api.Services;

/// <summary>
/// Builds branded HTML email bodies with Outlook-compatible table-based layout.
/// All emails share a common branded wrapper (accent bar, logo area, content card, footer).
/// </summary>
public class EmailTemplateService
{
    private readonly string _frontendBaseUrl;

    public EmailTemplateService(IConfiguration config)
    {
        _frontendBaseUrl = config["App:FrontendUrl"] ?? "http://localhost:5173";
    }

    /// <summary>
    /// Wraps arbitrary body HTML in the branded email chrome:
    /// navy accent bar, text-based logo/branding, white content card, footer.
    /// </summary>
    public string WrapInBrandedTemplate(string preheaderText, string bodyContentHtml)
    {
        var encodedPreheader = WebUtility.HtmlEncode(preheaderText);

        return $@"<!DOCTYPE html>
<html xmlns=""http://www.w3.org/1999/xhtml"">
<head>
<meta http-equiv=""Content-Type"" content=""text/html; charset=utf-8"" />
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
<title>{encodedPreheader}</title>
</head>
<body style=""margin:0;padding:0;background-color:#F8F9FA;"">
<!-- Preheader text (hidden) -->
<div style=""display:none;max-height:0;overflow:hidden;"">{encodedPreheader}</div>
<!-- Full-width wrapper table -->
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""background-color:#F8F9FA;"">
<tr><td align=""center"" style=""padding:40px 20px;"">

    <!--[if mso]>
    <table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" border=""0"" align=""center"">
    <tr><td>
    <![endif]-->

    <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""width:100%;max-width:600px;"">

    <!-- Navy accent bar -->
    <tr><td style=""background-color:#002349;height:6px;font-size:0;line-height:0;"">&nbsp;</td></tr>

    <!-- Logo/branding area -->
    <tr><td style=""background-color:#ffffff;padding:28px 40px 0;"">
        <!-- Replace with <img> tag if hosted logo URL available -->
        <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" border=""0"">
        <tr><td style=""font-family:Georgia,'Times New Roman',Times,serif;font-size:20px;font-weight:bold;color:#002349;line-height:1.3;"">
            AFH TimeSheets
        </td></tr>
        <tr><td style=""font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#C29B40;text-transform:uppercase;letter-spacing:0.1em;padding-top:4px;"">
            Atlanta Fine Homes Sotheby&#39;s International Realty
        </td></tr>
        </table>
    </td></tr>

    <!-- White content card -->
    <tr><td style=""background-color:#ffffff;padding:32px 40px;"">
        {bodyContentHtml}
    </td></tr>

    <!-- Footer -->
    <tr><td style=""padding:24px 40px;text-align:center;"">
        <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"">
        <tr><td style=""font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;text-align:center;"">
            AFH TimeSheets &bull; Atlanta Fine Homes Sotheby&#39;s International Realty
        </td></tr>
        <tr><td style=""font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#bbbbbb;text-align:center;padding-top:8px;"">
            This is an automated notification. Please do not reply to this email.
        </td></tr>
        </table>
    </td></tr>

    </table>

    <!--[if mso]>
    </td></tr>
    </table>
    <![endif]-->

</td></tr>
</table>
</body>
</html>";
    }

    /// <summary>
    /// Builds a bulletproof CTA button using the table-cell pattern for Outlook compatibility.
    /// </summary>
    public string BuildCtaButton(string text, string url, string bgColor = "#002349")
    {
        var encodedUrl = WebUtility.HtmlEncode(url);
        var encodedText = WebUtility.HtmlEncode(text);

        return $@"<table role=""presentation"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin:24px 0;"">
<tr>
    <td align=""center"" bgcolor=""{bgColor}"" style=""background-color:{bgColor};border-radius:2px;"">
        <!--[if mso]>
        <v:roundrect xmlns:v=""urn:schemas-microsoft-com:vml""
                     xmlns:w=""urn:schemas-microsoft-com:office:word""
                     href=""{encodedUrl}""
                     style=""height:48px;v-text-anchor:middle;width:220px;""
                     arcsize=""4%"" fillcolor=""{bgColor}"" strokecolor=""{bgColor}"">
        <w:anchorlock/>
        <center style=""color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.1em;"">
            {encodedText}
        </center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href=""{encodedUrl}"" target=""_blank""
           style=""display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;text-transform:uppercase;letter-spacing:0.1em;"">
            {encodedText}
        </a>
        <!--<![endif]-->
    </td>
</tr>
</table>";
    }

    /// <summary>
    /// Builds an inline status badge span (green for approved, red for denied).
    /// </summary>
    public string BuildStatusBadge(string statusText, bool isApproved)
    {
        var bg = isApproved ? "#ecfdf5" : "#fef2f2";
        var color = isApproved ? "#059669" : "#dc2626";
        var encodedText = WebUtility.HtmlEncode(statusText);

        return $@"<span style=""display:inline-block;padding:4px 12px;background-color:{bg};color:{color};font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;"">{encodedText}</span>";
    }

    /// <summary>
    /// Builds a table-based detail card with label/value rows.
    /// </summary>
    public string BuildDetailCard(params (string Label, string Value)[] rows)
    {
        var sb = new System.Text.StringBuilder();
        sb.Append(@"<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""background-color:#F8F9FA;border:1px solid #e1e7ef;margin-bottom:8px;"">");

        for (var i = 0; i < rows.Length; i++)
        {
            var isLast = i == rows.Length - 1;
            var borderStyle = isLast ? "" : "border-bottom:1px solid #e1e7ef;";

            sb.Append($@"<tr>
    <td style=""padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#666666;{borderStyle}"">
        <strong style=""color:#002349;"">{WebUtility.HtmlEncode(rows[i].Label)}</strong>
    </td>
    <td style=""padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1f2933;text-align:right;{borderStyle}"">
        {rows[i].Value}
    </td>
</tr>");
        }

        sb.Append("</table>");
        return sb.ToString();
    }

    /// <summary>
    /// Builds the "PTO submitted" email sent to the manager(s).
    /// </summary>
    public string BuildPtoSubmittedEmail(string managerFirstName, string employeeName, string dateRange, decimal hours, string ptoTypeName, int requestId)
    {
        var encodedManager = WebUtility.HtmlEncode(managerFirstName);
        var encodedEmployee = WebUtility.HtmlEncode(employeeName);
        var encodedDateRange = WebUtility.HtmlEncode(dateRange);
        var encodedPtoType = WebUtility.HtmlEncode(ptoTypeName);

        var content = $@"<p style=""font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2933;margin:0 0 16px;"">
    Hi {encodedManager},
</p>
<p style=""font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2933;margin:0 0 24px;"">
    <strong>{encodedEmployee}</strong> has submitted a new time-off request and it needs your review.
</p>
{BuildDetailCard(
    ("Type", encodedPtoType),
    ("Dates", encodedDateRange),
    ("Hours", hours.ToString())
)}
{BuildCtaButton("Review Request", $"{_frontendBaseUrl}/manager/approve-pto", "#002349")}";

        return WrapInBrandedTemplate($"{employeeName} submitted a time-off request", content);
    }

    /// <summary>
    /// Builds the "PTO approved" email sent to the employee.
    /// </summary>
    public string BuildPtoApprovedEmail(string employeeFirstName, string dateRange, decimal hours, string ptoTypeName, int requestId)
    {
        var encodedFirstName = WebUtility.HtmlEncode(employeeFirstName);
        var encodedDateRange = WebUtility.HtmlEncode(dateRange);
        var encodedPtoType = WebUtility.HtmlEncode(ptoTypeName);
        var badge = BuildStatusBadge("Approved", true);

        var content = $@"<p style=""font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2933;margin:0 0 16px;"">
    Hi {encodedFirstName},
</p>
<p style=""font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2933;margin:0 0 24px;"">
    Great news! Your time-off request has been approved. {badge}
</p>
{BuildDetailCard(
    ("Type", encodedPtoType),
    ("Dates", encodedDateRange),
    ("Hours", hours.ToString()),
    ("Status", badge)
)}
{BuildCtaButton("View Request", $"{_frontendBaseUrl}/timeoff/requests", "#C29B40")}";

        return WrapInBrandedTemplate("Your PTO has been approved", content);
    }

    /// <summary>
    /// Builds the "PTO denied" email sent to the employee.
    /// </summary>
    public string BuildPtoDeniedEmail(string employeeFirstName, string dateRange, decimal hours, string ptoTypeName, string? denyReason, int requestId)
    {
        var encodedFirstName = WebUtility.HtmlEncode(employeeFirstName);
        var encodedDateRange = WebUtility.HtmlEncode(dateRange);
        var encodedPtoType = WebUtility.HtmlEncode(ptoTypeName);
        var badge = BuildStatusBadge("Denied", false);

        var content = $@"<p style=""font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2933;margin:0 0 16px;"">
    Hi {encodedFirstName},
</p>
<p style=""font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2933;margin:0 0 24px;"">
    Your time-off request has been reviewed and was not approved at this time. {badge}
</p>
{BuildDetailCard(
    ("Type", encodedPtoType),
    ("Dates", encodedDateRange),
    ("Hours", hours.ToString()),
    ("Status", badge)
)}";

        // Add denial reason section if provided
        if (!string.IsNullOrWhiteSpace(denyReason))
        {
            content += $@"
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0"" style=""margin:16px 0;border-left:4px solid #C29B40;background-color:#F8F9FA;"">
<tr><td style=""padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1f2933;"">
    <strong style=""color:#002349;"">Reason</strong><br />
    {WebUtility.HtmlEncode(denyReason)}
</td></tr>
</table>";
        }

        content += BuildCtaButton("View Request", $"{_frontendBaseUrl}/timeoff/requests", "#002349");

        return WrapInBrandedTemplate("Your PTO request was denied", content);
    }

    /// <summary>
    /// Builds the system test email.
    /// </summary>
    public string BuildTestEmail()
    {
        var content = $@"<p style=""font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2933;margin:0 0 16px;"">
    Hi there,
</p>
<p style=""font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2933;margin:0 0 24px;"">
    This is a test email from AFH TimeSheets. If you're reading this, your email configuration is working correctly.
</p>
{BuildDetailCard(
    ("System", "Microsoft Graph API"),
    ("Status", "Connected")
)}
{BuildCtaButton("Open TimeSheets", _frontendBaseUrl, "#002349")}";

        return WrapInBrandedTemplate("Test email from AFH TimeSheets", content);
    }
}
