---
phase: 6
plan: 06
type: documentation
depends_on: [05]
files_modified: [README.md, docs]
autonomous: false
requirements: [DOC-01, DOC-02]
---

# Phase 6 Plan — Windows release, operations and documentation

## Objective

Package the desktop application and make the new operational model maintainable by the PASCOM team.

## Tasks

1. Produce a Windows installer and release checklist covering signing, versioning, updates and rollback.
2. Update README with separate desktop and public-site setup instructions.
3. Update architecture, folder structure, APIs, database, security, deploy and developer guides to remove remote overlays and describe the desktop boundary.
4. Add operator guide for login, “Manter conectado”, logout, overlay creation, OBS Browser Source URL, live updates, local backup and restore.
5. Add migration runbook: export old overlay data, verify local import, apply Supabase migration, clean Storage prefixes and recover from backup.
6. Add end-to-end smoke test: fresh Windows install, admin login, create overlay, copy URL to OBS, live edit, restart, deletion, and public-site validation.

## Acceptance criteria

- A new operator can install the `.exe`, log in and run an overlay in OBS using only the documentation.
- Documentation correctly states that overlays never leave the local machine.
- Deployment and recovery procedures cover both Supabase and local overlay folders.
