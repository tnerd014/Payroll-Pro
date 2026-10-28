const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

// Read app logo as base64
let logoBase64 = '';
const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
if (fs.existsSync(iconPath)) {
  const iconData = fs.readFileSync(iconPath);
  logoBase64 = `data:image/png;base64,${iconData.toString('base64')}`;
}

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payroll Pro — Complete Instruction Manual & Reference Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page {
      size: A4;
      margin: 14mm 14mm 16mm 14mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.55;
      font-size: 10pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page-break {
      page-break-before: always;
    }

    .avoid-break {
      page-break-inside: avoid;
    }

    /* Cover Page */
    .cover-container {
      height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 25mm 15mm 15mm 15mm;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      position: relative;
      overflow: hidden;
    }

    .cover-top-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #059669 0%, #0284c7 100%);
    }

    .cover-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .cover-logo {
      width: 64px;
      height: 64px;
      border-radius: 14px;
      background: #0f172a;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
    }

    .cover-brand {
      display: flex;
      flex-direction: column;
    }

    .cover-brand-title {
      font-size: 20pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
    }

    .cover-brand-subtitle {
      font-size: 10pt;
      color: #059669;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .cover-body {
      margin-top: 40px;
    }

    .cover-tag {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      background: #ecfdf5;
      color: #065f46;
      font-weight: 700;
      font-size: 9pt;
      border: 1px solid #a7f3d0;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .cover-title {
      font-size: 30pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.15;
      letter-spacing: -1px;
      margin-bottom: 14px;
    }

    .cover-desc {
      font-size: 12pt;
      color: #475569;
      max-width: 480px;
      line-height: 1.5;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      padding: 18px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
    }

    .cover-meta-item label {
      display: block;
      font-size: 7.5pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 2px;
      letter-spacing: 0.5px;
    }

    .cover-meta-item span {
      font-size: 9.5pt;
      font-weight: 600;
      color: #0f172a;
    }

    .cover-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 15px;
      border-top: 1px solid #cbd5e1;
      font-size: 8pt;
      color: #64748b;
    }

    /* Standard Content Styling */
    h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 10px;
      letter-spacing: -0.4px;
    }

    h1 .section-num {
      background: #0f172a;
      color: #ffffff;
      font-size: 10pt;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 700;
    }

    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 16px;
      margin-bottom: 8px;
      letter-spacing: -0.2px;
    }

    h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #334155;
      margin-top: 12px;
      margin-bottom: 6px;
    }

    p {
      margin-bottom: 8px;
      color: #334155;
    }

    ul, ol {
      margin-left: 20px;
      margin-bottom: 10px;
      color: #334155;
    }

    li {
      margin-bottom: 4px;
    }

    /* Header & Footer in Pages */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 7.5pt;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .page-header-title {
      color: #059669;
      font-weight: 700;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px 0;
      font-size: 8.5pt;
    }

    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.5px;
    }

    td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: middle;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
    }

    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 600;
    }

    .badge-green { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-blue { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
    .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-slate { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }

    /* Callouts */
    .callout {
      border-left: 3.5px solid;
      padding: 8px 12px;
      border-radius: 0 6px 6px 0;
      margin: 10px 0;
      font-size: 9pt;
    }

    .callout-info {
      background-color: #f0fdf4;
      border-color: #059669;
      color: #065f46;
    }

    .callout-info strong {
      color: #047857;
    }

    .callout-warning {
      background-color: #fffbeb;
      border-color: #d97706;
      color: #92400e;
    }

    .callout-tip {
      background-color: #f0f9ff;
      border-color: #0284c7;
      color: #075985;
    }

    /* Cards & Grids */
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin: 10px 0;
    }

    .feature-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      background: #ffffff;
    }

    .feature-card h4 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .feature-card p {
      font-size: 8.5pt;
      color: #64748b;
      margin-bottom: 0;
      line-height: 1.4;
    }

    /* Math Box */
    .math-box {
      background: #0f172a;
      color: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      margin: 8px 0;
      line-height: 1.45;
    }

    .math-box .hl { color: #34d399; font-weight: 600; }
    .math-box .op { color: #38bdf8; }
    .math-box .rem { color: #94a3b8; font-style: italic; }

    /* Steps */
    .step-list {
      list-style: none;
      margin-left: 0;
      counter-reset: step-counter;
    }

    .step-list li {
      position: relative;
      padding-left: 28px;
      margin-bottom: 8px;
      font-size: 9pt;
    }

    .step-list li::before {
      content: counter(step-counter);
      counter-increment: step-counter;
      position: absolute;
      left: 0;
      top: 1px;
      width: 20px;
      height: 20px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7.5pt;
      font-weight: 700;
      text-align: center;
      line-height: 20px;
    }
  </style>
</head>
<body>

  <!-- ==================== COVER PAGE ==================== -->
  <div class="cover-container">
    <div class="cover-top-accent"></div>
    
    <div class="cover-header">
      ${logoBase64 ? `<img src="${logoBase64}" class="cover-logo" alt="Payroll Pro Logo" />` : ''}
      <div class="cover-brand">
        <div class="cover-brand-title">PAYROLL PRO</div>
        <div class="cover-brand-subtitle">Enterprise Desktop & Cloud Suite</div>
      </div>
    </div>

    <div class="cover-body">
      <div class="cover-tag">Official Operational Documentation</div>
      <div class="cover-title">Instruction Manual &<br>Statutory Reference Guide</div>
      <div class="cover-desc">
        A comprehensive guide covering employee onboarding, monthly gross-to-net payroll computation, loan amortizations, payslip customization, corporate bank schedules, and statutory compliance under Nigerian tax laws.
      </div>
    </div>

    <div class="cover-meta-grid">
      <div class="cover-meta-item">
        <label>Document Version</label>
        <span>Release 1.0.2 (Production Stable)</span>
      </div>
      <div class="cover-meta-item">
        <label>Primary Audience</label>
        <span>Payroll Officers, HR Managers, Controllers</span>
      </div>
      <div class="cover-meta-item">
        <label>Statutory Jurisdiction</label>
        <span>Federal Republic of Nigeria (PITA / PRA 2014 / 2026 Tax Bill)</span>
      </div>
      <div class="cover-meta-item">
        <label>System Architecture</label>
        <span>Electron Native Desktop + Supabase Realtime Cloud</span>
      </div>
    </div>

    <div class="cover-footer">
      <div>CONFIDENTIAL & PROPRIETARY — FOR AUTHORIZED COMPANY USE ONLY</div>
      <div>PAYROLL PRO ENTERPRISE &copy; 2026</div>
    </div>
  </div>

  <!-- ==================== TABLE OF CONTENTS ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <span class="page-header-title">Payroll Pro — Instruction Manual</span>
    <span>Table of Contents</span>
  </div>

  <h1><span class="section-num">TOC</span> Table of Contents</h1>

  <table style="margin-top: 14px;">
    <thead>
      <tr>
        <th style="width: 12%;">Section</th>
        <th style="width: 68%;">Module & Operational Topic</th>
        <th style="width: 20%; text-align: right;">Target Audience</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Section 1</strong></td>
        <td><strong>Executive Overview & System Architecture</strong><br><span style="color:#64748b; font-size:7.5pt;">Offline-first caching, Supabase Realtime sync, system specifications, and global navigation.</span></td>
        <td style="text-align: right;"><span class="badge badge-slate">All Operators</span></td>
      </tr>
      <tr>
        <td><strong>Section 2</strong></td>
        <td><strong>Authentication & Multi-Company Workspaces</strong><br><span style="color:#64748b; font-size:7.5pt;">Cloud connection, Windows Account Picker, workspace PINs, and security question recovery.</span></td>
        <td style="text-align: right;"><span class="badge badge-slate">Admins & Staff</span></td>
      </tr>
      <tr>
        <td><strong>Section 3</strong></td>
        <td><strong>Employee Directory & Staff Management</strong><br><span style="color:#64748b; font-size:7.5pt;">Quick-Add spreadsheet bulk entry, Standard Profile setup, Department select dropdown, and 360° modal.</span></td>
        <td style="text-align: right;"><span class="badge badge-blue">HR & Payroll</span></td>
      </tr>
      <tr>
        <td><strong>Section 4</strong></td>
        <td><strong>Monthly Payroll Computation & Finalization</strong><br><span style="color:#64748b; font-size:7.5pt;">Gross-to-net computation, stint prorations, monthly overrides, period snapshot locking, and NUBAN bank schedules.</span></td>
        <td style="text-align: right;"><span class="badge badge-green">Payroll & Finance</span></td>
      </tr>
      <tr>
        <td><strong>Section 5</strong></td>
        <td><strong>Loans & Salary Advances Ledger</strong><br><span style="color:#64748b; font-size:7.5pt;">Disbursing facilities, auto-deduction integration, pause/resume, and manual repayment entries.</span></td>
        <td style="text-align: right;"><span class="badge badge-green">Finance & Accounts</span></td>
      </tr>
      <tr>
        <td><strong>Section 6</strong></td>
        <td><strong>WYSIWYG Payslip Designer & Batch Export</strong><br><span style="color:#64748b; font-size:7.5pt;">Layout presets (Modern, Classic, Compact), logo branding, cryptographic QR code verification, and PDF printing.</span></td>
        <td style="text-align: right;"><span class="badge badge-blue">HR & Finance</span></td>
      </tr>
      <tr>
        <td><strong>Section 7</strong></td>
        <td><strong>Statutory Compliance & Mathematical Models</strong><br><span style="color:#64748b; font-size:7.5pt;">PITA 2011 & 2026 Tax Bill progressive bands, CRA formulas, PRA 2014 BHT 8%/10% Pension, and worked examples.</span></td>
        <td style="text-align: right;"><span class="badge badge-amber">Compliance & Audit</span></td>
      </tr>
      <tr>
        <td><strong>Section 8</strong></td>
        <td><strong>Role-Based Access Control, Presence & Security Auditing</strong><br><span style="color:#64748b; font-size:7.5pt;">Admin vs Officer vs Auditor matrix, live operator presence, instant deactivation, and immutable audit logs.</span></td>
        <td style="text-align: right;"><span class="badge badge-slate">System Admins</span></td>
      </tr>
      <tr>
        <td><strong>Section 9</strong></td>
        <td><strong>Troubleshooting, Data Backup & Disaster Recovery</strong><br><span style="color:#64748b; font-size:7.5pt;">Encrypted JSON backups, silent background sync, common edge-cases, and recovery workflows.</span></td>
        <td style="text-align: right;"><span class="badge badge-slate">Admins & IT</span></td>
      </tr>
    </tbody>
  </table>

  <h2>Global Keyboard Shortcuts</h2>
  <p>Payroll Pro provides ergonomic keyboard triggers across all active workspaces:</p>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Shortcut Key</th>
        <th style="width: 35%;">Destination / Action</th>
        <th style="width: 40%;">Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="mono">Alt + 1</span></td>
        <td><strong>Executive Dashboard</strong></td>
        <td>Navigate directly to payroll KPIs, total statutory liabilities, and department breakdown.</td>
      </tr>
      <tr>
        <td><span class="mono">Alt + 2</span></td>
        <td><strong>Staff Directory</strong></td>
        <td>Open employee directory ledger, search filters, and bulk onboarding tools.</td>
      </tr>
      <tr>
        <td><span class="mono">Alt + 3</span></td>
        <td><strong>Payroll Processing</strong></td>
        <td>Jump to current period gross-to-net computation ledger and bank exports.</td>
      </tr>
      <tr>
        <td><span class="mono">Alt + 4</span></td>
        <td><strong>Loans & Advances</strong></td>
        <td>Open loan register, repayments, and facility disbursement form.</td>
      </tr>
      <tr>
        <td><span class="mono">Alt + 5</span></td>
        <td><strong>Payslip Designer</strong></td>
        <td>Open visual WYSIWYG payslip customizer and layout templates.</td>
      </tr>
      <tr>
        <td><span class="mono">Alt + 6</span></td>
        <td><strong>Company Settings</strong></td>
        <td>Manage company profile, tax rules, departments, backups, and audit trails.</td>
      </tr>
      <tr>
        <td><span class="mono">Escape (Esc)</span></td>
        <td><strong>Dismiss / Close</strong></td>
        <td>Immediately dismiss any open modal, dialog, or floating action menu.</td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== SECTION 1: EXECUTIVE OVERVIEW ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <span class="page-header-title">Payroll Pro — Instruction Manual</span>
    <span>Section 1: Executive Overview</span>
  </div>

  <h1><span class="section-num">01</span> Executive Overview & System Architecture</h1>

  <p>
    <strong>Payroll Pro</strong> is a specialized enterprise application built to handle the complex statutory, tax, and pension realities of operating in Nigeria. It eliminates spreadsheet errors, enforces compliance with federal and state regulations, and streamlines disbursement through Nigerian commercial banks.
  </p>

  <div class="feature-grid">
    <div class="feature-card">
      <h4>🔒 Dual-Mode Multi-Tenancy</h4>
      <p>Operates fully offline on isolated local storage or connects seamlessly to private Supabase PostgreSQL instances for multi-branch team collaboration.</p>
    </div>
    <div class="feature-card">
      <h4>⚡ Zero-Latency Role Enforcement</h4>
      <p>Role promotions, demotions, and operator deactivations take effect across remote operator windows in sub-seconds via Supabase Realtime CDC.</p>
    </div>
    <div class="feature-card">
      <h4>🇳🇬 Complete Nigerian Compliance</h4>
      <p>Built-in models for PITA 2011, Finance Act 2020, Pension Reform Act 2014, and the upcoming 2026 Nigerian Tax Reform Bill progressive brackets.</p>
    </div>
    <div class="feature-card">
      <h4>🛡️ Non-Destructive Background Sync</h4>
      <p>Silent multi-layered polling and WebSocket updates refresh data in memory without table unmounting, layout shifting, or screen flickering.</p>
    </div>
  </div>

  <h2>System Architecture & Data Flow</h2>
  <div class="callout callout-info">
    <strong>Offline-First Resilience:</strong> All changes made by operators are immediately written to local memory and persistent storage, followed by optimistic background synchronization to Supabase Cloud. If network connectivity drops, operators can continue processing payroll without interruption; changes sync automatically upon reconnection.
  </div>

  <table>
    <thead>
      <tr>
        <th>Component</th>
        <th>Technology</th>
        <th>Operational Function</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Desktop Shell</strong></td>
        <td>Electron 44 (x64)</td>
        <td>Provides high-performance native Windows integration, tray support, local file system access, and native print-to-PDF generation.</td>
      </tr>
      <tr>
        <td><strong>User Interface</strong></td>
        <td>React 18 &amp; Tailwind CSS</td>
        <td>Reactive, dark-mode ready UI with zero third-party component bloat, tailored for high-volume tabular accounting operations.</td>
      </tr>
      <tr>
        <td><strong>Computation Engine</strong></td>
        <td>Pure TypeScript</td>
        <td>Deterministic, audit-ready mathematical engine implementing Nigerian statutory emoluments, CRA formulas, and marginal tax bands.</td>
      </tr>
      <tr>
        <td><strong>Cloud Database</strong></td>
        <td>Supabase (PostgreSQL 14+)</td>
        <td>Multi-tenant relational database with foreign key cascades, Row Level Security (RLS), and Realtime WebSocket replication.</td>
      </tr>
      <tr>
        <td><strong>Export Engine</strong></td>
        <td>SheetJS &amp; xlsx-js-style</td>
        <td>Generates styled Excel corporate bank schedules (NUBAN format) and printable A4 payslips.</td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== SECTION 2: WORKSPACE SETUP ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <span class="page-header-title">Payroll Pro — Instruction Manual</span>
    <span>Section 2: Workspaces & Authentication</span>
  </div>

  <h1><span class="section-num">02</span> Authentication & Multi-Company Workspaces</h1>

  <p>
    Payroll Pro isolates data by legal corporate entities. Operators sign into the system with their verified credentials and then select or unlock their target company workspace.
  </p>

  <h2>2.1 Cloud Staff Access Gate</h2>
  <p>Upon launching the application, the system presents the Cloud &amp; Staff Access Gate:</p>
  <ul class="step-list">
    <li><strong>Enter Operator Credentials:</strong> Enter your registered Work Email or Username and Password.</li>
    <li><strong>Automatic Session Retention:</strong> Check <em>"Remember me on this workstation"</em> to bypass subsequent login prompts on secure company computers.</li>
    <li><strong>First-Time Admin Setup:</strong> If connecting to a newly deployed database, the gate prompts you to register the Master Administrator with an initial security question and answer.</li>
    <li><strong>Connecting a Private Server:</strong> Click <strong>Connect Server</strong> in the top-right corner to input your organization's private Supabase URL and Anon Public Key.</li>
  </ul>

  <h2>2.2 Windows OS-Style Account Picker</h2>
  <p>Once authenticated, the system presents the interactive workspace gallery:</p>
  <div class="callout callout-tip">
    <strong>Multi-Entity Switching:</strong> Holding companies and accounting firms managing multiple subsidiaries can switch between workspaces in seconds. Each company maintains its own distinct logo, password, staff register, and locked historical snapshots.
  </div>

  <table>
    <thead>
      <tr>
        <th>Workspace Feature</th>
        <th>Description &amp; Operational Rule</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Company Profile Card</strong></td>
        <td>Displays the company's legal name, logo, active staff count, and lock status.</td>
      </tr>
      <tr>
        <td><strong>Workspace PIN / Password</strong></td>
        <td>If a workspace has password protection enabled, clicking the card prompts for the confidential PIN/password before granting entry.</td>
      </tr>
      <tr>
        <td><strong>+ Add Company Workspace</strong></td>
        <td>Administrators can create a new entity by providing the legal business name, RC/CAC number, registered address, and default state of residence.</td>
      </tr>
      <tr>
        <td><strong>Authorized Team Members</strong></td>
        <td>Clicking <strong>Team Members</strong> in the top ribbon opens the central operator delegation ledger where roles and presence are administered.</td>
      </tr>
    </tbody>
  </table>

  <h2>2.3 Self-Service Password Recovery</h2>
  <p>If an operator forgets their login credentials, they can perform self-service recovery:</p>
  <ul class="step-list">
    <li>Click <strong>Forgot Password?</strong> on the login screen.</li>
    <li>Enter the registered <strong>Work Email or Username</strong>.</li>
    <li>The system verifies the account and presents the confidential <strong>Security Question</strong> registered during onboarding.</li>
    <li>Provide the exact <strong>Security Answer</strong> to immediately unlock the account and set a fresh confidential password.</li>
  </ul>

  <!-- ==================== SECTION 3: EMPLOYEE MANAGEMENT ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <span class="page-header-title">Payroll Pro — Instruction Manual</span>
    <span>Section 3: Staff Management</span>
  </div>

  <h1><span class="section-num">03</span> Employee Directory & Staff Management</h1>

  <p>
    The Employee Directory is the operational center for personnel records, salary contracts, statutory tax and pension settings, and mid-month tenure stints.
  </p>

  <h2>3.1 Quick-Add Spreadsheet Form (Bulk Onboarding)</h2>
  <p>
    Designed specifically for rapidly populating staff registers during new company setup or bulk seasonal hiring.
  </p>

  <div class="callout callout-info">
    <strong>Keyboard Power Workflow:</strong> Pressing <strong>Enter</strong> or <strong>Tab</strong> at the end of a row automatically validates the current staff member, commits the entry, and creates a fresh empty row with the cursor placed in the Full Name field.
  </div>

  <table style="margin-top: 8px;">
    <thead>
      <tr>
        <th style="width: 25%;">Column</th>
        <th style="width: 25%;">Input Type</th>
        <th style="width: 50%;">Rules &amp; Validation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Full Name</strong></td>
        <td>Text</td>
        <td>Required. Automatically parses First Name and Last Name.</td>
      </tr>
      <tr>
        <td><strong>Monthly Salary (₦)</strong></td>
        <td>Number / Currency</td>
        <td>Monthly Gross. Supports arbitrary decimal precision and empty states while typing.</td>
      </tr>
      <tr>
        <td><strong>Employment Type</strong></td>
        <td>Select Dropdown</td>
        <td>Select from Full-Time, Contract, Intern / NYSC, or Part-Time.</td>
      </tr>
      <tr>
        <td><strong>Department</strong></td>
        <td>Native Select Dropdown</td>
        <td>Select from company operational units (Operations, Finance, Sales, Admin, IT).</td>
      </tr>
    </tbody>
  </table>

  <h2>3.2 Standard Employee Profile Modal</h2>
  <p>
    Used when detailed statutory registration or individual contract terms are required.
  </p>

  <div class="feature-grid">
    <div class="feature-card">
      <h4>👤 Identity &amp; Role</h4>
      <p>Staff ID Code, First Name, Last Name, native Department select dropdown, Job Title, Work Email, and Phone.</p>
    </div>
    <div class="feature-card">
      <h4>💰 Compensation &amp; Rent</h4>
      <p>Base Monthly Gross (₦), Annual Rent Emolument (for statutory Rent Relief), and monthly salary overrides.</p>
    </div>
    <div class="feature-card">
      <h4>🏛️ Statutory Tax &amp; Pension</h4>
      <p>Subject to Pension (8%), Subject to PAYE, licensed PFA selection, 11-digit RSA Number, Taxpayer ID, and State of Residence.</p>
    </div>
    <div class="feature-card">
      <h4>🏦 Bank &amp; Disbursement</h4>
      <p>Official Bank Name (from licensed Nigerian banking directory) and validated 10-digit NUBAN account number.</p>
    </div>
  </div>

  <h2>3.3 Employee 360° Comprehensive View</h2>
  <p>
    Clicking any employee in the directory launches a balanced, high-fidelity <strong>50/50 two-column landscape dashboard</strong>:
  </p>
  <ul>
    <li><strong>Left Column (Identity &amp; Profile):</strong> Staff avatar, contact cards with one-click copy, statutory registration numbers, and banking details.</li>
    <li><strong>Right Column (Live Payroll Cycle &amp; Emoluments):</strong> Real-time month picker displaying exact emolument splits (Basic, Housing, Transport), CRA relief, PAYE tax, and net take-home pay for that specific cycle.</li>
    <li><strong>Edit Launchpad:</strong> One-click button to jump directly into full profile editing.</li>
  </ul>

  <!-- ==================== SECTION 4: PAYROLL PROCESSING ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <span class="page-header-title">Payroll Pro — Instruction Manual</span>
    <span>Section 4: Monthly Payroll Processing</span>
  </div>

  <h1><span class="section-num">04</span> Monthly Payroll Computation & Finalization</h1>

  <p>
    The Payroll Processing module computes gross-to-net calculations in real-time, factoring in mid-month stint prorations, monthly bonuses, loan repayments, and statutory tax deductions.
  </p>

  <h2>4.1 Computation Workflow</h2>
  <ul class="step-list">
    <li><strong>Select Cycle:</strong> Click the target month (e.g., <em>October</em>) and year from the top period ribbon.</li>
    <li><strong>Review Prorations:</strong> Staff joining or leaving mid-month have their gross earnings automatically prorated by active calendar days.</li>
    <li><strong>Apply Active Loan Deductions:</strong> Scheduled staff loan and advance deductions are automatically integrated into each employee's deductions column.</li>
    <li><strong>Audit Ledger Figures:</strong> Inspect Gross Pay, CRA Relief, Taxable Income, PAYE Tax, Pension (8%), Employer Pension (10%), and Net Take-Home Pay.</li>
    <li><strong>Lock Period Snapshot:</strong> Finalize the run to archive the numbers permanently against accidental retrospective modification.</li>
    <li><strong>Generate Bank Schedule:</strong> Export the validated NUBAN schedule for corporate internet banking upload.</li>
  </ul>

  <h2>4.2 Stint & Proration Logic</h2>
  <p>
    When an employee has a recorded Start Date or Exit Date falling within the active processing month, Payroll Pro applies exact calendar proration:
  </p>

  <div class="math-box">
    <span class="rem">// Calendar Day Tenure Proration Formula</span><br>
    <span class="hl">Proration Factor</span> <span class="op">=</span> Active Days in Month <span class="op">/</span> Total Calendar Days in Month<br>
    <span class="hl">Prorated Gross</span> <span class="op">=</span> Base Gross Salary <span class="op">*</span> Proration Factor
  </div>

  <h2>4.3 Period Snapshot Locking & Historical Archiving</h2>
  <p>
    To protect accounting integrity, completed payroll runs must be locked:
  </p>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Snapshot Parameter</th>
        <th style="width: 70%;">Compliance &amp; Operational Rule</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Lock Confirmation</strong></td>
        <td>Presents an executive summary: Total Gross, Total PAYE, Total Pension, and Net Disbursed.</td>
      </tr>
      <tr>
        <td><strong>Audit Attribution</strong></td>
        <td>Records the authorizing operator's name, role, timestamp, and optional run notes.</td>
      </tr>
      <tr>
        <td><strong>Immutable Lock State</strong></td>
        <td>Once locked, the period displays a golden padlock (<span class="mono">🔒 Locked</span>). Subsequent changes to employee base salaries in future months will not alter this finalized historical ledger.</td>
      </tr>
      <tr>
        <td><strong>Unlock Privilege</strong></td>
        <td>Only Master Administrators can unlock a finalized run, and doing so generates an immediate priority entry in the system audit log.</td>
      </tr>
    </tbody>
  </table>

  <h2>4.4 Corporate Bank Schedule Generation (NUBAN)</h2>
  <p>
    Clicking <strong>Export Bank Schedule</strong> generates an Excel workbook (<span class="mono">.xlsx</span>) formatted to CBN electronic payment standards, pre-formatted for direct upload into:
  </p>
  <div class="feature-grid">
    <div class="feature-card">
      <h4>🏦 AccessOnline / Access Bank</h4>
      <p>Standard corporate batch disbursement template with 10-digit NUBAN and sort codes.</p>
    </div>
    <div class="feature-card">
      <h4>🏦 GTBank GAPS</h4>
      <p>Guaranty Trust Automated Payment System corporate batch upload schedule.</p>
    </div>
    <div class="feature-card">
      <h4>🏦 Zenith Corporate iBank</h4>
      <p>Zenith Bank electronic salary disbursement format with automated narration strings.</p>
    </div>
    <div class="feature-card">
      <h4>🏦 UBA BankCollect / FirstBank</h4>
      <p>Compatible with United Bank for Africa and FirstBank FirstPay corporate salary portals.</p>
    </div>
  </div>

  <!-- ==================== SECTION 5: LOANS & ADVANCES ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <span class="page-header-title">Payroll Pro — Instruction Manual</span>
    <span>Section 5: Loans & Advances</span>
  </div>

  <h1><span class="section-num">05</span> Loans & Salary Advances Ledger</h1>

  <p>
    Manage company lending programs, short-term salary advances, monthly payroll amortizations, and balance tracking without external spreadsheets.
  </p>

  <h2>5.1 Facility Types</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Facility Type</th>
        <th style="width: 25%;">Standard Term</th>
        <th style="width: 50%;">Operational Purpose &amp; Usage</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Salary Advance</strong></td>
        <td>1 to 3 Months</td>
        <td>Emergency mid-month advance deducted from upcoming salary cycles.</td>
      </tr>
      <tr>
        <td><strong>Staff Loan</strong></td>
        <td>6 to 24 Months</td>
        <td>General personal loan amortized evenly across monthly payrolls.</td>
      </tr>
      <tr>
        <td><strong>Vehicle / Car Loan</strong></td>
        <td>12 to 48 Months</td>
        <td>Automobile financing with scheduled monthly principal deductions.</td>
      </tr>
      <tr>
        <td><strong>Housing Advance</strong></td>
        <td>6 to 12 Months</td>
        <td>Annual accommodation support facility amortized over the lease term.</td>
      </tr>
      <tr>
        <td><strong>Emergency Loan</strong></td>
        <td>1 to 6 Months</td>
        <td>Compassionate relief facility with flexible repayment scheduling.</td>
      </tr>
    </tbody>
  </table>

  <h2>5.2 Disbursing a Loan Facility</h2>
  <ul class="step-list">
    <li>Navigate to <strong>Loans &amp; Advances</strong> (<span class="mono">Alt + 4</span>).</li>
    <li>Click <strong>+ New Facility</strong>.</li>
    <li>Select the <strong>Employee</strong> from the searchable dropdown.</li>
    <li>Select the <strong>Facility Type</strong> and enter the <strong>Principal Amount (₦)</strong>.</li>
    <li>Enter the <strong>Monthly Deduction Amount (₦)</strong> (or loan duration in months).</li>
    <li>Select the <strong>Repayment Start Period</strong> (e.g., <span class="mono">2026-may</span>).</li>
    <li>Click <strong>Create Facility</strong>. The monthly deduction automatically binds to payroll processing starting from the chosen cycle.</li>
  </ul>

  <h2>5.3 Auto-Deduction & Lifecycle Tracking</h2>
  <div class="callout callout-info">
    <strong>Automatic Completion:</strong> When a monthly payroll run is executed, active loan deductions are deducted from the employee's net pay. The facility's remaining balance decreases automatically. When the balance hits <strong>₦0.00</strong>, the facility status flips to <strong>Completed</strong> and deductions automatically cease.
  </div>

  <h2>5.4 Facility Actions: Pause, Resume &amp; Manual Payments</h2>
  <p>Clicking the minimalist 3-dot action menu (<span class="mono">•••</span>) on any facility provides:</p>
  <ul>
    <li><strong>Pause Facility:</strong> Temporarily halts payroll deductions during staff hardship or special leave.</li>
    <li><strong>Resume Facility:</strong> Restores monthly payroll amortizations.</li>
    <li><strong>Record Manual Payment:</strong> If an employee repays cash directly, record the transaction to reduce the balance and log the receipt in the loan's audit history.</li>
    <li><strong>Edit Facility:</strong> Adjust monthly deduction amounts, remaining balance, or facility terms.</li>
  </ul>

  <!-- ==================== SECTION 6: PAYSLIP DESIGNER ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <span class="page-header-title">Payroll Pro — Instruction Manual</span>
    <span>Section 6: Payslip Customizer</span>
  </div>

  <h1><span class="section-num">06</span> WYSIWYG Payslip Designer & Batch Export</h1>

  <p>
    Design and distribute branded, tamper-evident payslips featuring corporate logos, custom color schemes, authorized digital signatures, and cryptographic QR verification.
  </p>

  <h2>6.1 Layout Templates</h2>
  <div class="feature-grid">
    <div class="feature-card">
      <h4>🎨 Modern Template</h4>
      <p>Clean, borderless card structure with vibrant brand accents, bold net pay callouts, and modern typography.</p>
    </div>
    <div class="feature-card">
      <h4>📋 Classic Corporate</h4>
      <p>Traditional accounting ledger styling with formal table borders, comprehensive statutory disclosures, and signature lines.</p>
    </div>
    <div class="feature-card">
      <h4>📄 Compact Format</h4>
      <p>Space-efficient layout designed for high-volume printing, thermal slips, or fitting two payslips per standard A4 sheet.</p>
    </div>
    <div class="feature-card">
      <h4>📑 Executive Statement</h4>
      <p>Comprehensive layout with year-to-date (YTD) cumulative earnings, pension history, and tax deduction tracking.</p>
    </div>
  </div>

  <h2>6.2 Branding, Watermarks & Cryptographic QR Codes</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Security / Design Feature</th>
        <th style="width: 70%;">Operational Benefit &amp; Implementation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>High-Res Company Logo</strong></td>
        <td>Upload PNG/SVG logos for sharp rendering on both physical paper and digital PDF files.</td>
      </tr>
      <tr>
        <td><strong>Authorized Signature Stamp</strong></td>
        <td>Include official digital signature stamps and date lines for immediate bank/visa verification validity.</td>
      </tr>
      <tr>
        <td><strong>Cryptographic QR Code</strong></td>
        <td>Generates a tamper-evident QR code embedding the staff ID, month key, and hash signature. Scanning verifies authenticity and combats forged payslips.</td>
      </tr>
      <tr>
        <td><strong>Confidential Watermark</strong></td>
        <td>Subtle background watermark discouraging unauthorized duplication or external distribution.</td>
      </tr>
    </tbody>
  </table>

  <h2>6.3 Single & Batch PDF Printing</h2>
  <ul class="step-list">
    <li><strong>Single Slip:</strong> In the Payroll computation ledger, click <strong>Print Payslip</strong> on any employee's row.</li>
    <li><strong>Batch Slips:</strong> Click <strong>Batch Print / PDF</strong> in the payroll action ribbon to render an aggregated print-ready file. Each staff member's payslip is cleanly isolated with CSS page-break rules for standard A4 printing.</li>
  </ul>

  <!-- ==================== SECTION 7: STATUTORY COMPLIANCE ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <span class="page-header-title">Payroll Pro — Instruction Manual</span>
    <span>Section 7: Statutory Compliance</span>
  </div>

  <h1><span class="section-num">07</span> Statutory Compliance & Mathematical Models</h1>

  <p>
    Payroll Pro implements the exact statutory calculation rules of the <strong>Personal Income Tax Act (PITA 2011)</strong>, the <strong>Pension Reform Act 2014 (PRA 2014)</strong>, and the <strong>2026 Nigerian Tax Reform Bill</strong>.
  </p>

  <h2>7.1 Emolument Allocations & BHT Base</h2>
  <p>Gross earnings are automatically allocated into statutory allowances:</p>
  <ul>
    <li><strong>Basic Salary:</strong> 40% of Gross (Pensionable &amp; Taxable)</li>
    <li><strong>Housing Allowance:</strong> 30% of Gross (Pensionable &amp; Taxable)</li>
    <li><strong>Transport Allowance:</strong> 20% of Gross (Pensionable &amp; Taxable)</li>
    <li><strong>Other Allowances:</strong> 10% of Gross (Non-Pensionable &amp; Taxable)</li>
  </ul>
  <p>The sum forms the statutory <strong>BHT Emolument</strong>: <span class="mono">BHT = Basic + Housing + Transport = 90% of Gross</span>.</p>

  <h2>7.2 Statutory Pension (PRA 2014)</h2>
  <div class="math-box">
    <span class="hl">Employee Pension Deduction</span> <span class="op">=</span> BHT * 8% <span class="rem">(7.2% of Gross — 100% Tax Deductible)</span><br>
    <span class="hl">Employer Pension Contribution</span> <span class="op">=</span> BHT * 10% <span class="rem">(9.0% of Gross — Company Expense)</span>
  </div>

  <h2>7.3 Consolidated Relief Allowance (CRA)</h2>
  <table>
    <thead>
      <tr>
        <th>Statutory Regime</th>
        <th>Annual CRA Formula</th>
        <th>Monthly Equivalent</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>PITA 2011 / Finance Act</strong></td>
        <td><span class="mono">max(₦200,000, 1% Gross) + 20% Gross</span></td>
        <td><span class="mono">max(₦16,666.67, 1% Gross) + 20% Gross</span></td>
      </tr>
      <tr>
        <td><strong>2026 Tax Reform Bill</strong></td>
        <td><span class="mono">₦800,000 Base + 20% Gross</span></td>
        <td><span class="mono">₦66,666.67 Base + 20% Gross</span></td>
      </tr>
    </tbody>
  </table>

  <h2>7.4 Progressive Tax Brackets (PITA 2011 vs 2026 Reform)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">PITA 2011 Band (Annual)</th>
        <th style="width: 15%;">Rate</th>
        <th style="width: 40%;">2026 Tax Reform Bill Band (Annual)</th>
        <th style="width: 15%;">Rate</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>First ₦300,000 (₦25,000/mo)</td>
        <td><strong>7%</strong></td>
        <td>First ₦2,200,000 (₦183,333.33/mo)</td>
        <td><strong>15%</strong></td>
      </tr>
      <tr>
        <td>Next ₦300,000 (₦25,000/mo)</td>
        <td><strong>11%</strong></td>
        <td>Next ₦9,000,000 (₦750,000.00/mo)</td>
        <td><strong>18%</strong></td>
      </tr>
      <tr>
        <td>Next ₦500,000 (₦41,666.67/mo)</td>
        <td><strong>15%</strong></td>
        <td>Next ₦13,000,000 (₦1,083,333.33/mo)</td>
        <td><strong>21%</strong></td>
      </tr>
      <tr>
        <td>Next ₦500,000 (₦41,666.67/mo)</td>
        <td><strong>19%</strong></td>
        <td>Next ₦25,000,000 (₦2,083,333.33/mo)</td>
        <td><strong>23%</strong></td>
      </tr>
      <tr>
        <td>Next ₦1,600,000 (₦133,333.33/mo)</td>
        <td><strong>21%</strong></td>
        <td>Above ₦49,200,000 (₦4,100,000.00/mo)</td>
        <td><strong>25%</strong></td>
      </tr>
      <tr>
        <td>Above ₦3,200,000 (₦266,666.67/mo)</td>
        <td><strong>24%</strong></td>
        <td>—</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>

  <h2>7.5 Worked Numerical Example (₦500,000 Monthly Gross)</h2>
  <div class="math-box">
    <span class="hl">1. Monthly Gross:</span> ₦500,000.00 (Annual: ₦6,000,000.00)<br>
    <span class="hl">2. BHT Emolument:</span> ₦450,000.00 (Basic ₦200k + Housing ₦150k + Transport ₦100k)<br>
    <span class="hl">3. Employee Pension (8%):</span> ₦36,000.00 (Tax Deductible)<br>
    <span class="hl">4. Employer Pension (10%):</span> ₦45,000.00 (Company Liability)<br>
    <span class="hl">5. Monthly CRA Relief:</span> ₦116,666.67 (₦200k/12 + 20% of ₦500k)<br>
    <span class="hl">6. Chargeable Taxable Income:</span> ₦500,000 - ₦36,000 - ₦116,666.67 = <span class="op">₦347,333.33</span><br>
    <span class="hl">7. Monthly PAYE Tax (PITA):</span> <span class="op">₦66,026.67</span><br>
    <span class="hl">8. Net Take-Home Pay:</span> ₦500,000 - ₦36,000 - ₦66,026.67 = <span class="hl">₦397,973.33</span>
  </div>

  <!-- ==================== SECTION 8: RBAC & AUDITING ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <span class="page-header-title">Payroll Pro — Instruction Manual</span>
    <span>Section 8: RBAC & Security</span>
  </div>

  <h1><span class="section-num">08</span> Role-Based Access Control, Presence & Security Auditing</h1>

  <p>
    Payroll Pro enforces separation of duties through a three-tier Role-Based Access Control (RBAC) architecture.
  </p>

  <h2>8.1 Operator Access Matrix</h2>
  <table>
    <thead>
      <tr>
        <th>Operational Capability</th>
        <th style="text-align: center;">Administrator</th>
        <th style="text-align: center;">Payroll Officer</th>
        <th style="text-align: center;">Auditor</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Configure Cloud Server &amp; Database Keys</td>
        <td style="text-align: center;">✅ Full</td>
        <td style="text-align: center;">❌ Denied</td>
        <td style="text-align: center;">❌ Denied</td>
      </tr>
      <tr>
        <td>Manage Operators, PINs &amp; Roles</td>
        <td style="text-align: center;">✅ Full</td>
        <td style="text-align: center;">❌ Denied</td>
        <td style="text-align: center;">❌ Denied</td>
      </tr>
      <tr>
        <td>Add, Edit &amp; Deactivate Staff Records</td>
        <td style="text-align: center;">✅ Full</td>
        <td style="text-align: center;">✅ Full</td>
        <td style="text-align: center;">👁️ Read-Only</td>
      </tr>
      <tr>
        <td>Run Monthly Payroll Calculations</td>
        <td style="text-align: center;">✅ Full</td>
        <td style="text-align: center;">✅ Full</td>
        <td style="text-align: center;">👁️ Read-Only</td>
      </tr>
      <tr>
        <td>Lock &amp; Finalize Historical Runs</td>
        <td style="text-align: center;">✅ Full</td>
        <td style="text-align: center;">✅ Full</td>
        <td style="text-align: center;">❌ Denied</td>
      </tr>
      <tr>
        <td>Export Bank NUBAN Schedules</td>
        <td style="text-align: center;">✅ Full</td>
        <td style="text-align: center;">✅ Full</td>
        <td style="text-align: center;">👁️ Audit Copy</td>
      </tr>
      <tr>
        <td>View System Security Audit Trail</td>
        <td style="text-align: center;">✅ Full</td>
        <td style="text-align: center;">❌ Denied</td>
        <td style="text-align: center;">👁️ Read-Only</td>
      </tr>
      <tr>
        <td>Modify Tax Variables &amp; CRA Formulas</td>
        <td style="text-align: center;">✅ Full</td>
        <td style="text-align: center;">❌ Denied</td>
        <td style="text-align: center;">❌ Denied</td>
      </tr>
    </tbody>
  </table>

  <h2>8.2 Live Operator Presence & Real-Time Tracking</h2>
  <p>
    When authorized team members open Payroll Pro across different locations, WebSocket presence tracking broadcasts active sessions. The team ledger displays live green indicator pills (<span class="mono">● Online since 09:14 AM</span>) including the company workspace they are currently viewing.
  </p>

  <h2>8.3 Zero-Latency Forced Deactivation</h2>
  <div class="callout callout-warning">
    <strong>Security Enforcement:</strong> If an employee resigns or a security incident occurs, an Administrator can flip the operator's status to <strong>Deactivated</strong>. Within sub-seconds, the remote operator's application halts operations, displays a security alert, and forcibly signs out to the login gate.
  </div>

  <h2>8.4 Immutable Audit Logging</h2>
  <p>
    All sensitive actions are permanently logged in the <span class="mono">audit_logs</span> table:
  </p>
  <ul>
    <li>Staff Created, Edited, Prorated, or Deactivated</li>
    <li>Salary Overrides and Monthly Variations Recorded</li>
    <li>Loan Facilities Disbursed, Paused, Resumed, or Manually Repaid</li>
    <li>Payroll Periods Locked, Finalized, or Exported</li>
    <li>Statutory Tax Parameters or CRA Formulas Modified</li>
  </ul>

  <!-- ==================== SECTION 9: TROUBLESHOOTING & BACKUP ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <span class="page-header-title">Payroll Pro — Instruction Manual</span>
    <span>Section 9: Troubleshooting & Backups</span>
  </div>

  <h1><span class="section-num">09</span> Troubleshooting, Data Backup & Disaster Recovery</h1>

  <p>
    Procedures for system maintenance, encrypted local backups, and resolving common operational edge-cases.
  </p>

  <h2>9.1 Local Encrypted Backups</h2>
  <p>
    Under <strong>Settings -> Data Backup</strong>, administrators can generate an encrypted <span class="mono">.json</span> database dump containing all company entities, employees, loans, locked historical runs, and audit logs.
  </p>
  <div class="callout callout-info">
    <strong>Recommended Backup Schedule:</strong> Export an encrypted local backup at the conclusion of every monthly payroll cycle immediately following period snapshot locking.
  </div>

  <h2>9.2 Disaster Recovery Procedure</h2>
  <ul class="step-list">
    <li>Deploy a fresh Supabase database instance.</li>
    <li>Execute <span class="mono">schema.sql</span> via the Supabase SQL Editor to initialize relational tables.</li>
    <li>Launch Payroll Pro and enter the new Supabase URL and Anon Key at the login gate.</li>
    <li>Navigate to <strong>Settings -> Restore from Backup</strong> and select your latest verified <span class="mono">.json</span> backup file.</li>
    <li>The system validates and restores all companies, employees, and historical snapshots within seconds.</li>
  </ul>

  <h2>9.3 Frequently Asked Questions &amp; Troubleshooting</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Symptom / Question</th>
        <th style="width: 70%;">Root Cause &amp; Resolution</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Why does a staff member's take-home pay appear lower than expected?</strong></td>
        <td>Check the employee's profile for: (1) Mid-month Start or Exit date activating calendar day proration; (2) Scheduled loan/salary advance deduction; or (3) A monthly override value set for that cycle.</td>
      </tr>
      <tr>
        <td><strong>Table flickering or reloading constantly?</strong></td>
        <td>Resolved in version 1.0.2. Background synchronization and polling routines operate in silent mode, preserving table state and active row inputs without layout shifts.</td>
      </tr>
      <tr>
        <td><strong>Can I edit a staff member's salary after locking a period?</strong></td>
        <td>Yes. Updating base gross salary will update all future unlocked periods. The locked period snapshot remains permanently preserved as finalized.</td>
      </tr>
      <tr>
        <td><strong>How do I change statutory pension rates?</strong></td>
        <td>Administrators can navigate to <strong>Settings -> Variables</strong> to adjust Employee Pension (8%) and Employer Pension (10%) rates to match special collective bargaining agreements.</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 30px; padding: 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; font-size: 8.5pt; color: #64748b;">
    <strong>PAYROLL PRO ENTERPRISE</strong> &bull; OFFICIAL OPERATIONAL MANUAL &bull; RELEASE 1.0.2<br>
    For technical support, database administration, or compliance inquiries, contact your company's System Administrator.
  </div>

</body>
</html>
`;

// Write HTML file
const tempHtmlPath = path.join(__dirname, '..', 'instruction_manual.html');
fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');
console.log('HTML documentation written to:', tempHtmlPath);

// Launch Electron to render PDF
app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      show: false,
      width: 1200,
      height: 900,
      webPreferences: {
        offscreen: true
      }
    });

    await win.loadFile(tempHtmlPath);

    // Wait a brief moment for web fonts and images to load completely
    await new Promise(resolve => setTimeout(resolve, 1500));

    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    });

    const rootPdfPath = path.join(__dirname, '..', 'Payroll_Pro_Instruction_Manual.pdf');
    const docsPdfPath = path.join(__dirname, '..', 'docs', 'Payroll_Pro_Instruction_Manual.pdf');

    fs.writeFileSync(rootPdfPath, pdfBuffer);
    fs.writeFileSync(docsPdfPath, pdfBuffer);

    console.log('PDF Generated Successfully at:');
    console.log('  1.', rootPdfPath);
    console.log('  2.', docsPdfPath);
    console.log('File size:', (pdfBuffer.length / 1024).toFixed(2), 'KB');
  } catch (err) {
    console.error('Failed to generate PDF:', err);
  } finally {
    app.quit();
  }
});
