# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Accurately track employee hours based on pay type and exemption status, with overtime handling and real-time clock punches for hourly workers
**Current focus:** Phase 8 - Clock In/Out

## Current Position

Phase: 8 of 11 (Clock In/Out) -- COMPLETE
Plan: 4 of 4 in current phase (08-04 complete)
Status: Phase complete -- ready for Phase 9
Last activity: 2026-02-21 -- Completed 08-04-PLAN.md (verification)

Progress: [################....] 82% (9/11 phases in progress)

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 10
- Average duration: 3.0 minutes
- Total execution time: 0.51 hours

**v1.1 Velocity:**
- Total plans completed: 5
- Average duration: 2.0 minutes
- Total execution time: 0.17 hours

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 06    | 01   | 1 min    | 2     | 4     |
| 06    | 02   | 2 min    | 2     | 4     |
| 07    | 01   | 4 min    | 2     | 5     |
| 07    | 02   | 2 min    | 1     | 1     |
| 11    | 01   | 1 min    | 1     | 1     |
| 08    | 01   | 2 min    | 2     | 4     |
| 08    | 02   | 4 min    | 2     | 2     |
| 08    | 03   | 7 min    | 2     | 2     |
| 08    | 04   | 20 min   | 1     | 2     |

## Accumulated Context

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table.
v1.1 decisions:
- Default PayType=Salary, ExemptionStatus=Exempt for existing employees (06-01: NOT NULL DEFAULT in migration)
- String properties with server-side validation arrays for PayType/ExemptionStatus (matching existing Role pattern)
- Hourly=>NonExempt enforcement applied in both Create and Update controller methods
- ManageUsers quick-create modal uses blank defaults for Pay Type/Exemption Status (requires explicit selection)
- Quick-create dropdowns only shown in create mode; edit uses AdminUserDetails page
- Pay Type and Exemption Status placed after Role in AdminUserDetails form grid for logical grouping
- NonExempt displayed as "Non-Exempt" with hyphen in read-only mode for readability

- Shared dateUtils.ts exports getWeekStart, addDays, toDateOnlyString, getDayName, formatWeekLabel for reuse across pages
- Each page independently fetches workWeekStartDay from SystemSettings on mount (no prop-drilling or context)
- OT_THRESHOLD constant (40) defined once at module level, referenced throughout
- Overtime row uses plain text (not input elements) for read-only display
- Amber (#d97706) color for overtime values and exempt warning badge
- Non-exempt weekly total badge uses "X / 40h" format to show threshold
- Exempt warning badge replaces normal badge only when worked > 40, shows neutral message

- Punch state machine: static helper GetValidNextActions() returns string[] for valid transitions, shared across endpoints
- Hours calculation via shared CalculateWorkedHours() helper, reused in Punch and Correct endpoints
- Hard delete for undo within 30-second window (not soft delete)
- Stale punch detection at startup groups by UserId+PunchDate for batch efficiency
- PayType validation at punch time rejects non-hourly employees with 400

- HourlyClockView inline in WeeklyTimeEntries.tsx (not separate file) to stay within 2-file plan scope
- Weekly summary uses fetchDailyTimeEntries (not fetchPunchHistory) since DailyTimeEntry has calculated hours
- Elapsed timer freezes during lunch by subtracting active lunch duration from total elapsed
- Undo toast uses 5-second auto-dismiss with useRef for cleanup
- Salary-only hooks guarded with `if (isHourly) return;` to prevent unnecessary API calls

v1.1 pending decisions:
- Maximum shift duration for missed-punch flagging (research recommends 12 hours)

v1.1 resolved decisions (08-04):
- [Phase 08]: Clock status card redesigned to compact 2-column layout to fit dashboard 2x2 grid (original plan had full-width)
- [Phase 08]: This Week's Hours card hidden for hourly employees since clock view replaces weekly grid entry
- [Phase 08]: OXC parser stricter than Babel -- conditional JSX requires ternary with null, not && with fragment

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-21 (08-04 verification)
Stopped at: Completed 08-04-PLAN.md -- Phase 08 Clock In/Out fully complete
Resume file: None

---
*State initialized: 2026-02-20*
