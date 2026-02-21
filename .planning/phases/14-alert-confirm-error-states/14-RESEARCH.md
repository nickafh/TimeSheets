# Phase 14: Alert/Confirm Replacement and Error States - Research

**Researched:** 2026-02-21
**Domain:** React UI feedback patterns - replacing native browser dialogs with styled components
**Confidence:** HIGH

## Summary

Phase 14 is a wiring phase, not a building phase. All four shared components (Toast, ConfirmDialog, LoadingSpinner, EmptyState) already exist from Phase 12 and are already provided at the app level via `ToastProvider` and `ConfirmProvider` in `App.tsx`. The work is purely mechanical: find every `alert()`, `confirm()`, ad-hoc loading state, ad-hoc empty state, and silent `console.error` across all pages, then replace each with the appropriate shared component/hook.

The codebase audit found **40 `alert()` calls** across 8 pages, **10 `confirm()` calls** across 6 pages, **6+ pages with ad-hoc loading markup** ("Loading..." text), **multiple pages with ad-hoc empty states**, and **~15 silent `console.error` catch blocks** across 7 pages (Dashboard, ManagerDashboard, TeamTimeEntries, CalendarView, TimeOffSummary, SystemReports, AdminDashboard) that provide no user-visible feedback.

**Primary recommendation:** Work page-by-page, converting all feedback mechanisms in each file before moving to the next. The ManagerDashboard needs special treatment since it has its own local toast state (lines 26-54) that should be removed in favor of the shared `useToast` hook.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Toast position: top-center
- Toast duration: 5 seconds auto-dismiss for all types
- Toast stacking: one toast at a time -- new toast replaces the previous one
- Confirm dialog tone: direct and neutral ("Are you sure you want to [action]?")
- Confirm dismiss behavior: must click Cancel -- clicking outside does NOT dismiss (modal is locked)
- Fetch errors: error toast fires + content area shows empty/unavailable state
- Empty states with CTAs: yes -- include action buttons where a logical next step exists

### Claude's Discretion
- Toast type categorization (success/error/warning split based on existing alert() usage)
- Confirm button labels (action-specific vs generic "Confirm")
- Confirm dialog visual treatment (red accent for destructive vs uniform)
- Error handling strategy for action failures vs fetch failures
- Dashboard error granularity (per-section vs full-page)
- Retry button inclusion per error context
- Loading indicator choice (spinner vs skeleton per page)
- Empty state visual treatment (text-only vs illustration+text per page)
- Stale data display during page transitions

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | All alert() calls replaced with Toast notifications (40+ instances across 8+ pages) | Complete audit below with exact file/line inventory. Use `useToast()` hook, map success alerts to `showToast(msg, 'success')`, error alerts to `showToast(msg, 'error')`, validation alerts to `showToast(msg, 'error')` |
| UX-02 | All confirm() calls replaced with ConfirmDialog modals (10 instances gating destructive actions) | Complete audit below. Use `useConfirm()` hook, convert `if (!confirm(...))` to `if (!(await confirm(...)))`. ConfirmDialog already returns Promise<boolean> |
| UX-03 | Dashboard shows visible error states per section instead of silent console.error | Dashboard.tsx has 4 independent section loaders (notifications, holidays, PTO, week entries) that silently catch errors. Add per-section error state + error toast |
| UX-04 | Pages with silent catch blocks show user-visible error feedback (9 instances) | Audit identified silent catches in: TeamTimeEntries, CalendarView, TimeOffSummary, SystemReports, ManagerDashboard, AdminDashboard. Add error toast + inline error display |
| UX-05 | All pages use standardized LoadingSpinner during data fetches | 6+ pages have ad-hoc "Loading..." text. Replace with `<LoadingSpinner>` component (supports `fullPage`, `size`, `message` props) |
| UX-06 | All pages use standardized EmptyState when no data exists | Several pages have inline empty state markup. Replace with `<EmptyState>` component (supports `icon`, `message`, `ctaLabel`, `onCtaClick` props) |
</phase_requirements>

## Standard Stack

### Core (Already Installed -- Phase 12)
| Component | Location | Purpose | API |
|-----------|----------|---------|-----|
| Toast/ToastProvider/useToast | `components/Toast.tsx` | Replace all `alert()` calls | `showToast(message, type)` where type = 'success' \| 'error' \| 'info' |
| ConfirmDialog/ConfirmProvider/useConfirm | `components/ConfirmDialog.tsx` | Replace all `confirm()` calls | `await confirm(actionName, confirmLabel?)` returns `Promise<boolean>` |
| LoadingSpinner | `components/LoadingSpinner.tsx` | Replace ad-hoc loading markup | `<LoadingSpinner size? message? fullPage?>` |
| EmptyState | `components/EmptyState.tsx` | Replace ad-hoc empty state markup | `<EmptyState icon message ctaLabel? onCtaClick?>` |

### Supporting (Already Wired)
| Component | Location | Purpose |
|-----------|----------|---------|
| ToastProvider | `App.tsx` line 32 | Wraps entire app -- useToast available everywhere |
| ConfirmProvider | `App.tsx` line 33 | Wraps entire app -- useConfirm available everywhere |
| ErrorBoundary | `App.tsx` line 34 | App-level crash boundary (already in place) |

### No New Dependencies
No npm install needed. This phase uses only existing components.

## Architecture Patterns

### Pattern 1: Replacing alert() with useToast

**What:** Import `useToast` hook, call `showToast()` instead of `alert()`
**When to use:** Every page that currently calls `alert()`

**Toast type mapping (Claude's discretion recommendation):**
- Success messages (e.g., "Holiday created successfully!") -> `showToast(msg, 'success')`
- Error messages (e.g., "Failed to save holiday.") -> `showToast(msg, 'error')`
- Validation warnings (e.g., "Name and Date are required") -> `showToast(msg, 'error')` (user needs to fix something)
- Info/neutral messages (e.g., "No data to export") -> `showToast(msg, 'info')`

**Example:**
```typescript
// Before
alert("Holiday created successfully!");

// After
import { useToast } from "../components/Toast";
const { showToast } = useToast();
showToast("Holiday created successfully!", "success");
```

### Pattern 2: Replacing confirm() with useConfirm

**What:** Import `useConfirm` hook, make the containing function `async`, `await confirm()`
**When to use:** Every page that currently calls `confirm()` or `window.confirm()`

**Key detail:** The `confirm()` call returns a `Promise<boolean>`, so the calling function MUST be async. Most handlers already are async. The ConfirmDialog already uses the locked-modal pattern (no outside-click dismiss).

**Confirm label recommendation (Claude's discretion):**
Use action-specific labels for clarity:
- Delete actions -> `confirm("delete this holiday", "Delete")`
- Deactivate actions -> `confirm("deactivate this user", "Deactivate")`
- Approve actions -> `confirm("approve this PTO request", "Approve")`
- Reset actions -> `confirm("reset all settings to defaults", "Reset")`
- Cancel PTO -> `confirm("cancel this PTO request", "Cancel Request")`

**Example:**
```typescript
// Before
if (!confirm(`Are you sure you want to delete "${holiday.name}"?`)) return;

// After
import { useConfirm } from "../components/ConfirmDialog";
const { confirm } = useConfirm();
if (!(await confirm(`delete "${holiday.name}"`, "Delete"))) return;
```

### Pattern 3: Replacing Ad-Hoc Loading States with LoadingSpinner

**What:** Replace inline loading markup with the shared `LoadingSpinner` component
**When to use:** Every page that shows a loading indicator during data fetches

**Two usage modes:**
1. **Full-page loading** (initial page load): `<LoadingSpinner fullPage message="Loading holidays..." />`
2. **Inline/section loading** (within a card/section): `<LoadingSpinner size="sm" />`

**Example:**
```typescript
// Before (full-page pattern)
if (loading) {
  return (
    <div style={{ minHeight: '100vh', ... }}>
      <span className="material-symbols-outlined" ...>progress_activity</span>
      <span>Loading...</span>
    </div>
  );
}

// After
if (loading) {
  return <LoadingSpinner fullPage message="Loading holidays..." />;
}

// Before (inline/section pattern)
{loadingPto ? (
  <div style={{ padding: '32px 0', textAlign: 'center', color: '#999999', fontStyle: 'italic' }}>Loading...</div>
) : ( ... )}

// After
{loadingPto ? <LoadingSpinner size="sm" /> : ( ... )}
```

### Pattern 4: Replacing Ad-Hoc Empty States with EmptyState

**What:** Replace inline "no data" markup with the shared `EmptyState` component
**When to use:** Every page that shows a message when no data exists

**Example:**
```typescript
// Before
<div style={{ padding: '48px', textAlign: 'center' }}>
  <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>celebration</span>
  <p style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
    No holidays for {selectedYear}
  </p>
</div>

// After
<EmptyState icon="celebration" message={`No holidays for ${selectedYear}`} ctaLabel="Add Holiday" onCtaClick={openAddHolidayModal} />
```

### Pattern 5: Adding Error States to Silent Catches

**What:** Add error toast + optional inline error display where catch blocks only log to console
**When to use:** Every catch block that only calls `console.error` without user feedback

**Two-pronged approach for fetch errors (per CONTEXT.md decision):**
1. Fire an error toast: `showToast("Failed to load data. Please try again.", "error")`
2. Set an error state variable to show inline: `setError("Unable to load data.")`

**For action errors (save, approve, deny):** just an error toast is sufficient since the user initiated the action and is watching.

**Example:**
```typescript
// Before (silent catch)
} catch (error) {
  console.error("Failed to load needs attention:", error);
}

// After
} catch (error) {
  console.error("Failed to load needs attention:", error);
  showToast("Failed to load attention items.", "error");
  setAttentionError("Unable to load attention items.");
}
```

### Pattern 6: Dashboard Per-Section Error States

**What:** Add per-section error state to Dashboard.tsx instead of one global error
**When to use:** Dashboard.tsx specifically (4 independent data loaders)

Dashboard loads 4 sections independently (notifications, holidays/closures, PTO summary, week entries). Each has its own loading state already. Add a corresponding error state per section so if one section fails, the others still render.

**Example:**
```typescript
const [notificationError, setNotificationError] = useState(false);
const [holidayError, setHolidayError] = useState(false);
// ...

// In each loader's catch block:
} catch (error) {
  console.error("Failed to load notifications:", error);
  setNotificationError(true);
}

// In render - show inline error:
{notificationError ? (
  <EmptyState icon="error" message="Unable to load notifications" />
) : ( ... normal content ... )}
```

### Pattern 7: ManagerDashboard Local Toast Migration

**What:** Remove the local toast state and inline toast UI from ManagerDashboard; use shared `useToast`
**When to use:** ManagerDashboard.tsx only

ManagerDashboard (lines 26-54, 1316-1354) has its own local toast implementation predating Phase 12. This must be replaced with the shared `useToast()` hook. The local `type Toast`, `useState<Toast>`, `showToast` callback, and the `{toast && ...}` JSX block at the bottom should all be removed.

### Anti-Patterns to Avoid
- **Mixing local and shared toast:** ManagerDashboard must not keep its local toast AND use the shared one. Remove local entirely.
- **Forgetting async on confirm handlers:** `useConfirm().confirm()` returns a Promise. The calling function must be `async`.
- **Removing console.error:** Keep `console.error` for developer debugging. Add `showToast` ALONGSIDE it, not instead of it.
- **Global loading state hiding partial data:** Dashboard sections load independently. Do not add a single global loading gate that blocks all sections.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | New toast component or local state | `useToast()` from `components/Toast.tsx` | Already exists, app-wide provider already wired |
| Confirmation modals | New modal or local confirm state | `useConfirm()` from `components/ConfirmDialog.tsx` | Already exists, Promise-based API, app-wide provider already wired |
| Loading spinners | Inline loading markup | `<LoadingSpinner>` from `components/LoadingSpinner.tsx` | Already exists, consistent styling, supports fullPage/inline |
| Empty state displays | Inline empty state markup | `<EmptyState>` from `components/EmptyState.tsx` | Already exists, consistent styling, supports CTAs |

**Key insight:** This entire phase is about USING existing components, not building new ones. Every page change follows the same mechanical pattern. No new components needed.

## Common Pitfalls

### Pitfall 1: Forgetting to Make Handlers Async for useConfirm
**What goes wrong:** TypeScript won't error if you call `confirm()` without `await`, but the confirm dialog will flash and immediately resolve, bypassing the user's choice.
**Why it happens:** The original `window.confirm()` is synchronous; `useConfirm().confirm()` is async.
**How to avoid:** Every function that calls `confirm()` must be `async` and must `await` the result.
**Warning signs:** Confirm dialog appears and immediately disappears. Actions execute without waiting for user choice.

### Pitfall 2: Toast Position Mismatch
**What goes wrong:** The existing Toast component renders at `top: 20px, left: 50%` (top-center), which matches the user's locked decision. However, ManagerDashboard's local toast is positioned at `bottom: 24px, right: 24px` (bottom-right).
**Why it happens:** ManagerDashboard was built before Phase 12 shared components.
**How to avoid:** Remove ManagerDashboard's local toast entirely. The shared toast's position is already correct per the user's decision.

### Pitfall 3: Validation Alerts vs Error Alerts
**What goes wrong:** Conflating validation messages ("Name and Date are required") with error messages ("Failed to save").
**Why it happens:** Both currently use `alert()`.
**How to avoid:** Validation alerts (missing required fields) -> `showToast(msg, 'error')`. These are user-facing errors about form input. Success confirmations -> `showToast(msg, 'success')`. API failures -> `showToast(msg, 'error')`.

### Pitfall 4: Not Adding Error State Variables for Fetch Failures
**What goes wrong:** Adding only a toast for fetch failures without an inline error state. The toast auto-dismisses after 5 seconds, leaving the user with an empty page and no indication of what went wrong.
**Why it happens:** It's easy to just add `showToast` and move on.
**How to avoid:** For fetch failures (initial data load), always pair the toast with an inline error state that persists in the content area. For action failures (save/delete), toast alone is fine since the UI context is clear.

### Pitfall 5: ConfirmDialog actionName Formatting
**What goes wrong:** Passing the full question ("Are you sure you want to delete this holiday?") as the actionName, resulting in "You are about to Are you sure you want to delete this holiday?"
**Why it happens:** The ConfirmDialog template says "You are about to {actionName}. This action cannot be undone."
**How to avoid:** Pass only the action verb phrase: `confirm("delete this holiday", "Delete")` produces "You are about to delete this holiday."

## Code Examples

### Complete Page Conversion Example (ManageHolidays Pattern)

```typescript
// Imports to add:
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";

// In component body:
const { showToast } = useToast();
const { confirm } = useConfirm();

// Replace loading state:
if (loading) {
  return <LoadingSpinner fullPage message="Loading holidays..." />;
}

// Replace alert validation:
if (!holidayForm.name || !holidayForm.holidayDate) {
  showToast("Name and Date are required", "error");
  return;
}

// Replace alert success:
showToast("Holiday created successfully!", "success");

// Replace alert error:
showToast("Failed to save holiday. Please try again.", "error");

// Replace confirm:
if (!(await confirm(`delete "${holiday.name}"`, "Delete"))) return;

// Replace empty state:
<EmptyState icon="celebration" message={`No holidays for ${selectedYear}`} ctaLabel="Add Holiday" onCtaClick={openAddHolidayModal} />
```

## Complete Audit: Files and Instances

### alert() Instances (40 total across 8 pages)

| Page | Count | Types |
|------|-------|-------|
| ManageHolidays.tsx | 12 | 4 success, 4 error, 2 validation, 2 success (closures) |
| ManageNotifications.tsx | 10 | 4 success, 4 error, 1 validation, 1 load error |
| ManageUsers.tsx | 7 | 2 success, 3 error, 1 validation, 1 load error |
| ApprovePto.tsx | 5 | 2 success, 2 error, 1 load error |
| AdminDashboard.tsx | 4 | 2 success, 2 error |
| SystemReports.tsx | 1 | 1 info ("No data to export") |
| TimeOffRequests.tsx | 0 | Uses inline error/success state (already correct pattern) |
| ManagerDashboard.tsx | 0 | Uses local toast (needs migration to shared toast) |

### confirm() Instances (10 total across 6 pages)

| Page | Count | Actions |
|------|-------|---------|
| ManageHolidays.tsx | 2 | Delete holiday, delete early closure |
| ManageNotifications.tsx | 2 | Deactivate notification, delete notification |
| ManageUsers.tsx | 2 | Deactivate user, activate user |
| ApprovePto.tsx | 1 | Approve PTO request |
| AdminDashboard.tsx | 1 | Approve PTO request |
| TimeOffRequests.tsx | 1 | Cancel PTO request |
| SystemSettings.tsx | 1 | Reset settings to defaults |

### Silent console.error Catch Blocks (needing user-visible error feedback)

| Page | Count | Sections |
|------|-------|----------|
| Dashboard.tsx | 5 | clock status, notifications, holidays/closures, PTO summary, week entries |
| ManagerDashboard.tsx | 6 | dashboard data, needs attention (2), pending requests, approve, deny, corrections |
| AdminDashboard.tsx | 1 | dashboard data fetch |
| TeamTimeEntries.tsx | 2 | users, time entries |
| CalendarView.tsx | 4 | calendar data, token fetch, copy failures |
| TimeOffSummary.tsx | 2 | data, PTO summary |
| SystemReports.tsx | 1 | report data |

### Pages Needing LoadingSpinner Replacement

| Page | Current Pattern | Replacement |
|------|----------------|-------------|
| ManageHolidays.tsx | Spinner icon + "Loading..." text | `<LoadingSpinner fullPage message="Loading..." />` |
| ApprovePto.tsx | Spinner icon + "Loading..." text | `<LoadingSpinner fullPage message="Loading..." />` |
| TeamTimeEntries.tsx | Spinner icon + "Loading..." text | `<LoadingSpinner fullPage message="Loading..." />` |
| Dashboard.tsx | 5x inline "Loading..." italic text per section | `<LoadingSpinner size="sm" />` per section |
| ManagerDashboard.tsx | 1x full-page ad-hoc + 1x inline "Loading..." | `<LoadingSpinner fullPage />` + `<LoadingSpinner size="sm" />` |
| TimeOffSummary.tsx | 3x inline "Loading..." text | `<LoadingSpinner size="sm" />` per section |

### Pages Needing EmptyState Replacement

| Page | Current Pattern | CTA Recommendation |
|------|----------------|--------------------|
| ManageHolidays.tsx | 2x inline "No holidays/closures" | "Add Holiday" / "Add Closure" buttons |
| ManageNotifications.tsx | Inline "No notifications" (if any) | "Create Notification" button |
| ApprovePto.tsx | "No pending requests" (if any) | None (no action possible) |
| ManagerDashboard.tsx | 2x inline empty states (PTO, attention) | Already styled appropriately -- convert to EmptyState |
| Dashboard.tsx | 2x holiday/closure "No X found" | "View Calendar" link |
| TeamTimeEntries.tsx | Empty table state (if any) | None |

## Special Cases

### ManagerDashboard Local Toast Cleanup
The ManagerDashboard has a complete local toast implementation (type definition line 26, state line 39, showToast callback lines 51-54, JSX render lines 1316-1354). All of this must be removed. The `showToast` calls throughout the component (lines 126, 129, 149, 151, 197, 199, 203) should be updated to use `useToast().showToast` which has the same signature.

### ManagerDashboard Approve/Deny Flow
The ManagerDashboard already uses custom modals for approve/deny (not `confirm()`), so UX-02 does not apply there. It already has the correct UX pattern -- just needs toast migration.

### TimeOffRequests.tsx Already Has Inline Error/Success States
TimeOffRequests.tsx uses inline `error` and `success` state variables instead of alert(). It does use `window.confirm()` for cancel (line 81) which needs UX-02 conversion. The inline error/success pattern is good and could remain alongside toast for persistent feedback.

### SystemSettings.tsx Has Its Own Error Handling
SystemSettings already uses `loadError` state for inline error display. The `confirm()` on line 79 needs UX-02 conversion.

### CalendarView.tsx Copy Clipboard Errors
CalendarView has `console.error('Failed to copy:', err)` in clipboard operations. These should show `showToast("Failed to copy URL", "error")`.

## Open Questions

1. **ManagerDashboard: Keep custom approve/deny modals or replace with ConfirmDialog?**
   - What we know: ManagerDashboard has rich custom modals showing request details (employee, date, hours, reason) plus a deny reason textarea. The shared ConfirmDialog is a simple "Are you sure?" dialog.
   - Recommendation: Keep the custom modals. They provide essential context. The ConfirmDialog is only appropriate for simple yes/no confirmations, not workflows requiring additional input (deny reason).

2. **AdminDashboard: Same approve confirm + deny modal pattern?**
   - What we know: AdminDashboard uses `confirm()` for approve (line 54) and a custom deny modal. The approve confirm should become ConfirmDialog; the deny modal should remain custom.
   - Recommendation: Replace the approve `confirm()` with `useConfirm()`, keep the custom deny modal.

## Sources

### Primary (HIGH confidence)
- Direct codebase audit of all 19 page files and 7 component files
- `src/Client/timesheets-web/src/components/Toast.tsx` -- Toast API verified
- `src/Client/timesheets-web/src/components/ConfirmDialog.tsx` -- ConfirmDialog API verified
- `src/Client/timesheets-web/src/components/LoadingSpinner.tsx` -- LoadingSpinner API verified
- `src/Client/timesheets-web/src/components/EmptyState.tsx` -- EmptyState API verified
- `src/Client/timesheets-web/src/App.tsx` -- Provider wiring verified (lines 32-33)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components already exist and are verified in codebase
- Architecture: HIGH -- patterns are mechanical find-and-replace based on existing APIs
- Pitfalls: HIGH -- identified from direct code analysis, not hypothetical
- Audit completeness: HIGH -- grep searched entire src directory for alert(), confirm(), console.error, catch, Loading

**Research date:** 2026-02-21
**Valid until:** Indefinite (no external dependencies, no version concerns)
