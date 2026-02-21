# Phase 10: Email Styling - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

All PTO and system emails use a professional branded HTML template that renders correctly in Outlook and other email clients. Three existing email types get styled: PTO request submitted (to managers), PTO decision approved/denied (to employees), and system test email. No new email types are added.

</domain>

<decisions>
## Implementation Decisions

### Brand & visual identity
- Color scheme matches the app exactly — pull the same blues/grays from the Tailwind theme
- Logo image in the header (will need a hosted image URL or base64 fallback)
- Full-width accent color bar spanning the top, behind/above the logo — bold brand presence
- PTO status uses colored badges — green for approved, red for denied — matching app badge style

### Email content layout
- PTO details presented in a card-style block — bordered/shaded container grouping date range, hours, type, status
- Card field selection is Claude's discretion — pick the right level of detail per email type (submitted vs approved vs denied)
- Prominent CTA button linking to the PTO request in the app (e.g., "View Request" / "Review Request")
- Denial emails show the denial reason directly in the email body — employee sees it immediately without opening the app

### Template chrome
- Light gray outer background behind a white content area — adds depth
- Fluid/responsive width — adapts to screen size (with Outlook-safe fallbacks since Outlook ignores media queries)
- Shared reusable template wrapper method — any future email type (weekly reminders, etc.) automatically gets branded styling
- Footer content is Claude's discretion — pick a professional footer appropriate for internal company emails

### Tone & copy style
- Warm professional tone — "We've received your time-off request and your manager will review it shortly." Friendly but businesslike
- Action-oriented subject lines — "New PTO Request to Review" / "Your PTO Has Been Approved" — tells the reader what happened
- Personalized greeting using recipient's first name — "Hi Nick,"
- Brief context body — a short paragraph explaining the situation + detail card + CTA button, not just a bare card

### Claude's Discretion
- Card field selection per email type (what details to include)
- Footer content and structure
- Exact responsive breakpoint strategy and Outlook fallback approach
- Loading/fallback for logo image if it can't render
- Font choices within email-safe constraints

</decisions>

<specifics>
## Specific Ideas

- The app uses blues and grays in its Tailwind theme — email should feel like a natural extension of the app
- Colored status badges should mirror how PTO statuses look in the app UI
- CTA button should be prominent enough that a manager can quickly act on a PTO request from email
- Template wrapper should be a reusable service/method so adding new email types later is trivial

</specifics>

<deferred>
## Deferred Ideas

- Weekly reminder emails — infrastructure toggle exists but sending logic not yet implemented (future phase)
- Email delivery tracking/logging
- Email retry mechanism for failed sends

</deferred>

---

*Phase: 10-email-styling*
*Context gathered: 2026-02-21*
