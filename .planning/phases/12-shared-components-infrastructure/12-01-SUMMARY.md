---
phase: 12-shared-components-infrastructure
plan: 01
subsystem: ui
tags: [react, css-animations, loading-spinner, empty-state, material-symbols]

# Dependency graph
requires: []
provides:
  - "LoadingSpinner component with sm/md/lg size variants and inline/full-page layouts"
  - "EmptyState component with Material Symbols icon, message, and optional CTA button"
  - "pulse-dot CSS keyframe animation for loading dots"
affects: [14-page-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Presentational component pattern: typed props, named export, inline styles with brand colors"
    - "CSS animation injection: app-wide keyframes in index.css, referenced by component inline styles"

key-files:
  created:
    - src/Client/timesheets-web/src/components/LoadingSpinner.tsx
    - src/Client/timesheets-web/src/components/EmptyState.tsx
  modified:
    - src/Client/timesheets-web/src/index.css

key-decisions:
  - "Used inline styles with brand color constants rather than Tailwind classes for consistency with existing component patterns"
  - "Named exports (not default) matching project convention"

patterns-established:
  - "Shared UI primitive pattern: typed props interface, named export, brand colors as constants"

requirements-completed: [COMP-04, COMP-05]

# Metrics
duration: 2min
completed: 2026-02-21
---

# Phase 12 Plan 01: Shared Components Summary

**LoadingSpinner with three pulsing gold dots (sm/md/lg) and EmptyState with Material Symbols icon plus optional CTA button**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-21T16:26:40Z
- **Completed:** 2026-02-21T16:28:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- LoadingSpinner component with configurable size (sm/md/lg), optional message, and inline/full-page layout variants
- EmptyState component with Material Symbols icon, descriptive text, and optional CTA button
- pulse-dot CSS keyframe animation added to index.css for staggered pulsing dot effect

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LoadingSpinner component and pulse-dot CSS animation** - `a680c38` (feat)
2. **Task 2: Create EmptyState component** - `b7a1b99` (feat)

## Files Created/Modified
- `src/Client/timesheets-web/src/components/LoadingSpinner.tsx` - Pulsing dots loading indicator with size variants and full-page support
- `src/Client/timesheets-web/src/components/EmptyState.tsx` - Icon + text empty state with optional CTA button
- `src/Client/timesheets-web/src/index.css` - Added @keyframes pulse-dot animation

## Decisions Made
- Used inline styles with hardcoded brand color values (#C29B40, #002349, #666666) matching existing component patterns in ManagerDashboard rather than introducing CSS classes or Tailwind utilities
- Named exports (not default) to match project-wide convention

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Toast.tsx useRef TypeScript error**
- **Found during:** Task 2 (EmptyState component creation)
- **Issue:** Pre-existing untracked Toast.tsx had `useRef<ReturnType<typeof setTimeout>>()` without initial argument, failing TypeScript strict checks and blocking the build
- **Fix:** Linter auto-fixed to `useRef<ReturnType<typeof setTimeout> | null>(null)`
- **Files modified:** src/Client/timesheets-web/src/components/Toast.tsx
- **Verification:** `npm run build` passes with zero errors
- **Committed in:** b7a1b99 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix was necessary to unblock the build. No scope creep.

## Issues Encountered
None beyond the Toast.tsx deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both components are ready for Phase 14 page integration
- LoadingSpinner replaces ad-hoc loading markup across all pages
- EmptyState replaces inline empty-data displays with consistent UI

---
*Phase: 12-shared-components-infrastructure*
*Completed: 2026-02-21*
