---
phase: 5
plan: 05
type: migration
depends_on: [02, 03, 04]
files_modified: [supabase/schema.sql, supabase/migrations]
autonomous: false
requirements: [PUB-01, PUB-02, DB-01, DB-02, DB-03]
---

# Phase 5 Plan — Public web reduction and Supabase overlay retirement

## Objective

Remove remote overlay functionality only after local replacement is verified, while preserving all public sponsor/telão functionality.

## Tasks

1. Create and verify a backup manifest of `overlays` rows and overlay-specific Storage objects; document restoration before destructive work.
2. Remove hosted admin, login, overlay list/editor and public shared-overlay routes, components, APIs and navigation; preserve only public landing page, community, sponsor slugs/reports and both web telões.
3. Remove overlay repositories, mappers, services, realtime subscriptions and store dependencies from the Next.js deployment.
4. Author a reviewed Supabase migration that drops overlay-only RPCs (including `get_public_overlay`), RLS policies, indexes/triggers and the `overlays` table.
5. Update `supabase/schema.sql` to match the migration exactly.
6. Delete Storage objects only under verified overlay prefixes; do not delete the shared `pascom-media` bucket or sponsor assets.
7. Verify all URL controls: overlays copy `127.0.0.1` links only, telões/landing/community/slugs copy the configured public-site domain, and external URL fields reject protocols other than `http`/`https`.
8. Run public-route, database and rollback smoke tests before approving the destructive migration in production.

## Acceptance criteria

- Hosted app exposes no administrative or overlay endpoint.
- `/`, community, public slugs, `/telao`, `/telao-master` and sponsor reports keep working.
- Supabase has no table/RPC/policy exclusively required for remote overlays.
- Backup restoration has been tested in a non-production environment.

## Mandatory human checkpoint

Production database and Storage deletion require explicit confirmation after backup evidence, migration dry run and public smoke test are attached.
