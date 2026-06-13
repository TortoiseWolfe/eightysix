# PRP-053: AI Photo Capture

**Status**: Planning
**Priority**: P1 (v1 capture mode)
**Feature Branch**: `053-photo-capture-ai`
**Dependencies**: PRP-049 (capture surface + confirm step + submit path), PRP-051 (offline queue — forward-compatible, not blocking). Independent of PRP-052.
**Estimated Effort**: 4-5 days
**Constitution**: Principles I (photos are household data), II (no analytics events without consent), IV (recognition never gates the list)

---

## Problem Statement

Some things have no barcode — produce, deli containers, the last egg. The
049 capture surface ships a disabled Snap tab — this PRP turns it on:

1. Photograph the empty container / item, get a suggested name back
2. The user ALWAYS confirms — recognition prefills, never auto-adds
3. Costs are controlled (per-user rate limit) and keys never reach the client

## Solution Overview

- Camera/photo picker in the Snap tab → client-side compress to ~1024px WebP
  (port of SpokeToWork avatar pipeline, bumped from 800px for vision accuracy)
- Upload to `item-photos` Supabase Storage bucket, path
  `household_id/item_id.webp`, RLS mirroring avatar policies but
  membership-scoped (Principle I: photos visible to household members only)
- `recognize-item` Supabase Edge Function (Deno, @anthropic-ai/sdk):
  Claude vision call with structured output json_schema
  `{name, category, confidence}`; model from config secret
  `RECOGNITION_MODEL`, default `claude-opus-4-8` (~$0.01/photo;
  `claude-haiku-4-5` swappable, ~$0.002)
- Confidence UX: ≥0.6 → prefilled confirm with a confidence badge;
  <0.6 → framed as "Best guess?" with the name field focused for correction.
  Either way, the standard 049 confirm step — never auto-trust
- Per-user rate limit on the Edge Function (template `rate_limit_attempts`
  precedent) for cost control
- Failure modes: recognition error/timeout → manual entry with the photo
  attached to the draft; offline → photo queued locally, recognition runs at
  sync, surfaced as a "confirm 1 recognized item" badge (queue-ready via the
  049 submit path; no auto-add even at sync)

## Key User Stories

1. Snap the empty oat-milk carton → "Oat Milk (Dairy alternatives) — 92%" prefilled → confirm (target: under 10 seconds)
2. Snap something ambiguous → "Best guess: Tortillas?" → correct the name → submit (photo retained on the item)
3. Recognition unavailable (offline / API error / rate-limited) → manual entry, photo still attached
4. Privacy: photos live in the household's bucket, member-visible only; no analytics event is written for non-consenting actors (049 gate applies unchanged)

## Technical Notes

- Edge Function secrets via Supabase (never NEXT_PUBLIC); streaming not needed (single small structured response)
- Image tokens dominate cost; 1024px keeps accuracy/cost balanced — measure before changing
- Wireframes: 3 light (camera capture, confidence confirm states, fallback states) + 1 dark (recognition pipeline incl. secret boundary + rate limit)

## Out of Scope

- Barcode scanning (PRP-052), offline queue internals (PRP-051)
- Multi-item detection in one photo (v1 = one item per snap)
- On-device/offline recognition models
- Using photos for any purpose beyond recognition + the item's own display
