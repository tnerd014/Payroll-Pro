---
name: mobile-app-ui-design
description: Design high-quality mobile app UI/UX screens, flows, and components. Use this skill whenever designing mobile app screens, creating app mockups, building mobile UI components, improving existing mobile app designs, creating mobile navigation, or transforming desktop interfaces into mobile-first Android/iOS experiences.
---

# Mobile App UI/UX Design Skill (Android & iOS)

This skill guides the creation of professional, polished mobile app interfaces that follow proven design principles used by top-tier apps like Revolut, Gusto, Airbnb, Spotify, and Material Design 3 for Android.

## Core Philosophy

Great mobile UI isn't about flashiness — it's about intentionality. Every pixel, spacing value, and touch interaction should serve the user. Interfaces must feel smooth, tactile, and effortless on touchscreen devices.

### 3 Guiding Questions Before Designing Any Screen:
1. **What is the user trying to accomplish right now?** (Reduce interaction cost and steps to reach that goal)
2. **How should this feel on a mobile device?** (Trustworthy, responsive, fluid, thumb-friendly)
3. **What is the single element they should notice first?** (Clear visual hierarchy)

---

## The 5-Step Mobile UI/UX Design Process

### Step 1: Understand the Context & Device Form Factor
- **Target Device**: Android (e.g., Pixel 8, Galaxy S24, 390px - 412px width baseline) or iOS.
- **Form Constraints**: Safe area insets (Status bar, camera punch-hole, bottom gesture pill/navigation bar).
- **Domain**: Enterprise Payroll, HR, and Financial Accounting (requires high data trust, clean numbers, tabular clarity transformed into mobile cards).

### Step 2: Structure First (Mobile UX Lens)
- **Thumb Zone Ergonomics**: Place primary actions (CTAs, FABs, bottom navigation, primary approvals) in the bottom third of the screen where fingers reach naturally without strain.
- **Table-to-Card Transformation**: NEVER force a desktop 10+ column table onto a phone screen. Instead, use:
  - High-density expandable summary cards.
  - Sticky key metrics (e.g., Name + Net Pay always visible).
  - Tap-to-expand accordions or Bottom Sheets for itemized breakdowns.
- **Material 3 Bottom Sheets**: Use modal and standard bottom sheets for filters, detailed breakdowns, and action menus rather than centered popups.
- **Horizontal Chips**: Use horizontally scrollable chip carousels for filters (e.g., Months, Departments, Status).

### Step 3: Apply Visual Design (UI Lens)

#### 1. Color System (60 / 30 / 10 Rule)
- **60% Neutral Base**: Pure dark (`#09090b` / `#121215`) or light background (`#fbfbfb` / `#ffffff`).
- **30% Structural Elements**: Elevated card surfaces (`#18181b` in dark mode, `#f4f4f5` in light mode), crisp borders, high-contrast typography.
- **10% Accent / Brand Color**: Emerald (`#10b981`), Indigo (`#6366f1`), or Amber for actions, status badges, and primary buttons.
- **Tonal Elevation**: In dark mode, use lighter surface tints (1dp to 8dp elevation) rather than heavy drop shadows.

#### 2. Typography & Numbers
- **System Font**: Inter, Roboto, or SF Pro.
- **Hierarchy**: Maximum 4 font sizes on any screen (e.g., 20px Screen Title, 15px Card Heading, 13px Body, 11px Metadata / Badge).
- **Monospace Financials**: Always use tabular numbers (`font-mono` / `tabular-nums`) for currency (₦ Naira, $, €), quantities, and dates so columns align effortlessly.

#### 3. Spacing (8-Point Grid System)
- All margins, paddings, and heights must be divisible by **8 or 4** (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`).
- Minimum touch target size: **48x48px** for all buttons, icons, and tap areas to comply with Android accessibility guidelines.

### Step 4: Emotional Design (Peak-End Rule)
- Design the **Peak**: When the user locks and finalizes payroll or approves loan disbursements, deliver satisfying tactile visual feedback (e.g. green success checkmark with smooth micro-animation, clear total payout badge).
- Design the **Ending**: A clean summary status pill ("Cycle May 2026 Locked & Ready for Disbursement") with instant export options (NIBSS CSV, WhatsApp Payslips).

### Step 5: Android Platform Specifics
- **Top App Bar**: 56dp height with Title, Company Avatar switcher, and Search/Sync action icons.
- **Bottom Navigation Bar**: 4-5 core tabs maximum (Dashboard, Staff, Payroll, Loans, More). Height: 80dp (Material 3).
- **Floating Action Button (FAB)**: Primary creation action (e.g., "+ Add Staff" or "New Loan") floating 16dp above the bottom navigation bar.
- **Pull to Refresh**: Seamless swiping gesture to trigger data re-sync with Supabase.

### Step 6: Mobile Icon Economy & Minimalist Action Design (CRITICAL INSTRUCTION)
- **Not all buttons need text**: On mobile view, excessive text in buttons or cards makes the UI bloated, congested, and amateurish (e.g. avoid multi-line button labels like "Print Official Payslip" or large action banners like "Official Payslip Document Tap to view & share breakdown").
- **Icon-First Design**: Just the icon is often enough. Use recognized, intuitive icons (e.g., `<FileText />` for payslip preview, `<Share2 />` for sharing, `<Printer />` for printing, `<X />` for closing/dismissing, `<Copy />` for copying, `<Edit3 />` for editing, `<Trash2 />` for deleting) with comfortable 40-48px touch targets and descriptive `aria-label`/`title` attributes.
- **Eliminate Text Bloat on Cards**: Avoid adding extra full-width action strips with explanatory text to every card in a list. Use a compact, elegant icon button right on the card header/row, or make the card itself cleanly tappable.
- **Minimalist Action Docks**: When grouping secondary or tertiary actions (bottom docks, floating action strips, card quick-actions), prioritize clean icon buttons or at most a single concise word (e.g., "Print" instead of "Print Official Payslip Document").

