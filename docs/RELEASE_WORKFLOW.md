# Payroll Pro — User & Developer Release Guide (Desktop + Android)

This guide is your day-to-day playbook for developing, testing, releasing, and rolling back **Payroll Pro** on Windows Desktop and Android without breaking live users or wasting GitHub Actions builds.

---

## Quick Cheat Sheet: What to Tell the Agent

| What You Want to Do | What to Say to the Agent | What Happens on GitHub | What Live Users See |
| :--- | :--- | :--- | :--- |
| **Save daily work / bug fixes** | `"Commit and push to main"` | Fast 30s CI check only (**no `.exe`/`.apk` compiled**) | **Nothing** |
| **Build a Test / Beta `.exe` & `.apk`** | `"Cut a beta build v1.2.0-rc.1"` | Compiles Windows `.exe` + Android `.apk` as a **Pre-release** | **Nothing** (apps ignore Pre-releases) |
| **Release to all customers** | `"Ship production release v1.2.0"` | Compiles Windows + Android into a **Draft** release | **Nothing until YOU click "Publish release"** on GitHub |
| **Undo a bad live release** | `"Revert the bad commit and cut hotfix v1.2.1"` | Builds `v1.2.1` hotfix after you set `v1.2.0` back to Draft | Un-updated users stay safe; updated users get `v1.2.1` |

---

## Phase 1: Everyday Development (No Installers Built)
- Code, fix bugs, and push to `main` as many times a day as you like:
  ```bash
  git add -A
  git commit -m "feat: add staff bonus calculation"
  git push origin main
  ```
- **What runs:** Only `.github/workflows/ci.yml` (~30s TypeScript + Vite build + `node -c electron/main.cjs`).
- **Database tip:** Use a separate free **Staging Supabase** project when testing new `schema.sql` changes so real customer payroll data is never touched.

---

## Phase 2: Test / Beta Phase (`v1.2.0-rc.1` — Only YOU Test It)
When you are ready to test real packaged installers on your own PC and Android phone:
```bash
git tag -a v1.2.0-rc.1 -m "Beta test build v1.2.0-rc.1"
git push origin v1.2.0-rc.1
```
1. Open **GitHub → Releases** and find **Payroll Pro v1.2.0-rc.1 (Beta / Test)** (labeled **Pre-release**).
2. Download `Payroll-Pro-Setup-1.2.0-rc.1.exe` onto your PC and `app-release.apk` onto your Android phone.
3. Test login, Supabase sync, core payroll features, and **Restart to Update**.
4. If you find a bug, fix it on `main` and cut `v1.2.0-rc.2`. Live users never see any of this.

---

## Phase 3: Production Phase (`v1.2.0` — Live Customers)
Only after your `-rc` build passes on your real Windows PC and Android phone:
1. Ask the agent to bump version to `1.2.0` (updates `package.json`, `android/app/build.gradle` `versionCode` +1, and `src/utils/releaseUpdate.ts`), commit, and push tag `v1.2.0`:
   ```bash
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin main
   git push origin v1.2.0
   ```
2. Wait ~5 minutes for **both** GitHub Actions (**Release Desktop Build** and **Release Android APK**) to show green checkmarks.
3. Go to **GitHub → Releases**, open the **Draft** for `v1.2.0`, confirm both the Windows `.exe` and `app-release.apk` are attached, and click **"Publish release"**.
4. All live PCs and Android phones now receive **one clean, verified update**.

---

## Phase 4: Emergency Rollback (If a Bug Slips Into Production)
Because Desktop and Android apps live on users' devices (and Android forbids installing a lower `versionCode`), rollback takes 2 steps:

### Step 1 — Stop Everyone Else From Updating (10 seconds)
1. Go to **GitHub → Releases → Edit `v1.2.0`**.
2. Tick **"Save as draft"** and click **Update release** (or delete the release).
3. Immediately, `/releases/latest` falls back to your previous working version — anyone who hasn't updated yet stays completely safe.

### Step 2 — Fix Anyone Who Already Updated ("Roll Forward")
1. Tell the agent: `"Revert commit <bad-sha> and release hotfix v1.2.1"`.
2. Git reverts the bad change, bumps to `v1.2.1` (and Android `versionCode + 1`), and builds a fresh Draft release.
3. Click **Publish release** on `v1.2.1` — users who installed `v1.2.0` immediately get the update prompt and are restored to working code.

### Database Safety Rule ("Expand, Never Break")
Old and new app versions share the same Supabase database while users update gradually. Always add new columns with `ADD COLUMN IF NOT EXISTS ... DEFAULT ...` in `schema.sql` and `src/constants/supabaseSchema.ts`, and never drop or rename a column in the same release.
