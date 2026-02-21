# Phase 9: Early Closure Calendar - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Display early closures on the existing Time Off Calendar (CalendarView.tsx) with visually distinct styling and closing times. Backend (EarlyClosure model, EarlyClosuresController, API helpers) and admin management (ManageHolidays.tsx CRUD) already exist. This phase is purely frontend calendar integration.

</domain>

<decisions>
## Implementation Decisions

### Visual styling
- Amber/gold (#C29B40) color scheme — matches the app's accent color, distinct from navy holidays and department-colored PTO bars
- Same left-border bar style as holidays and PTO — amber left border, light amber background, amber text
- Consistent bar shape maintains visual cohesion across all calendar event types

### Closing time display
- Bar text format: "Early Close [time]" (e.g., "Early Close 2:00 PM")
- Use the stored CloseTime string as-is from the database — no normalization
- Mobile detail panel shows same minimal format as the bar — no extra info

### Legend & labeling
- Add "Early Closure" entry to the calendar legend bar
- Position it right after "Company Holiday" — groups company-wide events together before department colors
- Legend uses amber dot matching the early closure bar color

### Holiday overlap handling
- If an early closure falls on the same day as a holiday, show only the holiday bar — early closure is redundant on full holidays

### Claude's Discretion
- Placement order of early closure bars within a day cell (after holidays, before or after PTO)
- Mobile dot indicator approach (distinct amber dot or use existing dot style)
- Exact amber shades for background/text contrast
- Hover tooltip content

</decisions>

<specifics>
## Specific Ideas

- The app already uses #C29B40 as its gold accent color — early closure bars should use this color family for brand consistency
- CalendarView.tsx currently fetches holidays and PTO requests but not early closures — need to add fetchEarlyClosures() call and integrate into the calendar day data structure
- The EarlyClosureDto and fetchEarlyClosures helper already exist in api.ts — no new API work needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-early-closure-calendar*
*Context gathered: 2026-02-21*
