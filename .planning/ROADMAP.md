# Roadmap: TimeSheets

## Milestones

- ✅ **v1.0 Mobile Fix** — Phases 1-5 (shipped 2026-02-10)
- ✅ **v1.1 Pay Types & Time Tracking** — Phases 6-11 (shipped 2026-02-21)
- 🚧 **v1.2 Polish & Hardening** — Phases 12-17 (in progress)

## Phases

<details>
<summary>✅ v1.0 Mobile Fix (Phases 1-5) — SHIPPED 2026-02-10</summary>

- [x] Phase 1: Layout Foundation (1/1 plans) — completed 2026-02-10
- [x] Phase 2: Touch & Form Patterns (2/2 plans) — completed 2026-02-10
- [x] Phase 3: Employee Pages (1/1 plans) — completed 2026-02-10
- [x] Phase 4: Manager Pages (3/3 plans) — completed 2026-02-10
- [x] Phase 5: Admin Pages (3/3 plans) — completed 2026-02-10

See: `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.1 Pay Types & Time Tracking (Phases 6-11) — SHIPPED 2026-02-21</summary>

- [x] Phase 6: Pay Type Classification (2/2 plans) — completed 2026-02-20
- [x] Phase 7: Overtime Tracking (2/2 plans) — completed 2026-02-20
- [x] Phase 8: Clock In/Out (4/4 plans) — completed 2026-02-21
- [x] Phase 9: Early Closure Calendar (1/1 plan) — completed 2026-02-21
- [x] Phase 10: Email Styling (1/1 plan) — completed 2026-02-21
- [x] Phase 11: ManageUsers Quick-Create Fix (1/1 plan) — completed 2026-02-21

See: `.planning/milestones/v1.1-ROADMAP.md` for full details.

</details>

### v1.2 Polish & Hardening (In Progress)

**Milestone Goal:** Fix mobile UI overflow bugs, replace all native browser dialogs with styled components, standardize error/loading/empty states, and clean up known tech debt.

- [x] **Phase 12: Shared Components Infrastructure** - Build ErrorBoundary, Toast, ConfirmDialog, LoadingSpinner, and EmptyState as reusable shared components (completed 2026-02-21)
- [x] **Phase 13: Mobile UI Overflow Fixes** - Fix header button overflow on admin pages and bottom nav white space on iPhone (completed 2026-02-21)
- [x] **Phase 14: Alert/Confirm Replacement and Error States** - Replace all alert()/confirm() with Toast/ConfirmDialog and add visible error/loading/empty states to every page (completed 2026-02-21)
- [x] **Phase 15: Code Cleanup** - Eliminate hardcoded literals, dead code, silent catch blocks, and CSS hacks (completed 2026-02-21)
- [ ] **Phase 16: Universal LoadingSpinner Adoption** - Replace all remaining ad-hoc loading indicators with shared LoadingSpinner across 7 pages
- [ ] **Phase 17: iPhone Bottom Nav Verification** - Verify MOB-03 fix (100dvh) on physical iPhone device

## Phase Details

### Phase 12: Shared Components Infrastructure
**Goal**: Reusable UI primitives exist for error recovery, user feedback, and data state representation
**Depends on**: Nothing (first phase of v1.2)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05
**Success Criteria** (what must be TRUE):
  1. A JavaScript render error in any page component shows a styled recovery UI with a retry option instead of a white screen
  2. Toast notifications can be triggered from any page for success, error, and info messages, and auto-dismiss after a timeout
  3. A styled confirmation modal appears when invoked, blocks the action until the user confirms or cancels, and returns the user's choice
  4. A shared LoadingSpinner component renders identically wherever used, replacing ad-hoc loading markup
  5. A shared EmptyState component renders identically wherever used, replacing ad-hoc "no data" markup
**Plans**: 3 plans
Plans:
- [ ] 12-01-PLAN.md — LoadingSpinner and EmptyState presentational components
- [ ] 12-02-PLAN.md — Toast and ConfirmDialog with Context/Portal
- [ ] 12-03-PLAN.md — ErrorBoundary and provider wiring into App/PageWrapper

### Phase 13: Mobile UI Overflow Fixes
**Goal**: Admin pages and bottom navigation render correctly on iPhone 375px without overflow or spacing gaps
**Depends on**: Nothing (CSS-only, independent of Phase 12)
**Requirements**: MOB-01, MOB-02, MOB-03
**Success Criteria** (what must be TRUE):
  1. ManageUsers page header buttons (Edit, Password Reset, Deactivate) are fully visible and tappable at 375px without horizontal scrolling
  2. ManageNotifications page header and action buttons are fully visible and tappable at 375px without horizontal scrolling
  3. Bottom navigation bar has no white space gap above it while scrolling on a real iPhone
**Plans**: 2 plans
Plans:
- [ ] 13-01-PLAN.md — OverflowMenu component and integration into AdminUserDetails + ManageNotifications
- [ ] 13-02-PLAN.md — Bottom nav white space fix with 100dvh viewport units

### Phase 14: Alert/Confirm Replacement and Error States
**Goal**: All user-facing feedback uses styled components instead of native browser dialogs, and every page handles error, loading, and empty states visibly
**Depends on**: Phase 12 (requires Toast, ConfirmDialog, LoadingSpinner, EmptyState components)
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06
**Success Criteria** (what must be TRUE):
  1. No native alert() dialogs appear anywhere in the app; all notifications use the Toast component
  2. All destructive actions (delete, deactivate, deny) show a styled ConfirmDialog modal instead of native confirm()
  3. Dashboard sections and pages with data fetches show inline error messages when requests fail, instead of silently logging to console
  4. All pages show the shared LoadingSpinner during data fetches and the shared EmptyState when no data exists
**Plans**: 3 plans
Plans:
- [ ] 14-01-PLAN.md — Convert ManageHolidays, ManageNotifications, ManageUsers (29 alerts, 6 confirms)
- [ ] 14-02-PLAN.md — Dashboard per-section error states and ManagerDashboard local toast migration
- [ ] 14-03-PLAN.md — Convert remaining 8 pages (ApprovePto, AdminDashboard, TeamTimeEntries, CalendarView, TimeOffSummary, SystemReports, TimeOffRequests, SystemSettings)

### Phase 15: Code Cleanup
**Goal**: Known tech debt items are resolved without changing any user-visible behavior
**Depends on**: Phase 14 (avoids merge conflicts with high-touch Phase 14 changes)
**Requirements**: CODE-01, CODE-02, CODE-03, CODE-04, CODE-05
**Success Criteria** (what must be TRUE):
  1. All overtime threshold comparisons use the shared OT_THRESHOLD constant with zero hardcoded `40` literals remaining
  2. calculateDailyOvertime is exported and importable from a shared module, and the dead editingUser branch is removed from ManageUsers
  3. No empty catch blocks exist in the codebase, and the CSS !important override on page-container padding is removed
**Plans**: 2 plans
Plans:
- [ ] 15-01-PLAN.md — Extract overtime utils to shared module and remove dead editingUser code
- [ ] 15-02-PLAN.md — Replace empty catch blocks with console.error and remove CSS !important override

### Phase 16: Universal LoadingSpinner Adoption
**Goal**: Every page with a data fetch uses the shared LoadingSpinner component instead of ad-hoc loading markup
**Depends on**: Phase 12 (LoadingSpinner component exists)
**Requirements**: UX-05
**Gap Closure:** Closes UX-05 gap from v1.2 audit
**Success Criteria** (what must be TRUE):
  1. TimeOffSummary.tsx uses LoadingSpinner for all 3 loading states (replacing ad-hoc hourglass_empty blocks)
  2. WeeklyTimeEntries.tsx uses LoadingSpinner for both loading indicators
  3. SystemReports.tsx, CalendarView.tsx, TimeOffRequests.tsx, AdminUserDetails.tsx, TeamMemberDetails.tsx each use LoadingSpinner for their loading states
  4. Zero ad-hoc loading markup remains across all pages in src/pages/
Plans:
- [ ] 16-01-PLAN.md — Replace ad-hoc loading indicators with LoadingSpinner across 7 pages

### Phase 17: iPhone Bottom Nav Verification
**Goal**: Confirm bottom navigation has no white space gap on physical iPhone after 100dvh CSS fix
**Depends on**: Phase 13 (100dvh fix already applied)
**Requirements**: MOB-03
**Gap Closure:** Closes MOB-03 gap from v1.2 audit — requires physical device testing
**Success Criteria** (what must be TRUE):
  1. Bottom navigation bar has no white space gap above it while scrolling on a physical iPhone (Safari)
  2. Navigation remains fixed at bottom during scroll with dynamic toolbar
Plans:
- [ ] 17-01-PLAN.md — Physical iPhone verification checklist and any corrective fixes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Layout Foundation | v1.0 | 1/1 | Complete | 2026-02-10 |
| 2. Touch & Form Patterns | v1.0 | 2/2 | Complete | 2026-02-10 |
| 3. Employee Pages | v1.0 | 1/1 | Complete | 2026-02-10 |
| 4. Manager Pages | v1.0 | 3/3 | Complete | 2026-02-10 |
| 5. Admin Pages | v1.0 | 3/3 | Complete | 2026-02-10 |
| 6. Pay Type Classification | v1.1 | 2/2 | Complete | 2026-02-20 |
| 7. Overtime Tracking | v1.1 | 2/2 | Complete | 2026-02-20 |
| 8. Clock In/Out | v1.1 | 4/4 | Complete | 2026-02-21 |
| 9. Early Closure Calendar | v1.1 | 1/1 | Complete | 2026-02-21 |
| 10. Email Styling | v1.1 | 1/1 | Complete | 2026-02-21 |
| 11. ManageUsers Quick-Create Fix | v1.1 | 1/1 | Complete | 2026-02-21 |
| 12. Shared Components Infrastructure | 3/3 | Complete    | 2026-02-21 | - |
| 13. Mobile UI Overflow Fixes | 2/2 | Complete    | 2026-02-21 | - |
| 14. Alert/Confirm Replacement and Error States | 3/3 | Complete    | 2026-02-21 | - |
| 15. Code Cleanup | 2/2 | Complete    | 2026-02-21 | - |
| 16. Universal LoadingSpinner Adoption | v1.2 | 0/1 | Planned | - |
| 17. iPhone Bottom Nav Verification | v1.2 | 0/1 | Planned | - |

---
*Roadmap created: 2026-02-10*
*v1.1 shipped: 2026-02-21*
*v1.2 roadmap added: 2026-02-21*
