# Requirements: TimeSheets v1.2 Polish & Hardening

**Defined:** 2026-02-21
**Core Value:** Accurately track employee hours based on pay type and exemption status, with overtime handling and real-time clock punches for hourly workers

## v1.2 Requirements

### Mobile UI Fixes

- [x] **MOB-01**: ManageUsers header buttons (Edit, Password Reset, Deactivate) visible without horizontal overflow at 375px
- [x] **MOB-02**: ManageNotifications header/action buttons visible without horizontal overflow at 375px
- [x] **MOB-03**: Bottom navigation has no white space gap while scrolling on iPhone

### Shared Components

- [x] **COMP-01**: ErrorBoundary component catches render errors and shows recovery UI instead of white screen
- [x] **COMP-02**: Toast notification system extracted from ManagerDashboard with success/error/info variants and auto-dismiss
- [x] **COMP-03**: ConfirmDialog component extracted from ManagerDashboard for destructive action confirmation
- [x] **COMP-04**: Shared LoadingSpinner component replaces ad-hoc loading markup across pages
- [x] **COMP-05**: Shared EmptyState component replaces ad-hoc "no data" markup across pages

### Alert/Confirm Replacement & Error States

- [x] **UX-01**: All alert() calls replaced with Toast notifications (40+ instances across 8+ pages)
- [x] **UX-02**: All confirm() calls replaced with ConfirmDialog modals (10 instances gating destructive actions)
- [x] **UX-03**: Dashboard shows visible error states per section instead of silent console.error
- [x] **UX-04**: Pages with silent catch blocks show user-visible error feedback (9 instances)
- [x] **UX-05**: All pages use standardized LoadingSpinner during data fetches
- [x] **UX-06**: All pages use standardized EmptyState when no data exists

### Code Cleanup

- [x] **CODE-01**: Hardcoded `40` literals replaced with shared OT_THRESHOLD constant (6 instances in WeeklyTimeEntries + Dashboard)
- [x] **CODE-02**: calculateDailyOvertime exported from WeeklyTimeEntries for reuse
- [x] **CODE-03**: Dead editingUser branch removed from ManageUsers handleSubmit
- [ ] **CODE-04**: Silent empty catch blocks replaced with proper error handling (9 instances)
- [ ] **CODE-05**: CSS !important override on page-container padding removed after confirming all pages use page-container

## Future Requirements

### Performance

- **PERF-01**: Audit and optimize bundle size
- **PERF-02**: Add code splitting for admin/manager routes

### Testing

- **TEST-01**: Expand Playwright coverage for mobile viewports
- **TEST-02**: Add component-level tests for shared components

## Out of Scope

| Feature | Reason |
|---------|--------|
| Wholesale !important audit (111 rules) | Most are legitimate (iOS zoom prevention). Only remove the page-container override. |
| Inline style → CSS class migration | Too many files touched, high cascade risk for a polish milestone |
| Backend changes | Entirely frontend milestone — no API or database modifications |
| New features or routes | Polish only — no new pages or capabilities |
| Tablet/iPad layouts | Project targets iPhone 375-390px only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MOB-01 | Phase 13 | Complete |
| MOB-02 | Phase 13 | Complete |
| MOB-03 | Phase 13 | Complete |
| COMP-01 | Phase 12 | Complete |
| COMP-02 | Phase 12 | Complete |
| COMP-03 | Phase 12 | Complete |
| COMP-04 | Phase 12 | Complete |
| COMP-05 | Phase 12 | Complete |
| UX-01 | Phase 14 | Complete |
| UX-02 | Phase 14 | Complete |
| UX-03 | Phase 14 | Complete |
| UX-04 | Phase 14 | Complete |
| UX-05 | Phase 14 | Complete |
| UX-06 | Phase 14 | Complete |
| CODE-01 | Phase 15 | Complete |
| CODE-02 | Phase 15 | Complete |
| CODE-03 | Phase 15 | Complete |
| CODE-04 | Phase 15 | Pending |
| CODE-05 | Phase 15 | Pending |

**Coverage:**
- v1.2 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-21 after roadmap creation*
