# Payroll Pro — Comprehensive End-User Guide

This guide provides an exhaustive, step-by-step manual for daily operations in **Payroll Pro**. It covers every view, modal, calculation, workflow, and export feature available to Payroll Officers, HR Managers, and Financial Controllers.

---

## Table of Contents

1. [Navigation & Workspace Overview](#1-navigation--workspace-overview)
2. [Dashboard View](#2-dashboard-view)
3. [Employee Directory (Staff Management)](#3-employee-directory-staff-management)
   - [Staff Directory Ledger & Filters](#31-staff-directory-ledger--filters)
   - [Quick-Add Spreadsheet Form](#32-quick-add-spreadsheet-form)
   - [Standard Employee Profile Modal](#33-standard-employee-profile-modal)
   - [Employee 360° Comprehensive View Modal](#34-employee-360-comprehensive-view-modal)
4. [Monthly Payroll Processing](#4-monthly-payroll-processing)
   - [Payroll Computation Ledger](#41-payroll-computation-ledger)
   - [Active Period & Year Selector](#42-active-period--year-selector)
   - [Salary Variations & Prorations](#43-salary-variations--prorations)
   - [Locking & Finalizing Historical Snapshots](#44-locking--finalizing-historical-snapshots)
   - [Bank Payment Schedule Generation](#45-bank-payment-schedule-generation)
5. [Loans & Salary Advances Ledger](#5-loans--salary-advances-ledger)
   - [Disbursing New Loans / Advances](#51-disbursing-new-loans--advances)
   - [Automatic Payroll Amortization & Manual Payments](#52-automatic-payroll-amortization--manual-payments)
   - [Pausing, Resuming, and Editing Loan Facilities](#53-pausing-resuming-and-editing-loan-facilities)
6. [WYSIWYG Payslip Designer](#6-wysiwyg-payslip-designer)
   - [Design Templates & Layout Presets](#61-design-templates--layout-presets)
   - [Branding, Watermarks, Signatures, and QR Codes](#62-branding-watermarks-signatures-and-qr-codes)
   - [Batch Payslip Printing & PDF Export](#63-batch-payslip-printing--pdf-export)
7. [Company Settings & Statutory Configuration](#7-company-settings--statutory-configuration)
   - [Company Profile & Legal Details](#71-company-profile--legal-details)
   - [Departments & Cost Centers](#72-departments--cost-centers)
   - [Data Backup, Cloud Sync & Audit Logs](#73-data-backup-cloud-sync--audit-logs)
8. [Troubleshooting & Common Edge Cases](#8-troubleshooting--common-edge-cases)

---

## 1. Navigation & Workspace Overview

Payroll Pro is divided into a top **System Title Bar**, a left-hand **Ergonomic Navigation Sidebar**, and a central **High-Performance Ledger Workspace**.

### Top System Title Bar
- **Cloud Status Badge:** Indicates real-time connection status (`Online Synced`, `Syncing...`, or `Offline Local Cache`).
- **Workspace Switcher:** Displays active company name and logo with quick-lock trigger (`🔒 Lock Workspace`).
- **Operator Profile Pill:** Displays current logged-in operator, role badge (`Admin`, `Payroll Officer`, `Auditor`), and quick-logout.
- **Theme Switcher:** Toggles instantly between sleek Dark Mode (`#121215`) and crisp Light Mode.

### Left Navigation Sidebar
Quickly jump between workspaces using either mouse clicks or global keyboard shortcuts:
- `Alt + 1` — **Dashboard:** High-level executive analytics and statutory liabilities.
- `Alt + 2` — **Staff (Employees):** Complete employee records, onboarding, and directory.
- `Alt + 3` — **Payroll:** Monthly computation engine, period locking, and bank exports.
- `Alt + 4` — **Loans & Advances:** Lending register, deduction tracking, and repayments.
- `Alt + 5` — **Payslip Designer:** Visual payslip template customizer.
- `Alt + 6` — **Settings:** Company legal details, tax variables, departments, and backups.

---

## 2. Dashboard View

*The Dashboard provides an executive summary of current-period payroll obligations, employee count, departmental cost distribution, and statutory remittance liabilities.*

### What You'll See
1. **Executive Metric Cards:**
   - **Total Net Pay:** Sum total of take-home pay to be disbursed to employees for the selected period.
   - **Total Gross Payroll:** Company's overall payroll commitment before deductions.
   - **Total PAYE Tax:** Total personal income tax payable to State Internal Revenue Services (SIRS/LIRS).
   - **Total Pension Liability:** Combined Employee (8%) and Employer (10%) statutory pension fund contributions.
   - **Active Headcount:** Number of eligible employees active for the chosen payroll cycle.
2. **Department Cost Allocation:**
   - Visual bar and percentage breakdown attributing payroll expense across departments (Operations, Sales, IT, Admin, etc.).
3. **Period Selection Ribbon:**
   - Select the target processing month (January through December) and financial year (e.g., 2026).
4. **Quick Action Shortcuts:**
   - One-click buttons to *Add Staff*, *Process Payroll*, *Disburse Loan*, or *Export Summaries*.

### What You Can Do
- Filter metrics across different calendar months to compare payroll expenditure trends.
- Click any metric card to drill directly down into the underlying calculation ledger.
- View real-time warnings if statutory compliance rates have not been confirmed for the year.

---

## 3. Employee Directory (Staff Management)

*The Employee Directory is the single source of truth for all personnel records, compensation terms, statutory identifications, and employment lifecycle stints.*

### 3.1 Staff Directory Ledger & Filters

#### What You'll See
- **Top Toolbar:**
  - Search input: Real-time search across First Name, Last Name, Staff Code, Email, and Department.
  - Department filter dropdown: Filter ledger by `All Departments` or specific operational units.
  - Status filter: Toggle between `Active`, `Inactive`, or `All Staff`.
  - Export button: Export filtered list to Excel (`.xlsx`) with complete contact and compensation details.
  - **+ Add Employee** button: Launch employee creation modal.
- **Ledger Table:**
  - **Staff Code & Name:** Primary ID badge, avatar initial, full name, and job title.
  - **Department & Employment Type:** Department badge and contract classification (`Full-Time`, `Contract`, `Intern`).
  - **Gross Monthly Salary:** Current monthly gross emolument formatted in Nigerian Naira (`₦`).
  - **Net Pay (Estimated):** Live computed take-home salary based on active statutory settings.
  - **Status Pill:** Visual indicator of employment state (`Active` green pill, `Inactive` amber pill).
  - **Action Menu (•••):** Quick access to *View 360° Profile*, *Edit Details*, or *Delete Record*.

---

### 3.2 Quick-Add Spreadsheet Form

*Designed for rapid, multi-row bulk onboarding of new staff without navigating through complex sub-menus.*

```
+-------------------------------------------------------------------------------------------------------+
|  QUICK ADD EMPLOYEES                                                          [Standard Profile] [X]  |
|  Bulk add staff records in a fast spreadsheet view. Press Enter or Tab to advance.                   |
+-------------------------------------------------------------------------------------------------------+
| # | Full Name           | Monthly Salary (₦) | Employment Type   | Department      | Actions         |
| 1 | Emeka Okafor        | 450,000            | [ Full-Time     ] | [ OPERATIONS  ] | [Trash]         |
| 2 | Fatima Bello        | 620,000            | [ Full-Time     ] | [ FINANCE     ] | [Trash]         |
| 3 | [ Type name... ]    | [ 0.00           ] | [ Full-Time     ] | [ ADMIN       ] | [Trash]         |
+-------------------------------------------------------------------------------------------------------+
| [+ Add Another Row]                                               [Cancel]  [Save 2 Employees (↵)]    |
+-------------------------------------------------------------------------------------------------------+
```

#### How To: Bulk Onboard Staff
1. In the Staff Directory, click **+ Add Employee**.
2. Select the **Quick Add** tab (default for new entries).
3. Type the staff member's **Full Name** (e.g., `Oluwaseun Adeyemi`).
4. Enter the **Monthly Gross Salary** in Naira.
5. Select the **Employment Type** (`Full-Time`, `Contract`, etc.).
6. Select the **Department** from the native dropdown menu.
7. Press `Enter` or click **+ Add Another Row** to immediately create a new empty row.
8. Click **Save All Employees** to commit all rows in a single atomic transaction.

> **Tip:** You can paste tabular data directly across rows, and the system will automatically parse and assign the values.

---

### 3.3 Standard Employee Profile Modal

*Used when onboarding or editing a staff member requiring deep customization: custom allowances, pension administration, bank routing, or mid-month prorations.*

#### Form Sections
1. **Identity & Employment:**
   - **Staff ID Code:** Auto-generated unique identifier (e.g., `EMP-842`).
   - **First & Last Name:** Formal legal names for tax and banking compliance.
   - **Department:** Native select dropdown linked to your company's departments list.
   - **Job Title / Position:** Operational title (e.g., `Senior Financial Analyst`).
   - **Employment Type:** Governs statutory tax and pension exemptions (`Full-Time`, `Contract`, `Intern / NYSC`, `Part-Time`).
   - **Work Email & Phone:** Contact coordinates for electronic payslip delivery.
   - **Start & Exit Dates:** Tracks employment tenure and activates mid-month salary proration.
2. **Compensation & Monthly Variations:**
   - **Base Monthly Gross (₦):** Standard monthly salary entitlement. Supports empty states during typing and arbitrary decimals (`step="any"`).
   - **Annual Rent Emolument (₦):** Optional housing rental value used for rent relief deductions under Nigerian tax provisions.
   - **Monthly Salary Variations Grid:** Override gross pay for specific calendar months (e.g., December bonuses, 13th month salary, unpaid leave deductions).
3. **Statutory Tax & Pension Configuration:**
   - **Subject to Statutory Pension (8%):** Toggle on/off. When active, deducts 8% employee contribution and computes 10% employer contribution.
   - **Subject to PAYE Personal Income Tax:** Toggle on/off. When disabled, tax rate is forced to 0% (ideal for diplomatic or exempt contract staff).
   - **Pension Fund Administrator (PFA):** Searchable datalist covering all licensed Nigerian PFAs (Stanbic IBTC, ARM, Leadway, Premium, etc.).
   - **Pension RSA Number:** 11-digit Retirement Savings Account identifier (e.g., `PEN100234567890`).
   - **Taxpayer ID / PAYE Number:** State Internal Revenue Service tax reference.
   - **State of Residence:** Determines tax jurisdiction (Lagos, Abuja FCT, Rivers, Ogun, Oyo, Kano, etc.).
4. **Bank & Payment Details:**
   - **Bank Name:** Searchable reference list of licensed Nigerian Commercial and Merchant banks (Access, GTBank, Zenith, UBA, First Bank, etc.).
   - **10-Digit NUBAN Account Number:** Validated account number used for electronic batch disbursement schedules.

---

### 3.4 Employee 360° Comprehensive View Modal

*Clicking any employee row opens a balanced, high-fidelity 50/50 two-column landscape dashboard showcasing all parameters of the employee's relationship with the company.*

#### Left Column: Identity & Structural Terms
- Header badge with staff avatar, full name, code, and active period indicator.
- Contact cards with one-click copy for email and phone numbers.
- Statutory card with PFA, RSA Number, State of Residence, and Tax ID.
- Banking card with Bank Name, 10-digit NUBAN, and copy button.

#### Right Column: Live Payroll Cycle & Statutory Emoluments
- **Real-Time Period Selector:** Select any month in the current year to observe exactly what this employee earned or will earn in that cycle.
- **Emoluments Breakdown:**
  - Basic Salary (40%)
  - Housing Allowance (30%)
  - Transport Allowance (20%)
  - Other Allowances (10%)
- **Relief & Tax Card:** Shows Gross Emolument, Consolidated Relief Allowance (CRA), Taxable Income, and Monthly PAYE.
- **Net Take-Home Pay Pill:** Prominently displays the final amount disbursed to the employee's bank account.
- **Edit Employee Button:** Jumps straight into the editing modal with all current values pre-loaded.

---

## 4. Monthly Payroll Processing

*The Payroll Processing View is the calculation headquarters where monthly gross-to-net ledgers are verified, adjusted, locked, and exported for executive approval and banking disbursement.*

### 4.1 Payroll Computation Ledger

#### What You'll See
A multi-column spreadsheet layout detailing every statutory and company deduction:
1. **Staff ID & Name:** Staff reference and department.
2. **Gross Salary:** Monthly gross earnings (adjusted for mid-month hire/exit proration or monthly variation overrides).
3. **Consolidated Relief (CRA):** Statutory tax allowance automatically computed under PITA/2026 rules.
4. **Taxable Income:** Net income subject to progressive tax brackets.
5. **PAYE Tax:** Personal Income Tax to be remitted to the state tax authority.
6. **Employee Pension (8%):** Deducted from staff salary based on Basic + Housing + Transport (BHT).
7. **Employer Pension (10%):** Company's statutory contribution (tracked separately, not deducted from staff).
8. **Loan / Advance Deduction:** Sum of all active amortized loan deductions scheduled for the period.
9. **Net Pay:** Final take-home pay to be credited to the employee (`Gross - PAYE - Pension - Loans`).

---

### 4.2 Active Period & Year Selector
Use the month buttons in the header ribbon (`Jan`, `Feb`, `Mar`, etc.) to switch between cycles. Payroll Pro automatically isolates salary overrides, stint prorations, and loan repayments to the selected period.

---

### 4.3 Salary Variations & Prorations
- **Prorated Hire / Exit:** If an employee has a `startDate` or `endDate` within the active month, Payroll Pro calculates active days divided by calendar days and prorates gross salary accordingly.
- **Monthly Override:** If an employee was granted a performance bonus or commission in November, that figure takes precedence over their standard base gross for November only.

---

### 4.4 Locking & Finalizing Historical Snapshots

*To maintain strict accounting compliance, past payroll periods must be locked to prevent accidental edits from altering historical ledgers.*

#### How To: Lock a Payroll Run
1. Verify all figures in the computation ledger for the target month.
2. Click **Lock Period Snapshot** in the top action bar.
3. Review the confirmation summary: Total Headcount, Gross Payroll, Total Tax, Total Pension, and Net Pay.
4. Enter optional run notes (e.g., *"Audited and approved by Financial Controller"*).
5. Click **Confirm & Lock Run**.
6. The period ribbon will now display a golden padlock icon (`🔒 Locked`). Edits to staff base salaries in future months will no longer alter this finalized record.

---

### 4.5 Bank Payment Schedule Generation

*Generate standard NUBAN payment schedules pre-formatted for direct upload into Nigerian corporate internet banking portals.*

#### How To: Export Bank Schedule
1. On the Payroll Processing screen, click **Export Bank Schedule**.
2. Select your banking format (Standard Corporate NUBAN / CBN Compatible).
3. Payroll Pro generates an Excel file (`.xlsx`) containing:
   - `Beneficiary Name`
   - `Bank Name`
   - `NUBAN Account Number`
   - `Amount (₦)`
   - `Narration` (e.g., *"Salary - March 2026 - [Company Name]"*)
4. Upload this file directly to AccessOnline, GTB GAPS, Zenith Corporate, or UBA BankCollect.

---

## 5. Loans & Salary Advances Ledger

*Track company loans, staff advances, monthly amortizations, remaining balances, and auto-deductions without manual spreadsheet tracking.*

### 5.1 Disbursing New Loans / Advances

#### Supported Facility Types
- **Staff Loan:** General multi-month personal facility.
- **Salary Advance:** Short-term mid-month cash advance.
- **Car / Vehicle Loan:** Long-term asset acquisition facility.
- **Housing / Rent Advance:** Annual accommodation support facility.
- **Emergency Loan:** Compassionate rapid-relief facility.

#### How To: Create a Loan Facility
1. Navigate to **Loans & Advances** (`Alt + 4`).
2. Click **+ New Facility**.
3. Select the **Employee** from the searchable dropdown.
4. Select the **Facility Type**.
5. Enter the **Principal Amount (₦)** (e.g., `₦600,000`).
6. Enter the **Monthly Deduction (₦)** or duration (e.g., `₦100,000` for 6 months).
7. Select the **Repayment Start Month** (e.g., `2026-apr`).
8. Enter optional loan notes or purpose.
9. Click **Create Facility**. The deduction will automatically reflect on the employee's payroll starting in April 2026.

---

### 5.2 Automatic Payroll Amortization & Manual Payments
- **Auto-Sync:** During payroll processing, Payroll Pro checks for active loans. If a deduction is applied, the loan's `totalRepaid` increases and `remainingBalance` decreases.
- **Automatic Completion:** When the remaining balance reaches `₦0.00`, the facility automatically switches status to `Completed` and deductions cease.
- **Manual Repayments:** If an employee repays cash directly, click the facility's **•••** menu, choose **Record Manual Payment**, enter the amount, and the system records the transaction into the loan's audit history.

---

### 5.3 Pausing, Resuming, and Editing Loan Facilities
- **Pause Facility:** If an employee is facing hardship, click **Pause**. The monthly deduction is omitted from the payroll ledger until resumed.
- **Edit Facility:** Adjust monthly deduction amounts, remaining balance, or facility terms at any time via the minimalist facility menu.

---

## 6. WYSIWYG Payslip Designer

*Create pixel-perfect, branded payslips customized to your company's corporate identity.*

### 6.1 Design Templates & Layout Presets
- **Modern Template:** Sleek, borderless cards with color accents and clean typography.
- **Classic Template:** Formal corporate layout with clear accounting ledger borders.
- **Compact Template:** Space-efficient layout designed for two-per-page thermal or high-volume printing.

---

### 6.2 Branding, Watermarks, Signatures, and QR Codes
- **Company Logo:** Upload high-resolution PNG/SVG logos.
- **Accent Colors:** Custom hex palette matching your brand guidelines.
- **Authorized Signature:** Upload digital signature stamps or include formal signature and date lines.
- **Security QR Code:** Generates a verifiable QR code containing cryptographic verification tokens, employee ID, and period net pay to combat forged payslips.
- **Confidential Watermark:** Subtle background watermark ensuring confidentiality.

---

### 6.3 Batch Payslip Printing & PDF Export
- **Single Payslip:** Click **Print Payslip** on any row in the payroll screen.
- **Batch Export:** Click **Batch Print / PDF** to generate an aggregated, printable document formatted for standard A4 paper with page breaks cleanly isolating each staff member.

---

## 7. Company Settings & Statutory Configuration

*Manage legal entities, tax rules, departments, cloud synchronization, and audit records.*

### 7.1 Company Profile & Legal Details
- Legal Company Name, Registered Business Address, RC/Corporate Affairs Commission (CAC) Number.
- Primary State Tax Identification Number (TIN) and Pension Employer Code.
- Corporate contact phone and official finance email.

---

### 7.2 Departments & Cost Centers
- Add, edit, or rename company departments.
- Removing a department safely unlinks future dropdowns while preserving historical records on existing staff.

---

### 7.3 Data Backup, Cloud Sync & Audit Logs
- **Export Local Backup:** Downloads the entire workspace state (companies, employees, loans, snapshots, settings) as an encrypted `.json` file.
- **Restore from Backup:** Restore data from any historical `.json` file with pre-import validation.
- **Cloud Realtime Sync:** Connect to Supabase Cloud for multi-device sync, real-time presence, and remote operator access.
- **Audit Trail:** Comprehensive activity log detailing which operator updated salaries, changed roles, added staff, or locked payroll cycles with exact timestamps and IP coordinates.

---

## 8. Troubleshooting & Common Edge Cases

### Table Flickering or Reloading
- **Resolution:** As of version 1.0.2, all real-time background checks and polling routines operate in **silent mode**. Existing table rows remain firmly mounted and interactive on screen while background synchronization occurs.

### Staff Member Proration Appears Incorrect
- **Check Start/Exit Dates:** Ensure the employee's `startDate` or `endDate` falls within the active month. If an employee joined on March 16th in a 31-day month, their salary is computed as `Gross * (16 / 31)`.
- **Check Monthly Overrides:** Inspect the employee's profile to verify if a manual salary override was set for that specific calendar month.

### Loan Deduction Did Not Deduct from Payroll
- **Verify Loan Status:** Ensure the loan status is `Active` and not `Paused` or `Completed`.
- **Verify Start Period:** Ensure the facility's `Start Period Key` (e.g., `2026-may`) is equal to or earlier than the currently processed payroll month.
