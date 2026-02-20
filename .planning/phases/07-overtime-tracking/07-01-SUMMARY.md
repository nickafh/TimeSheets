---
phase: 07-overtime-tracking
plan: 01
subsystem: ui
tags: [react, date-utils, system-settings, weekly-views]

# Dependency graph
requires:
  - phase: 06-pay-type-classification
    provides: SystemSettings API with workWeekStartDay field
provides:
  - Shared getWeekStart() utility in dateUtils.ts for configurable week start
  - All four weekly view pages use dynamic week start from SystemSettings
  - Foundation for correct overtime calculation boundaries (Plan 02)
affects: [07-02-overtime-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared date utilities, per-page SystemSettings fetch for week start]

key-files:
  created:
    - src/Client/timesheets-web/src/utils/dateUtils.ts
  modified:
    - src/Client/timesheets-web/src/pages/WeeklyTimeEntries.tsx
    - src/Client/timesheets-web/src/pages/TeamTimeEntries.tsx
    - src/Client/timesheets-web/src/pages/AdminUserDetails.tsx
    - src/Client/timesheets-web/src/pages/TeamMemberDetails.tsx

key-decisions:
  - "Shared dateUtils.ts exports getWeekStart, addDays, toDateOnlyString, getDayName, formatWeekLabel for reuse across pages"
  - "Each page independently fetches workWeekStartDay from SystemSettings on mount (no prop-drilling or context)"

patterns-established:
  - "Shared date utilities: import from utils/dateUtils.ts instead of inline helpers"
  - "Per-page SystemSettings fetch: each weekly view page independently reads workWeekStartDay"

requirements-completed: [OT-04]

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 7 Plan 1: Dynamic Work Week Start Summary

**Shared getWeekStart() utility replacing hardcoded Monday-start logic across all four weekly view pages, driven by SystemSettings workWeekStartDay**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T22:51:01Z
- **Completed:** 2026-02-20T22:55:01Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created shared `dateUtils.ts` with `getWeekStart(date, startDay)` supporting any day of week (0-6)
- Refactored all four weekly view pages to use dynamic week start from SystemSettings
- Eliminated all hardcoded Monday-start week logic (`getMonday`, `currentMonday`, inline offset calculations)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared dateUtils and refactor WeeklyTimeEntries** - `3490530` (feat)
2. **Task 2: Refactor TeamTimeEntries, AdminUserDetails, TeamMemberDetails** - `e49c6ac` (feat)

## Files Created/Modified
- `src/Client/timesheets-web/src/utils/dateUtils.ts` - Shared date utility with getWeekStart, addDays, toDateOnlyString, getDayName, formatWeekLabel
- `src/Client/timesheets-web/src/pages/WeeklyTimeEntries.tsx` - Uses dynamic week start, renamed currentMonday to currentWeekStart
- `src/Client/timesheets-web/src/pages/TeamTimeEntries.tsx` - Replaced local getMonday with imported getWeekStart
- `src/Client/timesheets-web/src/pages/AdminUserDetails.tsx` - Replaced inline Monday offset calculation with getWeekStart
- `src/Client/timesheets-web/src/pages/TeamMemberDetails.tsx` - Replaced inline Monday offset calculation with getWeekStart

## Decisions Made
- Shared dateUtils.ts exports all common date helpers (getWeekStart, addDays, toDateOnlyString, getDayName, formatWeekLabel) for reuse
- Each page independently fetches workWeekStartDay from SystemSettings on mount, consistent with existing SystemSettings usage pattern
- Default weekStartDay is 1 (Monday) as fallback if SystemSettings fetch fails

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dynamic week start foundation is complete, ready for Plan 02 overtime calculation
- All weekly views respect the configurable work week boundary

---
*Phase: 07-overtime-tracking*
*Completed: 2026-02-20*
