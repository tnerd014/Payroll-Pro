# Payroll Pro — Workspace Agent Instructions

All agents working in this repository must follow the workspace rules in `.agents/rules/`:

- [Release, Testing & Rollback Workflow](.agents/rules/release-and-deployment-workflow.md)
- [Database Synchronization & Minimalist Design](.agents/rules/database-and-minimalist-design.md)
- [Mobile UI/UX Guidelines](.agents/rules/mobile-ui-guidelines.md)

## Quick Mandatory Summary
1. **No Release Tags on Regular Pushes:** Regular `git push origin main` runs fast CI only (`.github/workflows/ci.yml`). Never bump versions or push a `v*` tag unless explicitly asked for a **Beta/Test (`vX.Y.Z-rc.N`)** or **Production (`vX.Y.Z`)** release.
2. **Test Before Production:** Use `vX.Y.Z-rc.N` pre-releases (invisible to live users) to test real Windows `.exe` and Android `.apk` builds. Stable `vX.Y.Z` tags publish as **Draft** releases until both platforms succeed and the owner clicks **Publish release** on GitHub.
3. **Rollback:** Unpublish the bad GitHub Release (back to Draft) to stop new updates, then `git revert` + release `vX.Y.(Z+1)` (incrementing Android `versionCode`) to roll forward already-updated devices.
4. **Schema Sync:** Any database change must update both `schema.sql` and `src/constants/supabaseSchema.ts` with backward-compatible (`ADD COLUMN IF NOT EXISTS ... DEFAULT ...`) migrations.
