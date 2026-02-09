# Coding Conventions

**Analysis Date:** 2026-02-08

## Naming Patterns

**Files:**
- Frontend pages: PascalCase (e.g., `Dashboard.tsx`, `WeeklyTimeEntries.tsx`, `TimeOffRequests.tsx`)
- Frontend components: PascalCase (e.g., `PageWrapper.tsx`, `Sidebar.tsx`, `Topbar.tsx`)
- Backend controllers: PascalCase with `Controller` suffix (e.g., `DailyTimeEntriesController.cs`, `UsersController.cs`)
- Backend models: PascalCase (e.g., `DailyTimeEntry.cs`, `User.cs`, `PtoRequest.cs`)
- Backend services: PascalCase with interface using `I` prefix (e.g., `IAppEmailSender`, `AppEmailSender.cs`)
- Utility/API modules: camelCase (e.g., `api.ts`, `useAuth.tsx`)

**Functions:**
- Frontend: camelCase (e.g., `getMonday()`, `formatWeekLabel()`, `getDayName()`, `isWeekend()`)
- Backend: PascalCase public methods (e.g., `Get()`, `SaveBulk()`, `GetTeamEntries()`, `Create()`)
- Backend: camelCase private methods (e.g., `populateManagerIds()`)
- API helpers: camelCase (e.g., `fetchUsers()`, `saveDailyTimeEntriesBulk()`, `createPtoRequest()`)
- React hooks: Lowercase with `use` prefix (e.g., `useAuth()`)

**Variables:**
- Frontend state: camelCase (e.g., `selectedUserId`, `currentMonday`, `weeks`, `grandTotalWorked`)
- Frontend constants: camelCase or UPPER_SNAKE_CASE for lookup tables (e.g., `PTO_TYPE_TO_ID`)
- Backend: camelCase for local variables (e.g., `existing`, `userIds`, `byUser`)
- Interface/DTO suffixes: `Dto`, `Request`, `Response` (e.g., `DailyTimeEntryDto`, `CreatePtoRequestDto`, `CreatePtoRequestRequest`)

**Types:**
- TypeScript interfaces: PascalCase with `I` prefix or no prefix (both observed)
  - Examples: `User`, `AuthContextValue`, `WeekEntry`, `WeekData`
  - DTO interfaces: Always suffixed `Dto` (e.g., `UserDto`, `DailyTimeEntryDto`, `SystemSettingsDto`)
- C# classes: PascalCase (e.g., `DailyTimeEntry`, `User`, `PtoRequest`)
- C# enums: Not extensively used; string constants preferred (e.g., role values: "Employee", "Manager", "Admin")
- TypeScript type unions: PascalCase (e.g., `UserRole = "Employee" | "Manager" | "Admin"`)

**Constants:**
- Lookup tables: UPPER_SNAKE_CASE (e.g., `AllowedRoles`, `PTO_TYPE_TO_ID`)
- Database table names: Plural, PascalCase (e.g., `Users`, `DailyTimeEntries`, `PtoRequests`)
- String values: PascalCase for enum-like (e.g., "Employee", "Manager", "Admin")

## Code Style

**Formatting:**
- ESLint: Flat config format in `eslint.config.js`
- No Prettier config found; formatting handled by ESLint
- TypeScript strict mode enabled (`strict: true` in `tsconfig.app.json`)
- Backend follows C# conventions (no explicit formatter config found)

**Linting:**
- Frontend: ESLint with TypeScript support
  - Extends: `js.configs.recommended`, `tseslint.configs.recommended`, React hooks rules, React Refresh
  - Enforces no unused locals, no unused parameters, no unchecked side effect imports
- Backend: Implicit C# code analysis (nullable reference types enabled with `<Nullable>enable</Nullable>`)

**Code Organization:**
- Frontend: Separation of concerns (pages, components, auth, api, services)
- Backend: Traditional MVC pattern with Controllers, Models, Data (DbContext), Services

## Import Organization

**Order (Frontend TypeScript/React):**
1. React and React Router imports (`import React`, `import { useEffect }`)
2. Third-party types and utilities (`import { Routes, Route }`)
3. Internal absolute imports from `api.ts` or utilities (`import { fetchUsers } from "../api"`)
4. Internal relative imports from auth/components (`import { useAuth } from "../auth/useAuth"`)
5. Type imports (`import type { DailyTimeEntryDto }`)

**Pattern observed in `WeeklyTimeEntries.tsx`:**
```typescript
import { useEffect, useMemo, useState } from "react";
import type { DailyTimeEntryDto } from "../api";
import {
  fetchUsers,
  fetchDailyTimeEntries,
  saveDailyTimeEntriesBulk,
} from "../api";
import { useAuth } from "../auth/useAuth";
```

**Path Aliases:**
- No aliases configured; relative paths used throughout (`"../"` for parent directory)

**Order (Backend C#):**
1. System namespaces (`using System`, `using System.ComponentModel`)
2. Microsoft namespaces (`using Microsoft.AspNetCore`, `using Microsoft.EntityFrameworkCore`)
3. Project namespaces (`using TimeSheets.Api.Data`, `using TimeSheets.Api.Models`)
4. File-scoped namespace (`namespace TimeSheets.Api.Controllers;`)

## Error Handling

**Frontend Pattern:**
- Try/catch with state management:
  ```typescript
  try {
    setError("");
    const data = await fetchUsers();
  } catch (e: any) {
    setError(e?.message ?? "Failed to load users.");
  }
  ```
- Error state held in component state: `useState<string>("")`
- User feedback via `success` and `error` state messages
- API helper functions throw `Error` with descriptive messages including HTTP status and response body hints

**Backend Pattern:**
- Try/catch with fallback handling:
  ```csharp
  try {
    // perform operation
  } catch {
    // leave defaults or empty
  }
  ```
  Example: `PopulateManagerIds()` catches missing table exception silently
- Validation at entry point (controller method):
  ```csharp
  if (request.UserId <= 0)
    return BadRequest(new { message = "UserId is required" });
  ```
- Use `ILogger` for logging errors (e.g., `_logger.LogError()`)
- Return appropriate HTTP status codes: `BadRequest()`, `NotFound()`, `Ok()`, `NoContent()`

**API Client Error Extraction:**
- Parse error response JSON if available to extract `message` and `hint` fields
- Fall back to HTTP status code in error message
- Example from `api.ts`:
  ```typescript
  const body = JSON.parse(text) as { message?: string; hint?: string };
  if (body?.message) msg += ` - ${body.message}`;
  if (body?.hint) msg += ` (${body.hint})`;
  ```

## Logging

**Frontend:**
- Pattern: `console.error()` for error logging (e.g., in catch blocks)
- Example: `console.error("Failed to load notifications:", error)`
- No structured logging library; browser console output only
- Playwright tests include `console.log()` for test diagnostics

**Backend:**
- Dependency injected: `ILogger<ControllerName>` injected via constructor
- Pattern: `_logger.LogError(exception, message)` or `_logger.LogInformation(message)`
- Example from `PtoRequestsController`:
  ```csharp
  private readonly ILogger<PtoRequestsController> _logger;
  ```

## Comments

**When to Comment:**
- Inline comments explaining business logic (e.g., "Demo user id 1 - matches Nick Albano in database")
- Comments before complex date calculations or validation logic
- Comments explaining why certain approaches are used (defensive coding)
- Example from `UsersController.cs`: `// UserManagers table may not exist yet; leave ManagerIds empty`

**Documentation:**
- XML documentation summaries (`/// <summary>`) used on public C# methods:
  ```csharp
  /// <summary>Get users who can be assigned as managers (Role = Manager or Admin).</summary>
  ```
- JSDoc comments on utility functions explaining parameters and return values:
  ```typescript
  /** Format PTO request date(s) for display: "Dec 20 – Dec 24" when range, else "Dec 20, 2024". */
  ```
- React components typically lack formal documentation comments

## Function Design

**Size:**
- Frontend functions: Generally compact (20-80 lines for feature functions)
- Backend controller methods: 10-50 lines average
- Helper functions: Under 15 lines (e.g., `getMonday()`, `formatWeekLabel()`)

**Parameters:**
- Backend: Use request DTOs for complex input (`[FromBody] CreatePtoRequestRequest request`)
- Frontend: Inline parameters for simple functions
- Use destructuring for object parameters: `({ page }) => { ... }`

**Return Values:**
- Frontend async functions: Return `Promise<T>` with specific types
- Frontend components: Implicitly return `JSX.Element`
- Backend controllers: Return `IActionResult` (Ok(), BadRequest(), NotFound(), NoContent())
- Database operations wrapped in `async Task<>`

## Module Design

**Exports:**
- Frontend: Named exports for components and utilities, default export for pages
- Backend: Public classes (no explicit export; C# visibility modifier defaults)
- API module exports: Mix of interfaces, functions, and utility methods

**Barrel Files:**
- Not extensively used; direct imports from specific files preferred
- Example: Import directly from `src/api.ts` rather than through index

**Separation of Concerns:**
- Frontend: `api.ts` contains all API client functions and TypeScript DTOs
- Backend: Controllers handle routing and basic validation; DbContext handles data access
- No repository pattern; direct DbContext usage in controllers
- Services injected for cross-cutting concerns (e.g., `IAppEmailSender`)

**Data Flow:**
- Frontend pages fetch data via API functions, manage local state with `useState`
- State lifted to page level; no Redux or global state management
- Authentication context (`AuthProvider`) provides user information to nested components
- Error and success messages propagated through local component state

---

*Convention analysis: 2026-02-08*
