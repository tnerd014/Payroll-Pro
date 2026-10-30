# Hyperframes Composition Brief: Payroll Pro

## Objective
Create a short, polished, high-energy launch brag video for Payroll Pro.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `c:/Users/USER/Desktop/Payroll Pro`
- Primary files read: `index.html`, `src/index.css`, `tailwind.config.js`, `src/components/layout/SidebarNav.tsx`, `src/components/dashboard/DashboardView.tsx`, `src/components/payroll/PayrollProcessingView.tsx`
- Product name: Payroll Pro
- Tagline / strongest claim: Intelligent Nigerian Payroll & Statutory Compliance in 1 Click
- Key UI or visual moment to recreate: Real dark-mode dashboard cards with live Naira counter, Nigerian statutory breakdown pills (PAYE, Pension 8%+10%, NHF 2.5%, NSITF 1%), and instant bank transfer schedules.
- Copy that must appear verbatim:
  - "End-of-month payroll shouldn't take 3 days."
  - "Payroll Pro: Intelligent Nigerian Payroll"
  - "100% Statutory Compliant: PAYE • Pension • NHF • NSITF"
  - "1-Click Batch Execution & Direct Bank Schedules"
  - "Payroll sorted in seconds. Pay your people with Payroll Pro."

## Creative Direction
- Tone preset: polished
- Creative direction: Modern African fintech product launch film with sharp dark aesthetics, vibrant emerald green accents, smooth typography, and authoritative clarity.
- Interpretation: Professional, authoritative, and clean. Keeps pace high through purposeful motion and bold UI highlights without clutter.
- Angle: Stop wasting days wrestling with manual Nigerian payroll spreadsheets and tax laws. Payroll Pro automates statutory deductions, payslips, and bank payment schedules in seconds.
- Hook: "End-of-month payroll shouldn't take 3 days."
- Outro / punchline: "Payroll sorted in seconds. Pay your people with Payroll Pro."
- Avoid:
  - Generic SaaS boilerplate words
  - Abstract 3D floating blobs or irrelevant illustrations
  - Low contrast unreadable typography

## Visual Identity
- Background: `#09090b`
- Surface / Cards: `#131317` / `#18181d`
- Border: `#2c2c34`
- Accent Primary: `#10b981` (Emerald)
- Accent Secondary: `#6366f1` (Fintech Indigo)
- Text Primary: `#f4f4f5`
- Text Muted: `#a1a1aa`
- Display font: Inter, system-ui, sans-serif
- Body font: Inter, system-ui, sans-serif
- Visual references from the project: Dark glassmorphic card containers, currency formatting (`₦`), status indicator pills, batch progress bars.

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook (0.0s - 3.5s) — High-contrast hook text: "End-of-month payroll shouldn't take 3 days." -> "What if you could run it in 1 click?"
2. Hero Dashboard Reveal (3.5s - 8.5s) — Payroll Pro dashboard cards slide in: 42 active staff, ₦14,850,200 total net payroll counting up, 100% compliance badge.
3. Automated Statutory Engine (8.5s - 13.5s) — Interactive breakdown: PAYE Tax, 8% Pension, 2.5% NHF, 1% NSITF. User trigger click -> "Batch Verified & Locked".
4. Bank Transfer Schedules & Payslips (13.5s - 17.5s) — Side-by-side cards: NIP / Bulk Bank payment schedule & branded employee digital payslips.
5. Outro & Brand Lockup (17.5s - 20.0s) — Centered Payroll Pro logo, glowing emerald badge, punchline: "Payroll sorted in seconds. Pay your people with Payroll Pro."

## Audio
- Audio role: Warm, confident rhythmic electronic bed.
- Audio arc: Tight suspense in the opening 3 seconds, dropping into an energetic confident pulse with rhythmic UI clicks, and resolving on a clean logo chord.
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`
- Music treatment: Plays from 0.0s with volume at ~0.65, steady drive, gentle fade-out at 18.5s - 20.0s.
- Music cue guidance: Preset cues loaded from track 10. Major beat at 3.55s aligns with Scene 2 hero entrance; beat at 8.73s aligns with Scene 3 engine; beat at 13.64s aligns with Scene 4 export; strong beat at 18.01s - 20.19s lands on logo reveal.
- Audio-reactive treatment: Subtle card glow and border brightness pulsing gently with beat energy.
- SFX selection guidance: Crisp UI snap on card entries, subtle mechanical click on batch trigger, clean digital confirm chime on completion.
- Audio files: `assets/music/happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`

## Hyperframes Instructions
Build a standalone Hyperframes HTML composition in `brag-output/composition/` with `index.html` conforming to Hyperframes specifications.
Requirements:
- Show real UI components from Payroll Pro (stat cards, statutory table, batch run button, bank schedule preview).
- Keep all text high contrast (WCAG AAA/AA compliant) and readable.
- Scene timings must sum exactly to 20 seconds (600 frames at 30fps).
- Run `npx hyperframes check` to ensure zero errors.
- Render to `brag-output/brag.mp4`.
