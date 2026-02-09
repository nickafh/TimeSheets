# Codebase Structure

**Analysis Date:** 2026-02-08

## Directory Layout

```
TimeSheets/
├── src/
│   ├── Server/
│   │   └── Timesheets.Api/              # ASP.NET Core Web API
│   │       ├── Controllers/             # REST API endpoints
│   │       ├── Models/                  # Entity models (User, DailyTimeEntry, etc.)
│   │       ├── Data/                    # DbContext and database setup
│   │       ├── Services/                # Business logic services (email)
│   │       ├── Properties/              # App metadata
│   │       ├── Scripts/                 # Utility scripts
│   │       ├── Program.cs               # App entry point and DI configuration
│   │       ├── appsettings.json         # Production config
│   │       ├── appsettings.Development.json  # Dev config (connection string)
│   │       ├── Timesheets.Api.csproj    # Project file
│   │       ├── Dockerfile               # Container image definition
│   │       └── EMAIL_SETUP.md           # Email configuration guide
│   └── Client/
│       └── timesheets-web/              # React + TypeScript frontend
│           ├── src/
│           │   ├── pages/               # Page components (one per route)
│           │   ├── components/          # Reusable UI components
│           │   │   └── Layout/          # Page layout (Sidebar, Topbar, PageWrapper)
│           │   ├── auth/                # Authentication context and route guards
│           │   ├── assets/              # Static assets (images, fonts)
│           │   ├── App.tsx              # Main app router
│           │   ├── main.tsx             # React DOM entry point
│           │   ├── api.ts               # Centralized API client and DTOs
│           │   ├── App.css              # App-level styles
│           │   └── index.css            # Global styles (Tailwind)
│           ├── tests/                   # Playwright E2E tests
│           ├── public/                  # Static files served as-is
│           ├── dist/                    # Build output (generated)
│           ├── node_modules/            # Dependencies (generated)
│           ├── package.json             # Dependencies and scripts
│           ├── tsconfig.json            # TypeScript configuration
│           ├── vite.config.ts           # Build tool configuration
│           ├── eslint.config.js         # Linting rules
│           ├── postcss.config.js        # CSS processing
│           ├── tailwind.config.js       # Tailwind CSS configuration
│           └── playwright.config.ts     # E2E test configuration
├── deploy/
│   └── nginx/                           # Nginx reverse proxy config
├── .planning/
│   └── codebase/                        # Codebase analysis documents (this folder)
├── CLAUDE.md                            # Development guide and conventions
├── Timesheets.sln                       # Visual Studio solution file
├── docker-compose.yml                   # Multi-container orchestration
├── .env.example                         # Environment variable template
└── README.md / docs/                    # Documentation (if present)
```

## Directory Purposes

**Backend Project Root (`src/Server/Timesheets.Api/`):**
- Purpose: ASP.NET Core Web API serving timesheet and PTO data
- Contains: Controllers, models, database access, services
- Key files: `Program.cs` (startup), `appsettings.Development.json` (connection string)

**Controllers (`src/Server/Timesheets.Api/Controllers/`):**
- Purpose: HTTP endpoint handlers and routing
- Contains: Files like `UsersController.cs`, `DailyTimeEntriesController.cs`, `PtoRequestsController.cs`
- Key files:
  - `UsersController.cs`: User CRUD and manager assignment
  - `DailyTimeEntriesController.cs`: Time entry query and bulk upsert
  - `PtoRequestsController.cs`: PTO request workflow (create, approve, deny)
  - `SystemSettingsController.cs`: App configuration (single entity at ID=1)
  - `HolidaysController.cs`: Company holidays management
  - `NotificationsController.cs`: System-wide notifications
  - `EarlyClosuresController.cs`: Early closure events

**Models (`src/Server/Timesheets.Api/Models/`):**
- Purpose: Entity definitions for database tables
- Contains: C# POCOs with EF Core attributes
- Key files:
  - `User.cs`: Employee records with role, department, manager relationships
  - `DailyTimeEntry.cs`: Daily work log (UserId + WorkDate composite key)
  - `PtoRequest.cs`: Time-off request with approval workflow
  - `PtoType.cs`: PTO category definitions (Vacation, Sick, etc.)
  - `UserManager.cs`: Join table for many-to-many user-to-manager relationships
  - `Holiday.cs`: Company-wide holidays
  - `SystemSettings.cs`: Singleton configuration entity
  - `Notification.cs`: System notifications for users
  - `EarlyClosure.cs`: Early business closures

**Data (`src/Server/Timesheets.Api/Data/`):**
- Purpose: Database context and configuration
- Contains: `TimeSheetsDbContext.cs`
- Defines: DbSets for all entities, OnModelCreating for constraints (unique email, foreign keys)

**Services (`src/Server/Timesheets.Api/Services/`):**
- Purpose: Cross-cutting business logic
- Contains: `IAppEmailSender.cs`, `AppEmailSender.cs`
- Registered in DI container for use in controllers

**Frontend Root (`src/Client/timesheets-web/src/`):**
- Purpose: React SPA source code
- Contains: Pages, components, auth, API client
- Key files: `App.tsx` (router), `main.tsx` (entry point), `api.ts` (API client)

**Pages (`src/Client/timesheets-web/src/pages/`):**
- Purpose: Full-page components, one per route
- Contains: 18+ page files like `WeeklyTimeEntries.tsx`, `Dashboard.tsx`, `ApprovePto.tsx`
- Pattern: All protected pages wrapped with `ProtectedRoute` or `RoleProtectedRoute` in App.tsx, then composed with `PageWrapper` for layout
- Key pages:
  - `Login.tsx`: Demo auth login screen
  - `Dashboard.tsx`: Employee dashboard with PTO summary and pending requests
  - `WeeklyTimeEntries.tsx`: Time entry grid editor
  - `TimeOffSummary.tsx`: PTO balance tracking
  - `NewTimeOffRequest.tsx`: PTO request creation
  - `ApprovePto.tsx`: Manager approval workflow
  - `ManagerDashboard.tsx`: Manager overview
  - `AdminDashboard.tsx`: Admin overview
  - `ManageUsers.tsx`: User administration
  - `SystemSettings.tsx`: Company configuration
  - `SystemReports.tsx`: Analytics and reporting

**Components (`src/Client/timesheets-web/src/components/`):**
- Purpose: Reusable UI building blocks
- Contains: `Layout/` subdirectory only
- Layout components (`src/Client/timesheets-web/src/components/Layout/`):
  - `PageWrapper.tsx`: Wraps all protected pages, includes Sidebar, Topbar, content area
  - `Sidebar.tsx`: Navigation menu with role-based links
  - `Topbar.tsx`: Header with user info and logout
  - `MobileBottomNav.tsx`: Mobile-optimized navigation
  - `MobileMenu.tsx`: Mobile menu toggle

**Auth (`src/Client/timesheets-web/src/auth/`):**
- Purpose: Authentication context and route protection
- Contains:
  - `useAuth.tsx`: React Context hook for user state (id, name, role)
  - `ProtectedRoute.tsx`: Wrapper redirecting unauthenticated users to /login
  - `RoleProtectedRoute.tsx`: Wrapper restricting pages to specific roles (Manager, Admin)
- Pattern: Demo mode with hardcoded user "Nick Albano" (ID: 1), role selectable at login

**API Client (`src/Client/timesheets-web/src/api.ts`):**
- Purpose: Centralized HTTP client and data transfer object definitions
- Contains:
  - Fetch wrapper functions: `getJson`, `putJson`, `postJson`, `patchJson`, `deleteJson`
  - DTOs: `UserDto`, `DailyTimeEntryDto`, `PtoRequestWithUserDto`, `SystemSettingsDto`, etc.
  - API functions: `fetchUsers()`, `saveDailyTimeEntriesBulk()`, `approvePtoRequest()`, etc.
  - Base URL configured via `VITE_API_BASE_URL` env var, defaults to `http://localhost:5150`
- All HTTP calls routed through this file for consistency

**Tests (`src/Client/timesheets-web/tests/`):**
- Purpose: Playwright end-to-end tests
- Contains: `.spec.ts` test files
- Configuration: `playwright.config.ts` at project root auto-starts dev server on port 5173

**Build Configuration:**
- `vite.config.ts`: Vite build tool setup (uses rolldown-vite instead of standard Vite)
- `tsconfig.json`: TypeScript compiler options
- `eslint.config.js`: ESLint rules (flat config format)
- `postcss.config.js`: CSS post-processing for Tailwind
- `tailwind.config.js`: Tailwind CSS customization

## Key File Locations

**Backend Entry Points:**
- `src/Server/Timesheets.Api/Program.cs`: Startup and DI configuration
- `src/Server/Timesheets.Api/appsettings.Development.json`: Dev database connection string

**Frontend Entry Points:**
- `src/Client/timesheets-web/src/main.tsx`: React DOM mount point
- `src/Client/timesheets-web/src/App.tsx`: Route definitions
- `src/Client/timesheets-web/src/index.css`: Global Tailwind styles

**Configuration Files:**
- Backend: `src/Server/Timesheets.Api/appsettings.json` (production), `appsettings.Development.json` (dev)
- Frontend: `src/Client/timesheets-web/.env` (environment variables, not committed), `.env.example` template
- Root: `docker-compose.yml` (local dev containers), `Timesheets.sln` (VS solution file)

**Core Logic:**
- Time entry management: `src/Server/Timesheets.Api/Controllers/DailyTimeEntriesController.cs`, `src/Client/timesheets-web/src/pages/WeeklyTimeEntries.tsx`
- PTO workflow: `src/Server/Timesheets.Api/Controllers/PtoRequestsController.cs`, `src/Client/timesheets-web/src/pages/ApprovePto.tsx`
- User management: `src/Server/Timesheets.Api/Controllers/UsersController.cs`, `src/Client/timesheets-web/src/pages/ManageUsers.tsx`

**Testing:**
- Playwright config: `src/Client/timesheets-web/playwright.config.ts`
- Test files: `src/Client/timesheets-web/tests/*.spec.ts`
- Test results/screenshots: `src/Client/timesheets-web/test-results/` and `tests/screenshots/` (generated during test runs)

## Naming Conventions

**Backend Files:**
- Controllers: `{Entity}Controller.cs` (e.g., `UsersController.cs`, `PtoRequestsController.cs`)
- Models: `{Entity}.cs` (e.g., `User.cs`, `DailyTimeEntry.cs`)
- Pattern: PascalCase for class names, file names match class names exactly
- Namespace: `TimeSheets.Api.{Folder}` (e.g., `TimeSheets.Api.Controllers`, `TimeSheets.Api.Models`)

**Frontend Files:**
- Pages: `{PageName}.tsx` in PascalCase (e.g., `WeeklyTimeEntries.tsx`, `AdminDashboard.tsx`)
- Components: `{ComponentName}.tsx` in PascalCase (e.g., `PageWrapper.tsx`, `Sidebar.tsx`)
- Utilities: `{utilityName}.ts` in camelCase (e.g., `api.ts`)
- Pattern: File names match default export component names

**Directories:**
- Backend: PascalCase (`Controllers`, `Models`, `Services`, `Data`)
- Frontend: camelCase (`src`, `pages`, `components`, `auth`, `assets`)
- Pattern: Consistent with language conventions

**Variables & Functions:**
- Backend C#: camelCase for private fields (`_db`), PascalCase for methods and properties (`GetUsers()`)
- Frontend TypeScript: camelCase for functions and variables, PascalCase for React components, UPPER_SNAKE_CASE for constants

## Where to Add New Code

**New Backend Feature (e.g., TimeCard Approval):**
- Create model: `src/Server/Timesheets.Api/Models/TimeCard.cs`
- Add DbSet to `src/Server/Timesheets.Api/Data/TimeSheetsDbContext.cs`
- Create migration: `dotnet ef migrations add AddTimeCard`
- Create controller: `src/Server/Timesheets.Api/Controllers/TimeCardsController.cs`
- Implement standard CRUD actions and business logic

**New Frontend Feature (e.g., TimeCard Approval Page):**
- Add DTOs to `src/Client/timesheets-web/src/api.ts` (e.g., `TimeCardDto`)
- Add API functions to `src/Client/timesheets-web/src/api.ts` (e.g., `fetchTimeCards()`, `approveTimeCard()`)
- Create page component: `src/Client/timesheets-web/src/pages/ApproveTimecards.tsx`
- Add route to `src/Client/timesheets-web/src/App.tsx` with appropriate protection (ProtectedRoute/RoleProtectedRoute)
- Add navigation link to `src/Client/timesheets-web/src/components/Layout/Sidebar.tsx`

**New Component (Reusable UI):**
- Create file: `src/Client/timesheets-web/src/components/{ComponentName}.tsx`
- Import and use in page components
- Example: Time picker, date range selector, etc.

**Utilities/Helpers:**
- Backend services: `src/Server/Timesheets.Api/Services/{ServiceName}.cs`
- Frontend utilities: `src/Client/timesheets-web/src/` root (e.g., `api.ts` for API functions, could add `utils.ts` for general utilities)

**Tests:**
- E2E tests: `src/Client/timesheets-web/tests/{feature}.spec.ts`
- Backend unit/integration tests: Not currently present; would be added to `src/Server/Timesheets.Api/Tests/` folder

## Special Directories

**Migrations (Backend - not shown in file listing):**
- Purpose: Database schema history and version tracking
- Location: `src/Server/Timesheets.Api/Migrations/` (generated by EF Core)
- Generated: Yes
- Committed: Yes - migrations must be version controlled

**Build Output:**
- `dist/`: Frontend production build output
- Generated: Yes (on `npm run build`)
- Committed: No - in `.gitignore`

**Dependencies:**
- `node_modules/`: Frontend packages (generated on `npm install`)
- `bin/` and `obj/`: Backend build artifacts (generated on `dotnet build`)
- Generated: Yes
- Committed: No

**Generated Tests:**
- `test-results/`: Playwright test reports and failures
- `playwright-report/`: Test execution history
- Generated: Yes (during `npm test`)
- Committed: No

**Assets:**
- `src/Client/timesheets-web/public/`: Static files (favicon, etc.)
- `src/Client/timesheets-web/src/assets/`: Images and other static resources
- Committed: Yes

**Container Setup:**
- `deploy/nginx/`: Reverse proxy configuration for production
- `Dockerfile`: Backend image definition
- `docker-compose.yml`: Local development environment with API + database containers
- Committed: Yes

---

*Structure analysis: 2026-02-08*
