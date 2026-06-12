# PRP-048: Household & Membership Foundation

**Status**: Planning
**Priority**: P0 (Foundation — everything is household-scoped)
**Feature Branch**: `048-household-membership`
**Dependencies**: Template auth (inherited Tier 0), template RLS baseline
**Estimated Effort**: 4-6 days
**Constitution**: Principles I (Household Data Sovereignty), II (Consent Before Collection — schema groundwork)

---

## Problem Statement

86 is a shared household out-of-stock list, but the template has no concept of
a household. Every domain feature (the 86 list, capture, analytics) is
household-scoped, so without households, memberships, and invitation flow:

1. There is no boundary to scope RLS policies to — Principle I cannot be enforced
2. Roommates cannot share a list — the entire product premise fails
3. There is no owner/member distinction for administrative actions
4. There is no way to join a roommate's household without sharing credentials

This feature is the schema cornerstone. Features 049–054 all hard-depend on it.

## What thriving looks like (Principle I)

A new user lands, creates "The Loft" in under 30 seconds, texts an 8-character
invite code to two roommates, and both join from their phones before dinner.
Each member sees exactly their household's data and nothing else — not because
the client filters it, but because the database makes cross-household reads
impossible. Leaving a household is one tap and actually removes access.

---

## Solution Overview

Households + memberships + invite codes, with RLS scoped through active
membership:

- `households` table (name, creator) with creation RPC that atomically inserts
  the owner membership
- `household_members` junction (role: owner/member, `left_at` soft-leave,
  partial unique active membership) — direct port of SpokeToWork's
  `conversation_members` pattern
- `household_invites` (short code, expiry, max uses, revocation) redeemed via
  SECURITY DEFINER RPC `join_household(code)` — a non-member can't pass
  household RLS to read the invite row, and static hosting means no server
  route; the definer function validates and inserts atomically
- `is_household_member(hid)` SECURITY DEFINER helper — avoids RLS infinite
  recursion when `household_members` policies reference `household_members`;
  reused by every later feature's policies
- Onboarding fork (create vs join), invite management, member management,
  household switcher for users in multiple households

## User Stories

### Onboarding

1. **As a new user**, I want to create a household with a name so my roommates and I have a shared space
2. **As a new user with an invite code**, I want to join an existing household so I see the same list as my roommates
3. **As a user**, I want a clear first-run choice between creating and joining so I don't end up in an empty solo household by accident

### Invitations

4. **As a member**, I want to generate a short invite code I can text/AirDrop to a roommate
5. **As a member**, I want to see the code's expiry and remaining uses so I know if it's still good
6. **As an owner**, I want to revoke an active invite code so a code shared too widely stops working
7. **As an invitee**, I want to preview the household ("Join 'The Loft' — 3 members") before confirming
8. **As an invitee**, I want a clear error when a code is expired, revoked, or used up

### Membership management

9. **As an owner**, I want to remove a member who moved out
10. **As a member**, I want to leave a household myself
11. **As an owner**, I want to transfer ownership before I leave
12. **As a user in multiple households**, I want to switch between them (apartment + family house)

### Data sovereignty (Principle I)

13. **As a member**, I can never see another household's data — enforced by RLS, verified by contract tests
14. **As a user who leaves**, my access ends immediately (`left_at` set, policies check active membership)

---

## Technical Requirements

### Database Schema (added to the monolithic migration)

- `households`: `id UUID PK`, `name TEXT NOT NULL`, `created_by UUID REFERENCES user_profiles`, timestamps
- `household_members`: `id UUID PK`, `household_id FK CASCADE`, `user_id FK CASCADE`, `role TEXT CHECK ('owner','member') DEFAULT 'member'`, `joined_at`, `left_at TIMESTAMPTZ NULL`; partial unique index `(household_id, user_id) WHERE left_at IS NULL`
- `household_invites`: `id UUID PK`, `household_id FK CASCADE`, `code TEXT UNIQUE` (8-char, unambiguous alphabet), `created_by`, `created_at`, `expires_at`, `max_uses INT`, `use_count INT DEFAULT 0`, `revoked_at TIMESTAMPTZ NULL`
- Functions: `is_household_member(hid UUID) RETURNS BOOLEAN` SECURITY DEFINER; `create_household(name TEXT)` (insert + owner membership atomically); `join_household(code TEXT)` SECURITY DEFINER (validate expiry/uses/revocation → insert membership → bump use_count)
- RLS: households SELECT/UPDATE members-only (UPDATE owner-only); household_members SELECT for fellow members, no direct INSERT (RPCs only), UPDATE for self-leave and owner-remove; household_invites SELECT/INSERT members, UPDATE (revoke) owner

### Precedents to port

- SpokeToWork monolithic migration lines ~765–884: `conversation_members` table shape, active-membership partial unique index, membership-EXISTS RLS
- SpokeToWork `delete-user-account` edge function (account deletion touches memberships — coordinate with PRP-050)

### UI (5-file components, generated)

- `OnboardingFork` (organism): create-or-join first-run screen
- `InvitePanel` (molecular): code display, share, expiry/uses, revoke
- `JoinHousehold` (molecular): code entry, preview, confirm, error states
- `HouseholdSettings` (organism): member list, roles, remove/leave/rename/transfer
- `HouseholdSwitcher` (atomic/molecular): dropdown in header

### Constraints

- Wireframe gate before /speckit.plan (constitution): 4 light UX wireframes + 2 dark architecture diagrams (RLS/membership, invite redemption sequence)
- RLS contract tests required (Principle I is testable)
- 44px touch targets; WCAG AA; works offline-degraded (membership ops queue is NOT required in v1 — joining requires connectivity, acceptable)

## Out of scope (this PRP)

- The 86 list itself (PRP-049)
- Consent UX and consent_records (PRP-050) — though this PRP's RPCs must not write analytics events at all
- Email-based invitations (code-only in v1)

## Success Criteria

- Two fresh accounts can create + join one household entirely on mobile in < 90 seconds
- RLS contract tests prove cross-household reads return zero rows for every table
- Invite redemption handles all failure modes (expired/revoked/exhausted/garbage code) with distinct user-facing messages
- `is_household_member()` is the single membership predicate reused by later features
