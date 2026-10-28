# Payroll Pro 💼🇳🇬

> **Enterprise Payroll Management & Statutory Nigerian Tax Compliance Suite**
> High-performance Electron desktop application powered by React 18, TypeScript, Tailwind CSS, and Supabase Realtime PostgreSQL.

---

## 📚 Complete Documentation Suite

Comprehensive documentation has been generated in the [`docs/`](docs/) directory:

- 📄 [**Download Printable Instruction Manual (PDF)**](Payroll_Pro_Instruction_Manual.pdf) — Complete 10-page, beautifully presented executive manual & statutory guide.
- 📖 [**Master Documentation Index & Quick Start**](docs/README.md)
- 👤 [**End-User Guide & Page Walkthroughs**](docs/USER_GUIDE.md) — Step-by-step guides for HR, Accountants & Payroll Officers (Dashboard, Staff Ledger, Quick-Add Spreadsheet, Payroll Processing, Salary Variations, Loan Amortizations, Payslip Designer, Bank Schedules).
- 🛡️ [**Administrator & Multi-Tenant Guide**](docs/ADMIN_GUIDE.md) — Workspace isolation, RBAC role matrix, Supabase Cloud sync, live presence, zero-latency deactivation, password recovery, and disaster recovery.
- ⚖️ [**Statutory Engine & Tax Specification**](docs/STATUTORY_PAYROLL_ENGINE.md) — Mathematical reference for Nigerian PAYE, Consolidated Relief Allowance (CRA), Pension Reform Act 2014 (PRA 2014) BHT calculations, and the 2026 Nigerian Tax Reform Bill.

---

## ⚡ Quick Start

### Installation & Development
```bash
# Install dependencies
npm install

# Start Vite React development server (runs on http://localhost:5174)
npm run dev

# Start Electron desktop app with live reload
npm run electron:dev

# Build production bundle
npm run build

# Package Windows desktop executable (.exe installer & portable)
npm run electron:build
```

---

## 🌟 Key Capabilities

- **Zero-Flicker Background Sync:** Silent real-time updates and polling without table unmounting or UI disruption.
- **Dual-Mode Multi-Tenancy:** Offline-first local storage cache coupled with live Supabase PostgreSQL change-data-capture.
- **Bulk Employee Onboarding:** Rapid spreadsheet entry with keyboard navigation (`Enter`/`Tab`) and instant validation.
- **NUBAN Bank Schedules:** Auto-formatted Excel exports compatible with Access, GTB, Zenith, UBA, and FirstBank corporate portals.
- **Tamper-Evident Payslips:** High-resolution PDF/Print output featuring cryptographic QR verification tokens.
