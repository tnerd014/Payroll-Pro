import { CalculatedPayrollItem, CompanyProfile, Employee } from '../types';

export interface BankScheduleRow {
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  narration: string;
  staffCode: string;
  email?: string;
  phone?: string;
}

export function generateBankPaymentRows(
  payrollItems: CalculatedPayrollItem[],
  employees: Employee[],
  company: CompanyProfile,
  monthLabel: string,
  year: number
): BankScheduleRow[] {
  const employeeMap = new Map(employees.map(e => [e.id, e]));

  return payrollItems
    .filter(item => item.netTakeHome > 0)
    .map(item => {
      const emp = employeeMap.get(item.employeeId);
      const fullName = emp ? `${emp.firstName} ${emp.lastName}`.trim() : item.fullName;
      const bank = emp?.bankName || item.bankName || 'Unknown Bank';
      const acct = emp?.accountNumber || item.accountNumber || '';
      const code = emp?.code || item.employeeCode || '';
      const narration = `Salary ${monthLabel} ${year} - ${company.name || 'Company'}`;

      return {
        beneficiaryName: fullName,
        bankName: bank,
        accountNumber: acct,
        amount: Math.round(item.netTakeHome * 100) / 100,
        narration: narration.substring(0, 50),
        staffCode: code,
        email: emp?.email,
        phone: emp?.phone,
      };
    });
}

export function exportNibssBankTransferCsv(
  payrollItems: CalculatedPayrollItem[],
  employees: Employee[],
  company: CompanyProfile,
  monthLabel: string,
  year: number
) {
  const rows = generateBankPaymentRows(payrollItems, employees, company, monthLabel, year);

  // CSV Headers: Serial, Beneficiary Name, Bank Name, Account Number, Amount (NGN), Narration, Staff ID
  const header = ['S/N', 'Beneficiary Name', 'Bank Name', 'Account Number', 'Amount (NGN)', 'Narration', 'Staff ID'];
  
  const csvLines: string[] = [header.join(',')];

  rows.forEach((row, index) => {
    const cleanName = `"${row.beneficiaryName.replace(/"/g, '""')}"`;
    const cleanBank = `"${row.bankName.replace(/"/g, '""')}"`;
    const cleanAcct = `"${row.accountNumber.replace(/"/g, '""')}"`;
    const cleanNarration = `"${row.narration.replace(/"/g, '""')}"`;
    const cleanCode = `"${row.staffCode.replace(/"/g, '""')}"`;

    csvLines.push([
      index + 1,
      cleanName,
      cleanBank,
      cleanAcct,
      row.amount.toFixed(2),
      cleanNarration,
      cleanCode
    ].join(','));
  });

  const csvContent = csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const sanitizedCompany = (company.name || 'Payroll').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('download', `${sanitizedCompany}_Bank_Payment_Schedule_${monthLabel}_${year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
