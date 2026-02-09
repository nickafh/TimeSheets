# Technology Stack

**Analysis Date:** 2026-02-08

## Languages

**Primary:**
- C# 13 (.NET 8.0 / 10.0) - Backend API, Web services
- TypeScript 5.9.x - Frontend application, type safety for React components
- JavaScript (ES 2020) - Build tooling, configuration

**Secondary:**
- SQL (MySQL 8.0) - Data persistence
- HTML5 / CSS (Tailwind) - Markup and styling

## Runtime

**Environment:**
- .NET Runtime 8.0 (API server) - See `src/Server/Timesheets.Api/Timesheets.Api.csproj` targeting net8.0
- .NET Runtime 10.0 - Alternative target framework
- Node.js (LTS recommended) - Frontend development and build tooling
- Browser runtime (Chrome/Chromium) - React 19 application

**Package Manager:**
- npm - Frontend dependencies (package.json)
- NuGet - .NET package manager (implicit in .csproj)
- Lockfile: `package-lock.json` (present for npm)

## Frameworks

**Core Backend:**
- ASP.NET Core Web API 8.0 - REST API framework
- Entity Framework Core 9.0.0 - ORM and data access layer (`src/Server/Timesheets.Api/Data/TimeSheetsDbContext.cs`)

**Core Frontend:**
- React 19.2.0 - UI library and component framework
- React Router 7.9.6 - Client-side routing (`react-router-dom@^7.9.6`)

**Styling:**
- Tailwind CSS 4.1.18 - Utility-first CSS framework with `@tailwindcss/postcss@^4.1.18`
- PostCSS 8.5.6 - CSS preprocessor with autoprefixer

**Testing:**
- Playwright 1.57.0 - End-to-end testing (`@playwright/test@^1.57.0`)
  - Config: `src/Client/timesheets-web/playwright.config.ts`
  - Test directory: `src/Client/timesheets-web/tests/`
  - Auto-starts dev server on port 5173

**Build/Dev:**
- Vite (via rolldown-vite 7.2.2) - Frontend bundler and dev server
  - Package: `npm:rolldown-vite@7.2.2` with npm override
  - Config: `src/Client/timesheets-web/vite.config.ts`
  - Dev server: `http://localhost:5173`
- @vitejs/plugin-react 5.1.0 - React support for Vite
- TypeScript Compiler (tsc) - Compilation to JavaScript

**Code Quality:**
- ESLint 9.39.1 - Linting (flat config format)
  - Config: `src/Client/timesheets-web/eslint.config.js`
  - TypeScript support via typescript-eslint 8.46.3
  - React plugin: eslint-plugin-react-refresh 0.4.24
  - React Hooks plugin: eslint-plugin-react-hooks 7.0.1

## Key Dependencies

**Critical Backend:**
- Microsoft.EntityFrameworkCore 9.0.0 - Data access abstraction
- Microsoft.EntityFrameworkCore.Design 9.0.0 - Migration tooling
- Microsoft.EntityFrameworkCore.Relational 9.0.0 - Relational database provider
- Pomelo.EntityFrameworkCore.MySql 9.0.0 - MySQL provider for EF Core with auto-detected server version
- Swashbuckle.AspNetCore 10.0.1 - Swagger/OpenAPI documentation (enabled in Development mode)

**Email & Cloud Integration:**
- MailKit 4.14.1 - SMTP email client library
- Microsoft.Graph 5.68.0 - Microsoft Graph API client for delegated email sending
- Microsoft.Identity.Client 4.66.1 - Azure AD authentication (MSAL)
- Azure.Identity 1.13.1 - Azure SDK identity provider (ClientSecretCredential for Graph API)

**Caching:**
- Microsoft.Extensions.Caching.Memory - In-memory cache (built into ASP.NET Core)

**Frontend UI Utilities:**
- baseline-browser-mapping 2.9.18 - CSS baseline support
- globals 16.5.0 - Global variable definitions for ESLint

## Configuration

**Environment:**
- Backend configuration via `appsettings.json` (shared) and `appsettings.Development.json` (dev-specific)
  - Path: `src/Server/Timesheets.Api/appsettings*.json`
  - Connection strings: `ConnectionStrings:DefaultConnection`
  - SMTP config: `Smtp:Host`, `Smtp:Port`, `Smtp:UserName`, `Smtp:Password`, `Smtp:EnableSsl`, `Smtp:TenantId`, `Smtp:ClientId`, `Smtp:ClientSecret`
  - Azure AD config: `AzureSetup:ClientId`, `AzureSetup:ClientSecret`, `AzureSetup:TenantId`
  - CORS config: `Cors:AllowedOrigins` (array, defaults to `["http://localhost:5173"]`)
  - Logging: `Logging:LogLevel` (configured at `Information` default, `Warning` for Microsoft.AspNetCore)

- Frontend environment via `.env.local` and `VITE_` prefixed environment variables
  - `VITE_API_BASE_URL` - API base URL (defaults to `http://localhost:5150`)
  - See `src/Client/timesheets-web/src/api.ts` for usage

**Build:**
- TypeScript config: `src/Client/timesheets-web/tsconfig.json` (references `tsconfig.app.json` and `tsconfig.node.json`)
- Vite config: `src/Client/timesheets-web/vite.config.ts`
- Tailwind config: `src/Client/timesheets-web/tailwind.config.js` (extends with custom colors and fonts)
- PostCSS config: `src/Client/timesheets-web/postcss.config.js` (uses @tailwindcss/postcss and autoprefixer)
- ESLint config: `src/Client/timesheets-web/eslint.config.js` (flat format with TypeScript and React rules)
- Playwright config: `src/Client/timesheets-web/playwright.config.ts` (single Chrome project, auto-starts dev server)

## Database

**Provider:** MySQL 8.0

**Connection Details:**
- Development: `Server=localhost;Port=3306;Database=afh_timesheets;User=root;TreatTinyAsBoolean=true;AllowZeroDateTime=True;ConvertZeroDateTime=True`
- Docker production: `Server=mysql;Port=3306;Database=afh_timesheets;User=root;Password=${MYSQL_ROOT_PASSWORD}`

**Key Entities:** User, DailyTimeEntry, PtoRequest, PtoType, Holiday, Notification, EarlyClosure, SystemSettings, UserManager

**Migrations:** Managed via `dotnet ef` CLI in `src/Server/Timesheets.Api/`

## Platform Requirements

**Development:**
- .NET SDK 8.0+ (for building and running API)
- Node.js LTS (for frontend development and Playwright)
- MySQL 8.0 (local instance or Docker)
- Git (version control)

**Production:**
- Docker - Containerized deployment (see `.planning/codebase/` for Dockerfile locations)
- Docker Compose - Orchestration (`docker-compose.yml`)
- MySQL 8.0 - Database
- Nginx - Reverse proxy and web server (`deploy/nginx/Dockerfile`)
- Let's Encrypt Certbot - SSL/TLS certificate management

**Backend Server Ports:**
- Development: Port 5150 (default for ASP.NET Core)
- Docker: Port 8080 (exposed from container)
- Nginx: Ports 80/443 (HTTP/HTTPS)

**Frontend Server Ports:**
- Development: Port 5173 (Vite dev server)

---

*Stack analysis: 2026-02-08*
