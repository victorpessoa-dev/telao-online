---
phase: 1
plan: 01
type: implementation
depends_on: []
files_modified: []
autonomous: false
requirements: [DESK-01, AUTH-01, AUTH-02, AUTH-03, AUTH-04]
---

# Phase 1 Plan — Desktop foundation and secure login

## Objective

Create the secure Electron foundation required for the Windows administrative application, including e-mail/password authentication, encrypted session persistence and a hard admin-role boundary.

## Tasks

1. Define desktop packaging and process architecture.
   - Add Electron main, preload and renderer entry points without giving the renderer direct Node.js or filesystem access.
   - Configure `contextIsolation`, renderer sandboxing, restrictive navigation/window policies and an explicit Content Security Policy.
   - Define package scripts for desktop development, production build and Windows installer generation.
   - Verify: non-privileged renderer cannot call arbitrary IPC or Node APIs.

2. Build a narrow, typed desktop bridge.
   - Expose individual allowlisted methods only: application metadata, local-data path, secure session operations and later overlay APIs.
   - Validate IPC sender, payload shape and paths in the main process; reject unknown operations.
   - Keep local filesystem APIs unavailable until Phase 2.
   - Verify: automated tests cover rejected channels, malformed payloads and renderer-origin validation.

3. Implement Supabase email/password authentication for Electron.
   - Build login, loading, denied and signed-out states.
   - Authenticate through the anon/publishable key only; never package a service role key.
   - Fetch/verify `profiles.is_admin` after authentication and immediately sign out non-admin users.
   - Verify: admin reaches the desktop shell; non-admin cannot; bad credentials reveal no account details.

4. Implement safe persistent sessions and logout.
   - Persist only refresh/session credentials through Electron `safeStorage` after the “Manter conectado” opt-in; never store the password.
   - Restore, refresh and invalidate the session safely on startup; offer explicit local sign-out.
   - Define Supabase session settings for inactivity and maximum lifetime, then document the selected values before applying them.
   - Verify: restart restores opted-in session; sign-out clears it; expired/revoked session returns to login.

5. Add Phase 1 tests and security checklist.
   - Unit-test session adapter and admin guard.
   - Add a desktop smoke test for login, restart and logout.
   - Record an Electron security checklist for later phase acceptance.
   - Verify: lint, typecheck, unit tests and a packaged-development smoke test pass.

## Acceptance criteria

- A Windows developer build opens a login screen before administrative content.
- Only `profiles.is_admin = true` users can open the desktop application.
- “Manter conectado” survives restart but no password is written to disk.
- Logout removes local credentials and returns to login.
- Electron security defaults and restricted IPC are demonstrably enabled.

## Risks and gates

- **One-way decision gate:** select the Electron packaging stack and supported Windows architecture before adding binary tooling.
- **Security gate:** inspect packaged files to ensure `service_role` and `.env*` files are absent.
- **No Supabase schema deletion occurs in this phase.**
