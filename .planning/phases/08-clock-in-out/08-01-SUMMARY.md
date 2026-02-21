---
phase: 08-clock-in-out
plan: 01
subsystem: api
tags: [clock-punch, state-machine, rest-api, entity-framework, mysql]

# Dependency graph
requires:
  - phase: 06-pay-type-classification
    provides: PayType field on User model (Hourly vs Salary)
provides:
  - ClockPunch entity model with punch type, timestamp, status, and audit fields
  - ClockPunches MySQL table with foreign keys and indexes
  - POST /api/clockpunches/punch endpoint with state machine validation
  - GET /api/clockpunches/status endpoint for current punch state
  - DELETE /api/clockpunches/{id}/undo endpoint with 30-second window
  - GET /api/clockpunches/needs-attention endpoint for Manager/Admin
  - PUT /api/clockpunches/{id}/correct endpoint with audit trail
  - GET /api/clockpunches/history endpoint for date range queries
  - Stale punch auto-flagging on application startup
  - DailyTimeEntry sync on ClockOut (hours calculation)
affects: [08-02, 08-03, 08-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [clock-punch-state-machine, server-side-timestamps, audit-trail-corrections]

key-files:
  created:
    - src/Server/Timesheets.Api/Models/ClockPunch.cs
    - src/Server/Timesheets.Api/Controllers/ClockPunchesController.cs
  modified:
    - src/Server/Timesheets.Api/Data/TimeSheetsDbContext.cs
    - src/Server/Timesheets.Api/Program.cs

key-decisions:
  - "State machine uses static helper returning string[] for valid next actions, shared across endpoints"
  - "Hours calculation shared via private helper, reused in Punch and Correct endpoints"
  - "Hard delete for undo (within 30-second window) rather than soft delete"
  - "Stale punch detection runs at startup, grouped by UserId+PunchDate for efficiency"

patterns-established:
  - "Punch state machine: null->ClockIn, ClockIn->LunchOut|ClockOut, LunchOut->LunchIn, LunchIn->ClockOut, ClockOut->done"
  - "Server-side timestamps only: client sends PunchType, server generates DateTime.UtcNow"
  - "Audit trail: OriginalPunchTime + CorrectedByUserId + CorrectedAt on manager corrections"
  - "Status response DTO: currentState, validNextActions, todayPunches, totalHoursToday, clockInTime, lunchMinutes"

requirements-completed: [CLK-01, CLK-02, CLK-03, CLK-04, CLK-05, CLK-07]

# Metrics
duration: 2min
completed: 2026-02-21
---

# Phase 8 Plan 1: Clock In/Out Backend Summary

**ClockPunch entity with state machine REST API, server-side timestamps, hours calculation syncing to DailyTimeEntry, undo support, stale punch detection, and manager corrections with audit trail**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-21T08:00:00Z
- **Completed:** 2026-02-21T08:02:12Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- ClockPunch entity model with all properties (PunchType, PunchTime, PunchDate, Status, audit fields)
- Full ClockPunchesController with 6 endpoints covering punch recording, status, undo, needs-attention, corrections, and history
- State machine enforces valid punch transitions (ClockIn -> LunchOut/ClockOut -> LunchIn -> ClockOut)
- Hours calculation on ClockOut upserts DailyTimeEntry.WorkedHours while preserving PtoHours and Notes
- Stale open punches from previous days auto-flagged as NeedsAttention on application startup

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ClockPunch entity model and database table** - `c139630` (feat)
2. **Task 2: Create ClockPunchesController with all endpoints** - `3b591d9` (feat)

## Files Created/Modified
- `src/Server/Timesheets.Api/Models/ClockPunch.cs` - ClockPunch entity with PunchType, PunchTime, PunchDate, Status, audit trail fields
- `src/Server/Timesheets.Api/Controllers/ClockPunchesController.cs` - 6 REST endpoints: punch, status, undo, needs-attention, correct, history
- `src/Server/Timesheets.Api/Data/TimeSheetsDbContext.cs` - Added DbSet<ClockPunch> and model configuration with FK and index
- `src/Server/Timesheets.Api/Program.cs` - CREATE TABLE IF NOT EXISTS for ClockPunches + stale punch auto-flag logic

## Decisions Made
- State machine uses a static helper method `GetValidNextActions()` returning `string[]`, avoiding duplication across endpoints
- Hours calculation uses a shared `CalculateWorkedHours()` private helper, reused in both Punch and Correct endpoints
- Status response built by `BuildStatusResponse()` helper, reused in Punch, Undo, and Status endpoints
- Hard delete for undo within 30-second window (not soft delete) since the punch was just created
- Stale punch detection on startup groups by UserId+PunchDate to batch-check for missing ClockOut records
- PayType validation at punch time rejects non-hourly employees with 400

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 backend endpoints ready for frontend integration in plans 08-02 through 08-04
- ClockPunches table created automatically on startup
- Stale punch detection operational on every application restart

---
*Phase: 08-clock-in-out*
*Completed: 2026-02-21*
