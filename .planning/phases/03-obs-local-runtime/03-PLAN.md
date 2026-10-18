---
phase: 3
plan: 03
type: implementation
depends_on: [02]
files_modified: []
autonomous: false
requirements: [OVR-05, OVR-06, RUN-01, RUN-02, RUN-03, RUN-04]
---

# Phase 3 Plan — OBS loopback runtime and live updates

## Objective

Serve local overlays to OBS with transparent rendering and immediate, secure updates.

## Tasks

1. Add a loopback-only HTTP/WebSocket server lifecycle owned by Electron main process; refuse non-loopback binding.
2. Implement `/overlay/<uuid>` initial render and local asset delivery with strict UUID and path validation.
3. Define event protocol for complete snapshot, element patch, transient drag frame, persisted commit, asset refresh and project deletion.
4. Connect editor save/preview actions to the runtime; coalesce transient pointer movement while sending immediate visibility/text/property changes.
5. Add filesystem watcher with debounce and manifest validation so external local edits trigger a safe refresh.
6. Test OBS Browser Source compatibility, transparent output, reconnection, invalid UUID handling and deletion while connected.

## Acceptance criteria

- `http://127.0.0.1:<port>/overlay/<uuid>` displays only that local project with transparent background.
- Show/hide, movement, edits and animations appear without Browser Source reload.
- The endpoint is not reachable from another network device.
- Deleted overlays return not found and connected clients receive a clear removal event.
