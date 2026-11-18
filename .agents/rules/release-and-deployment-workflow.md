# Agent Operational Rule: Release, Testing & Rollback Workflow (Desktop + Android)

Payroll Pro is distributed as a **Windows Desktop (Electron)** app and an **Android (Capacitor)** app backed by **Supabase** (not a web app). All agents MUST follow this 3-phase release discipline:

## 1. Never Create Release Tags on Regular Pushes
- When the user asks to **commit**, **save**, or **push** normal code changes or bug fixes:
  - Push **only** the branch (`git push origin main`).
  - Do **NOT** bump version numbers (`package.json`, `android/app/build.gradle`, `src/utils/releaseUpdate.ts`) and do **NOT** create or push a `v*` tag unless the user explicitly asks to cut a **Beta/Test (`rc`)** or **Production** release.
  - Pushing to `main` triggers only `.github/workflows/ci.yml` (~30s build & syntax check), saving GitHub Actions build minutes and keeping live users undisturbed.

## 2. Test / Beta Phase Before Production (`vX.Y.Z-rc.N`)
- When the user asks to **test a build**, **build a beta**, or **prepare a release candidate**:
  - Create and push a pre-release tag formatted `vX.Y.Z-rc.1` (incrementing `.2`, `.3`, etc. for fixes).
  - Do **not** bump the stable version in `package.json` to `X.Y.Z` yet unless explicitly requested (the Desktop workflow overrides `extraMetadata.version` from the tag).
  - GitHub Actions publishes `vX.Y.Z-rc.N` as a **GitHub Pre-release (`prerelease: true`)**, invisible to production users.
  - Remind the user to install and verify both the `.exe` and `.apk` on real devices (including **Restart to Update** and Supabase sync) before promoting to Production.

## 3. Production Phase (`vX.Y.Z` — Draft First)
- Only when the user explicitly asks to **ship/publish a production release** (after Beta/RC verification):
  1. Bump the version consistently in all 3 files:
     - `package.json` (`"version": "X.Y.Z"`)
     - `android/app/build.gradle` (`versionCode` +1, `versionName "X.Y.Z"`)
     - `src/utils/releaseUpdate.ts` (`DEFAULT_APP_VERSION = 'X.Y.Z'`)
  2. Run `npm run build` and `node -c electron/main.cjs` to verify clean compilation.
  3. Commit, create tag `vX.Y.Z`, and push both `main` and `vX.Y.Z`.
  4. Remind the user that `vX.Y.Z` is created as a **Draft Release** on GitHub — they must verify both Windows & Android workflows pass and click **Publish release** on GitHub to notify live users.

## 4. Rollback Protocol (Desktop + Android)
Because binaries live on user devices and Android forbids downgrading `versionCode`:
1. **Immediate Stop:** Advise the user to set the faulty GitHub Release back to **Draft** so `/releases/latest` reverts to the previous stable version immediately.
2. **Roll Forward:** Revert the faulty commit(s) (`git revert <sha>`), bump to the next patch version (`X.Y.(Z+1)` and `versionCode + 1`), verify, and release so already-updated users automatically update to the restored code.

## 5. Database Compatibility & Update Safety
- Every Supabase schema change must be additive and backward-compatible (`ADD COLUMN IF NOT EXISTS ... DEFAULT ...`) in both `schema.sql` and `src/constants/supabaseSchema.ts`, because older and newer app versions query the same live database simultaneously.
- Never allow `src/utils/releaseUpdate.ts` or `electron/main.cjs` to treat `draft`, `prerelease`, or raw `main/package.json` commits as stable updates for production users.
- Never run destructive tests against live customer companies in production Supabase; use a Staging Supabase project or isolated `SIM_*` test records that are always cleaned up.
