# Roadmap: TimeSheets

## Milestones

- ✅ **v1.0 Mobile Fix** -- Phases 1-5 (shipped 2026-02-10)
- 🚧 **v1.1 Pay Types & Time Tracking** -- Phases 6-11 (in progress)

## Phases

<details>
<summary>v1.0 Mobile Fix (Phases 1-5) -- SHIPPED 2026-02-10</summary>

- [x] Phase 1: Layout Foundation (1/1 plans) -- completed 2026-02-10
- [x] Phase 2: Touch & Form Patterns (2/2 plans) -- completed 2026-02-10
- [x] Phase 3: Employee Pages (1/1 plans) -- completed 2026-02-10
- [x] Phase 4: Manager Pages (3/3 plans) -- completed 2026-02-10
- [x] Phase 5: Admin Pages (3/3 plans) -- completed 2026-02-10

See: `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

### v1.1 Pay Types & Time Tracking (In Progress)

**Milestone Goal:** Add salary/hourly classification with exempt/non-exempt status, FLSA-compliant overtime tracking, real-time clock in/out for hourly workers, early closures on the calendar, and styled email notifications.

- [x] **Phase 6: Pay Type Classification** - Admin can classify employees as Salary/Hourly and Exempt/Non-Exempt (completed 2026-02-20)
- [x] **Phase 7: Overtime Tracking** - Non-exempt employees see overtime in weekly view; exempt employees see 40-hour warning (completed 2026-02-20)
- [x] **Phase 8: Clock In/Out** - Hourly employees can clock in/out with real-time punches that auto-calculate daily hours (completed 2026-02-21)
- [ ] **Phase 9: Early Closure Calendar** - Early closures display on the Time Off Calendar with closing time
- [x] **Phase 10: Email Styling** - PTO and system emails use a branded HTML template matching app aesthetic (completed 2026-02-21)
- [x] **Phase 11: ManageUsers Quick-Create Fix** - Add Pay Type/Exemption Status dropdowns to user creation modal (gap closure) (completed 2026-02-21)

## Phase Details

### Phase 6: Pay Type Classification
**Goal**: Admin can classify each employee by pay type and exemption status, enabling conditional behavior across the application
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04
**Success Criteria** (what must be TRUE):
  1. Admin can set any user's pay type to Salary or Hourly from the user management page
  2. Admin can set any user's exemption status to Exempt or Non-Exempt from the user management page
  3. Setting a user to Hourly automatically forces their exemption status to Non-Exempt (and prevents changing it)
  4. Logged-in user's pay type and exemption status are available in the frontend auth context for conditional UI
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md — Backend: User model, database migration, controller CRUD, auth context enrichment
- [ ] 06-02-PLAN.md — Frontend: TypeScript interfaces, auth hook, admin edit form with Hourly=>NonExempt UI

### Phase 7: Overtime Tracking
**Goal**: Non-exempt employees see their weekly overtime calculated and displayed; exempt employees see a warning when exceeding 40 hours
**Depends on**: Phase 6
**Requirements**: OT-01, OT-02, OT-03, OT-04
**Success Criteria** (what must be TRUE):
  1. Non-exempt employees see a read-only Overtime row in the weekly time entry view showing hours beyond 40 worked hours
  2. Overtime calculation counts only worked hours (PTO hours and holiday hours are excluded from the 40-hour threshold)
  3. Exempt employees see an informational warning banner when their weekly worked hours exceed 40
  4. Overtime calculation respects the workweek start day configured in system settings (not hardcoded)
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Dynamic week start day: extract shared getWeekStart() utility, refactor all weekly views to use SystemSettings workWeekStartDay
- [ ] 07-02-PLAN.md — OT row for non-exempt employees (per-day breakdown), exempt 40-hour warning badge, mobile OT display

### Phase 8: Clock In/Out
**Goal**: Hourly employees can track their work time through real-time clock punches that auto-calculate daily hours and flow into the weekly time entry view
**Depends on**: Phase 6, Phase 7
**Requirements**: CLK-01, CLK-02, CLK-03, CLK-04, CLK-05, CLK-06, CLK-07, CLK-08, CLK-09
**Success Criteria** (what must be TRUE):
  1. Hourly employee can complete a full daily clock flow (Clock In, Lunch Out, Lunch In, Clock Out) with real-time timestamps
  2. After clocking out, the system auto-calculates daily worked hours and the value appears in the weekly time entry grid as read-only
  3. Incomplete punch records (e.g., clocked in but never clocked out) are flagged as "Needs Attention" and not auto-calculated
  4. Hourly employees see a clock status card on their dashboard showing current punch state
  5. Clock In/Out navigation item appears only for hourly employees (salary employees never see it)
**Plans**: 4 plans

Plans:
- [ ] 08-01-PLAN.md — Backend: ClockPunch entity, database table, ClockPunchesController with punch/status/undo/corrections endpoints
- [ ] 08-02-PLAN.md — Frontend: ClockPunch DTOs/API helpers, conditional clock controls on Time Entries page with read-only weekly summary
- [ ] 08-03-PLAN.md — Frontend: Dashboard clock status card for hourly employees, Manager "Needs Attention" card with correction modal
- [ ] 08-04-PLAN.md — Visual verification: end-to-end clock flow testing

### Phase 9: Early Closure Calendar
**Goal**: Employees can see upcoming early closures on the Time Off Calendar with distinct styling and closing times
**Depends on**: Nothing (independent of Phases 6-8)
**Requirements**: CAL-01
**Success Criteria** (what must be TRUE):
  1. Early closures appear on the Time Off Calendar with visually distinct styling (different from holidays and PTO)
  2. The closing time is prominently displayed for each early closure on the calendar
**Plans**: 1 plan

Plans:
- [ ] 09-01-PLAN.md — Fetch early closures, render amber bars/dots/detail panel/legend on CalendarView with holiday overlap suppression

### Phase 10: Email Styling
**Goal**: All PTO and system emails use a professional branded HTML template that renders correctly in Outlook and other email clients
**Depends on**: Nothing (independent of Phases 6-9)
**Requirements**: EML-01, EML-02, EML-03
**Success Criteria** (what must be TRUE):
  1. PTO notification emails (submitted, approved, denied) display with branded header, accent bar, and consistent footer matching the app's visual style
  2. Email templates use table-based layout with inline CSS (no flexbox, no grid) so they render correctly in Outlook desktop
  3. System test email uses the same branded template as PTO notification emails
**Plans**: 1 plan

Plans:
- [ ] 10-01-PLAN.md — Create EmailTemplateService with branded template wrapper, wire into PTO and test email code paths

### Phase 11: ManageUsers Quick-Create Fix
**Goal**: Add Pay Type and Exemption Status dropdowns to the ManageUsers quick-create modal so admins can set classification during user creation instead of requiring a separate edit step
**Depends on**: Phase 6
**Requirements**: PAY-01, PAY-02 (gap closure — create path)
**Gap Closure**: Closes integration and flow gaps from v1.1 audit
**Success Criteria** (what must be TRUE):
  1. ManageUsers quick-create modal includes Pay Type dropdown (Salary/Hourly)
  2. ManageUsers quick-create modal includes Exemption Status dropdown (Exempt/Non-Exempt)
  3. Selecting Hourly auto-sets Exemption Status to Non-Exempt and disables the dropdown (matching AdminUserDetails behavior)
  4. New users created via the modal have correct payType and exemptionStatus persisted to the database
**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md — Add Pay Type and Exemption Status dropdowns to quick-create modal with validation and Hourly->NonExempt auto-lock

## Progress

**Execution Order:**
Phases 6 through 8 execute sequentially (strict dependency chain). Phases 9, 10, and 11 are independent and can execute in parallel with or after Phase 8. Phase 11 depends only on Phase 6 (already complete) so it can execute immediately.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Layout Foundation | v1.0 | 1/1 | Complete | 2026-02-10 |
| 2. Touch & Form Patterns | v1.0 | 2/2 | Complete | 2026-02-10 |
| 3. Employee Pages | v1.0 | 1/1 | Complete | 2026-02-10 |
| 4. Manager Pages | v1.0 | 3/3 | Complete | 2026-02-10 |
| 5. Admin Pages | v1.0 | 3/3 | Complete | 2026-02-10 |
| 6. Pay Type Classification | v1.1 | Complete    | 2026-02-20 | - |
| 7. Overtime Tracking | v1.1 | 2/2 | Complete | 2026-02-20 |
| 8. Clock In/Out | 4/4 | Complete    | 2026-02-21 | - |
| 9. Early Closure Calendar | v1.1 | 0/? | Not started | - |
| 10. Email Styling | 1/1 | Complete   | 2026-02-21 | - |
| 11. ManageUsers Quick-Create Fix | v1.1 | Complete    | 2026-02-21 | 2026-02-21 |

---
*Roadmap created: 2026-02-10*
*v1.1 phases added: 2026-02-20*
