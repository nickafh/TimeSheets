# Architecture

**Analysis Date:** 2026-02-08

## Pattern Overview

**Overall:** Client-server REST architecture with separate frontend and backend repositories in a monorepo, following a layered pattern with clear separation of concerns.

**Key Characteristics:**
- Backend: ASP.NET Core Web API with Entity Framework Core data access
- Frontend: React SPA with React Router for client-side routing
- Database-first approach using EF Core migrations
- Stateless API with demo authentication
- Role-based access control (Employee, Manager, Admin)

## Layers

**Presentation Layer (Frontend):**
- Purpose: User-facing interface for time tracking and PTO management
- Location: `src/Client/timesheets-web/src/`
- Contains: React pages, components, routing logic
- Depends on: Auth context, API client
- Used by: End users via browser

**API Controller Layer (Backend):**
- Purpose: HTTP endpoint handling and request routing
- Location: `src/Server/Timesheets.Api/Controllers/`
- Contains: Standard ASP.NET Core controllers (UsersController, DailyTimeEntriesController, PtoRequestsController, etc.)
- Depends on: DbContext, Services
- Used by: Frontend via HTTP requests
- Pattern: Each controller corresponds to an entity type with standard CRUD operations

**Business Logic / Services Layer (Backend):**
- Purpose: Cross-cutting concerns like email sending
- Location: `src/Server/Timesheets.Api/Services/`
- Contains: `IAppEmailSender`, `AppEmailSender`
- Depends on: Configuration
- Used by: Controllers

**Data Access Layer (Backend):**
- Purpose: Database interaction via Entity Framework Core
- Location: `src/Server/Timesheets.Api/Data/`
- Contains: `TimeSheetsDbContext` - DbContext with DbSets for all entities
- Depends on: MySQL via Pomelo provider
- Used by: Controllers

**Data Model Layer (Backend):**
- Purpose: Entity definitions mapped to database schema
- Location: `src/Server/Timesheets.Api/Models/`
- Contains: User, DailyTimeEntry, PtoRequest, PtoType, Holiday, Notification, EarlyClosure, SystemSettings, UserManager
- Used by: DbContext, Controllers

**Authentication/Authorization Layer (Frontend):**
- Purpose: User authentication and protected route enforcement
- Location: `src/Client/timesheets-web/src/auth/`
- Contains: `useAuth` context hook, `ProtectedRoute`, `RoleProtectedRoute`
- Pattern: Demo-based with hardcoded user "Nick Albano" (ID: 1) and role selection
- Used by: App routing, pages, components

## Data Flow

**Time Entry CRUD Flow:**

1. Frontend user navigates to `/timesheets/weekly` (WeeklyTimeEntries page)
2. Page calls `fetchDailyTimeEntries(userId, start, end)` from `api.ts`
3. GET request to `/api/DailyTimeEntries?userId={id}&start={date}&end={date}`
4. Backend: `DailyTimeEntriesController.Get()` queries DbContext
5. Results returned as JSON array of `DailyTimeEntryDto`
6. Frontend displays entries in weekly grid format with local edit state
7. User modifies hours/notes in the UI
8. On save: `saveDailyTimeEntriesBulk(entries)` called
9. PUT to `/api/DailyTimeEntries/bulk` with array of entries
10. Backend: `SaveBulk()` iterates entries, creates new or updates existing based on UserId + WorkDate composite
11. Changes persisted to MySQL via `SaveChangesAsync()`
12. Frontend receives 204 No Content response, displays success

**PTO Request Approval Flow:**

1. Manager navigates to `/manager/approve-pto` (ApprovePto page)
2. Page fetches pending requests via `fetchPendingPtoRequests()`
3. GET `/api/ptorequests/pending`
4. Backend joins PtoRequests with Users, returns with user info
5. Manager reviews and clicks Approve/Deny
6. Frontend calls `approvePtoRequest(id, approvedBy)` or `denyPtoRequest(id, deniedBy, reason)`
7. PATCH request to `/api/ptorequests/{id}/approve` or `/deny`
8. Backend updates status, approvedDeniedAt, approvedDeniedBy, sends email notification
9. Frontend refreshes list to reflect approval status

**State Management:**

- **Frontend Auth State:** Managed by `useAuth` context (user, loginAsDemo, logout)
- **Frontend Page State:** React useState hooks (no Redux/Zustand)
- **Backend State:** Stateless - all state in MySQL database
- **Session:** Demo mode only - no persistent session management currently

## Key Abstractions

**User Entity:**
- Purpose: Represents employees with roles and manager assignments
- Examples: `src/Server/Timesheets.Api/Models/User.cs`, `src/Client/timesheets-web/src/api.ts` (UserDto)
- Pattern: DbSet<User> in context, decorated with attributes (IsActive, IsWfh, IsPartTime, IsIntern as sbyte 1/0), many-to-many to managers via UserManager join table
- Frontend representation: `UserDto` interface with all properties mapped from backend

**DailyTimeEntry:**
- Purpose: Tracks hours worked/PTO for each day per user
- Examples: `src/Server/Timesheets.Api/Models/DailyTimeEntry.cs`, API DTO `DailyTimeEntryDto`
- Pattern: Simple model with UserId + WorkDate as natural compound key, supports create/update/query by date range
- Bulk upsert pattern in controller reduces chattiness

**PtoRequest:**
- Purpose: Time-off request workflow with approval chain
- Examples: `src/Server/Timesheets.Api/Models/PtoRequest.cs`, `PtoRequestWithUserDto`
- Pattern: Supports single-day and multi-day ranges (DateOfLeave + optional EndDate), status enum (0=Pending, 1=Approved, 2=Denied), approval tracking fields (ApprovedDeniedBy, ApprovedDeniedAt)

**SystemSettings:**
- Purpose: Centralized configuration for PTO rules and company settings
- Examples: `src/Server/Timesheets.Api/Models/SystemSettings.cs`
- Pattern: Single-instance singleton (always ID=1), controls PTO allowances, accrual, carryover, approval workflow, notification preferences

## Entry Points

**Backend Entry Point:**
- Location: `src/Server/Timesheets.Api/Program.cs`
- Triggers: `dotnet run` or container startup
- Responsibilities: Configure DI container, DbContext with MySQL, CORS for Vite dev server, Swagger UI, middleware pipeline, route mapping

**Frontend Entry Point:**
- Location: `src/Client/timesheets-web/src/main.tsx`
- Triggers: Vite dev server or production build
- Responsibilities: Render React app to DOM root, wrap with BrowserRouter and AuthProvider

**Main App Router:**
- Location: `src/Client/timesheets-web/src/App.tsx`
- Responsibilities: Define all routes, apply ProtectedRoute / RoleProtectedRoute wrappers, compose page components with PageWrapper layout

**API Routes:**
Pattern: Standard REST at `/api/[controller]` - auto-mapped by ASP.NET Core from controller names

- Users: `GET|POST /api/users`, `GET /api/users/{id}`, `PUT /api/users/{id}`, `PATCH /api/users/{id}/activate|deactivate`, `GET /api/users/managers`
- DailyTimeEntries: `GET /api/DailyTimeEntries`, `PUT /api/DailyTimeEntries/bulk`, `GET /api/DailyTimeEntries/team`, `GET /api/DailyTimeEntries/summary`
- PtoRequests: `GET|POST /api/ptorequests`, `GET /api/ptorequests/user/{userId}`, `PATCH /api/ptorequests/{id}/approve|deny`, `GET /api/ptorequests/pending|all|history`
- Holidays: `GET|POST /api/holidays`, `PUT|DELETE /api/holidays/{id}`
- PtoTypes: `GET /api/ptotypes`
- Notifications: `GET|POST /api/notifications`, `PATCH /api/notifications/{id}/activate|deactivate|delete`
- EarlyClosures: `GET|POST /api/earlyclosures`, `PUT|DELETE /api/earlyclosures/{id}`
- SystemSettings: `GET|PUT /api/systemsettings`

## Error Handling

**Strategy:** Fetch wrapper functions handle HTTP errors, throw descriptive messages; controllers return appropriate HTTP status codes

**Patterns:**
- Frontend: `getJson`, `putJson`, `postJson`, `patchJson`, `deleteJson` in `api.ts` parse response and throw on non-2xx status
- Backend: Controllers return `Ok()`, `NoContent()`, `BadRequest()` - no custom error classes observed
- Error messages include HTTP status and parsed response body (message/hint fields if available)
- 204 No Content responses treated as empty success on frontend

## Cross-Cutting Concerns

**Logging:** Backend uses `ILogger<T>` injected into controllers (e.g., PtoRequestsController logs operations); frontend uses `console` for debugging

**Validation:** Entity models in backend use data annotations (e.g., unique Email index); frontend relies on API validation errors for feedback

**Authentication:** Frontend demo-only via `useAuth` context; backend currently has no authentication middleware (API is open)

**Authorization:** Frontend enforces role-based access via `RoleProtectedRoute`; backend has no authorization checks currently (API assumes authenticated requests)

**CORS:** Configured in `Program.cs` to allow Vite dev server (`http://localhost:5173`) and configurable production origins

**Database Migrations:** EF Core migrations tracked in `Migrations/` folder (not visible in source listing but referenced in CLAUDE.md); created with `dotnet ef migrations add`

---

*Architecture analysis: 2026-02-08*
