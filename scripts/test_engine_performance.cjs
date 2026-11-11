const { performance } = require('perf_hooks');

// Import payePensionEngine
const { 
  calculatePayrollItem,
  getScheduleWorkdays 
} = require('../src/engine/payePensionEngine');

// Mock data
const mockPayrollVariables = {
  craFixedBase: 800000,
  craVariableRate: 0.20,
  craVariableMaxCap: 500000,
  taxBands: [
    { upTo: 2200000, rate: 0.15 },
    { upTo: 11200000, rate: 0.18 },
    { upTo: null, rate: 0.24 }
  ],
  pensionEmployeeRate: 0.08,
  pensionEmployerRate: 0.10,
  minimumWageThreshold: 70000,
  workdayDivisorRule: 'actual_weekdays'
};

const mockPayeTaxVariables = {
  minimumTaxRate: 0.01,
  exemptThreshold: 840000
};

function generateEmployees(count) {
  const emps = [];
  const depts = ['Executive', 'Finance', 'Engineering', 'Operations', 'Sales', 'HR', 'Legal', 'Logistics'];
  for (let i = 1; i <= count; i++) {
    const code = `EMP-${String(i).padStart(4, '0')}`;
    const monthlyGross = 150000 + (i % 20) * 100000;
    const annualRent = 500000 + (i % 10) * 200000;
    emps.push({
      id: `emp-${i}`,
      code,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      department: depts[i % depts.length],
      position: `Role ${i}`,
      monthlyGross,
      annualRent,
      workSchedule: i % 5 === 0 ? '6-day' : '5-day',
      hasPension: true,
      hasPaye: true,
      employmentType: 'Full-Time',
      hireDate: '2022-01-15'
    });
  }
  return emps;
}

function generateContributions(empCount, countPerEmp = 20) {
  const contribs = [];
  for (let e = 1; e <= empCount; e++) {
    for (let c = 0; c < countPerEmp; c++) {
      contribs.push({
        id: `contrib-${e}-${c}`,
        employeeId: `emp-${e}`,
        periodKey: `2026-nov`,
        schemeName: 'Staff Welfare Fund',
        amount: 5000,
        createdAt: '2026-11-11'
      });
    }
  }
  return contribs;
}

function generateLoans(empCount) {
  const loans = [];
  for (let i = 1; i <= Math.min(empCount, 100); i++) {
    loans.push({
      id: `loan-${i}`,
      employeeId: `emp-${i}`,
      type: 'Staff Loan',
      principalAmount: 1200000,
      monthlyDeduction: 100000,
      remainingBalance: 500000,
      status: 'Active',
      history: [
        { periodKey: '2026-nov', amount: 100000, balanceAfter: 400000 }
      ]
    });
  }
  return loans;
}

function generateAbsences(empCount) {
  const absences = [];
  for (let i = 1; i <= Math.min(empCount, 50); i++) {
    absences.push({
      id: `abs-${i}`,
      employeeId: `emp-${i}`,
      periodKey: '2026-nov',
      daysAbsent: 2,
      absenceType: 'unauthorized_absence',
      deductionAmount: 25000,
      dates: ['2026-11-04', '2026-11-05']
    });
  }
  return absences;
}

async function runBenchmark() {
  console.log('====================================================');
  console.log('🚀 PAYROLL PRO ENGINE STRESS TEST & BENCHMARK SUITE');
  console.log('====================================================\n');

  const empCount = 500;
  console.log(`Generating test datasets: ${empCount} employees...`);
  const employees = generateEmployees(empCount);
  const contributions = generateContributions(empCount, 25); // 12,500 contribution records
  const loans = generateLoans(empCount);
  const absences = generateAbsences(empCount);

  console.log(`Total Contributions: ${contributions.length}`);
  console.log(`Total Loans: ${loans.length}`);
  console.log(`Total Absences: ${absences.length}\n`);

  // Test 1: Baseline computePayrollItem speed (pure calculation)
  console.log('--- TEST 1: Pure Engine Calculation Throughput ---');
  const t0 = performance.now();
  const iterations = 5000;
  for (let i = 0; i < iterations; i++) {
    const emp = employees[i % employees.length];
    calculatePayrollItem(emp, mockPayrollVariables, mockPayeTaxVariables, 'nov', 2026);
  }
  const t1 = performance.now();
  const elapsedPure = t1 - t0;
  const opsPerSec = (iterations / (elapsedPure / 1000)).toFixed(0);
  console.log(`Computed ${iterations} statutory payroll items in ${elapsedPure.toFixed(2)}ms (${opsPerSec} calculations/sec).`);

  // Test 2: UN-OPTIMIZED Nested Array Search (Current usePayrollStore approach)
  console.log('\n--- TEST 2: Un-optimized Nested Search (Linear .filter/.find) ---');
  const currentPeriodKey = '2026-nov';
  const t2 = performance.now();
  let dummyTotal1 = 0;

  for (const emp of employees) {
    // 1. Absences .find()
    const abs = absences.find(a => a && a.employeeId === emp.id && a.periodKey === currentPeriodKey);
    // 2. Loans .forEach()
    let loanDed = 0;
    loans.forEach(loan => {
      if (!loan || loan.employeeId !== emp.id) return;
      const rec = (loan.history || []).find(h => h.periodKey === currentPeriodKey);
      if (rec) loanDed += rec.amount;
    });
    // 3. Contributions .filter() over 12,500 records
    const empContribs = contributions.filter(c => c && c.employeeId === emp.id && c.periodKey === currentPeriodKey);
    const contribDed = empContribs.reduce((s, c) => s + c.amount, 0);

    const base = calculatePayrollItem(emp, mockPayrollVariables, mockPayeTaxVariables, 'nov', 2026);
    dummyTotal1 += base.netTakeHome - loanDed - contribDed;
  }
  const t3 = performance.now();
  const elapsedUnoptimized = t3 - t2;
  console.log(`Unoptimized linear search for ${empCount} employees: ${elapsedUnoptimized.toFixed(2)}ms`);

  // Test 3: OPTIMIZED Hash Map Pre-indexing
  console.log('\n--- TEST 3: Optimized Pre-indexed Map Approach ---');
  const t4 = performance.now();
  let dummyTotal2 = 0;

  // Pre-index collections by employeeId
  const absenceMap = new Map();
  for (const a of absences) {
    if (a.periodKey === currentPeriodKey) {
      absenceMap.set(a.employeeId, a);
    }
  }

  const loanMap = new Map();
  for (const loan of loans) {
    let loanDed = 0;
    const rec = (loan.history || []).find(h => h.periodKey === currentPeriodKey);
    if (rec) {
      loanDed += rec.amount;
    } else if (loan.status === 'Active' && loan.remainingBalance > 0) {
      loanDed += Math.min(loan.monthlyDeduction || 0, loan.remainingBalance);
    }
    if (loanDed > 0) {
      loanMap.set(loan.employeeId, (loanMap.get(loan.employeeId) || 0) + loanDed);
    }
  }

  const contributionMap = new Map();
  for (const c of contributions) {
    if (c.periodKey === currentPeriodKey) {
      const arr = contributionMap.get(c.employeeId) || [];
      arr.push(c);
      contributionMap.set(c.employeeId, arr);
    }
  }

  for (const emp of employees) {
    const abs = absenceMap.get(emp.id);
    const loanDed = loanMap.get(emp.id) || 0;
    const empContribs = contributionMap.get(emp.id) || [];
    const contribDed = empContribs.reduce((s, c) => s + c.amount, 0);

    const base = calculatePayrollItem(emp, mockPayrollVariables, mockPayeTaxVariables, 'nov', 2026);
    dummyTotal2 += base.netTakeHome - loanDed - contribDed;
  }
  const t5 = performance.now();
  const elapsedOptimized = t5 - t4;
  const speedup = (elapsedUnoptimized / elapsedOptimized).toFixed(1);
  console.log(`Optimized pre-indexed Map search for ${empCount} employees: ${elapsedOptimized.toFixed(2)}ms`);
  console.log(`⚡ Speedup: ${speedup}x faster!`);
  console.log(`Integrity check: dummyTotal1 === dummyTotal2: ${dummyTotal1 === dummyTotal2}`);

  console.log('\n====================================================');
  console.log('✅ BENCHMARK COMPLETE');
  console.log('====================================================');
}

runBenchmark().catch(console.error);

