# Feature Specification: AI Photo Capture

**Feature Branch**: `053-photo-capture-ai`
**Created**: 2026-06-12
**Status**: Draft
**Input**: User description: "AI photo capture for 86: the Snap tab goes live - photograph an item, Claude vision suggests name and category with a confidence badge, the member always confirms before anything is added"

The Snap tab of the capture surface (designed in feature 049) goes live.
Some things have no barcode — produce, deli tubs, the last egg in the
carton. The member photographs the item (or its empty container), a vision
model suggests a name and category with a confidence score, and the standard
confirm step opens prefilled. High confidence reads as a suggestion;
low confidence reads as "Best guess?" with the name field focused for
correction. Recognition NEVER adds anything by itself, costs are bounded by
a per-user rate limit, and the recognition key lives server-side only.

**Depends on**: 049-eighty-six-list (capture surface, confirm step, single
submit path). Independent of 052-barcode-capture. Forward-compatible with
051-offline-capture-queue.

## Clarifications

### Session 2026-06-12

- Q: Vision model and recognition architecture? → A: Decisions carried from the roadmap (locked at fork planning): server-side recognition function returning structured {name, category, confidence}; default model claude-opus-4-8 (config value RECOGNITION_MODEL, haiku swappable); ~1024px compressed upload; confidence threshold 0.6 for the "Best guess?" framing. Clarification round waived at user request ("ship to preview") — assumptions documented below.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Snap and Confirm (Priority: P1)

A member finishes the oat milk, taps Snap, photographs the empty carton.
Two seconds later the confirm step opens: "Oat Milk — Dairy Alternatives"
with a 92% confidence badge. One tap on "86 it" and it's on the list.

**Why this priority**: This is the wow moment of the product — and the
reason the Snap tab exists: zero typing for things barcodes can't cover.

**Independent Test**: Submit a clear product photo through the Snap flow;
verify the confirm step prefills with name, category, and a visible
confidence indicator, and submission follows the standard path.

**Acceptance Scenarios**:

1. **Given** the Snap tab with camera permission, **When** it opens, **Then** a camera view with a capture button appears (plus a photo-library alternative)
2. **Given** a captured photo, **When** recognition completes with confidence at or above the threshold, **Then** the confirm step opens prefilled with name and category and shows the confidence as a badge
3. **Given** the prefilled confirm step, **When** the member edits any field, **Then** the edit wins; the suggestion never locks
4. **Given** any recognition result, **When** the member cancels at confirm, **Then** nothing is added and the photo is discarded
5. **Given** a confirmed submission, **When** it completes, **Then** the photo is attached to the item, visible to household members only

---

### User Story 2 - Best Guess, Always Confirmed (Priority: P1)

The member snaps a blurry photo of mystery leftovers. Recognition comes back
at 41% confidence with "Tortillas". The confirm step frames it honestly —
"Best guess: Tortillas?" — with the name field focused so correcting it is
the path of least resistance. Nothing was ever going to be added without the
member's word.

**Why this priority**: Trust in the Snap tab depends on it being honest
about uncertainty; auto-trusting a wrong guess would poison the list and the
analytics signal alike.

**Independent Test**: Submit an ambiguous photo; verify the low-confidence
framing, focused name field, and that submission requires explicit
confirmation.

**Acceptance Scenarios**:

1. **Given** recognition below the confidence threshold, **When** the confirm step opens, **Then** it reads "Best guess?" with the suggestion in an editable, focused name field
2. **Given** any confidence level, **When** the flow runs, **Then** there is no path that adds an item without the member tapping the confirm action
3. **Given** the member corrects a best-guess name, **When** they submit, **Then** the corrected name is what lands on the list and in any consented event record

---

### User Story 3 - Recognition Can Fail; Capture Can't (Priority: P2)

The vision service is down, the device is offline, or the member is
rate-limited. The Snap flow degrades to manual entry with the photo still
attached — the capture habit survives every failure.

**Why this priority**: A capture mode that dead-ends teaches members not to
use it; failure paths are the difference between a demo and a tool.

**Independent Test**: Force a recognition failure, an offline state, and a
rate-limit state; verify each lands in manual entry with the photo attached
and a specific explanation.

**Acceptance Scenarios**:

1. **Given** recognition fails or times out (over 6 seconds), **When** the failure surfaces, **Then** manual entry opens with the photo attached and the message "Couldn't recognize this one - name it yourself"
2. **Given** the device is offline, **When** a photo is captured, **Then** the member proceeds through manual naming immediately; the photo is kept and recognition MAY run when connectivity returns, surfacing as a non-blocking suggestion — never an auto-add
3. **Given** a member who exceeds the per-user recognition rate limit, **When** they snap, **Then** they see "Recognition is cooling down - type it this time" and manual entry opens with the photo attached
4. **Given** any failure path, **When** capture completes manually, **Then** the consented event record (if any) carries capture method "photo"

---

### User Story 4 - Private by Architecture (Priority: P2)

Photos of a household's fridge contents are household data. They live in the
household's storage space, are visible only to members, and the recognition
key never reaches anyone's browser.

**Why this priority**: Constitution Principle I applies to images exactly as
to rows; a leak here would be a sovereignty breach regardless of intent.

**Independent Test**: Verify a non-member cannot retrieve another
household's item photos; verify no recognition credential is present in any
client-delivered asset.

**Acceptance Scenarios**:

1. **Given** an item photo, **When** a household member views the item, **Then** the photo loads; **When** a non-member attempts the same reference, **Then** access is denied at the storage layer
2. **Given** the recognition service, **When** invoked, **Then** it runs server-side with its credential held in server configuration; the client only ever sends the photo and receives the suggestion
3. **Given** a member without analytics consent, **When** they capture via Snap, **Then** the item and photo behave normally and NO event record is written (the 049 gate, unchanged)

---

### Edge Cases

- Multiple items in one photo: v1 recognizes the dominant item; the suggestion is editable as always (multi-item detection is out of scope)
- Very large originals (modern phone cameras): compressed client-side to ~1024px before upload; original never leaves the device
- A photo of nothing recognizable (the inside of the fridge): low-confidence path with "Best guess?" or the failure path; never an error wall
- The same member rapid-fires snaps: rate limit engages with the cooling-down message; manual capture remains unlimited
- Photo storage quota pressure: oldest photos are evicted before list data is ever touched (photos are enrichment, not the record)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Snap tab MUST offer camera capture and photo-library selection when permission allows; permission denial falls back to library selection, then to the Type tab
- **FR-002**: Captured photos MUST be compressed client-side to approximately 1024px before upload; originals never leave the device
- **FR-003**: Recognition MUST run server-side, returning a structured suggestion — name, category, confidence — with the recognition credential held in server configuration only
- **FR-004**: The recognition model MUST be a server configuration value (default carried from roadmap: claude-opus-4-8) swappable without client changes
- **FR-005**: Suggestions at or above the 0.6 confidence threshold MUST prefill the standard confirm step with a visible confidence badge
- **FR-006**: Suggestions below the threshold MUST present as "Best guess?" with the name field focused for correction
- **FR-007**: NO path may add an item without explicit member confirmation, regardless of confidence
- **FR-008**: Recognition failure, timeout (6 seconds), offline state, and rate-limiting MUST each land in manual entry with the photo attached and a state-specific message
- **FR-009**: Recognition requests MUST be rate-limited per user (template rate-limiting precedent) to bound cost; manual capture is never rate-limited
- **FR-010**: Item photos MUST be stored household-scoped with access limited to active members at the storage layer (Principle I)
- **FR-011**: Snap capture MUST flow through the 049 single submit path (optimistic add, duplicate guard, consent-gated event with capture_method "photo")
- **FR-012**: Offline-captured photos MAY be recognized at reconnection, surfacing as a non-blocking suggestion on the existing draft/item — never an automatic addition (forward-compatibility with feature 051)

### Key Entities

- **Item Photo**: a compressed image attached to an item; household-scoped, member-visible, evictable enrichment (never the record of truth)
- **Recognition Suggestion**: a transient structured result — name, category, confidence — that exists to prefill the confirm step and is discarded after the member decides
- **Draft (extended)**: the 049 capture draft gains optional photo and confidence fields surviving every fallback path

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A clear product photo goes from Snap-tab-open to on-the-list in under 10 seconds with zero typing
- **SC-002**: 100% of recognition failures (forced error, offline, rate limit) land in working manual capture with the photo attached — zero dead ends in acceptance testing
- **SC-003**: Zero items are ever added without explicit confirmation across all automated and acceptance tests
- **SC-004**: Cross-household photo access attempts return zero objects in storage contract tests
- **SC-005**: Per-photo recognition cost stays within the configured budget at the default model (order of one cent per snap); the rate limit prevents any single user exceeding their hourly allowance
- **SC-006**: Events from Snap captures carry capture method "photo" only for consenting members, contract-tested

## Assumptions

- Architecture carried from roadmap decisions: server-side recognition function (no client credential), structured output, RECOGNITION_MODEL config default claude-opus-4-8 (~$0.01/photo; haiku option ~$0.002), 0.6 confidence threshold, ~1024px WebP uploads, per-user rate limit reusing the template precedent
- The recognition provider sees the photo transiently for inference; no training use; this is disclosed in the privacy policy (feature 050 copy)
- One item per photo in v1; the dominant-object suggestion is acceptable
- Photo eviction policy (storage pressure) favors recency; exact quotas tuned at implementation
- The Snap tab's disabled state (feature 049 frame 03) is replaced without layout changes (SC-006 of 049)

## Out of Scope

- Barcode scanning (feature 052); offline queue internals (feature 051)
- Multi-item detection, shelf-level inventory from one photo
- On-device recognition models
- Any use of photos beyond recognition and the item's own display
