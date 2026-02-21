---
phase: 16-universal-loading-spinner
plan: 01
subsystem: ui
tags: [react, loading-spinner, ux-consistency]

requires:
  - phase: 12-shared-components
    provides: LoadingSpinner component
provides:
  - Universal LoadingSpinner usage across all page-level loading states
  - Eliminated all ad-hoc loading markup from src/pages/
affects: []

tech-stack:
  added: []
  patterns:
    - "LoadingSpinner fullPage for page-level early returns"
    - "LoadingSpinner inline for section/table loading"

key-files:
  created: []
  modified:
    - src/Client/timesheets-web/src/pages/WeeklyTimeEntries.tsx
    - src/Client/timesheets-web/src/pages/SystemReports.tsx
    - src/Client/timesheets-web/src/pages/CalendarView.tsx
    - src/Client/timesheets-web/src/pages/TimeOffRequests.tsx
    - src/Client/timesheets-web/src/pages/AdminUserDetails.tsx
    - src/Client/timesheets-web/src/pages/TeamMemberDetails.tsx
    - src/Client/timesheets-web/src/pages/SystemSettings.tsx
    - src/Client/timesheets-web/src/pages/TimeEntries.tsx
    - src/Client/timesheets-web/src/pages/TimeOffSummary.tsx

key-decisions:
  - "Button-level submission spinners (progress_activity in save/submit buttons) left as-is — out of scope for page-level loading consistency"
  - "Dash placeholders ('--') in TimeOffSummary stat cards kept as-is — number-slot placeholders, not styled loading UI"

patterns-established:
  - "fullPage prop for page-level loading (SystemReports, AdminUserDetails, TeamMemberDetails)"
  - "Inline LoadingSpinner with message prop for section loading"
  - "Default md size everywhere — no size='sm' usage"

requirements-completed: [UX-05]

duration: 5min
completed: 2026-02-21
---

# Phase 16: Universal Loading Spinner Summary

**Replaced 10 ad-hoc loading indicators with shared LoadingSpinner across 9 pages, standardized all sizes to md**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21
- **Completed:** 2026-02-21
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Replaced 10 ad-hoc loading blocks (progress_activity icons, hourglass_empty guards, plain "Loading..." text) with LoadingSpinner
- Standardized 3 existing LoadingSpinner instances in TimeOffSummary from size="sm" to default md
- Zero ad-hoc page-level loading markup remains in src/pages/

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace ad-hoc loading indicators across 8 pages** - `3493787` (feat)
2. **Task 2: Standardize TimeOffSummary LoadingSpinner size** - `21651df` (fix)

## Files Created/Modified
- `src/Client/timesheets-web/src/pages/WeeklyTimeEntries.tsx` - LoadingSpinner for clock status and time entry grid loading
- `src/Client/timesheets-web/src/pages/SystemReports.tsx` - LoadingSpinner fullPage for initial load
- `src/Client/timesheets-web/src/pages/CalendarView.tsx` - LoadingSpinner for calendar data and subscribe modal
- `src/Client/timesheets-web/src/pages/TimeOffRequests.tsx` - LoadingSpinner for request list loading
- `src/Client/timesheets-web/src/pages/AdminUserDetails.tsx` - LoadingSpinner fullPage for initial load
- `src/Client/timesheets-web/src/pages/TeamMemberDetails.tsx` - LoadingSpinner fullPage for initial load
- `src/Client/timesheets-web/src/pages/SystemSettings.tsx` - LoadingSpinner for settings loading
- `src/Client/timesheets-web/src/pages/TimeEntries.tsx` - LoadingSpinner in table row loading
- `src/Client/timesheets-web/src/pages/TimeOffSummary.tsx` - Size standardized from sm to md

## Decisions Made
- Button-level submission spinners (progress_activity in save/submit buttons) left as-is — different concern from page loading
- Dash placeholders in TimeOffSummary stat cards kept — number slots, not loading UI

## Deviations from Plan
None - plan executed as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All page-level loading states use consistent LoadingSpinner component
- Ready for Phase 17 or verification

---
*Phase: 16-universal-loading-spinner*
*Completed: 2026-02-21*
