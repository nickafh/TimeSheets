---
phase: 08-clock-in-out
verified: 2026-02-21T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
human_verification:
  - test: "Full clock flow: Clock In -> Lunch Out -> Lunch In -> Clock Out"
    expected: "Each punch records instantly, live elapsed time ticks during active states, pauses during lunch, shows total hours on Clock Out, no errors"
    why_human: "State machine transitions and real-time UI behavior cannot be verified without a running application and live interaction"
  - test: "Undo toast functionality"
    expected: "After any punch, a toast appears at the bottom with an Undo link; clicking Undo within 5 seconds reverses the punch and returns to prior state; toast auto-dismisses after 5 seconds"
    why_human: "Timer-based auto-dismiss and undo interaction requires real-time execution to verify"
  - test: "Read-only weekly summary refreshes after Clock Out"
    expected: "After clocking out, the weekly summary table below the clock controls updates to show today's calculated hours without a page reload"
    why_human: "Live state dependency on clockStatus.currentState triggering a re-fetch requires actual execution"
  - test: "Dashboard clock status card for hourly employee"
    expected: "Hourly employee Dashboard shows Clock Status card as the first card with correct state label, live elapsed time (ticking), today's punch log, and a 'Go to Time Entries' link; salary employee Dashboard shows no clock card"
    why_human: "Visual rendering, live ticker behavior, and conditional visibility require a running application"
  - test: "Manager Needs Attention card and correction modal"
    expected: "Manager Dashboard shows Needs Attention card listing employees with incomplete punches; Fix button opens modal with datetime-local inputs pre-filled; saving corrections updates punch via API and refreshes the list"
    why_human: "Modal interaction, correction payload, and API integration require a running backend and frontend"
---

# Phase 8: Clock In/Out Verification Report

**Phase Goal:** Hourly employees can track their work time through real-time clock punches that auto-calculate daily hours and flow into the weekly time entry view
**Verified:** 2026-02-21
**Status:** human_needed (all automated checks passed; 5 items require human verification)
**Re-verification:** No - initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /api/clockpunches/punch with PunchType=ClockIn creates a punch with server-side timestamp | VERIFIED | `ClockPunchesController.Punch()` sets `PunchTime = DateTime.UtcNow`, validates PayType==Hourly, state machine enforced via `GetValidNextActions()` |
| 2 | State machine rejects invalid transitions (e.g., ClockOut before ClockIn) | VERIFIED | `GetValidNextActions(lastPunchType)` returns `string[]`; if `!validActions.Contains(request.PunchType)` returns 400 with valid actions listed |
| 3 | POST /api/clockpunches/punch with PunchType=ClockOut calculates worked hours and upserts DailyTimeEntry.WorkedHours | VERIFIED | `CalculateWorkedHours(todayPunches)` called on ClockOut; upserts DailyTimeEntry preserving PtoHours and Notes; confirms `DayType = "Work"` |
| 4 | GET /api/clockpunches/status returns current punch state, valid next actions, and today's punches | VERIFIED | `BuildStatusResponse()` returns `{ currentState, validNextActions, todayPunches, totalHoursToday, clockInTime, lunchMinutes }` |
| 5 | DELETE /api/clockpunches/{id}/undo removes most recent punch within undo window | VERIFIED | Undo endpoint validates: belongs to current user, within 30 seconds, is most recent Active punch; hard deletes; reverts DailyTimeEntry.WorkedHours if ClockOut undone |
| 6 | Stale open punches from previous days are auto-flagged as NeedsAttention on startup | VERIFIED | `Program.cs` queries `PunchDate < DateTime.UtcNow.Date && Status == "Active" && PunchType != "ClockOut"`, groups by UserId+PunchDate, sets Status="NeedsAttention" if no ClockOut found |
| 7 | Manager/Admin can correct punch times via PUT endpoint with audit trail | VERIFIED | `PUT /api/clockpunches/{id}/correct` sets `OriginalPunchTime`, `CorrectedByUserId`, `CorrectedAt`; recalculates hours if ClockIn+ClockOut present; resolves NeedsAttention -> Active |
| 8 | Hourly employee navigating to Time Entries sees clock controls instead of the weekly grid | VERIFIED | `WeeklyTimeEntries.tsx` derives `isHourly = authUser?.payType === "Hourly"`; renders `<HourlyClockView>` if isHourly; salary path guarded with `if (isHourly) return` in all salary-only effects |
| 9 | Dashboard shows clock status card for hourly, hidden for salary | VERIFIED | `Dashboard.tsx` has `isHourly = user?.payType === "Hourly"`; `renderClockStatusCard()` returns null if !isHourly; card positioned in first grid cell only for hourly |
| 10 | Manager Dashboard shows Needs Attention card with correction modal | VERIFIED | `ManagerDashboard.tsx` imports `fetchNeedsAttention`, `correctPunchTime`, `NeedsAttentionItemDto`; loads on mount; renders card with Fix button and datetime-local correction modal |

**Score:** 10/10 truths verified (automated checks)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/Server/Timesheets.Api/Models/ClockPunch.cs` | ClockPunch entity with PunchType, PunchTime, PunchDate, Status, audit fields | VERIFIED | All properties present: Id, UserId, PunchDate, PunchTime, PunchType, Status, OriginalPunchTime, CorrectedByUserId, CorrectedAt, User navigation property |
| `src/Server/Timesheets.Api/Controllers/ClockPunchesController.cs` | Punch, Status, Undo, NeedsAttention, Correct, History endpoints | VERIFIED | 472 lines; 6 endpoints implemented: POST punch, GET status, DELETE undo, GET needs-attention, PUT correct, GET history; private helpers GetValidNextActions, CalculateWorkedHours, BuildStatusResponse |
| `src/Client/timesheets-web/src/api.ts` | ClockPunchDto, ClockStatusDto, NeedsAttentionItemDto interfaces + 6 helper functions | VERIFIED | All 3 interfaces and 6 functions present: recordPunch, fetchClockStatus, undoLastPunch, fetchNeedsAttention, correctPunchTime, fetchPunchHistory; deleteJson helper exists and is wired |
| `src/Client/timesheets-web/src/pages/WeeklyTimeEntries.tsx` | Conditional rendering: clock controls for hourly, weekly grid for salary | VERIFIED | HourlyClockView inline function with state machine buttons, elapsed timer, undo toast, weekly summary table; isHourly gates salary-only effects |
| `src/Client/timesheets-web/src/pages/Dashboard.tsx` | Clock status card for hourly employees | VERIFIED | renderClockStatusCard() with live elapsed time, punch log, state badge, total hours, Go to Time Entries link; guarded by isHourly |
| `src/Client/timesheets-web/src/pages/ManagerDashboard.tsx` | Needs Attention card for managers | VERIFIED | NeedsAttentionItemDto state, fetchNeedsAttention on mount, correction modal with datetime-local inputs and correctPunchTime calls |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ClockPunchesController.Punch() | DailyTimeEntry upsert | Calculates hours on ClockOut | WIRED | Pattern `DailyTimeEntries.*WorkedHours` confirmed; `dailyEntry.WorkedHours = workedHours` on line 200 |
| Program.cs | ClockPunches table | CREATE TABLE IF NOT EXISTS | WIRED | `CREATE TABLE IF NOT EXISTS ClockPunches` present in Program.cs |
| WeeklyTimeEntries.tsx | /api/clockpunches/punch | recordPunch() from api.ts | WIRED | Imports `recordPunch`, called in `handlePunch()` on button click |
| WeeklyTimeEntries.tsx | /api/clockpunches/status | fetchClockStatus() from api.ts | WIRED | Imports `fetchClockStatus`, called on mount via useEffect |
| WeeklyTimeEntries.tsx | useAuth().user.payType | Conditional rendering by payType | WIRED | `const isHourly = authUser?.payType === "Hourly"` gates HourlyClockView |
| Dashboard.tsx | /api/clockpunches/status | fetchClockStatus() from api.ts | WIRED | Imports `fetchClockStatus`, called in useEffect gated by isHourly |
| ManagerDashboard.tsx | /api/clockpunches/needs-attention | fetchNeedsAttention() from api.ts | WIRED | Imports `fetchNeedsAttention`, called on mount; also called in `refreshNeedsAttention()` after corrections |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| CLK-01 | 08-01, 08-02, 08-04 | Hourly employees can clock in with a real-time timestamp | SATISFIED | POST /api/clockpunches/punch with PunchType=ClockIn; server-generated DateTime.UtcNow; frontend Clock In button calls recordPunch("ClockIn") |
| CLK-02 | 08-01, 08-02, 08-04 | Hourly employees can clock out for lunch with a real-time timestamp | SATISFIED | Same punch endpoint; state machine validates prior ClockIn; LunchOut button enabled only when valid |
| CLK-03 | 08-01, 08-02, 08-04 | Hourly employees can clock back in from lunch with a real-time timestamp | SATISFIED | Same punch endpoint; state machine validates prior LunchOut; LunchIn button enabled only when valid |
| CLK-04 | 08-01, 08-02, 08-04 | Hourly employees can clock out for the day with a real-time timestamp | SATISFIED | ClockOut punch triggers hours calculation; "Day Complete" state shown in UI |
| CLK-05 | 08-01, 08-02, 08-04 | System auto-calculates daily worked hours from clock punches and syncs to DailyTimeEntry | SATISFIED | CalculateWorkedHours() on ClockOut upserts DailyTimeEntry.WorkedHours; preserves PtoHours and Notes |
| CLK-06 | 08-02, 08-04 | Hourly employees see punch-derived hours as read-only in the weekly time entry grid | SATISFIED | HourlyClockView renders read-only weekly summary table fetching from fetchDailyTimeEntries; no editable inputs for hourly users |
| CLK-07 | 08-01, 08-03, 08-04 | Incomplete punch records are flagged as "Needs Attention" (not auto-calculated) | SATISFIED | Stale punch auto-flag in Program.cs on startup; GET /api/clockpunches/needs-attention endpoint; ManagerDashboard Needs Attention card |
| CLK-08 | 08-03, 08-04 | Hourly employees see a clock status card on their dashboard | SATISFIED | Dashboard.tsx renderClockStatusCard() for hourly; shows current state, elapsed time, punch log, total hours; live 1-second ticker |
| CLK-09 | 08-02, 08-04 | Clock In/Out appears as a nav item only for hourly employees | SATISFIED (by documented interpretation) | RESEARCH.md explicitly addresses this conflict: CONTEXT.md locked decision prohibits a separate nav item; requirement intent (clock functionality only for hourly) is satisfied by conditional rendering on Time Entries page. Sidebar has no pay-type filtering because no separate nav item exists. |

All 9 CLK requirements accounted for. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No stubs, placeholders, or incomplete implementations detected |

Both backend (`dotnet build`: 0 errors, 1 pre-existing warning in DailyTimeEntriesController unrelated to this phase) and frontend (`npm run build`: succeeds, TypeScript strict mode passes) compile cleanly.

---

### Human Verification Required

#### 1. Full Clock Flow End-to-End

**Test:** Log in as an hourly employee. Navigate to Time Entries. Click Clock In, then Lunch Out, then Lunch In, then Clock Out.
**Expected:** Each punch records instantly; live elapsed time ticks in HH:MM:SS format when clocked in or back from lunch; elapsed time pauses during lunch; "Day Complete" with total hours displayed after Clock Out; read-only weekly summary below updates to show today's hours.
**Why human:** Real-time UI behavior, state transitions, and live timer cannot be verified by static code analysis alone.

#### 2. Undo Toast Functionality

**Test:** Log in as an hourly employee. Navigate to Time Entries. Click Clock In and immediately click the Undo link in the toast.
**Expected:** Toast appears at bottom of screen with "Undo" link; clicking Undo within 5 seconds reverses the punch; state returns to "not started"; toast auto-dismisses if Undo not clicked.
**Why human:** Timer-based behavior and UI toast interaction require live execution.

#### 3. Read-Only Weekly Summary Auto-Refresh

**Test:** Log in as hourly employee. Complete a full day (Clock Out). Observe the weekly summary table beneath the clock controls.
**Expected:** After Clock Out, the weekly summary table updates to show today's calculated hours (pulled from DailyTimeEntry) without a page reload.
**Why human:** The weekly summary fetches on `clockStatus.currentState` change — this dependency chain requires execution to observe.

#### 4. Dashboard Clock Status Card

**Test:** Log in as hourly employee. Navigate to Dashboard. Observe the Clock Status card.
**Expected:** Clock Status card appears as the first card; shows correct human-readable state label; shows live elapsed time ticking every second when clocked in; shows today's punch log with formatted times; shows total hours when day is complete; includes "Go to Time Entries" link. Log in as salary employee and confirm no clock card is present.
**Why human:** Visual layout, live ticker, and conditional visibility require a running application.

#### 5. Manager Needs Attention Card and Correction Modal

**Test:** With an incomplete punch on record (employee who clocked in but never clocked out), restart the backend (triggers stale punch detection). Log in as manager. Navigate to Manager Dashboard.
**Expected:** Needs Attention card lists the employee with their incomplete punch date, shows existing punches, indicates missing ClockOut. Click Fix, enter a corrected ClockOut time, save. Verify the card updates to "All clear" and the DailyTimeEntry is updated with calculated hours.
**Why human:** Requires a realistic data state (stale punch), modal interaction, and API round-trip to verify end-to-end.

---

### Notes

**CLK-09 Interpretation:** The REQUIREMENTS.md says "Clock In/Out appears as a nav item only for hourly employees." The CONTEXT.md locked decision (pre-implementation) says "No separate nav item." RESEARCH.md documents this conflict at line 417-420 and explicitly recommends satisfying the requirement's intent via conditional rendering. This decision was made before any code was written and is consistent across all plan files. The Sidebar has no pay-type filtering, which is correct per the locked decision. Verifier accepts this interpretation as intentional.

**Build Status:** Backend compiles cleanly (0 errors). Frontend TypeScript strict mode passes (0 errors, 0 warnings from phase 08 files). The only build warning is a pre-existing CS0162 in DailyTimeEntriesController.cs, unrelated to this phase.

---

_Verified: 2026-02-21_
_Verifier: Claude (gsd-verifier)_
