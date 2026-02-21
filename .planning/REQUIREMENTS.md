# Requirements: TimeSheets v1.1

**Defined:** 2026-02-20
**Core Value:** Accurately track employee hours based on pay type and exemption status, with overtime handling and real-time clock punches for hourly workers

## v1.1 Requirements

Requirements for milestone v1.1. Each maps to roadmap phases.

### Pay Type Classification

- [x] **PAY-01**: Admin can set a user's pay type (Salary or Hourly) via user management
- [x] **PAY-02**: Admin can set a user's exemption status (Exempt or Non-Exempt) via user management
- [x] **PAY-03**: System enforces that hourly users are always non-exempt
- [x] **PAY-04**: Pay type and exemption status appear in auth context for conditional UI

### Overtime Tracking

- [x] **OT-01**: Non-exempt employees see a read-only Overtime row in the weekly time entry view showing hours beyond 40
- [x] **OT-02**: Overtime is calculated from worked hours only (PTO and holiday hours excluded)
- [x] **OT-03**: Exempt employees see an informational warning when weekly worked hours exceed 40
- [x] **OT-04**: Overtime calculation uses configured workweek start day from system settings

### Clock In/Out

- [x] **CLK-01**: Hourly employees can clock in with a real-time timestamp
- [x] **CLK-02**: Hourly employees can clock out for lunch with a real-time timestamp
- [x] **CLK-03**: Hourly employees can clock back in from lunch with a real-time timestamp
- [x] **CLK-04**: Hourly employees can clock out for the day with a real-time timestamp
- [x] **CLK-05**: System auto-calculates daily worked hours from clock punches and syncs to DailyTimeEntry
- [x] **CLK-06**: Hourly employees see punch-derived hours as read-only in the weekly time entry grid
- [x] **CLK-07**: Incomplete punch records are flagged as "Needs Attention" (not auto-calculated)
- [ ] **CLK-08**: Hourly employees see a clock status card on their dashboard
- [x] **CLK-09**: Clock In/Out appears as a nav item only for hourly employees

### Calendar

- [ ] **CAL-01**: Early closures display on the Time Off Calendar with distinct styling and closing time shown

### Email Styling

- [ ] **EML-01**: PTO notification emails use a branded HTML template matching the app's visual style
- [ ] **EML-02**: Email template uses table-based layout with inline CSS for Outlook compatibility
- [ ] **EML-03**: System test email uses the same branded template

## v1.2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Clock In/Out Enhancements

- **CLK-10**: Employee can submit a missed punch correction request for manager approval
- **CLK-11**: System sends reminder notification when a punch is incomplete at end of day

### Overtime Reporting

- **OT-05**: Manager can view overtime trending reports for their team
- **OT-06**: Weekly timesheet summary email digest with overtime highlights

## Out of Scope

| Feature | Reason |
|---------|--------|
| GPS/location verification for clock punches | Privacy concerns, single-office company |
| Daily overtime (hours > 8/day) | Georgia follows federal FLSA only (weekly threshold) |
| Overtime blocking/capping | FLSA violation risk -- must pay all hours actually worked |
| Manual time entry for hourly users with punch records | Defeats purpose of punch system; punches are source of truth |
| Clock in/out UI for salary employees | Salary users stay on manual weekly entry |
| Native mobile app | Web-only, responsive design |
| Offline support / PWA | Deferred to v2+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PAY-01 | Phase 6, Phase 11 | Complete |
| PAY-02 | Phase 6, Phase 11 | Complete |
| PAY-03 | Phase 6 | Complete |
| PAY-04 | Phase 6 | Complete |
| OT-01 | Phase 7 | Complete |
| OT-02 | Phase 7 | Complete |
| OT-03 | Phase 7 | Complete |
| OT-04 | Phase 7 | Complete |
| CLK-01 | Phase 8 | Complete |
| CLK-02 | Phase 8 | Complete |
| CLK-03 | Phase 8 | Complete |
| CLK-04 | Phase 8 | Complete |
| CLK-05 | Phase 8 | Complete |
| CLK-06 | Phase 8 | Complete |
| CLK-07 | Phase 8 | Complete |
| CLK-08 | Phase 8 | Pending |
| CLK-09 | Phase 8 | Complete |
| CAL-01 | Phase 9 | Pending |
| EML-01 | Phase 10 | Pending |
| EML-02 | Phase 10 | Pending |
| EML-03 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-21 after Phase 11 execution*
