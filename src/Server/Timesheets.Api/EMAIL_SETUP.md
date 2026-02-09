# Email sending setup

The API sends email for PTO notifications using **Microsoft Graph API** with client credentials (app-only) authentication.

The **From** address is the **System Email** configured in **Admin > System Settings > Company Information**. No separate sender config is needed — whatever address the admin sets in the UI is used directly.

---

## Microsoft 365 setup

### 1. Register an app in Azure

1. Go to [Azure Portal](https://portal.azure.com) > **Microsoft Entra ID** > **App registrations** > **New registration**.
2. Name it (e.g. "Timesheets SMTP"), choose **Accounts in this organizational directory only**, then **Register**.
3. On the app page, note:
   - **Application (client) ID**
   - **Directory (tenant) ID**
4. Go to **Certificates & secrets** > **New client secret** > add a description, choose expiry > **Add**. Copy the **Value** (client secret) immediately; it's shown only once.

### 2. Grant Mail.Send permission and admin consent

1. In the app, go to **API permissions** > **Add a permission**.
2. Choose **Microsoft Graph** > **Application permissions**.
3. Add **Mail.Send**.
4. Click **Grant admin consent for [your org]**.

### 3. Configure the API

Use **User Secrets** (development) or environment variables (production).

**Development (User Secrets):**

```bash
cd src/Server/Timesheets.Api

dotnet user-secrets set "Smtp:TenantId" "YOUR_TENANT_ID"
dotnet user-secrets set "Smtp:ClientId" "YOUR_CLIENT_ID"
dotnet user-secrets set "Smtp:ClientSecret" "YOUR_CLIENT_SECRET"
```

**Production (docker-compose):**

Set these in your `.env` file:

```
GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret
```

- **TenantId**: Directory (tenant) ID from Azure app registration.
- **ClientId**: Application (client) ID.
- **ClientSecret**: The client secret value from Certificates & secrets.

### 4. Set System Email in the app

In the timesheet app: **Admin > System Settings > Company Information > System Email** = the mailbox address to send from (e.g. `timesheets@yourcompany.com`).

The Azure app must have permission to send as this mailbox. With **Mail.Send** application permission and admin consent, this works for any mailbox in the tenant.

---

## Enable notifications

In **Admin > System Settings > Notifications**:

- **Enable Email Notifications**: Master switch.
- **Notify managers when employees submit PTO requests**
- **Notify employees when their PTO request is approved or denied**

---

## When email is sent

| Event | Recipients | Condition |
|-------|------------|-----------|
| PTO request created | All managers of the employee (from User Managers) | Notifications enabled + Notify managers |
| PTO request approved | Employee (user's Email) | Notifications enabled + Notify employee |
| PTO request denied | Employee (user's Email) | Same |

Managers and employees must have an **Email** set in their user record.

---

## Test

With the API running (Development), open:

```
http://localhost:5150/api/systemsettings/test-email?to=your@email.com
```

You should receive a test message from your System Email address.
