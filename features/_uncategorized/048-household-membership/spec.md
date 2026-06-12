# Feature Specification: Household & Membership Foundation

**Feature Branch**: `048-household-membership`
**Created**: 2026-06-12
**Status**: Draft
**Input**: User description: "Household and membership foundation for 86: create or join households via short invite codes; owner/member roles; RLS-enforced household data sovereignty per docs/prp-docs/household-membership-prp.md"

86 is a shared household out-of-stock tracker. This feature creates the
container everything else lives in: households, memberships, and the
invitation flow that gets roommates into the same shared space. It is the
schema cornerstone — every later feature (the 86 list, capture, analytics)
scopes its data and its access rules to the household boundary established
here. Constitution Principle I (Household Data Sovereignty) is enforced at
the database layer and verified by contract tests.

## Clarifications

### Session 2026-06-12

- Q: How should invite-code redemption be protected against brute-force guessing? → A: Rate-limit redemption attempts per user (e.g., 10 failed attempts/hour, then cool-down), reusing the template's rate-limiting pattern
- Q: What is the maximum number of active members per household? → A: 20 active members (hard cap; UI stays flat lists, raisable later without migration)
- Q: What are the default invite-code lifetime and use limits? → A: 7 days / 10 uses (defaults; per-invite values stored so they remain adjustable later)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create a Household (Priority: P1)

A brand-new user signs up, lands on a first-run screen with a clear fork —
"Create a household" or "I have an invite code" — names their household
("The Loft"), and arrives at their household's (empty) home screen as its
owner.

**Why this priority**: Without a household nothing else exists. This is the
first 30 seconds of every new user's life with the product.

**Independent Test**: Can be fully tested by signing up a fresh account,
creating a household, and confirming the user lands in it as owner — no
other feature required.

**Acceptance Scenarios**:

1. **Given** a newly registered user with no memberships, **When** they complete sign-in, **Then** they see the create-or-join fork before any other app content
2. **Given** the create form, **When** the user submits a household name, **Then** the household exists, the user is its owner, and they land on the household home screen
3. **Given** a household name that is empty or whitespace, **When** submitted, **Then** creation is rejected with a clear inline message
4. **Given** a user who just created a household, **When** they view it, **Then** an empty state invites them to add roommates (handing off to Story 2)

---

### User Story 2 - Invite a Roommate & Join via Code (Priority: P1)

A member opens the invite panel, generates a short 8-character code, and
texts it to a roommate. The roommate (after signing up) picks "I have an
invite code" on the first-run fork, enters the code, sees a preview —
"Join 'The Loft' — 3 members" — confirms, and is in.

**Why this priority**: A single-member household defeats the product's
purpose. Invitation is the second half of onboarding; together with Story 1
it forms the minimum viable product.

**Independent Test**: With one existing household, generate a code on
account A, redeem it on fresh account B, and confirm B sees the same
household as A.

**Acceptance Scenarios**:

1. **Given** an active member, **When** they request an invite code, **Then** an 8-character code is created showing its expiry date and remaining uses, with copy and share actions
2. **Given** a valid code, **When** an invitee enters it, **Then** they see the household name and member count before confirming
3. **Given** the preview, **When** the invitee confirms, **Then** they become a member and land on the household home screen
4. **Given** an expired, revoked, or fully-used code, **When** entered, **Then** the invitee sees a distinct, specific error for each case (expired / revoked / used up / not found / household full)
5. **Given** an owner viewing active invites, **When** they revoke one, **Then** the code stops working immediately for anyone who has it
6. **Given** a user who is already a member of the household, **When** they redeem its code again, **Then** they are taken to the household without creating a duplicate membership

---

### User Story 3 - Manage Membership (Priority: P2)

Life happens: a roommate moves out, the lease-holder graduates. Owners can
remove members and transfer ownership; any member can leave on their own;
the household can be renamed.

**Why this priority**: Required for real households over time, but a
freshly onboarded household functions without it.

**Independent Test**: With a 3-member household, exercise remove, leave,
rename, and ownership transfer, verifying access changes take effect
immediately.

**Acceptance Scenarios**:

1. **Given** the settings screen, **When** any member views it, **Then** they see the member list with names, roles, and join dates
2. **Given** an owner, **When** they remove a member, **Then** that member immediately loses access to all household data
3. **Given** a member (not owner), **When** they choose "Leave household" and confirm, **Then** their access ends immediately
4. **Given** the sole owner attempting to leave, **When** other members remain, **Then** they are required to transfer ownership first
5. **Given** an owner, **When** they transfer ownership to another member, **Then** roles swap and the change is visible to all members
6. **Given** an owner, **When** they rename the household, **Then** all members see the new name

---

### User Story 4 - Switch Between Households (Priority: P3)

Some users belong to more than one household (an apartment and a family
home). A switcher in the header shows the current household and flips
between them; all household-scoped screens follow the selection.

**Why this priority**: A real but minority use case; single-household users
never need it.

**Independent Test**: Join two households with one account, switch, and
confirm the visible data follows the switch with no leakage between
households.

**Acceptance Scenarios**:

1. **Given** a user in two households, **When** they open the switcher, **Then** both households are listed with the active one marked
2. **Given** a switch, **When** it completes, **Then** every household-scoped view shows only the newly selected household's data
3. **Given** a user in exactly one household, **When** they view the header, **Then** the switcher shows the household name without a misleading dropdown affordance

---

### Edge Cases

- A removed member with the app open: their next data interaction fails closed (access already revoked at the data layer) and routes them to the create-or-join fork
- The last member leaves a household: the household is retained but inaccessible (dissolution/cleanup is deferred — documented assumption)
- An invite code is redeemed concurrently by two invitees with one remaining use: exactly one succeeds; the other sees "used up"
- A user deletes their account (handled by feature 050): memberships end; owned households require transfer or are flagged for dissolution
- Invite code entry is case-insensitive and ignores surrounding whitespace; the code alphabet excludes ambiguous characters (0/O, 1/l/I)
- A user signs up via an invite link/code but abandons before confirming: no membership is created

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST present every authenticated user with no active membership a create-or-join fork before other app content
- **FR-002**: Users MUST be able to create a household by supplying a non-empty name, becoming its owner atomically
- **FR-003**: Active members MUST be able to generate invite codes: 8 characters from an unambiguous alphabet, with an expiry timestamp and a maximum-use count
- **FR-004**: System MUST validate invite redemption against expiry, revocation, and remaining uses, and reject each failure mode with a distinct message
- **FR-005**: Invitees MUST see the household name and member count before confirming a join
- **FR-006**: Invite redemption MUST be atomic: membership creation and use-count increment succeed or fail together, including under concurrent redemption
- **FR-007**: Owners MUST be able to revoke an invite code with immediate effect
- **FR-008**: System MUST distinguish two roles — owner and member — where owner additionally can remove members, revoke invites, rename the household, and transfer ownership
- **FR-009**: Members MUST be able to leave a household; the sole owner MUST transfer ownership before leaving a household that still has other members
- **FR-010**: Removal or departure MUST end the affected user's access to all household data immediately, enforced at the data layer (not by interface hiding)
- **FR-011**: A user MUST be able to belong to multiple households simultaneously and switch the active household, with every household-scoped view following the selection
- **FR-012**: System MUST prevent duplicate active memberships (same user, same household) including via repeated invite redemption
- **FR-013**: All household-scoped data access MUST be governed by a single membership predicate at the database layer, reused by every future household-scoped feature; cross-household reads MUST return nothing, verified by automated contract tests (Constitution Principle I)
- **FR-014**: This feature MUST NOT record analytics events of any kind; membership operations are operational data only (Constitution Principle II groundwork — the consent system arrives in feature 050)
- **FR-015**: Membership history MUST be preserved as inactive records on leave/removal (supporting later features' attribution) while conferring no access
- **FR-016**: System MUST rate-limit invite-code redemption attempts per user (10 failed attempts per rolling hour, then a cool-down with a clear "try again later" message) to prevent brute-force code guessing
- **FR-017**: System MUST cap active membership at 20 members per household; redemption of a valid code against a full household MUST fail with a distinct "household is full" message

### Key Entities

- **Household**: the shared space; has a name, a creator, and a lifecycle independent of any single member
- **Membership**: links one user to one household with a role (owner | member), a join date, and an end date when no longer active; at most one active membership per user per household
- **Invite**: a short-lived shareable code belonging to a household; carries expiry, maximum uses, use count, and revocation state; created by a member, redeemable by any authenticated user

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Two fresh accounts can go from sign-up to sharing one household (create → invite → join) in under 90 seconds of combined user effort, entirely on mobile
- **SC-002**: 100% of cross-household access attempts return zero data in automated contract tests across every household-scoped surface
- **SC-003**: Every invite failure mode (expired, revoked, exhausted, unknown code) presents its own distinct user-facing message — zero generic "something went wrong" outcomes in acceptance testing
- **SC-004**: Membership changes (remove, leave, transfer) take effect in under 2 seconds and are reflected on all members' devices without manual refresh
- **SC-005**: A user can create a household in under 30 seconds from first seeing the create-or-join fork
- **SC-006**: 95% of usability-test participants complete the join-via-code flow on the first attempt without assistance

## Assumptions

- Invite codes are the only join mechanism in v1 (no email invitations, no links with embedded auth); codes are shared out-of-band (text, AirDrop, spoken)
- Invite defaults are 7 days lifetime and 10 uses (clarified 2026-06-12); values are stored per-invite, so defaults can change later without affecting existing codes
- Households are never hard-deleted in v1; a household whose last member leaves is retained and orphaned (dissolution is a future feature)
- Display names for members come from the existing user profile system (inherited template feature)
- Joining a household requires connectivity; offline membership operations are out of scope (offline capture is feature 051, scoped to list actions)
- The create-or-join fork appears post-authentication; authentication itself is the inherited template feature 003

## Out of Scope

- The 86 list, items, or any household content (feature 049)
- Consent, analytics events, data export/delete (feature 050)
- Email-based invitations and deep links
- Household dissolution/cleanup and orphaned-household garbage collection
- Push notifications for membership changes
