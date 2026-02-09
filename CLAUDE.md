# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack employee timesheet and time-off management system consisting of:
- **Backend**: ASP.NET Core Web API (.NET 8.0) with Entity Framework Core and MySQL
- **Frontend**: React 19 + TypeScript + Vite with Tailwind CSS 4.x
- **Testing**: Playwright for end-to-end tests

The application allows employees to track daily time entries (worked hours, PTO hours) and manage time-off requests.

## Repository Structure

```
src/
├── Server/
│   └── Timesheets.Api/          # ASP.NET Core Web API
│       ├── Controllers/         # API endpoints
│       ├── Models/             # Entity models (User, DailyTimeEntry, PtoRequest, etc.)
│       ├── Data/               # DbContext
│       └── Program.cs          # Application entry point
└── Client/
    └── timesheets-web/         # React frontend
        ├── src/
        │   ├── pages/          # Page components (Dashboard, TimeEntries, etc.)
        │   ├── components/     # Reusable UI components (Layout, Sidebar, Topbar)
        │   ├── auth/           # Authentication context and protected routes
        │   ├── api.ts          # API client functions
        │   ├── App.tsx         # Main app with routing
        │   └── main.tsx        # Application entry point
        └── tests/              # Playwright e2e tests
```

## Common Development Commands

### Backend (ASP.NET Core API)

Build and run the API from the solution root:
```bash
dotnet build Timesheets.sln
dotnet run --project src/Server/Timesheets.Api/Timesheets.Api.csproj
```

Run from the API project directory:
```bash
cd src/Server/Timesheets.Api
dotnet run
```

Database migrations (run from API project directory):
```bash
# Create a new migration
dotnet ef migrations add MigrationName

# Apply migrations to the database
dotnet ef database update

# Revert the last migration
dotnet ef migrations remove
```

### Frontend (React + Vite)

All frontend commands must be run from `src/Client/timesheets-web`:
```bash
cd src/Client/timesheets-web

# Install dependencies
npm install

# Start dev server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Testing

End-to-end tests with Playwright (from `src/Client/timesheets-web`):
```bash
# Run all tests headless
npm test

# Run tests with UI mode
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed
```

## Architecture & Key Patterns

### Backend Architecture

- **Database-first approach**: Entity Framework Core with MySQL using Pomelo provider
- **Connection string**: Configured in `appsettings.Development.json` under `ConnectionStrings:DefaultConnection`
- **CORS**: Configured in `Program.cs` to allow Vite dev server on `http://localhost:5173`
- **Controllers**: Standard REST API controllers inheriting from `ControllerBase` with `[ApiController]` attribute
- **Data access**: Direct DbContext usage in controllers (no repository pattern)
- **Swagger**: Enabled in development mode for API documentation

### Key Backend Entities

- **User**: Employee records with hire/termination dates, department, manager
- **DailyTimeEntry**: Daily time tracking with worked hours, PTO hours, and day type
- **PtoRequest**: Time-off requests with approval workflow (status, approver, denial reason)
- **PtoType**: Categories of PTO (vacation, sick, etc.)
- **Holiday**: Company holidays

### Frontend Architecture

- **Routing**: React Router v7 with protected routes pattern
- **Authentication**: Simple demo authentication system using React Context (`useAuth` hook)
  - Current implementation is demo-only with hardcoded user "Nick Albano"
  - Three roles: Employee, Manager, Admin
- **Layout**: All protected pages wrapped in `PageWrapper` component which includes `Sidebar` and `Topbar`
- **API calls**: Centralized in `src/api.ts` using fetch with helper functions (`getJson`, `putJson`)
- **State management**: React Context for auth, local state otherwise (no Redux/Zustand)
- **Styling**: Tailwind CSS 4.x (uses `@tailwindcss/postcss` and `@tailwindcss/cli`)
- **Build tool**: Using `rolldown-vite` as a Vite replacement (faster Rust-based bundler)

### API Communication

- **Base URL**: Configurable via `VITE_API_BASE_URL` environment variable, defaults to `http://localhost:5150`
- **Main endpoints**:
  - `GET /api/users` - Fetch all users
  - `GET /api/DailyTimeEntries?userId={id}&start={date}&end={date}` - Fetch time entries for date range
  - `PUT /api/DailyTimeEntries/bulk` - Bulk upsert time entries
  - Controllers for PtoRequests, PtoTypes, Users exist but may have limited frontend integration

### Data Flow Pattern

Time entry updates follow this pattern:
1. Frontend fetches entries for a date range via `fetchDailyTimeEntries()`
2. User edits entries in UI (local state)
3. On save, frontend calls `saveDailyTimeEntriesBulk()`
4. Backend upserts entries (creates if new, updates if exists based on UserId + WorkDate)

## Important Technical Notes

### .NET Configuration

- **Target Framework**: .NET 8.0
- **Entity Framework Core**: Version 9.0.0
- **MySQL Provider**: Pomelo.EntityFrameworkCore.MySql 9.0.0 with auto-detected server version
- **Nullable reference types**: Enabled globally

### Frontend Build Setup

- **Vite override**: Uses `rolldown-vite@7.2.2` instead of standard Vite
- **React**: Version 19.2.0 (latest)
- **TypeScript**: 5.9.x
- **ESLint**: Flat config format (eslint.config.js) with TypeScript support
- **Playwright**: Configured to auto-start dev server on port 5173

### Database Schema Notes

- Boolean fields use `sbyte` (1/0) instead of `bool` (e.g., `IsActive`, `Status`)
- Some entities have legacy ID fields for migration purposes (e.g., `LegacyEmployeeId`, `LegacyRequestId`)
- Date fields use `DateTime` in C# models, serialized as ISO strings in TypeScript

## Development Workflow

When adding new features:

1. **Backend changes**:
   - Add/modify model in `Models/` folder
   - Update `TimeSheetsDbContext.cs` if adding new entity
   - Create migration with `dotnet ef migrations add`
   - Add/update controller in `Controllers/`

2. **Frontend changes**:
   - Add TypeScript DTO interfaces to `api.ts`
   - Create API helper functions in `api.ts`
   - Add page component to `pages/` if new route
   - Add route to `App.tsx` with `ProtectedRoute` wrapper
   - Update `Sidebar.tsx` if adding navigation item

3. **Testing**:
   - Add Playwright tests in `tests/` directory
   - Playwright auto-starts dev server, no manual setup needed
