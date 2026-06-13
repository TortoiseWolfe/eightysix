# Feature Specification: Barcode Capture

**Feature Branch**: `052-barcode-capture`
**Created**: 2026-06-12
**Status**: Draft
**Input**: User description: "Barcode capture for 86: the Scan tab goes live - viewfinder scanning, shared product cache, Open Food Facts lookup, graceful fallbacks to manual entry preserving the barcode"

The Scan tab of the capture surface (designed in feature 049) goes live.
Packaged goods name themselves: point the camera at the barcode on the empty
carton and the confirm step arrives prefilled with the product's name and
category. Unknown barcodes never block capture — the member names the item
once and the shared product cache remembers it for every household that
scans it after. Every path still converges on the same confirm step; a scan
never adds anything by itself.

**Depends on**: 049-eighty-six-list (capture surface, confirm step, single
submit path). Forward-compatible with 051-offline-capture-queue.

## Clarifications

### Session 2026-06-12

- Q: Scanning library and product data source? → A: Decisions carried from the roadmap (locked at fork planning): @zxing/browser for scanning; Open Food Facts as the public product database; shared product cache with ~30-day freshness. Clarification round waived at user request ("ship to preview") — assumptions documented below.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Scan a Known Product (Priority: P1)

A member opens the capture surface, taps the Scan tab, points the camera at
the empty sriracha bottle's barcode, and the confirm step appears prefilled:
"Sriracha Hot Chili Sauce — Condiments". One tap on "86 it" and it's on the
list — under eight seconds, zero typing.

**Why this priority**: This is the payoff that makes Scan worth a tab —
packaged goods are most of a fridge.

**Independent Test**: Scan a barcode present in the product cache; verify
the confirm step prefills name and category and submission follows the
standard path.

**Acceptance Scenarios**:

1. **Given** the Scan tab, **When** it opens with camera permission granted, **Then** a live viewfinder with a scan guide appears and detection requires no shutter tap
2. **Given** a barcode known to the product cache, **When** it is detected, **Then** the confirm step opens prefilled with name and category, the barcode attached to the draft
3. **Given** a barcode unknown to the cache but known to the public product database, **When** detected, **Then** the lookup fetches, caches, and prefills the same way
4. **Given** a prefilled confirm step, **When** the member edits the name before submitting, **Then** the edit wins (prefill is a suggestion, not a lock)
5. **Given** any scan result, **When** the member cancels at confirm, **Then** nothing is added and nothing is cached against their household

---

### User Story 2 - Name an Unknown Barcode Once (Priority: P1)

The local hot sauce from the farmers market isn't in any database. The scan
finds the barcode, the lookup comes back empty, and the member lands in
manual entry with the barcode silently preserved. They type "Dragon's Breath
Hot Sauce", submit — and the next household that ever scans that bottle gets
the name prefilled.

**Why this priority**: Unknown barcodes are common (store brands, local
products, international goods). If they dead-end, members stop trusting the
Scan tab.

**Independent Test**: Scan a barcode absent from cache and public database;
verify manual entry opens with the barcode preserved; submit; verify a
second scan of the same barcode prefills the typed name.

**Acceptance Scenarios**:

1. **Given** a barcode with no cache or database match, **When** lookup completes, **Then** manual entry opens with a notice "New one! Name it and you've named it for everyone" and the barcode retained on the draft
2. **Given** the named item is submitted, **When** any household scans the same barcode later, **Then** the confirm step prefills with the contributed name
3. **Given** a cache entry older than 30 days, **When** its barcode is scanned, **Then** the cached value prefills immediately and a background refresh updates the cache without blocking the member

---

### User Story 3 - Fallbacks Never Block Capture (Priority: P2)

Camera permission denied? Type the digits. Offline at the fridge? Manual
entry now, lookup later. The Scan tab degrades stepwise and always lands on
a working capture path.

**Why this priority**: Permission and connectivity failures are everyday
events; the capture habit survives only if every failure lands somewhere
useful.

**Independent Test**: Deny camera permission and verify digit entry works
end-to-end; go offline and verify capture completes with the barcode
preserved for later lookup.

**Acceptance Scenarios**:

1. **Given** camera permission is denied, **When** the Scan tab opens, **Then** it offers manual barcode digit entry (with a link to re-enable the camera) and digits run the same lookup chain
2. **Given** the device is offline, **When** a barcode is captured (camera or digits), **Then** the member proceeds through manual naming with the barcode preserved, and the product lookup retries when connectivity returns
3. **Given** the lookup service is slow (over 3 seconds), **When** waiting, **Then** the member can skip to manual entry at any time without losing the barcode
4. **Given** a barcode that fails to decode after sustained attempts, **When** 10 seconds pass, **Then** the viewfinder offers digit entry and the Type tab as alternatives

---

### Edge Cases

- Scanning in low light: viewfinder shows a hint to use the digit-entry fallback (torch control is out of scope v1)
- A barcode maps to a clearly wrong cached name (bad earlier contribution): the member edits at confirm; the edited submission updates the cache (latest-write wins; abuse bounded by rate limiting)
- The same product in different sizes has different barcodes: each barcode is its own cache row; item names may repeat — the 049 duplicate guard operates on names, unchanged
- Non-product barcodes (URLs, QR codes): rejected with "That doesn't look like a product barcode" and the viewfinder keeps scanning
- Lookup returns a name longer than 80 characters: truncated at prefill per the 049 name limit

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Scan tab MUST present a live camera viewfinder with continuous barcode detection (no shutter button) when camera permission is granted
- **FR-002**: Detected barcodes MUST resolve through a lookup chain: shared product cache first, then the public product database on cache miss, caching successful results
- **FR-003**: Successful lookups MUST prefill the standard 049 confirm step (name, category, barcode attached); the member can edit anything before submitting
- **FR-004**: A scan MUST NEVER add an item without the member passing through the confirm step
- **FR-005**: Unknown barcodes MUST route to manual naming with the barcode preserved; the named submission MUST update the shared cache so subsequent scans (any household) prefill
- **FR-006**: The shared product cache holds PUBLIC product data only (no household or member references); entries carry a fetch timestamp and are refreshed in the background when older than 30 days
- **FR-007**: Camera permission denial MUST fall back to manual barcode digit entry running the same lookup chain
- **FR-008**: Offline capture MUST complete via manual naming with the barcode preserved and the lookup deferred to reconnection
- **FR-009**: The member MUST be able to abandon a slow lookup (3+ seconds) for manual entry without losing the scanned barcode
- **FR-010**: Cache write access MUST be limited to authenticated members and rate-limited per user (template rate-limiting precedent) to bound abuse of the shared cache
- **FR-011**: Scan capture MUST flow through the 049 single submit path (optimistic add, duplicate guard, consent-gated event with capture_method "barcode")
- **FR-012**: Non-product symbologies (QR/URL codes) MUST be rejected with a specific message while scanning continues

### Key Entities

- **Product Cache Entry**: one barcode's public identity — barcode (unique), name, brand, category, image reference, source, fetched-at; shared across ALL households; carries no personal or household data
- **Draft (extended)**: the 049 capture draft gains an optional barcode field that survives every fallback path

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A known product goes from Scan-tab-open to on-the-list in under 8 seconds without typing
- **SC-002**: 100% of unknown-barcode scans land in manual entry with the barcode preserved (zero dead ends) in acceptance testing
- **SC-003**: A barcode named by one household prefills for a different household's scan within 1 minute of the first submission
- **SC-004**: Camera-denied and offline paths complete capture successfully in 100% of acceptance runs
- **SC-005**: Events logged from scans carry capture method "barcode" only for consenting members (zero events for non-consenting), contract-tested

## Assumptions

- Scanning library and data source carried from roadmap decisions: @zxing/browser, Open Food Facts (public API, no key, attribution in app credits)
- Cache freshness window is 30 days; background refresh, never blocking
- Latest-write-wins on cache name corrections is acceptable for v1 (no moderation queue); rate limiting bounds abuse
- Torch/flash control, multi-barcode batch scanning, and symbology tuning are post-v1
- The Scan tab's disabled state (feature 049 frame 03) is replaced by this live implementation without layout changes (SC-006 of 049)

## Out of Scope

- Photo recognition (feature 053); offline queue internals (feature 051)
- Nutrition/price data display; shopping or store integrations
- Cache moderation tools; category taxonomy curation
