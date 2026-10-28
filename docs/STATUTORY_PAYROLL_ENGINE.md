# Payroll Pro — Statutory Engine & Compliance Specification

This document provides the formal mathematical models, legal precedents, and algorithmic rules governing the **Payroll Pro Calculation Engine** (`src/engine/payePensionEngine.ts`). It serves as an authoritative reference for Tax Auditors, Compliance Officers, and Financial Controllers.

---

## Table of Contents

1. [Salary Emoluments & BHT Breakdown](#1-salary-emoluments--bht-breakdown)
2. [Statutory Pension Contributions (PRA 2014)](#2-statutory-pension-contributions-pra-2014)
3. [Consolidated Relief Allowance (CRA) & Rent Relief](#3-consolidated-relief-allowance-cra--rent-relief)
4. [PAYE Progressive Tax Brackets](#4-paye-progressive-tax-brackets)
   - [PITA 2011 / Finance Act Baseline](#41-pita-2011--finance-act-baseline)
   - [2026 Nigerian Tax Reform Bill Baseline](#42-2026-nigerian-tax-reform-bill-baseline)
5. [Minimum Tax Safeguard (1%)](#5-minimum-tax-safeguard-1)
6. [Other Statutory Funds (NHF, NSITF, ITF)](#6-other-statutory-funds-nhf-nsitf-itf)
7. [Tenure Prorations (Mid-Month Stints)](#7-tenure-prorations-mid-month-stints)
8. [Worked Numerical Examples](#8-worked-numerical-examples)

---

## 1. Salary Emoluments & BHT Breakdown

Under Nigerian compensation standards, an employee's Monthly Gross Emolument is mathematically split into statutory allowances:

$$\text{Gross} = \text{Basic} + \text{Housing} + \text{Transport} + \text{Other Allowances}$$

### Default Emolument Allocations

| Component | Default % | Statutory Treatment |
| :--- | :---: | :--- |
| **Basic Salary** | **40%** | Pensionable, Taxable, Emolument Base |
| **Housing Allowance** | **30%** | Pensionable, Taxable |
| **Transport Allowance** | **20%** | Pensionable, Taxable |
| **Other Allowances** | **10%** | Non-Pensionable, Taxable |

### Pensionable Base (BHT)
The sum of Basic, Housing, and Transport forms the **BHT Emolument**:

$$\text{BHT} = \text{Basic} + \text{Housing} + \text{Transport} = 90\% \times \text{Gross}$$

---

## 2. Statutory Pension Contributions (PRA 2014)

Governed by Section 4(1) of the **Pension Reform Act 2014 (PRA 2014)**:
- **Employee Pension Deduction:** Minimum of **8%** of monthly BHT emolument.
- **Employer Pension Contribution:** Minimum of **10%** of monthly BHT emolument.
- **Total Statutory Remittance:** **18%** of BHT remitted to the employee's licensed Pension Fund Administrator (PFA).

$$\text{Pension}_{\text{emp}} = \text{BHT} \times 8\% = (90\% \times \text{Gross}) \times 0.08 = 7.2\% \times \text{Gross}$$

$$\text{Pension}_{\text{empr}} = \text{BHT} \times 10\% = (90\% \times \text{Gross}) \times 0.10 = 9.0\% \times \text{Gross}$$

> **Statutory Relief:** Under Section 33 of the Personal Income Tax Act (PITA), employee pension deductions are **100% tax-exempt** and subtracted from Gross Income prior to calculating Chargeable Taxable Income.

---

## 3. Consolidated Relief Allowance (CRA) & Rent Relief

### 3.1 Standard PITA 2011 Formula
Under the 6th Schedule of PITA 2011 (as amended by Finance Acts):

$$\text{CRA Annual} = \max(₦200,000,\; 1\% \times \text{Gross Annual}) + (20\% \times \text{Gross Annual})$$

Divided monthly:

$$\text{CRA Monthly} = \max(₦16,666.67,\; 1\% \times \text{Gross Monthly}) + (20\% \times \text{Gross Monthly})$$

### 3.2 2026 Nigerian Tax Reform Bill Formula
The modern 2026 reform model simplifies and elevates the statutory base relief:

$$\text{CRA Annual (2026)} = ₦800,000 + (20\% \times \text{Gross Annual})$$

$$\text{CRA Monthly (2026)} = ₦66,666.67 + (20\% \times \text{Gross Monthly})$$

### 3.3 Statutory Rent Relief
Where an employer designates rent emoluments:
- Rate: **20% of annual rent paid**.
- Annual Cap: **₦500,000** (₦41,666.67 / month).

---

## 4. PAYE Progressive Tax Brackets

Chargeable taxable income is derived as:

$$\text{Taxable Income} = \text{Gross} - \text{Employee Pension} - \text{CRA} - \text{Rent Relief} - \text{Other Statutory Deductions}$$

If $\text{Taxable Income} \le 0$, PAYE Tax is evaluated under the Minimum Tax rule.

---

### 4.1 PITA 2011 / Finance Act Baseline

Calculated cumulatively on an annualized basis and divided by 12:

| Tax Bracket (Annual) | Monthly Equivalent | Marginal Rate |
| :--- | :--- | :---: |
| **First ₦300,000** | First ₦25,000 / month | **7%** |
| **Next ₦300,000** | Next ₦25,000 / month | **11%** |
| **Next ₦500,000** | Next ₦41,666.67 / month | **15%** |
| **Next ₦500,000** | Next ₦41,666.67 / month | **19%** |
| **Next ₦1,600,000** | Next ₦133,333.33 / month | **21%** |
| **Above ₦3,200,000** | Above ₦266,666.67 / month | **24%** |

---

### 4.2 2026 Nigerian Tax Reform Bill Baseline

The modern 2026 reform schedule elevates standard thresholds for upper-tier earners:

| Tax Bracket (Annual) | Monthly Equivalent | Marginal Rate |
| :--- | :--- | :---: |
| **First ₦2,200,000** | First ₦183,333.33 / month | **15%** |
| **Next ₦9,000,000** | Next ₦750,000 / month | **18%** |
| **Next ₦13,000,000** | Next ₦1,083,333.33 / month | **21%** |
| **Next ₦25,000,000** | Next ₦2,083,333.33 / month | **23%** |
| **Above ₦49,200,000** | Above ₦4,100,000 / month | **25%** |

---

## 5. Minimum Tax Safeguard (1%)

Under Section 37 of PITA:
If an employee's total statutory deductions (Pension + CRA) exceed their gross income, or if computed tax is less than **1% of Gross Income**, the employee is subject to statutory **Minimum Tax**:

$$\text{PAYE Tax} = \max(\text{Computed Progressive Tax},\; 1\% \times \text{Gross})$$

> **National Minimum Wage Exemption:** Employees earning at or below the official Nigerian National Minimum Wage (Finance Act 2020 amendment) are completely exempt from minimum tax.

---

## 6. Other Statutory Funds (NHF, NSITF, ITF)

| Fund | Legal Basis | Rate | Obligated Party |
| :--- | :--- | :---: | :--- |
| **National Housing Fund (NHF)** | NHF Act 1992 | **2.5% of Basic** | Employee (Deducted from salary) |
| **Employees' Compensation (NSITF)** | ECA 2010 | **1.0% of Total Payroll** | Employer (Direct company liability) |
| **Industrial Training Fund (ITF)** | ITF Act 2011 | **1.0% of Total Payroll** | Employer (If 5+ employees or >₦50m turnover) |

---

## 7. Tenure Prorations (Mid-Month Stints)

When an employee begins employment after the 1st of the month or terminates employment before the final calendar day, Payroll Pro calculates active days using exact calendar day math:

$$\text{Proration Factor} = \frac{\text{Active Calendar Days in Month}}{\text{Total Calendar Days in Month}}$$

$$\text{Prorated Gross} = \text{Base Monthly Gross} \times \text{Proration Factor}$$

All subsequent calculations (Basic, Housing, Transport, Pension, CRA, and PAYE) are computed strictly against the **Prorated Gross**.

---

## 8. Worked Numerical Examples

### Example 1: Standard Employee (₦500,000 Monthly Gross)
- **Gross Monthly:** `₦500,000.00`
- **Gross Annual:** `₦6,000,000.00`

#### Step 1: Emoluments & Pension
- Basic (40%): `₦200,000.00`
- Housing (30%): `₦150,000.00`
- Transport (20%): `₦100,000.00`
- Other (10%): `₦50,000.00`
- **BHT Emolument:** `₦450,000.00`
- **Employee Pension (8%):** `₦450,000 * 0.08 = ₦36,000.00`
- **Employer Pension (10%):** `₦450,000 * 0.10 = ₦45,000.00`

#### Step 2: Consolidated Relief Allowance (CRA)
- 1% of Gross Annual: `₦60,000.00` vs Base `₦200,000.00` -> Higher is `₦200,000.00`
- 20% of Gross Annual: `₦1,200,000.00`
- **Total Annual CRA:** `₦1,400,000.00`
- **Monthly CRA:** `₦1,400,000 / 12 = ₦116,666.67`

#### Step 3: Taxable Income
$$\text{Taxable Monthly} = ₦500,000.00 - ₦36,000.00 - ₦116,666.67 = ₦347,333.33$$
$$\text{Taxable Annual} = ₦4,168,000.00$$

#### Step 4: Annual PAYE Computation (PITA 2011 Brackets)
- First ₦300,000 @ 7%: `₦21,000.00`
- Next ₦300,000 @ 11%: `₦33,000.00`
- Next ₦500,000 @ 15%: `₦75,000.00`
- Next ₦500,000 @ 19%: `₦95,000.00`
- Next ₦1,600,000 @ 21%: `₦336,000.00`
- Remaining ₦968,000 @ 24%: `₦232,320.00`
- **Total Annual PAYE:** `₦792,320.00`
- **Monthly PAYE Tax:** `₦792,320 / 12 = ₦66,026.67`

#### Step 5: Net Take-Home Pay
$$\text{Net Pay} = ₦500,000.00 - ₦36,000.00 (\text{Pension}) - ₦66,026.67 (\text{PAYE}) = \mathbf{₦397,973.33}$$
