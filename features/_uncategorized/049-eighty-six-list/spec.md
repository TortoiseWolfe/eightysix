# Feature Specification: The 86 List & Capture Experience

**Feature Branch**: `049-eighty-six-list`
**Created**: 2026-06-12
**Status**: Draft
**Input**: User description: "The 86 list and capture experience: live household out-of-stock list with manual add + autocomplete, restock lifecycle, realtime sync, and the three-mode AddItem capture surface per docs/prp-docs/eighty-six-list-prp.md"

This is the soul of 86: the live list of everything the household is out of,
and the capture experience that gets items onto it in seconds. When the milk
runs out, a roommate 86's it before the fridge door closes; everyone sees it
instantly; whoever shops checks it off and the item leaves every device's
list in realtime. Manual (typed) capture ships fully in this feature; the
barcode (052) and photo (053) modes plug into the same capture surface
later, and the offline queue (051) wraps the same submit path. Consent-gated
analytics events land here at the schema level (Constitution Principle II);
the consent experience itself is feature 050.

**Depends on**: 048-household-membership (households, memberships, the
single membership predicate for data access).

## Clarifications

### Session 2026-06-12

- Q: How do members restock (check off) an item on the 86 list? → A: Both from day one — a 44px circle-check target leading each row AND swipe-right-to-restock; the circle check is the accessible/discoverable baseline, swipe is the power path; both end in the same undo toast

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See What's 86'd (Priority: P1)

A member opens the app and sees their household's live 86 list: everything
currently out of stock, newest first, each item showing who 86'd it and
roughly when. When a roommate adds or restocks something, the list updates
on every member's device without a refresh.

**Why this priority**: The shared, always-current list IS the product. Every
other story feeds it or drains it.

**Independent Test**: Seed a household with items in both states; verify the
list shows only out-of-stock items with attribution, and that a change made
on a second account appears on the first without refresh.

**Acceptance Scenarios**:

1. **Given** a household with 86'd items, **When** a member opens the list, **Then** they see all currently-out items, newest first, with item name, who 86'd it, and relative time
2. **Given** two members viewing the list, **When** one adds an item, **Then** the other sees it appear within 2 seconds without manual refresh
3. **Given** a brand-new household with no items, **When** a member views the list, **Then** a friendly empty state teaches the add action
4. **Given** a member of two households, **When** they switch households, **Then** the list shows only the newly selected household's items

---

### User Story 2 - 86 Something in Seconds (Priority: P1)

Standing at the open fridge, a roommate taps the add button, types two
letters, taps the autocomplete suggestion built from the household's item
history, confirms, done — under five seconds. The capture surface shows
three mode tabs (Type / Scan / Snap); Type works fully today, Scan and Snap
are visibly present but marked "coming soon" so the surface never needs a
redesign when those features land.

**Why this priority**: Capture speed decides whether the habit forms. If
86'ing the milk takes longer than ignoring it, the list dies.

**Independent Test**: With a household that has item history, time the flow
from tapping add to the item appearing on the list; verify autocomplete
suggests from history; verify all three tabs render with only Type active.

**Acceptance Scenarios**:

1. **Given** the list screen, **When** a member taps the add button, **Then** the capture surface opens with Type / Scan / Snap tabs, Type active, Scan and Snap visibly disabled with "coming soon" labels
2. **Given** the Type tab, **When** the member types two characters, **Then** autocomplete suggests matching items from the household's history (previously stocked or 86'd items)
3. **Given** a selected suggestion or fully typed name, **When** the member reaches the confirm step, **Then** they can edit the name and optionally set a category before submitting
4. **Given** a confirmed draft, **When** submitted, **Then** the item appears at the top of the list immediately on the actor's device (optimistic) and on all members' devices within 2 seconds
5. **Given** an item already on the 86 list, **When** a member tries to add it again, **Then** the existing row is highlighted instead of creating a duplicate
6. **Given** the confirm step, **When** the member cancels, **Then** nothing is added and the list is unchanged

---

### User Story 3 - Restock & Re-86 (Priority: P2)

At the store, the shopper works down the list, checking items off as they
hit the cart — each check-off restocks the item for the whole household in
realtime. Back home, a mis-tap can be undone, and frequently consumed items
can be re-86'd in one tap from a "recently restocked" strip.

**Why this priority**: Restocking closes the loop that makes the list double
as the shopping list — but the list has read value even before this ships.

**Independent Test**: Check an item off, verify it leaves all members'
lists; undo it; re-86 an item from history in one tap.

**Acceptance Scenarios**:

1. **Given** an 86'd item, **When** a member checks it off (restock), **Then** it leaves the 86 list on all devices within 2 seconds
2. **Given** a just-restocked item, **When** the member taps undo in the same session, **Then** the item returns to the 86 list
3. **Given** the recently-restocked strip, **When** a member taps an item, **Then** it is re-86'd in one tap (no retyping)
4. **Given** an item that was restocked, **When** a member types its name in the capture surface later, **Then** it appears in autocomplete (history persists)

---

### User Story 4 - Privacy-Honest Event Logging (Priority: P2)

Members who opted into analytics generate an event record for each 86 and
restock action (what, when, how captured) that powers future household
insights. Members who declined generate no event records at all — and their
list experience is identical in every way.

**Why this priority**: Constitution Principles II and IV are load-bearing
for the product's long game; the event log schema must exist from the first
item ever 86'd, or early signal is lost.

**Independent Test**: Perform identical actions as a consenting and a
non-consenting member; verify event records exist only for the former and
that both experiences are indistinguishable in the interface.

**Acceptance Scenarios**:

1. **Given** a consenting member, **When** they 86 or restock an item, **Then** exactly one event record is written capturing the item name, category, action type, capture method, and action time
2. **Given** a non-consenting member, **When** they perform the same actions, **Then** no event record is written and the list behaves identically
3. **Given** any member, **When** they use the list, **Then** no interface element nags, badges, or degrades based on consent status
4. **Given** an event record, **When** anyone attempts to modify or delete it through the application, **Then** the attempt fails (events are append-only)

---

### Edge Cases

- Two members 86 the same item simultaneously: one row results; the second actor sees the existing-row highlight, not an error
- A member restocks an item while another member is viewing it: the viewer's list updates live; no stale check-off is possible (acting on an already-restocked item is a no-op)
- Realtime connection drops and reconnects: the list refetches to fill any gap; no duplicate or missing rows
- An item name of unusual length (e.g. 120 characters): accepted up to a sane limit (80 characters), truncated gracefully in display
- The household has years of history (thousands of stocked rows): autocomplete stays fast; the 86 list itself only ever renders current out-of-stock items
- A removed member's past attributions: rows keep displaying their name via preserved membership history (feature 048, FR-015)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST show each household's currently-out items as a live list, newest first, with item name, the member who 86'd it, and relative time
- **FR-002**: List changes (add, restock) MUST propagate to all active members' views within 2 seconds without manual refresh
- **FR-003**: The capture surface MUST present three mode tabs — Type, Scan, Snap — with Type fully functional and Scan/Snap visibly present but disabled ("coming soon") in this feature
- **FR-004**: Manual capture MUST offer autocomplete drawn from the household's full item history after 2 typed characters
- **FR-005**: All capture modes MUST converge on a single editable confirm step (name, optional category) before submission
- **FR-006**: Submission MUST be optimistic: the item appears immediately for the actor, reconciling with the shared state in the background
- **FR-007**: The system MUST prevent duplicate currently-out items per household (case-insensitive name match), highlighting the existing row instead
- **FR-008**: Members MUST be able to restock an item two equivalent ways — tapping the row's leading 44px circle-check target, or swiping the row right — removing it from every member's 86 list; restocked items persist as history; both paths surface the same undo affordance; the circle check is the accessibility baseline (swipe is never the only path)
- **FR-009**: Restock MUST be undoable within the actor's current session
- **FR-010**: A recently-restocked strip MUST allow one-tap re-86 of items
- **FR-011**: Item categories are optional free text with suggestions from the household's prior categories
- **FR-012**: For members with analytics consent, each 86/restock action MUST append exactly one immutable event record carrying item name, category, action type, capture method, and the time the action occurred (distinct from the time it was recorded)
- **FR-013**: For members without analytics consent, NO event record may be written — enforced at the data layer, not the client (Constitution Principle II); the interface MUST be identical regardless of consent (Principle IV)
- **FR-014**: Event records MUST be append-only: no modification or deletion through any application path
- **FR-015**: All list and event data MUST be household-scoped through the single membership predicate established by feature 048; cross-household access returns nothing (contract-tested)
- **FR-016**: The submit path MUST be a single code path shared by all capture modes, structured so the offline queue (feature 051) can wrap it without redesign
- **FR-017**: Item names are limited to 80 characters; the list interface MUST remain usable one-handed on a phone with 44px touch targets

### Key Entities

- **Item**: one thing the household tracks; carries a name, optional category, current status (out | stocked), who added it, and when its status last changed; persists across status flips as the household's history
- **Stock Event**: an immutable record of one 86 or restock action by one consenting member — item name snapshot, category, action type, capture method, action time, recording time; exists only when the actor has consented
- **Household / Membership**: inherited from feature 048; every item and event belongs to exactly one household

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A member can 86 a known item (one in history) in under 5 seconds of interaction from list screen to visible-on-list
- **SC-002**: List changes appear on other members' devices in under 2 seconds in 95% of cases
- **SC-003**: Zero duplicate currently-out items per household in concurrent-use testing
- **SC-004**: Consenting members' actions produce exactly one event each; non-consenting members' actions produce exactly zero — verified by automated contract tests
- **SC-005**: In usability testing, 90% of participants successfully add and restock an item on first attempt without instruction
- **SC-006**: The capture surface accommodates the Scan and Snap modes (features 052/053) with no layout redesign — verified at wireframe review of those features against this feature's signed-off frames

## Assumptions

- The consent record system (storage and onboarding prompt) is feature 050; until it ships, all members default to non-consenting and no events are written — the gate itself lands here
- Category taxonomy is free text with suggestions in v1; a curated taxonomy may arrive with barcode data (feature 052)
- "Session" for restock-undo means the current app session (until navigation away or close); durable undo history is out of scope
- Attribution inside the household is a feature, not a privacy concern (Constitution Principle I ring 1): roommates legitimately see who 86'd what
- List ordering is fixed (newest first) in v1; sorting/grouping options are future polish
- Item photos, barcodes, and product metadata columns may exist in the data model for forward compatibility but have no interface in this feature

## Out of Scope

- Barcode scanning (feature 052) and photo recognition (feature 053) — tabs designed here, wired there
- Offline capture queue (feature 051) — submit path shaped for it here
- Consent onboarding, settings, export/delete (feature 050)
- Analytics dashboards (feature 054)
- Quantities, units, or shopping-list amounts (an item is out or it isn't — v1 philosophy)
- Push notifications
