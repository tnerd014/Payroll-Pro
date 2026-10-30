export interface LegalSection {
  id: string;
  title: string;
  content: string[];
  subsections?: { title: string; points: string[] }[];
}

export const PRIVACY_POLICY: {
  title: string;
  lastUpdated: string;
  introduction: string;
  sections: LegalSection[];
} = {
  title: "Privacy Policy",
  lastUpdated: "October 2026",
  introduction:
    "This Privacy Policy describes how Payroll Pro (\"we\", \"our\", or \"the Software\") processes, stores, and protects organizational information, employee records, and payroll data. We operate under the principle of data minimization and recognize that payroll information is highly confidential.",
  sections: [
    {
      id: "scope-ownership",
      title: "1. Scope and Data Ownership",
      content: [
        "Your organization maintains full and exclusive ownership of all corporate profiles, employee records, salary structures, tax declarations, and financial transactions entered into Payroll Pro.",
        "Payroll Pro operates solely as a software utility and data processor. We do not sell, rent, monetize, or disclose your corporate or employee data to any third parties or advertising services.",
        "You retain the right to export, backup, or permanently erase your data from the application at any time without restriction."
      ]
    },
    {
      id: "data-collected",
      title: "2. Categories of Data Processed",
      content: [
        "To perform payroll calculations, generate payslips, and produce statutory reports, the software processes the following categories of information:"
      ],
      subsections: [
        {
          title: "Company Information",
          points: [
            "Entity name, registration number, registered business address, official phone number, and administrative contact email.",
            "Company logos and custom payslip branding assets.",
            "Local workspace protection credentials, including encrypted passwords and recovery configurations."
          ]
        },
        {
          title: "Employee Identification and Contact Details",
          points: [
            "Full legal names, employee codes, job titles, department assignments, and employment categories.",
            "Work and personal email addresses, telephone numbers, and state of residence.",
            "Employment start dates, contract periods, and tenure records."
          ]
        },
        {
          title: "Compensation, Banking, and Loan Records",
          points: [
            "Gross salary emoluments and itemized allowance breakdowns (Basic, Housing, Transport, Other).",
            "Annual rent declarations used for statutory rent relief computations.",
            "Bank names and account numbers for salary disbursement schedules.",
            "Internal staff loan records, repayment tenors, monthly deduction schedules, and balance histories."
          ]
        },
        {
          title: "Statutory Tax and Pension Identifiers",
          points: [
            "State Internal Revenue Service (SIRS) Taxpayer Identification Numbers (TIN / PAYE ID).",
            "National Pension Commission (PenCom) Retirement Savings Account (RSA) PINs.",
            "Pension Fund Administrator (PFA) designations and voluntary contribution amounts."
          ]
        }
      ]
    },
    {
      id: "biometrics-security",
      title: "3. Device Security and Authentication",
      content: [
        "Biometric Authentication: Where supported and enabled, Payroll Pro interfaces with device hardware biometrics (Windows Hello, Touch ID, Apple Face ID, or Android Biometrics) through the standard WebAuthn API.",
        "Zero Biometric Transmission: Biometric measurements, fingerprint images, and facial geometry never leave your local device and are never transmitted to our servers or any cloud service. Authentication is performed entirely by the host operating system's Secure Enclave or Trusted Platform Module (TPM).",
        "Session Inactivity Locking: To prevent unauthorized physical access, users may configure an auto-lock interval (1 to 30 minutes). When triggered, access requires re-authentication via PIN, password, or biometrics."
      ]
    },
    {
      id: "storage-sync",
      title: "4. Storage Architecture and Data Transmission",
      content: [
        "Offline Operation: In standalone offline mode, all company databases, staff rosters, and calculation snapshots remain strictly on your local device storage (IndexedDB). No network requests are dispatched.",
        "Cloud Synchronization: When an organization connects to a shared PostgreSQL database, data is transmitted over TLS 1.3 encrypted connections and stored encrypted at rest (AES-256).",
        "Workspace Isolation: Multi-company separation is enforced using PostgreSQL Row-Level Security (RLS) to ensure that records from one workspace cannot be accessed by unauthorized accounts."
      ]
    },
    {
      id: "access-control",
      title: "5. Role-Based Permissions and Audit Logging",
      content: [
        "Access to functions within Payroll Pro is governed by three primary roles:",
        "• Administrator: Full management rights over workspaces, operator credentials, salary configuration, and data deletion.",
        "• Payroll Officer: Operational rights to manage staff rosters, input monthly variables, apply loan deductions, and generate payslips.",
        "• Auditor: Read-only inspection rights to examine historical snapshots, audit logs, and compliance schedules without editing capabilities.",
        "Audit Logging: Material actions—including finalizing or unlocking payroll periods, modifying employee salaries, and altering tax configuration—are automatically recorded with timestamp, operator identity, and description of change."
      ]
    },
    {
      id: "retention-deletion",
      title: "6. Data Retention, Portability, and Erasure",
      content: [
        "Data Portability: Authorized users can export complete employee rosters, salary spreadsheets, and payroll snapshots to Microsoft Excel (.xlsx) workbooks or printable PDF documents at any time.",
        "Permanent Erasure: Deleting an employee, resetting a company workspace, or disconnecting cloud synchronization triggers immediate removal of associated records from local caches and active database tables.",
        "Session Disposal: Signing out clears active authentication tokens and terminates active presence channels."
      ]
    },
    {
      id: "statutory-contact",
      title: "7. Regulatory Alignment and Inquiries",
      content: [
        "Payroll Pro is engineered in alignment with applicable data protection principles, including the Nigeria Data Protection Act (NDPA / NDPR) and general data minimization standards.",
        "For privacy inquiries or technical compliance verification, administrators may contact legal@payrollpro.app or consult the built-in Instruction Manual."
      ]
    }
  ]
};

export const TERMS_OF_SERVICE: {
  title: string;
  lastUpdated: string;
  introduction: string;
  sections: LegalSection[];
} = {
  title: "Terms of Service",
  lastUpdated: "October 2026",
  introduction:
    "These Terms of Service (\"Terms\") govern the use of the Payroll Pro Desktop and Mobile applications. By installing, launching, or using the Software, you agree to these Terms on behalf of your organization.",
  sections: [
    {
      id: "license-grant",
      title: "1. License Grant and Permitted Use",
      content: [
        "Payroll Pro grants you a non-exclusive, non-transferable license to install and use the software for your organization's internal payroll processing and workforce administration.",
        "Multi-Workspace Management: You may create and administer multiple distinct company workspaces within the application, subject to your organization's internal controls.",
        "Restrictions: You may not decompile, reverse-engineer, disassemble, modify, or create derivative works of the software computational engine, nor distribute the software for commercial resale."
      ]
    },
    {
      id: "user-obligations",
      title: "2. User Obligations and Account Security",
      content: [
        "Credential Security: The customer is solely responsible for maintaining the confidentiality of master administrator passwords, PINs, and security question answers. We cannot recover accounts if all administrative recovery keys and answers are lost.",
        "Authorized Access: The customer agrees to maintain an accurate roster of authorized operators and promptly revoke credentials for departed or reassigned personnel.",
        "Accuracy of Information: The customer is responsible for ensuring that all employee data, gross compensation values, and banking details entered into the system are accurate and lawful."
      ]
    },
    {
      id: "statutory-disclaimer",
      title: "3. Calculation Engines and Statutory Tax Disclaimer",
      content: [
        "Calculation Framework: Payroll Pro incorporates computation rules based on established statutory guidelines, including the Personal Income Tax Act (PITA 2011 as amended), Consolidated Relief Allowance (CRA), Pension Reform Act 2014, and National Housing Fund (NHF) provisions.",
        "Statutory Disclaimer: Payroll Pro is an administrative computational tool and does not provide formal legal, tax, or certified public accounting advice. Tax rates, relief caps, pension thresholds, and labor regulations are subject to legislative and administrative change.",
        "Employer Responsibility: The employer is solely and legally responsible for verifying all calculation formulas, ensuring compliance with relevant jurisdiction-specific laws, and timely remitting all deducted taxes, pensions, and levies to the appropriate government authorities (e.g. State IRS, FIRS, PenCom)."
      ]
    },
    {
      id: "offline-continuity",
      title: "4. Offline Operations and Data Synchronization",
      content: [
        "Offline Availability: The software provides an offline-first architecture designed to allow continuous salary computation during network interruptions.",
        "Synchronization: When cloud synchronization is enabled, users acknowledge that network latency or database connectivity interruptions may temporarily delay real-time synchronization between devices.",
        "Payroll Finalization: Finalizing and locking a monthly payroll run creates an immutable historical snapshot. Unlocking a finalized run requires administrative authority and creates an audit log entry."
      ]
    },
    {
      id: "loan-management",
      title: "5. Employee Loans and Salary Advances",
      content: [
        "The software provides tracking facilities for internal staff loans, equipment advances, and salary deductions.",
        "Agreements to issue loans and make deductions from employee remuneration exist strictly between the employer and the employee. Payroll Pro is not party to such agreements and assumes no responsibility for employment disputes or uncollected balances."
      ]
    },
    {
      id: "limitation-liability",
      title: "6. Limitation of Liability and Disclaimers",
      content: [
        "To the maximum extent permitted by applicable law, Payroll Pro is provided \"as is\" and \"as available\" without warranties of any kind, whether express, implied, or statutory.",
        "In no event shall Payroll Pro or its contributors be liable for any direct, indirect, incidental, punitive, or consequential damages (including lost profits, statutory penalties, banking delays, business interruption, or hardware issues) arising from the use or inability to use the software."
      ]
    },
    {
      id: "intellectual-property",
      title: "7. Intellectual Property",
      content: [
        "All software code, user interface designs, payslip templates, icons, and documentation are the intellectual property of Payroll Pro.",
        "Nothing in these Terms grants the customer ownership of the software. All rights not expressly granted are reserved."
      ]
    },
    {
      id: "termination-governing",
      title: "8. Termination and Governing Law",
      content: [
        "Termination: The customer may discontinue use of the software at any time by exporting their data and uninstalling the application.",
        "Survival: Provisions regarding proprietary rights, statutory disclaimers, limitation of liability, and governing law survive termination.",
        "Governing Law: These Terms are governed by applicable commercial and labor laws, and disputes shall be resolved through good-faith negotiation."
      ]
    }
  ]
};
