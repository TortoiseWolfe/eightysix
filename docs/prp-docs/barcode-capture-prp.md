# PRP-052: Barcode Capture

**Status**: Planning
**Priority**: P1 (v1 capture mode)
**Feature Branch**: `052-barcode-capture`
**Dependencies**: PRP-049 (capture surface + confirm step + submit path), PRP-051 (offline queue — forward-compatible, not blocking)
**Estimated Effort**: 3-4 days
**Constitution**: Principles I (household scoping), IV (works without surveillance)

---

## Problem Statement

Typing "Sriracha Hot Chili Sauce 28oz" at the fridge is friction; the bottle
already says what it is. The 049 capture surface ships a disabled Scan tab —
this PRP turns it on:

1. Point the camera at a barcode, get the product name prefilled
2. Unknown barcodes still capture instantly (manual entry, barcode preserved)
3. Every named barcode benefits the whole network via a shared product cache

## Solution Overview

- `@zxing/browser` viewfinder in the Scan tab (camera permission flow)
- Lookup chain: `product_cache` table → on miss, client fetch to Open Food
  Facts (public API, no key) → trim + upsert cache → prefill the 049 confirm
  step `{name, category, brand, barcode}`
- `product_cache` is shared PUBLIC data (no PII, no household scoping):
  barcode UNIQUE, name, brand, category, image_url, trimmed raw JSONB,
  fetched_at (stale after ~30 days), source='openfoodfacts'
- Fallbacks, all preserving the scanned barcode on the draft: OFF miss →
  manual naming (cache upsert on submit names it for everyone); camera
  permission denied → manual barcode digit entry; offline → manual entry now,
  lookup retried at sync (queue-ready via the 049 single submit path)
- Everything converges on the SAME confirm step — barcode never auto-adds

## Key User Stories

1. Scan a known product → name/category prefilled → confirm → on the list (target: under 8 seconds)
2. Scan an unknown barcode → name it once → the next household scanning it gets the name
3. Camera permission denied / no camera → type the digits, same lookup
4. Cache freshness: stale entries re-fetched in the background, never blocking capture

## Technical Notes

- Lib: `@zxing/browser` (typed, maintained; chosen over html5-qrcode)
- OFF API: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json` — trim response to name/brand/category/image before caching
- `product_cache` RLS: SELECT all authenticated; INSERT/UPDATE authenticated (caches public data; abuse bounded by rate limiting precedent)
- Wireframes: 3 light (viewfinder, result/unknown prefill, fallback states) + 1 dark (lookup pipeline)

## Out of Scope

- Photo recognition (PRP-053), offline queue internals (PRP-051)
- Curated category taxonomy (may seed from OFF categories later)
- Nutrition data, price data, shopping integrations
