# PRP-049: The 86 List & Capture Experience

**Status**: Planning
**Priority**: P0 (Core product)
**Feature Branch**: `049-eighty-six-list`
**Dependencies**: PRP-048 (Household & Membership Foundation)
**Estimated Effort**: 6-8 days
**Constitution**: Principles I, II (consent-gated events), IV (list works without surveillance)

---

## Problem Statement

The household exists (PRP-048) but there is nothing in it. The core product
loop is missing:

1. No way to record "we're out of milk" — the one problem 86 exists to solve
2. No shared live view — roommates can't see what's 86'd right now
3. No restock lifecycle — the list can't double as the shopping list
4. No history — autocomplete and "quick re-86" need past items
5. No event log — household insights (PRP-054) have nothing to aggregate

This feature is the soul of the app: the live 86'd list plus the Add-Item
capture experience. Manual (typed) capture ships here; barcode (PRP-052) and
AI photo (PRP-053) plug into the same capture surface later, and the offline
queue (PRP-051) wraps the same submit path.

## What thriving looks like (Principle IV)

A roommate finishes the milk, taps the FAB while the fridge door is still
open, types "mi…", taps the autocomplete suggestion, done — under five
seconds. Everyone else's list updates live. At the store, their partner works
down the list, checking items off as they hit the cart; each check-off
restocks the item for the whole household in realtime. A member who declined
analytics gets exactly the same experience.

---

## Solution Overview

- **`items` table** — current state of everything the household tracks.
  `status: 'out' | 'stocked'`; the 86 list is `WHERE status='out'`; restock
  flips status and the row persists as history (powers autocomplete + quick
  re-86). Client-generated UUID PKs for offline idempotency (PRP-051-ready).
- **`stock_events` table** — append-only analytics log (86'd / restocked),
  written ONLY for consenting actors, enforced in RLS (Principle II). Decline
  = the item still flows, no event row at all. Schema lands here;
  the consent UX itself is PRP-050. Until PRP-050 ships its onboarding
  prompt, all users default to no-consent and the list simply logs nothing.
- **AddItem capture surface** — single FAB → organism with three mode tabs
  (Type / Scan / Snap). Type ships fully here; Scan and Snap tabs render as
  visible-but-disabled previews wired to PRP-052/053 (the wireframes design
  all three so the surface doesn't get redesigned twice).
- **Confirm step** — all capture modes converge on one editable draft
  `{name, category, barcode?, photo?, confidence?}` before submit. One submit
  code path: optimistic `items` upsert + consent-conditional `stock_events`
  insert.
- **Realtime** — adapt SpokeToWork `RealtimeService` →
  `subscribeToHouseholdItems(household_id, cb)` using postgres_changes
  filtered `household_id=eq.<id>`, with reconnect → refetch gap-fill.
- **Restock UX** — swipe/check interaction on list rows; "Recently restocked"
  section supports quick re-86.

## User Stories

### The list

1. **As a member**, I want to see everything currently 86'd in my household, newest first, in one glance
2. **As a member**, I want the list to update live when a roommate adds or restocks something
3. **As a new household**, I want a friendly empty state that teaches the FAB
4. **As a member**, I want to see who 86'd an item and roughly when (inside the household, attribution is a feature — Principle I ring 1)

### Capture (manual mode, this PRP)

5. **As a member**, I want to add an out-of-stock item in under five seconds from my phone
6. **As a member**, I want autocomplete from our household's item history so I rarely type a full name
7. **As a member**, I want to optionally set a category so the list groups sensibly
8. **As a member**, I want adding a duplicate of an already-86'd item to be prevented gracefully (bump/highlight the existing row instead)

### Restock

9. **As the shopper**, I want to check items off at the store and have them leave everyone's 86 list instantly
10. **As a member**, I want to un-restock a mis-tap within the same session
11. **As a member**, I want to quickly re-86 something we run out of often

### Privacy (Principles II & IV)

12. **As a non-consenting member**, adding and restocking items works identically — no event rows are written for my actions, and nothing nags me
13. **As a consenting member**, my 86/restock actions append `stock_events` rows with truthful `occurred_at` timestamps

---

## Technical Requirements

### Database Schema (added to the monolithic migration)

- `items`: `id UUID PK` (client-generated), `household_id FK NOT NULL`, `name TEXT NOT NULL`, `category TEXT`, `barcode TEXT NULL`, `product_id UUID NULL` (FK to product_cache when PRP-052 lands), `photo_path TEXT NULL`, `status TEXT CHECK ('out','stocked') DEFAULT 'out'`, `added_by UUID`, `status_changed_at`, timestamps. Partial unique `(household_id, lower(name)) WHERE status='out'` (duplicate policy: prevent + highlight existing). Realtime publication membership.
- `stock_events`: `id UUID PK`, `household_id FK NOT NULL`, `item_id UUID NULL FK SET NULL`, `event_type TEXT CHECK ('86','restock')`, `item_name TEXT NOT NULL` (denormalized snapshot), `category TEXT`, `barcode TEXT NULL`, `capture_method TEXT CHECK ('manual','barcode','photo')`, `actor_id UUID NULL FK SET NULL`, `occurred_at TIMESTAMPTZ NOT NULL`, `recorded_at DEFAULT now()`. No user UPDATE/DELETE policies (append-only).
- RLS: `items` SELECT/INSERT/UPDATE for active members (`is_household_member()` from PRP-048), `added_by = auth.uid()` on INSERT, no DELETE in v1. `stock_events` SELECT members; INSERT members AND latest `analytics_events` consent granted (consent_records table shape coordinated with PRP-050; this PRP creates the gate, PRP-050 creates the UX).

### Precedents to port

- SpokeToWork `src/lib/messaging/realtime.ts` → RealtimeService adaptation
- SpokeToWork immutability pattern ("payment results are immutable") for stock_events
- ScriptHammer `src/lib/offline-queue/` — design the submit path queue-shaped now (single `submitItemAction()` entry point) so PRP-051 wraps it without refactoring

### UI (5-file components, generated)

- `EightySixList` (organism): live list, grouping, empty state, FAB
- `ListItemRow` (molecular): item, attribution, age, restock swipe/check
- `AddItemSheet` (organism): three-tab capture surface (Type live; Scan/Snap disabled previews)
- `ItemDraftConfirm` (molecular): shared editable confirm step
- `RecentlyRestocked` (molecular): quick re-86 strip

### Constraints

- Wireframe gate before /speckit.plan: 5 light UX wireframes + 1 dark data-flow diagram (capture modes → confirm → submit path → items + consent-gated stock_events → realtime fanout)
- Category taxonomy: free text with suggestions in v1 (seeded list deferred until Open Food Facts categories arrive with PRP-052)
- 44px touch targets; one-handed phone use is the primary ergonomic target
- Realtime subscription cleanup on household switch (PRP-048 switcher)

## Out of scope (this PRP)

- Barcode scanning (PRP-052) and AI photo recognition (PRP-053) — tabs are designed here, wired there
- Offline queue (PRP-051) — submit path is shaped for it, not implemented
- Consent onboarding UX (PRP-050) — only the RLS gate and schema land here
- Analytics dashboard (PRP-054)

## Success Criteria

- Manual add: tap FAB → typed/autocompleted item on every member's list in < 5s of user effort, < 2s of sync latency
- Restock from the list reflects on all devices in < 2s
- RLS contract tests: non-member sees zero items; non-consenting actor's actions write zero stock_events; consenting actor's actions write exactly one event per action
- The AddItem surface visually accommodates Scan/Snap without redesign (verified at wireframe review)
