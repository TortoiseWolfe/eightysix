<!--
Sync Impact Report - v1.0.0 Ratification (Privacy-First Reframe)
Ratification Date: 2026-06-12
Version: (forked from ScriptHammer template, post-047 feature tree) → 1.0.0 (FRESH RATIFICATION)
Project: eightysix ("86") — household out-of-stock tracker

Rationale for fresh v1.0.0 rather than v1.x.x amendment:
  This is a template generation from TortoiseWolfe/ScriptHammer followed by a
  wholesale principle reframe. The new constitution puts privacy-first data
  ethics in the top slots (I–V) and absorbs ScriptHammer's six original
  disciplines (component pattern, TDD, PRP/SpecKit + wireframe gate, Docker,
  progressive enhancement, privacy/GDPR) into a "Mandatory Constraints"
  section beneath them — the structural pattern established by SpokeToWork
  v1.0.0 and HatCoatAndBoots v1.0.0. This is a fresh constitution for a new
  project, not an amendment of the upstream's; semantic versioning starts at
  1.0.0 here.

Why privacy-first for a fridge app:
  86's long-term ambition is aggregate analysis of out-of-stock/restock
  events — market-research-grade data about what households consume.
  A product whose business model touches behavioral data must make its
  data ethics structural, not procedural. The principles below are the
  product moat: households trust the list because the architecture makes
  betrayal impossible, not because a policy page promises restraint.

Constitutional Alignment at v1.0.0:
  I. Household Data Sovereignty
  II. Consent Before Collection
  III. Anonymity by Architecture
  IV. The List Works Without Surveillance
  V. Transparent Future Monetization

Template Consistency (carried forward from ScriptHammer template):
  ✅ .specify/templates/plan-template.md            (no change required)
  ✅ .specify/templates/spec-template.md            (no change required)
  ✅ .specify/templates/tasks-template.md           (no change required)
  ✅ Wireframe gate from ScriptHammer v1.0.2        (preserved in Constraints)

Family Position:
  eightysix is a ScriptHammer family fork (web/Next.js/Docker/SpecKit stack —
  sibling of SpokeToWork, TurtleWolfe, and HatCoatAndBoots). Its content
  domain is a shared household out-of-stock list with consent-gated
  analytics. See /home/TurtleWolfe/repos/CLAUDE.md for the 5-track family
  context.
-->

# eightysix Constitution

**Project:** 86 — when something in the fridge runs out, any roommate 86's it
from their phone (typed, barcode-scanned, or photo-recognized); the shared
live list doubles as the shopping list. Restocking un-86's it. An append-only
event log powers household insights and, only with separate explicit consent,
k-anonymized cross-household research. A fork of ScriptHammer
(web/Next.js/Docker/SpecKit) — same machinery, privacy-first reframe.

The five principles below apply on **both layers simultaneously**: they shape
what the product promises households AND how the schema, RLS policies, and
Edge Functions are built. The disciplines under "Mandatory Constraints" are
the _how_; the principles above them are the _why_.

## Core Principles

### I. Household Data Sovereignty

The household's data belongs to the household; the member's data belongs to
the member. 86 is the custodian, never the owner.

**Forbidden:** any read path that lets one household see another household's
rows; any export, dashboard, or debug tool that crosses the household
boundary outside the Principle III rollup; any schema design where deleting
a user leaves their personal data orphaned but recoverable.

**Required:** every domain table carries a `household_id` and an RLS policy
scoped through active membership (`is_household_member()`); every member can
export their own data (JSON, theirs to take) and delete their account, with
the effect on shared rows documented in the privacy policy. Data formats are
portable — Markdown, JSON, CSV — never trapped.

### II. Consent Before Collection

No analytics event is recorded without the acting user's explicit, prior,
revocable opt-in — and the gate is enforced **in the database**, not in the
client.

**Forbidden:** logging `stock_events` rows for non-consenting users (even
"anonymized" ones — in a 3-person household, a timestamped anonymous event
is trivially re-identifiable); bundling consent types; pre-checked boxes;
consent walls that block core function; inferring one consent from another.

**Required:** `consent_records` is append-only with versioned policy text, so
the audit trail of who agreed to what, when, under which wording, is
permanent. The RLS INSERT policy on `stock_events` checks the actor's latest
`analytics_events` consent. Revocation takes effect at the next action — no
grace period, no batch flush.

### III. Anonymity by Architecture

Cross-household aggregation exists only through structures that make
re-identification impossible — the boundary is enforced by the schema, not
by promises.

**Forbidden:** any client-readable path to raw `stock_events` outside the
actor's own households; rollups keyed by household or user; aggregate
buckets small enough to single out a household.

**Required:** cross-household research data flows through SECURITY DEFINER
views/functions only, which (a) strip `household_id` and `actor_id`,
(b) include only events from users whose latest `aggregate_research` consent
is granted (default: denied), and (c) apply k-anonymity — any bucket with
fewer than 10 distinct households is suppressed. The view definition ships
in the monolithic migration so the boundary is reviewable in one place.

### IV. The List Works Without Surveillance

Declining analytics never degrades the core product. The list is the
product; the data is a privilege the user may grant.

**Forbidden:** feature-gating list functionality on analytics consent;
nagging re-prompts; dark patterns that make "decline" harder than "accept";
quietly degraded sync, autocomplete, or capture for non-consenting users.

**Required:** operational writes (`items` add/restock) work identically for
consenting and non-consenting members. Household dashboards label their
basis honestly: "based on events from consenting members." A household of
zero consenting members still has a fully working 86 list, barcode scanner,
and photo recognition.

### V. Transparent Future Monetization

If aggregate data is ever monetized (research sales, sponsored insights,
ads), that requires fresh, separate, explicit opt-in under its own policy
version — never inferred, never bundled, never retroactive.

**Forbidden:** treating `analytics_events` or `aggregate_research` consent
as covering external monetization; retroactively including pre-consent
events in any monetized dataset; ad targeting from individual (rather than
k-anonymized aggregate) data.

**Required:** the `marketing_external` consent type is reserved in the
schema from day one (no UI until it is real), so the future question is
asked honestly when it arrives. Any monetization PRP must cite this
principle and pass a constitutional review before /specify.

## Mandatory Constraints

These are the operational disciplines inherited from ScriptHammer. They are
_how_ we build; principles I–V are _why_. Constraints stay enforced by CI;
violations break the build.

### Docker-First Development

All development happens in containers. Never install packages on the host
(`pnpm install` runs _inside_ the container). Never `sudo` to fix
permissions. The container runs as your user with correct UID/GID. Commit
from inside the container so husky/lint-staged/gitleaks hooks run; never
`--no-verify`.

### 5-File Component Pattern

Every component MUST ship as five files in its own directory:

```
ComponentName/
  index.tsx                          # barrel export
  ComponentName.tsx                  # the component
  ComponentName.test.tsx             # Vitest unit + RTL component tests
  ComponentName.stories.tsx          # Storybook story
  ComponentName.accessibility.test.tsx  # Pa11y a11y test
```

Generate with `pnpm run generate:component` — never create by hand. CI
rejects components missing any of the five files.

### Test-First Development

RED → GREEN → REFACTOR. Tests precede implementation. Stack: Vitest (unit +
component, 25%+ coverage minimum), Playwright (E2E), Pa11y (WCAG 2.1 AA,
zero violations), Storybook (every component has a story). Tests run on
pre-push via Husky. RLS policies get contract tests — Principle I and II
enforcement IS testable behavior, and ships tested.

### SpecKit Workflow (with the v1.0.2 Wireframe Gate)

All features flow through:

```
/speckit.specify → /speckit.clarify
       → wireframe generate → wireframe review          [HARD GATE]
       → /speckit.plan → /speckit.checklist → /speckit.tasks
       → /speckit.analyze → /speckit.implement
       → wireframe screenshots                          [post-implement regression]
```

The wireframe gate (inherited from ScriptHammer v1.0.2) is mandatory.
Pure-infrastructure PRPs ship a "no UI" wireframe stub rather than skipping
the step. Dark-theme wireframes document backend architecture (RLS,
sequence flows) and count toward the gate.

### Static Hosting

Deploys to GitHub Pages. No server-side API routes. All server logic lives
in Supabase (database, RLS, Edge Functions, triggers). Secrets live in
Supabase Vault / Edge Function secrets — the vision-model key for photo
recognition never reaches the client. Route protection is the
`<ProtectedRoute>` client component; data security is enforced at the
database layer via RLS, not at the request layer.

### Monolithic Supabase Migration

One migration file, one `BEGIN;`...`COMMIT;`, every statement idempotent
(`IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`). RLS on
every table. Never create separate migration files.

### Progressive Enhancement + WCAG AA

Core HTML works first. Then PWA (offline capture at the fridge is a
first-class flow, not an edge case — queue locally, sync honestly with
`occurred_at` preserved). Then a11y (44px touch targets, keyboard nav,
screen reader). Then performance (90+ Lighthouse). A roommate using a
screen reader must be able to 86 the milk.

### Privacy & Compliance First

GDPR-honest by default. Cookie consent before any tracking. Analytics only
after explicit consent (Principle II makes this structural). RLS on every
Supabase table. No third-party services without a consent modal.

## Governance

### Amendment Procedure

- Amendments use `/speckit.constitution` which auto-syncs
  `.specify/templates/` and writes a Sync Impact Report at the top of this
  file.
- Each amendment documents rationale, impact analysis, and migration plan
  if breaking.
- Any amendment weakening Principles I–III requires the maintainer to write
  the user-facing announcement FIRST — if you can't announce it plainly,
  don't ship it.

### Versioning (Semver)

- **MAJOR** — principle removal, redefinition, or governance restructure.
- **MINOR** — principle addition, materially expanded scope.
- **PATCH** — clarifications, wording, typos.

### Compliance & Enforcement

- All PRs verify constitutional compliance — CI enforces the technical
  Mandatory Constraints automatically; reviewers check principle adherence,
  with special scrutiny on any diff touching `stock_events`,
  `consent_records`, or SECURITY DEFINER objects.
- This constitution supersedes all other practices. Sprint constitutions
  may temporarily override for focused work, with documented rationale —
  but never Principles I–III.
- Use `CLAUDE.md` at the repo root for AI-assistance development guidance.

**Version**: 1.0.0 | **Ratified**: 2026-06-12 | **Last Amended**: 2026-06-12

## Amendment Log

### v1.0.0 — 2026-06-12 — Ratification

Fresh ratification of a constitution for the eightysix project (generated
from the TortoiseWolfe/ScriptHammer template, then wholesale-reframed).
Five privacy-first principles take the Core slots; ScriptHammer's
disciplines move into Mandatory Constraints. Structural pattern mirrors
HatCoatAndBoots v1.0.0 and SpokeToWork v1.0.0. The privacy principles are
load-bearing for the product's planned analytics: consent enforced in RLS
(II), k-anonymized definer-view rollups (III), and a reserved
`marketing_external` consent type (V) are schema-level commitments made
before the first feature was specified.
