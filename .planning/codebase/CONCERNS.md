# Codebase Concerns

**Analysis Date:** 2026-02-08

## Security Concerns

**Authentication is Demo-Only:**
- Issue: Frontend uses hardcoded demo authentication with `useAuth` hook returning fixed user "Nick Albano" (ID 1) with selectable roles
- Files: `src/Client/timesheets-web/src/auth/useAuth.tsx`, `src/App.tsx`
- Impact: No real authentication mechanism. Any user can assume any role by changing the role parameter to `loginAsDemo()`. Entire role-based access control (Manager/Admin routes) is frontend-only and can be bypassed by modifying browser state.
- Fix approach: Implement real authentication (Azure AD, OAuth2, JWT tokens). Backend must validate user identity and roles on every request. Remove `loginAsDemo()` pattern.

**No Backend Authorization:**
- Issue: Backend controllers lack any authentication/authorization checks. APIs are open to any request.
- Files: `src/Server/Timesheets.Api/Controllers/` (all controllers), `src/Server/Timesheets.Api/Program.cs`
- Impact: Anyone with network access to API can call any endpoint and modify any user's data, approve/deny PTO requests, modify system settings without verification of user identity or permissions.
- Fix approach: Add `[Authorize]` attributes, JWT bearer token validation, and role-based authorization (`[Authorize(Roles = "Admin")]`) to all controllers. Implement proper authentication middleware in `Program.cs`.

**No Input Validation on Email Sending:**
- Issue: PTO request emails send HTML body without sanitization. User-provided `denyReason` in PTO denial is HTML-encoded but other fields (employee name, date range) are not validated.
- Files: `src/Server/Timesheets.Api/Controllers/PtoRequestsController.cs` lines 286-287, 311-356
- Impact: Potential for injection attacks if employee names or other fields contain malicious HTML/script content. Low current risk due to HTML encoding in one place, but inconsistent.
- Fix approach: Sanitize all HTML email content. Use structured email templates. Validate employee names and other user-facing data server-side before rendering in emails.

**Graph API Credentials in Configuration:**
- Issue: Azure credentials (`TenantId`, `ClientId`, `ClientSecret`) stored in config files
- Files: `src/Server/Timesheets.Api/Services/AppEmailSender.cs` lines 48-54
- Impact: If configuration files are accidentally committed or exposed, Graph API credentials leak. Already has defensive code (returns silently if missing), but risk remains.
- Fix approach: Enforce use of Azure Key Vault or user secrets. Document that credentials must never be in version control. Add pre-commit hooks to prevent accidental commits.

## Testing Coverage Gaps

**No Backend Unit Tests:**
- Issue: Zero unit test files found in backend project
- Files: `src/Server/Timesheets.Api/` - no `*.Tests.cs` or `Tests/` directory
- Impact: Controllers, business logic, and data access layer are untested. Regressions during changes go undetected. Email sending, PTO validation, and user management logic have no automated verification.
- Priority: High
- Fix approach: Create `Timesheets.Api.Tests` project with xUnit tests for controllers, validators, and email service. Aim for >80% coverage of critical paths (PTO approval, time entry save, user management).

**Limited Frontend E2E Tests:**
- Issue: Only 3 Playwright test files present; coverage appears focused on WeeklyTimeEntries page
- Files: `src/Client/timesheets-web/tests/` (only 3 test files)
- Impact: Most pages and features (Dashboard, TimeOffSummary, ManagerDashboard, AdminDashboard, ManageUsers, SystemSettings, etc.) lack automated testing. UI regressions and integration failures go undetected.
- Priority: High
- Fix approach: Expand Playwright tests to cover all major user flows: login, view time entries, submit PTO request, approve PTO (manager), manage users (admin), system settings. Aim for critical path coverage first.

**No API Integration Tests:**
- Issue: Frontend makes API calls but no tests verify backend response contracts
- Files: `src/Client/timesheets-web/src/api.ts` - API client not tested against real/mock backend
- Impact: Frontend assumes API responses match DTOs. Breaking changes on backend aren't caught until manual testing or production.
- Fix approach: Add integration tests in Playwright that hit real backend (or mock server) and verify response structure matches TypeScript interfaces.

## Tech Debt & Code Quality

**Catch-All Exception Handlers:**
- Issue: Multiple controllers and services swallow exceptions with bare `catch` blocks
- Files: `src/Server/Timesheets.Api/Controllers/UsersController.cs` lines 74-78 (UserManagers table migration fallback), `src/Server/Timesheets.Api/Controllers/PtoRequestsController.cs` lines 139-147, 302-305, 330-333 (email notification failures)
- Impact: Errors are hidden; makes debugging difficult. Email failures silently fail without clear logging of root cause.
- Fix approach: Log exceptions with full context before returning graceful fallbacks. Use `_logger.LogError()` or `_logger.LogWarning()` before swallowing exceptions.

**Bare Try-Catch for Migration Compatibility:**
- Issue: Code tries to access `UserManagers` table and catches all exceptions if table doesn't exist (migration not run)
- Files: `src/Server/Timesheets.Api/Controllers/UsersController.cs` lines 61-79, 90-100
- Impact: Hides real errors (permission denied, connection issues) behind "table doesn't exist" assumption. Makes production debugging harder.
- Fix approach: Check migrations were applied at startup in `Program.cs`. Use EF Core migrations tracking table to verify schema version. Throw specific exception if critical tables missing.

**Hardcoded PTO Type Mappings:**
- Issue: PTO type IDs (1=PaidTimeOff, 2=JuryDuty, etc.) hardcoded in frontend
- Files: `src/Client/timesheets-web/src/api.ts` lines 452-458
- Impact: Frontend and backend must stay in sync on these IDs. Adding new PTO type requires code change in multiple places. Type names are not fetched from backend.
- Fix approach: Fetch PTO types from `/api/ptotypes` endpoint and dynamically build mapping. Remove hardcoded type IDs.

**Demo User Hardcoded:**
- Issue: Frontend authentication hardcodes user ID 1 as "Nick Albano"
- Files: `src/Client/timesheets-web/src/auth/useAuth.tsx` line 28
- Impact: All local testing uses same user ID. Cannot easily test multi-user scenarios locally.
- Fix approach: Remove hardcoded demo user. Implement real auth flow. For local testing, create flexible demo mode that accepts any user ID from login page.

**No Database Constraints for Business Logic:**
- Issue: `DailyTimeEntry` model has no constraints on `WorkedHours`, `PtoHours`, or `DayType` values. API accepts any numeric value or invalid day type strings.
- Files: `src/Server/Timesheets.Api/Models/DailyTimeEntry.cs`
- Impact: Invalid data can be saved (negative hours, impossible combinations). Frontend validation is bypassed if API is called directly. Database represents invalid state.
- Fix approach: Add model validation (ranges, enums). Use data annotations or FluentValidation. Validate in both API and database (check constraints).

**Missing Async/Await Handling in Frontend:**
- Issue: API client functions use `async/await` but error handling in components uses loose `any` type casting
- Files: `src/Client/timesheets-web/src/pages/TimeEntries.tsx` lines 138-139, 193-194
- Impact: Type safety lost for errors. Network errors, parsing errors, and API errors all treated the same way.
- Fix approach: Create error response wrapper. Parse error object types. Handle specific error cases (401 Unauthorized, 422 Validation, 500 Server Error) differently.

## Performance Bottlenecks

**Bulk Time Entry Save with N+1 Risk:**
- Issue: `DailyTimeEntriesController.SaveBulk()` loops through entries and queries for existing entry one by one
- Files: `src/Server/Timesheets.Api/Controllers/DailyTimeEntriesController.cs` lines 33-48
- Impact: For 20 time entries, makes 20+ database queries. Scales poorly as number of entries increases.
- Improvement path: Load all existing entries for the user+date range in one query. Use `Dictionary<(userId, date), entry>` for O(1) lookup. Single database round trip.

**Team Time Entries Join Without Filtering:**
- Issue: `GetTeamEntries()` joins DailyTimeEntries with Users without index awareness
- Files: `src/Server/Timesheets.Api/Controllers/DailyTimeEntriesController.cs` lines 57-81
- Impact: For large datasets (thousands of entries), join is inefficient. No filtering on user ID or department.
- Improvement path: Add query parameters to filter by department/team. Index on `WorkDate` and `UserId`. Consider pagination for large result sets.

**No Pagination on List Endpoints:**
- Issue: `fetchUsers()`, `fetchAllPtoRequests()`, `fetchPtoHistory()` return all records without pagination
- Files: `src/Client/timesheets-web/src/api.ts` lines 134, 304-314
- Impact: With 1000+ users or PTO requests, API returns large response. Frontend loads entire list into memory. Slow network transfers.
- Improvement path: Add `limit` and `offset` query parameters. Implement cursor-based pagination. Frontend should load on-scroll or lazy load.

**Email Sending Blocks Request:**
- Issue: PTO approval/denial sends email in request handler without fire-and-forget
- Files: `src/Server/Timesheets.Api/Controllers/PtoRequestsController.cs` lines 97, 240, 265
- Impact: If email service is slow (3+ seconds), user waits for response. Email failure causes request to fail or log warning in async scope.
- Improvement path: Move email sending to background queue (Hangfire, Azure Service Bus). Return response immediately. Send email asynchronously with retry logic.

## Fragile Areas

**Migration-Dependent Code:**
- Files: `src/Server/Timesheets.Api/Controllers/UsersController.cs` (UserManagers table), `src/Server/Timesheets.Api/Controllers/PtoRequestsController.cs` (EndDate column)
- Why fragile: Code assumes database schema may not include new columns or tables. Uses try-catch to fall back. Makes codebase hard to reason about—unclear whether feature is available or in progress.
- Safe modification: Enforce all migrations run at startup. Remove try-catch fallbacks. Add database initialization check in health check endpoint.
- Test coverage: Zero tests for migration scenarios. No verification that app works with/without migrations applied.

**PTO Request Deduplication Logic:**
- Files: `src/Server/Timesheets.Api/Controllers/PtoRequestsController.cs` lines 131-135
- Why fragile: Deduplication groups by `(UserName, DateOfLeave, EndDate, Department)` but not by PtoRequest ID. If two identical requests exist, one is silently dropped. Unclear why deduplication is needed if database enforces uniqueness.
- Safe modification: Remove deduplication and add unique constraint to database. If deduplication is intentional, document why and test it explicitly.

**Demo Authentication Flow:**
- Files: `src/Client/timesheets-web/src/auth/useAuth.tsx`, `src/Client/timesheets-web/src/pages/Login.tsx`
- Why fragile: Replacing with real auth requires changes to Auth context, all components using `useAuth`, and API client. High risk of breaking role checks or protected routes during migration.
- Safe modification: Parallel implementation—add real auth code alongside demo code. Feature-flag between them. Test both paths before removing demo.

## Scaling Limits

**Single Settings Record Architecture:**
- Issue: System settings stored as single row in database (ID=1)
- Files: `src/Server/Timesheets.Api/Services/AppEmailSender.cs` line 17, `src/Server/Timesheets.Api/Data/TimeSheetsDbContext.cs`
- Current capacity: One set of global settings. Cannot support multi-tenant or per-department settings.
- Scaling path: Refactor to settings key-value store or per-tenant settings table if multi-tenant is planned.

**In-Memory HttpClient Not Pooled:**
- Issue: `Program.cs` registers HttpClient with `AddHttpClient()` without explicit pooling configuration
- Files: `src/Server/Timesheets.Api/Program.cs` line 11
- Current capacity: Will work for moderate load; may leak sockets under high concurrency
- Scaling path: Use named/typed HttpClient factories. Monitor socket exhaustion in load tests.

**No Database Connection Pooling Configuration:**
- Issue: Pomelo MySQL provider uses default connection pool (likely 5-10 connections)
- Files: `src/Server/Timesheets.Api/Program.cs` line 32
- Current capacity: Sufficient for <50 concurrent requests. Beyond that, connection starvation occurs.
- Scaling path: Configure `MaxPoolSize` in connection string. Monitor active connections in production. Scale to read replicas if reporting queries dominate.

## Missing Critical Features

**No Audit Logging:**
- Problem: No tracking of who changed what or when in time entries, PTO requests, or user data
- Blocks: Compliance, forensics, user dispute resolution
- Example: If a manager changes an employee's time entry, there's no record of the change or reason.

**No Soft Deletes for PTO Requests:**
- Problem: Deleting a PTO request removes it from database. No history or undo capability.
- Blocks: Audit trail, accidental deletion recovery

**No Email Retries:**
- Problem: If email send fails, it fails silently. No retry mechanism for transient failures.
- Blocks: Reliability of notifications

**No Session Timeout:**
- Problem: Frontend session never expires. User stays logged in indefinitely (in demo auth).
- Blocks: Security best practices

**No Activity Logging:**
- Problem: API has no request logging. Cannot track user actions or debug issues without manually checking database.
- Blocks: Troubleshooting, audit trail, security incident response

## Dependencies at Risk

**Entity Framework Core 9.0 with .NET 8.0 Target:**
- Risk: Version mismatch. Target framework is `net8.0` but EF Core 9.0.0 is installed
- Files: `src/Server/Timesheets.Api/Timesheets.Api.csproj` lines 4, 12
- Impact: Potential compatibility issues. EF 9.0 may have breaking changes from 8.0.
- Migration plan: Update target framework to `net10.0` (mentioned in CLAUDE.md as intended). Or downgrade EF Core to 8.x.

**Azure SDK Dependency:**
- Risk: Azure.Identity 1.13.1 is dependency for Graph API. If Azure service is down, email functionality fails silently.
- Files: `src/Server/Timesheets.Api/Services/AppEmailSender.cs`
- Impact: Email notifications unreliable without retry logic
- Migration plan: Add circuit breaker pattern. Fall back to alternative email provider (SMTP). Implement retry with exponential backoff.

**Pomelo MySQL Provider:**
- Risk: Community-maintained fork of EF Core MySQL provider. Less heavily tested than official providers.
- Files: `src/Server/Timesheets.Api/Timesheets.Api.csproj` line 21
- Impact: Edge cases or bugs may not be caught
- Migration plan: Monitor release notes. Consider official MySQL provider (Oracle) if stability issues arise.

## Known Issues

**UserManagers Migration Incomplete:**
- Symptoms: Code attempts to use UserManagers table but catches exceptions if it doesn't exist
- Files: `src/Server/Timesheets.Api/Controllers/UsersController.cs` lines 61-79
- Trigger: Running app without running `dotnet ef database update` after UserManagers migration added
- Workaround: Run migrations before starting API. Warning message in UI indicates migration needed.

**PtoRequests EndDate Column Fallback:**
- Symptoms: Multi-day PTO requests fail to save if EndDate column missing
- Files: `src/Server/Timesheets.Api/Controllers/PtoRequestsController.cs` lines 139-147
- Trigger: Running app without `Scripts/AddPtoRequestEndDate.sql` migration
- Workaround: Error message returned (503) with hint to run migration. Apply SQL script manually or run EF migrations.

**Demo User Prevents Real Multi-User Testing:**
- Symptoms: Impossible to test with different users locally without changing source code
- Files: `src/Client/timesheets-web/src/auth/useAuth.tsx` line 28
- Trigger: Using `/login` page without real backend auth
- Workaround: Make useAuth accept user ID from query param or local storage instead of hardcoding.

---

*Concerns audit: 2026-02-08*
