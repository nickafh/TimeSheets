---
phase: 08-clock-in-out
plan: 03
subsystem: ui
tags: [dashboard, clock-status, needs-attention, hourly, manager, react]

# Dependency graph
requires:
  - phase: 08-clock-in-out
    plan: 01
    provides: ClockPunches API endpoints (status, needs-attention, correct)
  - phase: 08-clock-in-out
    plan: 02
    provides: ClockPunch DTOs and API helpers in api.ts
provides:
  - Clock status card on employee Dashboard for hourly employees (read-only, live elapsed time)
  - Needs Attention card on Manager Dashboard listing incomplete punch records
  - Correction modal for managers to edit punch times with audit trail
affects: [08-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [conditional-dashboard-card-by-paytype, live-elapsed-time-ticker, correction-modal-with-audit-trail]

key-files:
  created: []
  modified:
    - src/Client/timesheets-web/src/pages/Dashboard.tsx
    - src/Client/timesheets-web/src/pages/ManagerDashboard.tsx

key-decisions:
  - "Clock status card spans full width at top of dashboard grid for visual prominence"
  - "Status dot with glow effect indicates active clock states (clocked_in, lunch_in)"
  - "Elapsed time frozen during lunch break showing pre-lunch worked time"
  - "Needs Attention card positioned between Quick Stats and Pending PTO for manager visibility"
  - "Correction modal uses datetime-local inputs pre-filled with existing punch times"
  - "Changes detected by 1-minute threshold to avoid false positives from rounding"

patterns-established:
  - "Conditional card rendering based on user.payType from auth context"
  - "Live elapsed time using setInterval(1000ms) with cleanup on unmount"
  - "Grouped needs-attention items by userId+punchDate with missing punch detection"

requirements-completed: [CLK-07, CLK-08]

# Metrics
duration: 7min
completed: 2026-02-21
---

# Phase 8 Plan 3: Dashboard Clock Cards Summary

**Clock status card with live elapsed time for hourly employees on Dashboard, and Needs Attention card with punch correction modal for managers on Manager Dashboard**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-21T08:04:36Z
- **Completed:** 2026-02-21T08:11:07Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Hourly employees see a clock status card at the top of their Dashboard showing current state, live elapsed time, today's punch log, and total hours when clocked out
- Salary employees see no change to their Dashboard (card conditionally hidden)
- Managers see a Needs Attention card listing team members with incomplete punch records, with existing punches displayed and missing punches highlighted
- Correction modal allows managers to edit individual punch times, which saves corrections with audit trail via the correct API endpoint

## Task Commits

Each task was committed atomically:

1. **Task 1: Add clock status card to employee Dashboard** - `d23bae0` (feat)
2. **Task 2: Add Needs Attention card to Manager Dashboard** - `5db7359` (feat)

## Files Created/Modified
- `src/Client/timesheets-web/src/pages/Dashboard.tsx` - Added conditional clock status card for hourly employees with live elapsed time, punch log, status indicator, and link to Time Entries
- `src/Client/timesheets-web/src/pages/ManagerDashboard.tsx` - Added Needs Attention card with incomplete punch list, missing punch detection, Fix button, and correction modal with datetime-local inputs

## Decisions Made
- Clock status card placed as full-width card at the top of the dashboard grid (before existing cards) for immediate visibility
- Status dot indicator uses color-coded glow effect: green for active states, amber for lunch, gray for not started, navy for clocked out
- Elapsed time display uses monospace font for stability while ticking; frozen during lunch break to show pre-lunch worked time
- Needs Attention card uses amber border when items exist, green "All clear" message with checkmark when empty
- Correction modal pre-fills datetime-local inputs with existing punch times and detects changes by comparing timestamps with a 1-minute threshold
- Missing punch detection checks for expected punch types (ClockOut always expected, LunchIn expected if LunchOut exists)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed duplicate ClockPunch DTOs and API functions from api.ts**
- **Found during:** Task 1 (Dashboard build verification)
- **Issue:** The plan instructed adding ClockPunch types and API helpers to api.ts, but Plan 08-02 had already committed them. My addition created duplicates causing TypeScript "Cannot redeclare exported variable" errors.
- **Fix:** Removed the duplicate block (interfaces + functions) that I added, keeping the original set from Plan 08-02.
- **Files modified:** src/Client/timesheets-web/src/api.ts (returned to committed state)
- **Verification:** `npm run build` succeeded after removal
- **Committed in:** d23bae0 (part of Task 1 commit -- api.ts returned to its committed state so not in diff)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix for build success. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dashboard clock status card and Manager Needs Attention card fully integrated with ClockPunches API
- Plan 08-04 can build on the complete frontend integration

## Self-Check: PASSED

- [x] Dashboard.tsx exists
- [x] ManagerDashboard.tsx exists
- [x] 08-03-SUMMARY.md exists
- [x] Commit d23bae0 found (Task 1)
- [x] Commit 5db7359 found (Task 2)

---
*Phase: 08-clock-in-out*
*Completed: 2026-02-21*
