# CLAUDE.md

**eightysix ("86")** — household out-of-stock tracker. ScriptHammer-family PWA (Next.js 15 / React 19 / Tailwind 4 / DaisyUI / Supabase, static-exported to GitHub Pages) that also carries the multi-terminal planning-factory tooling.

Workspace conventions (Docker-first mandate, 5-file component pattern + generator, SpecKit command table, testing stack, deploy/code-quality) live in `/home/TurtleWolfe/repos/CLAUDE.md`. This file holds only what is specific to this repo.

## Docker / dev environment

- Docker service name is **`eightysix`**. Run everything through it: `docker compose exec eightysix pnpm <...>`.
- Container listens on port **3000**; the host port **auto-assigns** (`SH_PORT:-0`). Find the real one with `docker compose port eightysix 3000`. Pin it by setting `SH_PORT=3000` in `.env` (opt-in per instance — the old `:-3000` default collided).
- **Never `sudo` and never install/clean on the host** (`npm/pnpm install`, `rm -rf node_modules`, `rm -rf .next`) — container owns those files with its own UID/GID; host `sudo` corrupts permissions. Do it in-container: `docker compose exec eightysix pnpm run docker:clean`, or `docker compose down && docker compose up` (restarts + cleans `.next`).
- Git hooks only work in-container: `docker compose exec eightysix git add -A && ... git commit`. Push from the host (uses your SSH keys).
- Supabase Cloud free tier auto-pauses after 7 days (or first request is slow ~10-30s). Wake it with `docker compose exec eightysix pnpm run prime`.

## Static-hosting constraint

Deployed to GitHub Pages (static). No server-side API routes (`src/app/api/` does not run in prod), and only `NEXT_PUBLIC_*` env vars reach the browser. All server-side logic and secrets must live in Supabase (DB, Edge Functions, triggers, Vault).

## Supabase migrations

- **One monolithic idempotent migration file**: `supabase/migrations/20251006_complete_monolithic_setup.sql`. Never create separate `NNN_*.sql` files. Add changes inside its `BEGIN;`…`COMMIT;` block using `IF NOT EXISTS`.
- Execute it yourself via the Supabase **Management API** (`curl` to `.../database/query` with `SUPABASE_ACCESS_TOKEN` + `NEXT_PUBLIC_SUPABASE_PROJECT_REF` from `.env`). Never tell the user to paste SQL into the dashboard, never install `psql`/`pg` locally, and never direct-connect from Docker (DNS fails). Free tier has no CLI migrations.

## CI / E2E hard-won rules

- **Never bypass commit hooks** — no `git commit --no-verify` unless the user explicitly asks. husky + lint-staged + gitleaks catch real bugs and near-miss secret leaks. If a hook fails, read the named file+line, fix the cause, re-stage.
- **Never merge a PR while another PR's CI is running against the same Supabase backend.** Concurrent E2E runs race each other's `cleanupOldMessages` `beforeAll` hooks and wipe data the other is polling for. Now guarded by a repo-wide `concurrency:` mutex in `.github/workflows/e2e.yml` (runs queue, never race) — the rule still holds for any future shared backend.
- **WebKit does not reliably fire `scroll` when JS assigns `el.scrollTop`** (Chromium/Firefox do). In E2E, dispatch it explicitly: `el.dispatchEvent(new Event('scroll', { bubbles: true }))` after setting `scrollTop`.
- Authoritative CI state is the API (`gh run view <id> --json status,conclusion,jobs`), not the run-list UI (its timestamp = last sub-job start, misleading).
- E2E runs in CI (chromium + firefox + webkit, 28 shards).

## Branch hygiene

- Repo has `delete_branch_on_merge=true`; after merging run `git fetch --prune origin`. Don't leave unmerged branches / open PRs between work items.
- Avoid stacked PRs: when the parent merges, GitHub auto-closes children based on it — re-target the child to `main` and reopen.

## Misc

- Leaflet CSS: import it only in map components, never in `globals.css` (breaks Tailwind loading). Restart the container after CSS changes.
- Touch targets: `min-h-11 min-w-11` (44px, mobile-first).
- Test user: `test@example.com` / `TestPassword123!`. Optional secondary via `TEST_USER_SECONDARY_EMAIL` / `_PASSWORD` in `.env`.
- CI/CD secrets list lives in `README.md` (repo Settings → Secrets and variables → Actions).
- Feature/docs pointers: `docs/` (AUTH-SETUP, messaging, SECURITY, TESTING, CREATING_COMPONENTS, FORKING), PRP flow in `docs/prp-docs/` (branch via `./scripts/prp-to-feature.sh`).

## Planning-factory tooling (multi-terminal)

This repo also carries the eightysix planning template's tmux assembly line (STRATEGY → DESIGN → CODE → TEST → DOCS → RELEASE). Role context is in `.claude/roles/`; feature specs in `features/<category>/<NNN-name>/` with `features/IMPLEMENTATION_ORDER.md` as the dependency graph; run `/refresh-inventories` after spec changes.

- **Terminal git rule: COMMIT ONLY, NEVER PUSH.** Only the Operator has SSH push access. Stay in your lane — commit and move on.
- SVG wireframes: `viewBox="0 0 1920 1080"`; desktop x=40 y=60 1280×720, mobile x=1360 y=60 360×720; panel color `#e8d4b8` (never white); 44px touch targets; validate with `.specify/extensions/wireframe/scripts/validate.py`.
