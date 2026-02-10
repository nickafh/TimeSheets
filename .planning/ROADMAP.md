# Roadmap: TimeSheets Mobile Fix

## Overview

This roadmap transforms the TimeSheets web app from desktop-only to fully mobile-responsive by fixing the responsive foundation first (layout shell, bottom nav, safe areas), establishing shared mobile patterns and components, then systematically fixing employee pages, manager pages, and admin pages. Each phase delivers observable improvements to mobile usability, with Phase 1 fixing critical layout bugs that affect all pages simultaneously.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Layout Foundation** - Fix responsive shell (sidebar, bottom nav, safe areas) ✓
- [ ] **Phase 2: Touch & Form Patterns** - Establish mobile interaction patterns and form standards
- [ ] **Phase 3: Employee Pages** - Fix core user workflows for mobile
- [ ] **Phase 4: Manager Pages** - Make manager workflows mobile-functional
- [ ] **Phase 5: Admin Pages** - Complete mobile coverage with admin interface

## Phase Details

### Phase 1: Layout Foundation
**Goal**: All pages have correct responsive shell with sidebar hidden, bottom nav working, and no content overlap on iPhone
**Depends on**: Nothing (first phase)
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05
**Success Criteria** (what must be TRUE):
  1. Sidebar completely hidden on mobile with no margin-left offset on content area
  2. MobileBottomNav renders correctly at bottom of screen with working navigation
  3. All pages have bottom padding so last items are visible above bottom nav
  4. iPhone notch and home indicator don't cover fixed elements (safe area insets respected)
  5. All pages render at 375px width without horizontal scroll
**Plans:** 1 plan

Plans:
- [x] 01-01-PLAN.md — Fix viewport meta, consolidate bottom padding, migrate all pages to page-container class ✓

### Phase 2: Touch & Form Patterns
**Goal**: All interactive elements are tappable and all forms are usable on mobile devices
**Depends on**: Phase 1
**Requirements**: TOUCH-01, TOUCH-02, TOUCH-03, TOUCH-04, FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. All buttons, nav items, and clickable elements have minimum 44x44px touch targets
  2. All form inputs have 16px+ font size (iOS doesn't auto-zoom on tap)
  3. PTO type dropdown displays readable text on mobile
  4. Hours field is visible when creating time off request on mobile
  5. Time entry cards render without overlapping on mobile
  6. Data tables convert to card layouts on screens under 768px width
**Plans:** 2 plans

Plans:
- [ ] 02-01-PLAN.md — Fix form inputs (16px font), touch targets (44px), and button layout for mobile
- [ ] 02-02-PLAN.md — Add mobile card views for remaining data tables (TimeOffRequests, ManagerDashboard)

### Phase 3: Employee Pages
**Goal**: Employees can complete all core workflows (time entries, PTO requests, calendar) on iPhone
**Depends on**: Phase 2
**Requirements**: PAGE-01, PAGE-02, PAGE-03, PAGE-04, PAGE-05, PAGE-06, PAGE-07
**Success Criteria** (what must be TRUE):
  1. User can log in on iPhone without layout issues or unreadable text
  2. Dashboard displays all cards stacked vertically with readable stats and notifications on mobile
  3. User can view and edit weekly time entries on mobile without overlapping cards
  4. User can view time off request history as mobile-friendly cards
  5. User can submit new time off request using mobile-optimized form
  6. Calendar view displays in mobile-friendly format (list or simplified grid)
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Manager Pages
**Goal**: Managers can approve PTO and view team data on mobile devices
**Depends on**: Phase 3
**Requirements**: MGR-01, MGR-02, MGR-03, MGR-04
**Success Criteria** (what must be TRUE):
  1. Manager dashboard displays team metrics and pending approvals in mobile card layout
  2. Manager can approve or deny PTO requests with tappable buttons and readable details on mobile
  3. Manager can view team time entries in mobile-optimized format
  4. Team member detail pages display profile and time data without layout issues on mobile
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Admin Pages
**Goal**: Admin interface fully functional on mobile for user management and system configuration
**Depends on**: Phase 4
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07
**Success Criteria** (what must be TRUE):
  1. Admin dashboard displays system metrics and navigation in mobile layout
  2. Admin can view and edit user list on mobile with card-based layout
  3. Admin can manage holidays using mobile-optimized interface
  4. Admin can manage notifications on mobile device
  5. System reports display readable data on mobile screens
  6. System settings form is fully usable on mobile with proper input sizing
  7. User detail pages display all information in mobile-friendly format
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Layout Foundation | 1/1 | ✓ Complete | 2026-02-10 |
| 2. Touch & Form Patterns | 0/TBD | Not started | - |
| 3. Employee Pages | 0/TBD | Not started | - |
| 4. Manager Pages | 0/TBD | Not started | - |
| 5. Admin Pages | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-10*
