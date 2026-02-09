# External Integrations

**Analysis Date:** 2026-02-08

## APIs & External Services

**Microsoft Graph API (Email):**
- Service: Microsoft Graph for delegated email sending
- What it's used for: Sending email notifications to employees and managers (PTO approvals, reminders, etc.)
- SDK/Client: Microsoft.Graph 5.68.0
- Auth: Azure AD app-only credentials (ClientSecretCredential)
- Implementation: `src/Server/Timesheets.Api/Services/AppEmailSender.cs`
- Configuration keys:
  - `Smtp:TenantId` - Azure AD tenant ID
  - `Smtp:ClientId` - Azure AD app registration client ID
  - `Smtp:ClientSecret` - Azure AD app registration secret (stored in secrets or environment)
  - `Smtp:UserName` - Mailbox address to send from (user principal name)
- Status: Enabled conditionally - requires config and SystemSettings.EmailNotificationsEnabled flag

**SMTP (Legacy/Fallback):**
- Service: SMTP server for email
- Configuration keys:
  - `Smtp:Host` - SMTP server hostname (e.g., smtp.office365.com)
  - `Smtp:Port` - SMTP port (default 587)
  - `Smtp:Password` - SMTP password
  - `Smtp:EnableSsl` - Enable TLS (default true)
  - `Smtp:UseOAuth2` - Enable OAuth2 authentication (for Office 365)
- Current implementation uses Graph API instead of raw SMTP

## Data Storage

**Databases:**
- Type: MySQL 8.0
- Provider: Pomelo.EntityFrameworkCore.MySql 9.0.0
- Connection env var: `ConnectionStrings:DefaultConnection`
- ORM Client: Entity Framework Core 9.0.0
- Database name: `afh_timesheets`

**File Storage:**
- Local filesystem only - No external file storage (S3, Azure Blob Storage, etc.)

**Caching:**
- In-memory cache (Microsoft.Extensions.Caching.Memory) - No external cache service (Redis, Memcached)

## Authentication & Identity

**Auth Provider:**
- Azure AD (for Graph API access)
  - Implementation: `src/Server/Timesheets.Api/Services/AppEmailSender.cs` uses `Azure.Identity.ClientSecretCredential`
  - Credential type: App-only (client credentials flow)
  - Scope: `https://graph.microsoft.com/.default`

**Application Authentication:**
- Custom/Demo authentication implemented via React Context (`src/Client/timesheets-web/src/auth/`)
- Current implementation is demo-only with hardcoded user "Nick Albano"
- Three roles: Employee, Manager, Admin
- No external OAuth provider (no auth0, Okta, etc.)

## Monitoring & Observability

**Error Tracking:**
- Not detected - Errors are logged but not sent to external service (no Sentry, DataDog, etc.)

**Logs:**
- Standard ASP.NET Core logging to console/file
- Configuration: `Logging:LogLevel` in appsettings.json
- Default level: Information with Warning for Microsoft.AspNetCore
- Frontend: Console logging only (no external service)

## CI/CD & Deployment

**Hosting:**
- Docker/Docker Compose for containerized deployment
- Infrastructure: self-hosted or cloud VM (not AWS/Azure/GCP managed service)
- Reverse proxy: Nginx
- SSL/TLS: Let's Encrypt (via Certbot)

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, Jenkins, etc. configured
- Manual deployment expected via `docker-compose up`

## Environment Configuration

**Required env vars (Backend - Production):**
- `ConnectionStrings__DefaultConnection` - MySQL connection string
- `Smtp__TenantId` - Azure AD tenant ID
- `Smtp__ClientId` - Azure AD app client ID
- `Smtp__ClientSecret` - Azure AD app secret
- `Smtp__UserName` - Sender mailbox address
- `MYSQL_ROOT_PASSWORD` - MySQL root password (for Docker Compose)
- `DOMAIN` - Domain name for Nginx SSL setup

**Optional env vars (Backend):**
- `ASPNETCORE_ENVIRONMENT` - Environment (Development/Production)
- `Smtp__Host` - SMTP server (overrides Graph API if configured)
- `Smtp__Port` - SMTP port
- `Smtp__EnableSsl` - Enable TLS

**Frontend env vars:**
- `VITE_API_BASE_URL` - Backend API base URL (defaults to `http://localhost:5150`)

**Secrets location:**
- Backend: User Secrets (development) with UserSecretsId `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
  - Access via `dotnet user-secrets` CLI
- Production: Environment variables or Docker Secrets (via docker-compose.yml)
- Frontend: `.env.local` file (not committed)

## Webhooks & Callbacks

**Incoming:**
- None detected - No webhook endpoints for external services

**Outgoing:**
- Email notifications via Microsoft Graph API (not true webhooks, but asynchronous calls)
  - Triggered by: PTO request decisions, system notifications
  - Destination: Employee and manager email addresses
  - Implementation: `AppEmailSender.SendAsync()` method

## API Communication

**Backend → Frontend:**
- REST API over HTTP/HTTPS
- Base URL: `http://localhost:5150` (development) or configured via `VITE_API_BASE_URL`
- CORS: Configured to allow origin(s) specified in `Cors:AllowedOrigins` (defaults to `http://localhost:5173` for Vite)
- Format: JSON
- Helper functions in `src/Client/timesheets-web/src/api.ts`: `getJson()`, `postJson()`, `putJson()`, `patchJson()`, `deleteJson()`

**Key endpoints (partial list from api.ts):**
- `GET /api/users` - Fetch all users
- `GET /api/users/{id}` - Fetch user by ID
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `PATCH /api/users/{id}/activate` - Activate user
- `PATCH /api/users/{id}/deactivate` - Deactivate user
- `GET /api/DailyTimeEntries?userId={id}&start={date}&end={date}` - Fetch time entries
- `PUT /api/DailyTimeEntries/bulk` - Bulk upsert time entries
- `GET /api/DailyTimeEntries/team?start={date}&end={date}` - Fetch team time entries
- `GET /api/DailyTimeEntries/summary?weekStart={date}` - Fetch weekly summary
- `GET /api/ptorequests` - Fetch PTO requests
- `POST /api/ptorequests` - Create PTO request
- `PATCH /api/ptorequests/{id}/approve?approvedBy={userId}` - Approve PTO request
- `PATCH /api/ptorequests/{id}/deny?deniedBy={userId}` - Deny PTO request
- `GET /api/holidays` - Fetch holidays
- `POST /api/holidays` - Create holiday
- `GET /api/notifications` - Fetch active notifications
- `GET /api/systemsettings` - Fetch system settings
- `PUT /api/systemsettings` - Update system settings
- See `src/Client/timesheets-web/src/api.ts` for complete endpoint definitions

## Documentation

**API Documentation:**
- Swagger/OpenAPI enabled in Development mode (`app.UseSwagger()` and `app.UseSwaggerUI()`)
- Accessible at: `http://localhost:5150/swagger` (development)
- Generated by Swashbuckle.AspNetCore 10.0.1

---

*Integration audit: 2026-02-08*
