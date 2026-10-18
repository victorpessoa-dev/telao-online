---
phase: 4
plan: 04
type: implementation
depends_on: [01]
files_modified: []
autonomous: false
requirements: [ADM-01]
---

# Phase 4 Plan — Desktop administrative operations

## Objective

Move sponsor, telão and setting operations to the authenticated desktop without weakening Supabase authorization.

## Tasks

1. Port the protected admin shell and navigation into Electron, including patrocinadores, ajustes, edição de telões, métricas and local overlay pages.
2. Reuse or adapt Supabase sponsor/settings services for the Electron authentication runtime.
3. Preserve media upload validation, sponsor activation, NORMAL/MASTER counters and settings operations.
4. Remove any remaining dependency from desktop admin pages on remote overlays.
5. Add URL actions that copy/open only their valid destination: public web URLs for landing, comunidade, sponsor slugs and telões; loopback URLs only for local overlays.
6. Regression-test admin operations with admin, non-admin and signed-out states.

## Acceptance criteria

- Admin can manage sponsors, telões, adjustments, metrics and local overlays only after desktop login.
- Non-admin and unauthenticated users are denied by both UI and RLS.
- Overlay management remains local and works if Supabase is temporarily unavailable.
