---
phase: 2
plan: 02
type: implementation
depends_on: [01]
files_modified: []
autonomous: false
requirements: [OVR-01, OVR-02, OVR-03, OVR-04]
---

# Phase 2 Plan — Local overlay projects and persistence

## Objective

Replace remote overlay CRUD with a Windows-local project repository while retaining editor behavior.

## Tasks

1. Specify and validate the versioned `overlay.json` contract: UUID, display name, canvas, elements, assets, animation configuration and timestamps.
2. Implement filesystem repository rooted in Electron `userData/overlays/<uuid>/`, using path containment checks and atomic writes.
3. Replace the current Supabase overlay repository/store calls with the local adapter; preserve the existing mapper/editor model where possible.
4. Implement creation, UUID links, duplicate, local-folder reveal, autosave, bounded backup history and recovery after interrupted writes.
5. Implement confirmed deletion: stop its runtime subscription, remove only the resolved project directory and return a not-found state for its UUID.
6. Provide an import/export/backup path for current remote overlays before Phase 5 removes them.

## Acceptance criteria

- New overlay creation generates a UUID and an isolated local directory.
- Restarting the app restores all state, assets, element positions and animation settings.
- Copy-link uses the UUID, not the editable display name.
- Deleting one project cannot remove another project or an arbitrary path.
