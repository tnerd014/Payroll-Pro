# Industry Conventions & Mobile UX Reference for Financial/Payroll Apps

## Financial & Payroll Mobile App Standards (Revolut, Gusto, Deel, Rippling)
1. **High Visual Trust & Security**:
   - Deep slate/zinc neutrals with emerald/teal accents denoting financial health and compliance.
   - Clean badges for statutory locks (PAYE, Pension, Tax Compliance).
   - Biometric authentication trigger (Fingerprint / Face ID prompt).

2. **Thumb-Zone Prioritization**:
   - Primary actions (Review & Finalize, Share Payslips, Disburse Bank Transfer) placed in sticky bottom containers.
   - Filters accessible via single-tap bottom sheets.

3. **Data Density Adaptation**:
   - Desktop tables with 12+ columns cannot be horizontally scrolled on mobile without extreme friction.
   - Best practice: Convert table rows into **stacked tactile cards** with 2 key numbers visible by default (Gross & Net Pay), expanding on tap to reveal all statutory deductions (Basic, Housing, Transport, PAYE, Pension, Voluntary deductions).

4. **Offline Resilience & Instant Feedback**:
   - Cache active payroll snapshot and employee list in local device storage.
   - Immediate optimistic UI updates when marking loans or toggling status.
