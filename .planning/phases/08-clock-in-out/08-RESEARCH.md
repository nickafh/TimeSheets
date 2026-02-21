# Phase 8: Clock In/Out - Research

**Researched:** 2026-02-21
**Domain:** Real-time clock punch system (backend entity + REST API + React UI)
**Confidence:** HIGH

## Summary

Phase 8 introduces a clock punch system for hourly employees, adding a new `ClockPunch` entity/table on the backend, a new `ClockPunchesController` with endpoints for punching and querying punch state, and frontend changes to the Time Entries page (conditional rendering based on `payType`), the employee Dashboard (status card), and the Manager Dashboard ("Needs Attention" card). The implementation stays within the existing architecture: direct DbContext usage in controllers, `postJson`/`getJson` helpers in `api.ts`, inline styles matching the existing dashboard card pattern, and `payType` already available in auth context.

This phase is entirely within the project's existing technology stack (.NET 8 + EF Core + MySQL backend, React 19 + TypeScript frontend). No new libraries are required. The core complexity is in the state machine logic (valid punch transitions), the hours calculation on Clock Out, and the conditional rendering that replaces the weekly grid for hourly employees.

**Primary recommendation:** Build backend first (model + migration + controller), then frontend clock UI, then dashboard cards, then manager "Needs Attention" card. Keep the punch state machine simple: a linear sequence of (ClockIn -> LunchOut -> LunchIn -> ClockOut) per day, with the next valid action derived from the most recent punch record for that user+date.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Clock controls live on the Time Entries page, replacing the weekly grid entirely for hourly employees
- No separate nav item or floating button -- hourly employees navigate to Time Entries and see clock controls instead of the grid
- All four action buttons displayed in a row (Clock In, Lunch Out, Lunch In, Clock Out), with only the valid next action enabled/highlighted
- Punches record instantly on tap -- no confirmation dialog
- Brief "Undo" toast appears after each punch (like Gmail undo send) for a few seconds to catch accidental taps
- Dashboard card for hourly employees shows: current state, live elapsed time, today's punch log, and total hours today
- Elapsed time updates every second (live ticking stopwatch)
- Card is status/read-only -- no punch buttons on the dashboard (punching only on Time Entries page)
- Only managers/admins can edit punch times -- employees cannot self-correct
- Incomplete punches (e.g., forgot to clock out) flagged as "Needs Attention"
- "Needs Attention" items surfaced via a manager dashboard card listing team members with incomplete punches
- Audit trail required: store original punch time + corrected time + who corrected + when
- Midnight auto-flag: if still clocked in at midnight, auto-mark as "Needs Attention" and reset state for the new day
- Calculated hours sync to DailyTimeEntry immediately on Clock Out (not batched)
- Lunch deduction uses actual punch duration (exact time between Lunch Out and Lunch In)
- Hourly employee Time Entries page shows a compact read-only weekly summary below the clock controls
- Hourly employees see punch-derived hours as read-only in their weekly summary

### Claude's Discretion
- Dashboard card placement relative to existing cards
- Manager override of punch-derived hours on Team Time Entries (read-only vs editable)
- Visual design of the action buttons row (sizing, colors, disabled state styling)
- Undo toast duration and behavior
- How "Needs Attention" card is designed for managers

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLK-01 | Hourly employees can clock in with a real-time timestamp | New `ClockPunch` entity with `PunchType` enum; `POST /api/clockpunches/punch` endpoint; frontend Clock In button sends request with server-side `DateTime.UtcNow` |
| CLK-02 | Hourly employees can clock out for lunch with a real-time timestamp | Same punch endpoint with `PunchType = "LunchOut"`; state machine validates previous punch was ClockIn |
| CLK-03 | Hourly employees can clock back in from lunch with a real-time timestamp | Same punch endpoint with `PunchType = "LunchIn"`; state machine validates previous punch was LunchOut |
| CLK-04 | Hourly employees can clock out for the day with a real-time timestamp | Same punch endpoint with `PunchType = "ClockOut"`; triggers hours calculation and DailyTimeEntry sync |
| CLK-05 | System auto-calculates daily worked hours from clock punches and syncs to DailyTimeEntry | On ClockOut: calculate (ClockOut - ClockIn) - (LunchIn - LunchOut), upsert DailyTimeEntry with WorkedHours |
| CLK-06 | Hourly employees see punch-derived hours as read-only in the weekly time entry grid | Frontend: when `authUser.payType === "Hourly"`, render compact read-only weekly summary instead of editable grid |
| CLK-07 | Incomplete punch records are flagged as "Needs Attention" (not auto-calculated) | `Status` field on `ClockPunch` grouping: "Complete" vs "NeedsAttention"; midnight check sets flag; manager endpoint returns flagged records |
| CLK-08 | Hourly employees see a clock status card on their dashboard | New card component on Dashboard.tsx; `GET /api/clockpunches/status` endpoint returns current state + today's punches |
| CLK-09 | Clock In/Out appears as a nav item only for hourly employees | **Note:** Per CONTEXT.md locked decision, there is NO separate nav item. The clock controls replace the Time Entries grid conditionally. The requirement title is misleading -- the intent is that clock functionality is only visible to hourly employees, which is satisfied by conditional rendering on the Time Entries page. |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| .NET 8.0 / ASP.NET Core | 8.0 | Backend API | Already in use; controllers with `[Authorize]` |
| Entity Framework Core | 9.0.0 | Data access | Already in use; direct DbContext in controllers |
| Pomelo.EntityFrameworkCore.MySql | 9.0.0 | MySQL provider | Already in use |
| React | 19.2.0 | Frontend UI | Already in use |
| TypeScript | 5.9.x | Type safety | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| BCrypt.Net-Next | (existing) | Password hashing | Already in use, not needed for this phase |

### Alternatives Considered
No new libraries needed. This phase uses only the existing stack.

**Installation:**
No new packages to install.

## Architecture Patterns

### Recommended Project Structure
```
src/Server/Timesheets.Api/
├── Models/
│   └── ClockPunch.cs           # New entity
├── Controllers/
│   └── ClockPunchesController.cs  # New controller
├── Data/
│   └── TimeSheetsDbContext.cs   # Add DbSet<ClockPunch>
└── Program.cs                  # Add table creation migration

src/Client/timesheets-web/src/
├── pages/
│   └── WeeklyTimeEntries.tsx    # Modified: conditional rendering for hourly
│   └── Dashboard.tsx            # Modified: add clock status card
│   └── ManagerDashboard.tsx     # Modified: add "Needs Attention" card
├── api.ts                       # Add ClockPunch DTOs and API functions
└── utils/
    └── dateUtils.ts             # May add time formatting helpers
```

### Pattern 1: Punch State Machine
**What:** A deterministic state machine where the next valid punch action is derived from the most recent punch for a user on a given date.
**When to use:** Every punch request and every UI render of the action buttons.

State transitions:
```
No punches today  ->  ClockIn (only valid action)
Last: ClockIn     ->  LunchOut or ClockOut
Last: LunchOut    ->  LunchIn
Last: LunchIn     ->  ClockOut
Last: ClockOut    ->  Day complete (no more actions)
```

```csharp
// Derive next valid action from last punch type
public static string[] GetValidNextActions(string? lastPunchType)
{
    return lastPunchType switch
    {
        null => new[] { "ClockIn" },
        "ClockIn" => new[] { "LunchOut", "ClockOut" },
        "LunchOut" => new[] { "LunchIn" },
        "LunchIn" => new[] { "ClockOut" },
        "ClockOut" => Array.Empty<string>(),
        _ => Array.Empty<string>(),
    };
}
```

### Pattern 2: Server-Side Timestamp
**What:** The server generates the punch timestamp, not the client. The client sends only the punch type.
**When to use:** All punch operations.
**Why:** Prevents clock manipulation. The client displays times but never sets them.

```csharp
[HttpPost("punch")]
public async Task<IActionResult> Punch([FromBody] PunchRequest request)
{
    // Server generates the timestamp
    var now = DateTime.UtcNow;
    var punch = new ClockPunch
    {
        UserId = currentUserId,
        PunchType = request.PunchType,
        PunchTime = now,
        PunchDate = now.Date, // For easy date-based queries
    };
    // ... validate state machine, save, possibly calculate hours
}
```

### Pattern 3: Hours Calculation on ClockOut
**What:** When the ClockOut punch is recorded, immediately calculate daily hours and upsert into DailyTimeEntry.
**When to use:** Only on ClockOut punch type.

```csharp
// Calculate: (ClockOut - ClockIn) - (LunchIn - LunchOut)
var clockIn = punches.First(p => p.PunchType == "ClockIn").PunchTime;
var clockOut = now;
var totalSpan = clockOut - clockIn;

var lunchOut = punches.FirstOrDefault(p => p.PunchType == "LunchOut");
var lunchIn = punches.FirstOrDefault(p => p.PunchType == "LunchIn");
var lunchSpan = (lunchOut != null && lunchIn != null)
    ? lunchIn.PunchTime - lunchOut.PunchTime
    : TimeSpan.Zero;

var workedHours = Math.Round((totalSpan - lunchSpan).TotalHours, 2);
```

### Pattern 4: Undo via Soft Delete with Timer
**What:** After a punch is recorded, the frontend shows an "Undo" toast for a configurable duration (e.g., 5 seconds). If the user clicks Undo, a DELETE request removes the last punch.
**When to use:** After every successful punch.

```typescript
// Frontend undo pattern
const [undoPunchId, setUndoPunchId] = useState<number | null>(null);

const handlePunch = async (punchType: string) => {
  const result = await recordPunch(punchType);
  setUndoPunchId(result.id);
  // Auto-clear after 5 seconds
  setTimeout(() => setUndoPunchId(null), 5000);
};

const handleUndo = async () => {
  if (undoPunchId) {
    await undoLastPunch(undoPunchId);
    setUndoPunchId(null);
    // Refresh punch state
  }
};
```

### Pattern 5: Conditional Page Rendering by PayType
**What:** The WeeklyTimeEntries page checks `authUser.payType` and renders either the clock controls (Hourly) or the existing weekly grid (Salary).
**When to use:** WeeklyTimeEntries page component.

```typescript
// In WeeklyTimeEntries.tsx
const { user: authUser } = useAuth();
const isHourly = authUser?.payType === "Hourly";

if (isHourly) {
  return <HourlyClockView />;
}
// ...existing weekly grid code
```

### Anti-Patterns to Avoid
- **Client-side timestamps for punches:** Never trust the client clock. Always use `DateTime.UtcNow` on the server.
- **Polling for state updates:** The punch state only changes when the user punches. Fetch state on mount and after each punch; no need for periodic polling.
- **Storing calculated hours in the ClockPunch table:** Hours belong in DailyTimeEntry. The ClockPunch table stores raw punch timestamps only.
- **Allowing employees to edit punches:** Per locked decision, only managers/admins can correct punch times.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time zone handling | Custom offset logic | Store UTC in DB, convert to local for display using `Intl.DateTimeFormat` | Time zone bugs are subtle; UTC storage is the standard pattern |
| Toast notifications | Custom toast from scratch | Reuse the existing toast pattern from ManagerDashboard.tsx | Already implemented in the codebase with animation and auto-dismiss |
| Date-only queries | String manipulation | Use `PunchDate` (DATE column) for queries, `PunchTime` (DATETIME) for calculations | Avoids timezone issues in date boundary queries |

**Key insight:** The project already has all necessary infrastructure (auth context with payType, toast pattern, dashboard card layout, DailyTimeEntry upsert logic). This phase is mostly new entity + new controller + conditional rendering.

## Common Pitfalls

### Pitfall 1: Midnight Boundary
**What goes wrong:** An employee clocks in at 11 PM and forgets to clock out. At midnight, the date changes, creating ambiguity about which day the punch belongs to.
**Why it happens:** Clock punches span calendar day boundaries in night shift or overtime scenarios.
**How to avoid:** Store a `PunchDate` field (DATE type) set at ClockIn time. All punches for a shift use the same PunchDate, regardless of when they physically occur. Implement midnight auto-flag: a startup check or scheduled task that flags any open ClockIn from the previous day as "NeedsAttention".
**Warning signs:** Tests that only use daytime timestamps; no test for pre/post-midnight scenarios.

### Pitfall 2: Double Punch
**What goes wrong:** User taps the button twice quickly, recording two identical punches.
**Why it happens:** Network latency; UI doesn't disable the button fast enough.
**How to avoid:** (1) Frontend: disable all buttons immediately on tap, re-enable after response. (2) Backend: validate that the last punch type for this user+date is valid for the requested punch type. A duplicate ClockIn after an existing ClockIn is rejected.
**Warning signs:** Two consecutive ClockIn records for the same user+date.

### Pitfall 3: Undo Race Condition
**What goes wrong:** User punches, starts the undo timer, then immediately punches again before undoing.
**Why it happens:** If the undo deletes the wrong punch or the state machine gets confused.
**How to avoid:** The undo endpoint should only delete the specific punch by ID, not "the last punch." Clear the undo state when a new punch is recorded.
**Warning signs:** Undo toast showing after multiple rapid punches.

### Pitfall 4: DailyTimeEntry Overwrite
**What goes wrong:** Hours calculation on ClockOut overwrites manually-entered PTO hours or notes for the same day.
**Why it happens:** Naive upsert that replaces all fields.
**How to avoid:** On ClockOut, only update `WorkedHours` (and set `DayType` appropriately). Preserve existing `PtoHours` and `Notes` fields.
**Warning signs:** PTO hours disappearing after an employee clocks out.

### Pitfall 5: Incomplete NeedsAttention Detection
**What goes wrong:** An employee who clocked in but never clocked out is not flagged.
**Why it happens:** No process checks for stale open punches.
**How to avoid:** On application startup (in Program.cs), and optionally as a periodic background task, query for ClockIn or LunchOut punches from previous dates with no corresponding ClockOut. Mark them as "NeedsAttention." Per the locked decision, midnight auto-flag should reset the day.
**Warning signs:** Old unclosed punches sitting in the database without any flag.

## Code Examples

### ClockPunch Entity Model
```csharp
namespace TimeSheets.Api.Models;

public class ClockPunch
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime PunchDate { get; set; }       // DATE only - the work day this punch belongs to
    public DateTime PunchTime { get; set; }        // Full timestamp (UTC)
    public string PunchType { get; set; } = "";    // ClockIn, LunchOut, LunchIn, ClockOut
    public string Status { get; set; } = "Active"; // Active, NeedsAttention, Voided

    // Audit trail for corrections
    public DateTime? OriginalPunchTime { get; set; }  // Set when a manager corrects
    public int? CorrectedByUserId { get; set; }       // Who corrected
    public DateTime? CorrectedAt { get; set; }        // When corrected

    public User User { get; set; } = null!;
}
```

### Table Creation in Program.cs
```csharp
// Following existing pattern in Program.cs
try
{
    await db.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS ClockPunches (
            Id INT AUTO_INCREMENT PRIMARY KEY,
            UserId INT NOT NULL,
            PunchDate DATE NOT NULL,
            PunchTime DATETIME NOT NULL,
            PunchType VARCHAR(20) NOT NULL,
            Status VARCHAR(20) NOT NULL DEFAULT 'Active',
            OriginalPunchTime DATETIME NULL,
            CorrectedByUserId INT NULL,
            CorrectedAt DATETIME NULL,
            FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
            FOREIGN KEY (CorrectedByUserId) REFERENCES Users(Id) ON DELETE SET NULL,
            INDEX IX_ClockPunches_UserId_PunchDate (UserId, PunchDate)
        )");
}
catch { /* Table may already exist */ }
```

### Frontend: Clock Status Endpoint Response Shape
```typescript
// api.ts DTO
export interface ClockPunchDto {
  id: number;
  userId: number;
  punchDate: string;     // ISO date
  punchTime: string;     // ISO datetime
  punchType: string;     // ClockIn, LunchOut, LunchIn, ClockOut
  status: string;        // Active, NeedsAttention, Voided
}

export interface ClockStatusDto {
  currentState: string;       // "not_started" | "clocked_in" | "lunch_out" | "lunch_in" | "clocked_out"
  validNextActions: string[]; // e.g., ["ClockIn"] or ["LunchOut", "ClockOut"]
  todayPunches: ClockPunchDto[];
  totalHoursToday: number | null;  // null if day incomplete
  clockInTime: string | null;      // ISO datetime of today's ClockIn (for elapsed time calc)
  lunchMinutes: number | null;     // Lunch duration so far if applicable
}
```

### Frontend: Live Elapsed Time Hook
```typescript
// Custom hook for live elapsed time display
function useElapsedTime(startTime: string | null): string {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startTime) {
      setElapsed("");
      return;
    }

    const update = () => {
      const start = new Date(startTime).getTime();
      const diff = Date.now() - start;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return elapsed;
}
```

### Backend: Midnight Auto-Flag (Startup Check)
```csharp
// In Program.cs after seeding, flag stale open punches
var yesterday = DateTime.UtcNow.Date.AddDays(-1);
var stalePunches = await db.Set<ClockPunch>()
    .Where(p => p.PunchDate < DateTime.UtcNow.Date
        && p.Status == "Active"
        && (p.PunchType == "ClockIn" || p.PunchType == "LunchOut" || p.PunchType == "LunchIn"))
    .ToListAsync();

// Check if each stale punch has a corresponding ClockOut for the same day
foreach (var punch in stalePunches)
{
    var hasClockOut = await db.Set<ClockPunch>()
        .AnyAsync(p => p.UserId == punch.UserId
            && p.PunchDate == punch.PunchDate
            && p.PunchType == "ClockOut"
            && p.Status == "Active");

    if (!hasClockOut)
    {
        // Flag all punches for this user+date as NeedsAttention
        var dayPunches = await db.Set<ClockPunch>()
            .Where(p => p.UserId == punch.UserId
                && p.PunchDate == punch.PunchDate
                && p.Status == "Active")
            .ToListAsync();
        foreach (var dp in dayPunches)
            dp.Status = "NeedsAttention";
    }
}
await db.SaveChangesAsync();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| EF Migrations (`dotnet ef`) | Raw SQL `CREATE TABLE IF NOT EXISTS` in Program.cs | Project convention since v1.0 | Follow existing pattern; no migration files |
| Separate punch clock page | Integrated into Time Entries page (conditional) | User decision for this phase | Less navigation, single page handles both salary and hourly |
| Client-generated timestamps | Server-generated timestamps | Industry standard | Prevents time manipulation |

**Deprecated/outdated:**
- None relevant to this phase

## Open Questions

1. **CLK-09 Requirement vs Locked Decision Conflict**
   - What we know: CLK-09 says "Clock In/Out appears as a nav item only for hourly employees." The CONTEXT.md locked decision says "No separate nav item" -- clock controls replace the weekly grid on the Time Entries page.
   - What's unclear: Whether CLK-09 should be interpreted literally (add nav item) or by intent (clock functionality only visible to hourly users).
   - Recommendation: Follow the CONTEXT.md locked decision. CLK-09 is satisfied by the conditional rendering that makes clock functionality visible only to hourly employees on the existing Time Entries page. The nav item to Time Entries already exists.

2. **Midnight Auto-Flag Mechanism**
   - What we know: "If still clocked in at midnight, auto-mark as Needs Attention and reset state for the new day." The application uses startup checks (Program.cs) for database migrations.
   - What's unclear: Whether the midnight flag should be a real-time background task (e.g., `IHostedService`) or a startup-only check.
   - Recommendation: Implement as a startup check initially (catches previous-day stale punches). This is simpler and aligns with the existing pattern. A background timer could be added later but is not necessary for v1.1. When an hourly user opens the Time Entries page, the frontend can also check for stale punches from the current state endpoint.

3. **Manager Punch Correction UI Location**
   - What we know: Managers/admins can edit punch times. Audit trail is required.
   - What's unclear: Whether the correction UI lives on the Manager Dashboard "Needs Attention" card, the Team Time Entries page, or a separate view.
   - Recommendation: Add a simple correction modal accessible from the "Needs Attention" card on the Manager Dashboard. Keep it minimal -- show the punch list for a flagged day, allow editing individual punch times, save with audit trail.

4. **Skipping Lunch Punches**
   - What we know: The state machine allows ClockIn -> ClockOut (skipping lunch), since the valid actions after ClockIn include both LunchOut and ClockOut.
   - What's unclear: Whether this is intentional or should be flagged.
   - Recommendation: Allow it. Some hourly employees may not take a lunch break. The hours calculation should handle the case where no lunch punches exist (lunch deduction = 0).

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All source files read directly from the repository
  - `src/Server/Timesheets.Api/Models/User.cs` - PayType/ExemptionStatus fields
  - `src/Server/Timesheets.Api/Models/DailyTimeEntry.cs` - Target entity for hours sync
  - `src/Server/Timesheets.Api/Controllers/DailyTimeEntriesController.cs` - Existing bulk upsert pattern
  - `src/Server/Timesheets.Api/Controllers/AuthController.cs` - PayType in auth response
  - `src/Server/Timesheets.Api/Data/TimeSheetsDbContext.cs` - Entity registration pattern
  - `src/Server/Timesheets.Api/Program.cs` - Table creation migration pattern
  - `src/Client/timesheets-web/src/auth/useAuth.tsx` - PayType available in auth context
  - `src/Client/timesheets-web/src/pages/WeeklyTimeEntries.tsx` - Page to modify with conditional rendering
  - `src/Client/timesheets-web/src/pages/Dashboard.tsx` - Dashboard card layout pattern
  - `src/Client/timesheets-web/src/pages/ManagerDashboard.tsx` - Manager card and toast pattern
  - `src/Client/timesheets-web/src/api.ts` - API helper pattern (getJson, postJson, etc.)
  - `src/Client/timesheets-web/src/components/Layout/Sidebar.tsx` - Nav item structure
  - `src/Client/timesheets-web/src/App.tsx` - Route registration pattern

### Secondary (MEDIUM confidence)
- Clock punch system design patterns are well-established in workforce management software; the state machine approach is standard industry practice.

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using only existing project dependencies; no new libraries
- Architecture: HIGH - Following established codebase patterns (controller + entity + table creation in Program.cs)
- Pitfalls: HIGH - Based on direct codebase analysis and standard time-tracking system concerns
- State machine: HIGH - Simple deterministic transitions, well-understood pattern

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (30 days; stable domain, no dependency version changes expected)
