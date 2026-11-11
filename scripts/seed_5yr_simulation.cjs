const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ofrzssqvoosomydjcomd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mcnpzc3F2b29zb215ZGpjb21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNDgxNTAsImV4cCI6MjEwODkyNDE1MH0.QbbBwnY-2zdYF0u2PXkGng66EGFyxQGyBEBydErbgJ4';

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

const COMPANY_ID = 'comp-6a68e480-495f-48b5-a3b2-75190deeef2f';

// Tax Engine calculation matching src/engine/payePensionEngine.ts
function calculatePayroll(gross, hasPension = true, hasPaye = true, annualRent = 0) {
  const safeGross = Math.max(0, Number(gross) || 0);
  const basic = safeGross * 0.40;
  const housing = safeGross * 0.15;
  const transport = safeGross * 0.15;
  const otherAllowances = safeGross * 0.30;
  const pensionableBHT = basic + housing + transport;

  const employeePension = hasPension ? pensionableBHT * 0.08 : 0;
  const employerPension = hasPension ? pensionableBHT * 0.10 : 0;
  const annualEmpPension = employeePension * 12;
  const annualGross = safeGross * 12;

  let rentRelief = 0;
  let pensionRelief = 0;
  let totalCra = 0;
  let taxableIncome = 0;
  let annualTax = 0;
  let monthlyPaye = 0;

  if (hasPaye) {
    const craBase = 800000;
    rentRelief = Math.min((annualRent || 0) * 0.20, 500000);
    pensionRelief = annualEmpPension;
    totalCra = craBase + rentRelief + pensionRelief;
    taxableIncome = Math.max(annualGross - totalCra, 0);

    if (taxableIncome > 0) {
      const brackets = [
        { upTo: 2200000, rate: 0.15 },
        { upTo: 11200000, rate: 0.18 },
        { upTo: null, rate: 0.24 }
      ];
      let remaining = taxableIncome;
      let prevLimit = 0;
      for (const b of brackets) {
        if (remaining <= 0) break;
        let inBucket = 0;
        if (b.upTo === null) {
          inBucket = remaining;
        } else {
          const bSize = Math.max(0, b.upTo - prevLimit);
          inBucket = Math.min(remaining, bSize);
          prevLimit = b.upTo;
        }
        annualTax += inBucket * b.rate;
        remaining -= inBucket;
      }
    }
    monthlyPaye = annualTax / 12;
  }

  const totalDeductions = monthlyPaye + employeePension;
  const netTakeHome = safeGross - totalDeductions;
  const employerTotalCost = safeGross + employerPension;

  return {
    monthlyGross: safeGross,
    basic,
    housing,
    transport,
    otherAllowances,
    pensionableBHT,
    employeePension,
    employerPension,
    annualGross,
    rentRelief,
    pensionRelief,
    extraReliefs: 0,
    totalCra,
    taxableIncome,
    annualTax,
    monthlyPaye,
    totalDeductions,
    netTakeHome,
    employerTotalCost,
  };
}

const crypto = require('crypto');

async function seed() {
  console.log('🚀 Starting 5-Year High-Fidelity Payroll Simulation Seeding...');

  // 1. Update Company Profile
  console.log('Step 1: Updating Company Profile...');
  const { error: compErr } = await client.from('companies').upsert({
    id: COMPANY_ID,
    name: 'Apex Synergy Logistics Ltd (2122)',
    subtitle: 'RC-1849201 • Integrated Supply Chain & Fleet Solutions',
    address: 'Plot 14B Adetokunbo Ademola Street, Victoria Island, Lagos State',
    phone: '+234 1 295 4820',
    email: 'payroll@apexsynergy.ng',
    has_password: false,
    updated_at: new Date().toISOString()
  });
  if (compErr) console.error('Company update error:', compErr);

  // 2. Insert 8 Departments
  console.log('Step 2: Ensuring 8 Departments...');
  const departments = [
    'Executive & Leadership',
    'Software & Infrastructure',
    'Logistics & Fleet Operations',
    'Finance & Accounts',
    'Human Resources & Admin',
    'Warehousing & Supply Chain',
    'Client Success & Commercial',
    'Legal, Risk & Compliance'
  ];
  for (const dept of departments) {
    try {
      await client.from('departments').upsert({
        company_id: COMPANY_ID,
        name: dept
      });
    } catch (e) {}
  }

  // 3. Generate 52 Realistic Employees
  console.log('Step 3: Populating 52 Nigerian Employees with Historical Staggered Hires (2022-2026)...');
  const staffTemplates = [
    { code: 'EMP-001', fn: 'Wedqw', ln: 'Tunde-Davies', dept: 'Executive & Leadership', pos: 'Managing Director / CEO', gross: 2450000, rent: 1800000, hire: '2022-01-05', bank: 'Guaranty Trust Bank', num: '0123456789' },
    { code: 'EMP-002', fn: 'Babatunde', ln: 'Balogun', dept: 'Finance & Accounts', pos: 'Chief Financial Officer', gross: 1950000, rent: 1500000, hire: '2022-01-10', bank: 'Zenith Bank', num: '1012345678' },
    { code: 'EMP-003', fn: 'Chukwuemeka', ln: 'Okonkwo', dept: 'Software & Infrastructure', pos: 'VP of Technology & Systems', gross: 1800000, rent: 1400000, hire: '2022-02-01', bank: 'Access Bank', num: '0691234567' },
    { code: 'EMP-004', fn: 'Amina', ln: 'Yusuf', dept: 'Human Resources & Admin', pos: 'Head of People & Culture', gross: 1250000, rent: 900000, hire: '2022-02-15', bank: 'First Bank of Nigeria', num: '3045678901' },
    { code: 'EMP-005', fn: 'Olumide', ln: 'Bakare', dept: 'Logistics & Fleet Operations', pos: 'Fleet Operations Director', gross: 1400000, rent: 1000000, hire: '2022-03-01', bank: 'United Bank for Africa', num: '2056789012' },
    { code: 'EMP-006', fn: 'Ngozi', ln: 'Eze', dept: 'Legal, Risk & Compliance', pos: 'General Counsel & Compliance Lead', gross: 1350000, rent: 950000, hire: '2022-03-15', bank: 'Stanbic IBTC Bank', num: '0023456781' },
    { code: 'EMP-007', fn: 'Damilola', ln: 'Adeyemi', dept: 'Finance & Accounts', pos: 'Senior Payroll & Tax Accountant', gross: 780000, rent: 600000, hire: '2022-04-01', bank: 'Guaranty Trust Bank', num: '0234567891' },
    { code: 'EMP-008', fn: 'Ibrahim', ln: 'Garba', dept: 'Warehousing & Supply Chain', pos: 'Warehouse Logistics Manager', gross: 850000, rent: 650000, hire: '2022-04-10', bank: 'Zenith Bank', num: '2134567890' },
    { code: 'EMP-009', fn: 'Chioma', ln: 'Nwachukwu', dept: 'Client Success & Commercial', pos: 'Commercial Accounts Manager', gross: 720000, rent: 500000, hire: '2022-05-01', bank: 'Providus Bank', num: '5401234567' },
    { code: 'EMP-010', fn: 'Segun', ln: 'Oladipo', dept: 'Software & Infrastructure', pos: 'Principal DevOps Engineer', gross: 1100000, rent: 800000, hire: '2022-06-01', bank: 'Sterling Bank', num: '0078901234' },
    { code: 'EMP-011', fn: 'Zainab', ln: 'Bello', dept: 'Human Resources & Admin', pos: 'Talent Acquisition Specialist', gross: 520000, rent: 400000, hire: '2022-07-01', bank: 'Access Bank', num: '0712345678' },
    { code: 'EMP-012', fn: 'Emeka', ln: 'Anayo', dept: 'Logistics & Fleet Operations', pos: 'Route Optimization Lead', gross: 650000, rent: 450000, hire: '2022-08-01', bank: 'First Bank of Nigeria', num: '3123456789' },
    { code: 'EMP-013', fn: 'Fatima', ln: 'Mohammed', dept: 'Finance & Accounts', pos: 'Payables & Treasury Officer', gross: 480000, rent: 350000, hire: '2022-09-01', bank: 'Guaranty Trust Bank', num: '0345678912' },
    { code: 'EMP-014', fn: 'Kayode', ln: 'Fashola', dept: 'Software & Infrastructure', pos: 'Senior Backend Engineer', gross: 950000, rent: 700000, hire: '2022-10-01', bank: 'Zenith Bank', num: '2234567891' },
    { code: 'EMP-015', fn: 'Blessing', ln: 'Akpan', dept: 'Client Success & Commercial', pos: 'Customer Support Lead', gross: 420000, rent: 300000, hire: '2022-11-01', bank: 'United Bank for Africa', num: '2156789013' },
    { code: 'EMP-016', fn: 'Tari', ln: 'Briggs', dept: 'Warehousing & Supply Chain', pos: 'Inventory Controller', gross: 380000, rent: 250000, hire: '2022-12-01', bank: 'Access Bank', num: '0723456789' },
    // 2023 Hires
    { code: 'EMP-017', fn: 'Kelechi', ln: 'Maduka', dept: 'Logistics & Fleet Operations', pos: 'Senior Fleet Dispatcher', gross: 360000, rent: 250000, hire: '2023-01-15', bank: 'First Bank of Nigeria', num: '3223456780' },
    { code: 'EMP-018', fn: 'Yemisi', ln: 'Adebowale', dept: 'Human Resources & Admin', pos: 'HR Operations Officer', gross: 400000, rent: 300000, hire: '2023-02-01', bank: 'Guaranty Trust Bank', num: '0456789123' },
    { code: 'EMP-019', fn: 'Usman', ln: 'Danladi', dept: 'Warehousing & Supply Chain', pos: 'Procurement Specialist', gross: 550000, rent: 400000, hire: '2023-03-01', bank: 'Zenith Bank', num: '2334567892' },
    { code: 'EMP-020', fn: 'Ifeoma', ln: 'Umeh', dept: 'Software & Infrastructure', pos: 'Frontend React Engineer', gross: 800000, rent: 600000, hire: '2023-04-15', bank: 'Stanbic IBTC Bank', num: '0034567892' },
    { code: 'EMP-021', fn: 'Sunday', ln: 'Ogundipe', dept: 'Logistics & Fleet Operations', pos: 'Safety & Telematics Officer', gross: 450000, rent: 300000, hire: '2023-05-01', bank: 'Access Bank', num: '0734567890' },
    { code: 'EMP-022', fn: 'Hauwa', ln: 'Aliyu', dept: 'Client Success & Commercial', pos: 'Key Account Executive', gross: 500000, rent: 350000, hire: '2023-06-01', bank: 'United Bank for Africa', num: '2256789014' },
    { code: 'EMP-023', fn: 'Oluwaseun', ln: 'Ajayi', dept: 'Software & Infrastructure', pos: 'Database Administrator', gross: 900000, rent: 650000, hire: '2023-07-01', bank: 'Guaranty Trust Bank', num: '0567891234' },
    { code: 'EMP-024', fn: 'Abubakar', ln: 'Sadiq', dept: 'Logistics & Fleet Operations', pos: 'Haulage Maintenance Lead', gross: 480000, rent: 320000, hire: '2023-08-15', bank: 'Zenith Bank', num: '2434567893' },
    { code: 'EMP-025', fn: 'Folashade', ln: 'Ogunlesi', dept: 'Legal, Risk & Compliance', pos: 'Regulatory Compliance Officer', gross: 600000, rent: 450000, hire: '2023-09-01', bank: 'First Bank of Nigeria', num: '3323456781' },
    { code: 'EMP-026', fn: 'Nura', ln: 'Katsina', dept: 'Warehousing & Supply Chain', pos: 'Distribution Hub Supervisor', gross: 380000, rent: 260000, hire: '2023-10-01', bank: 'Access Bank', num: '0745678901' },
    { code: 'EMP-027', fn: 'Tochukwu', ln: 'Obiora', dept: 'Client Success & Commercial', pos: 'CRM Support Specialist', gross: 350000, rent: 240000, hire: '2023-11-01', bank: 'Sterling Bank', num: '0089012345' },
    { code: 'EMP-028', fn: 'Omowunmi', ln: 'Badmus', dept: 'Finance & Accounts', pos: 'Internal Audit Associate', gross: 520000, rent: 380000, hire: '2023-12-01', bank: 'Guaranty Trust Bank', num: '0678912345' },
    // 2024 Hires
    { code: 'EMP-029', fn: 'Chinedu', ln: 'Nwosu', dept: 'Software & Infrastructure', pos: 'Full-Stack Developer', gross: 750000, rent: 550000, hire: '2024-01-10', bank: 'Providus Bank', num: '5412345678' },
    { code: 'EMP-030', fn: 'Maryam', ln: 'Shehu', dept: 'Human Resources & Admin', pos: 'Employee Relations Lead', gross: 580000, rent: 420000, hire: '2024-02-01', bank: 'Zenith Bank', num: '2534567894' },
    { code: 'EMP-031', fn: 'Gideon', ln: 'Ekanem', dept: 'Logistics & Fleet Operations', pos: 'Freight Operations Lead', gross: 520000, rent: 360000, hire: '2024-03-01', bank: 'United Bank for Africa', num: '2356789015' },
    { code: 'EMP-032', fn: 'Rukayat', ln: 'Lawal', dept: 'Warehousing & Supply Chain', pos: 'Cold-Chain Warehouse Lead', gross: 450000, rent: 300000, hire: '2024-04-15', bank: 'First Bank of Nigeria', num: '3423456782' },
    { code: 'EMP-033', fn: 'Rotimi', ln: 'Adebayo', dept: 'Software & Infrastructure', pos: 'QA & Test Engineer', gross: 600000, rent: 450000, hire: '2024-05-01', bank: 'Access Bank', num: '0756789012' },
    { code: 'EMP-034', fn: 'Patience', ln: 'Okafor', dept: 'Client Success & Commercial', pos: 'Enterprise Relationship Manager', gross: 650000, rent: 480000, hire: '2024-06-01', bank: 'Guaranty Trust Bank', num: '0789123456' },
    { code: 'EMP-035', fn: 'Victor', ln: 'Osawe', dept: 'Finance & Accounts', pos: 'Financial Analyst', gross: 550000, rent: 390000, hire: '2024-07-01', bank: 'Zenith Bank', num: '2634567895' },
    { code: 'EMP-036', fn: 'Salisu', ln: 'Musa', dept: 'Logistics & Fleet Operations', pos: 'Heavy Truck Fleet Coordinator', gross: 320000, rent: 200000, hire: '2024-08-01', bank: 'First Bank of Nigeria', num: '3523456783' },
    { code: 'EMP-037', fn: 'Anuoluwapo', ln: 'Adeleke', dept: 'Client Success & Commercial', pos: 'Client Onboarding Associate', gross: 300000, rent: 200000, hire: '2024-09-15', bank: 'Stanbic IBTC Bank', num: '0045678903' },
    { code: 'EMP-038', fn: 'Emmanuel', ln: 'Bassey', dept: 'Warehousing & Supply Chain', pos: 'Fulfillment Dispatch Officer', gross: 260000, rent: 180000, hire: '2024-10-01', bank: 'Access Bank', num: '0767890123' },
    { code: 'EMP-039', fn: 'Halima', ln: 'Abba', dept: 'Human Resources & Admin', pos: 'Payroll Benefits Assistant', gross: 320000, rent: 220000, hire: '2024-11-01', bank: 'United Bank for Africa', num: '2456789016' },
    { code: 'EMP-040', fn: 'Kunle', ln: 'Adekunle', dept: 'Software & Infrastructure', pos: 'Mobile Flutter Specialist', gross: 720000, rent: 500000, hire: '2024-12-01', bank: 'Guaranty Trust Bank', num: '0891234567' },
    // 2025 Hires
    { code: 'EMP-041', fn: 'Amarachi', ln: 'Kalu', dept: 'Finance & Accounts', pos: 'Billing & Invoicing Specialist', gross: 380000, rent: 250000, hire: '2025-01-10', bank: 'Zenith Bank', num: '2734567896' },
    { code: 'EMP-042', fn: 'Taofeeq', ln: 'Gbadamosi', dept: 'Logistics & Fleet Operations', pos: 'Driver Operations Manager', gross: 420000, rent: 280000, hire: '2025-02-01', bank: 'First Bank of Nigeria', num: '3623456784' },
    { code: 'EMP-043', fn: 'Eunice', ln: 'Ebong', dept: 'Legal, Risk & Compliance', pos: 'Legal Associate', gross: 450000, rent: 300000, hire: '2025-03-15', bank: 'Access Bank', num: '0778901234' },
    { code: 'EMP-044', fn: 'Bamidele', ln: 'Sowore', dept: 'Warehousing & Supply Chain', pos: 'Stock Control Specialist', gross: 280000, rent: 180000, hire: '2025-05-01', bank: 'Providus Bank', num: '5423456789' },
    { code: 'EMP-045', fn: 'Rashida', ln: 'Umar', dept: 'Client Success & Commercial', pos: 'Customer Retention Lead', gross: 400000, rent: 270000, hire: '2025-07-01', bank: 'Guaranty Trust Bank', num: '0912345678' },
    { code: 'EMP-046', fn: 'Godwin', ln: 'Effiong', dept: 'Software & Infrastructure', pos: 'Cybersecurity Associate', gross: 650000, rent: 450000, hire: '2025-09-01', bank: 'Zenith Bank', num: '2834567897' },
    { code: 'EMP-047', fn: 'Titilope', ln: 'Sobowale', dept: 'Human Resources & Admin', pos: 'People Operations Coordinator', gross: 340000, rent: 220000, hire: '2025-11-01', bank: 'Stanbic IBTC Bank', num: '0056789014' },
    // 2026 Hires
    { code: 'EMP-048', fn: 'Faisal', ln: 'Haruna', dept: 'Logistics & Fleet Operations', pos: 'Fleet Safety Inspector', gross: 300000, rent: 200000, hire: '2026-01-15', bank: 'Access Bank', num: '0789012345' },
    { code: 'EMP-049', fn: 'Somtochukwu', ln: 'Okeke', dept: 'Finance & Accounts', pos: 'Junior Tax Associate', gross: 250000, rent: 160000, hire: '2026-02-01', bank: 'United Bank for Africa', num: '2556789017' },
    { code: 'EMP-050', fn: 'Bukola', ln: 'Akintola', dept: 'Client Success & Commercial', pos: 'Sales Associate', gross: 240000, rent: 150000, hire: '2026-03-01', bank: 'First Bank of Nigeria', num: '3723456785' },
    { code: 'EMP-051', fn: 'Musa', ln: 'Gidado', dept: 'Warehousing & Supply Chain', pos: 'Loading Operations Officer', gross: 200000, rent: 120000, hire: '2026-05-01', bank: 'Sterling Bank', num: '0090123456' },
    { code: 'EMP-052', fn: 'Grace', ln: 'Udoh', dept: 'Software & Infrastructure', pos: 'Junior Frontend Developer', gross: 400000, rent: 250000, hire: '2026-07-01', bank: 'Guaranty Trust Bank', num: '0198765432' },
  ];

  const pfas = ['Stanbic IBTC Pension Managers', 'ARM Pension Managers', 'Leadway Pensure PFA', 'Premium Pension Limited'];
  const employeeRecords = staffTemplates.map((t, idx) => {
    // Generate realistic IDs
    const empId = (idx === 0) ? 'emp-203d8882-51af-49b9-8858-ca01c43c846e'
      : (idx === 1) ? 'emp-a6704d1f-4677-4f0b-b0ec-596c25846bc6'
      : `emp-apex-5yr-${String(idx + 1).padStart(3, '0')}`;
    
    return {
      id: empId,
      company_id: COMPANY_ID,
      code: t.code,
      first_name: t.fn,
      last_name: t.ln,
      department: t.dept,
      position: t.pos,
      email: `${t.fn.toLowerCase()}.${t.ln.toLowerCase().replace(/[^a-z]/g, '')}@apexsynergy.ng`,
      phone: `+234 80${(10000000 + idx * 137357).toString().slice(0, 8)}`,
      monthly_gross: t.gross,
      annual_rent: t.rent,
      annual_rents: { '2022': t.rent * 0.8, '2023': t.rent * 0.85, '2024': t.rent * 0.9, '2025': t.rent * 0.95, '2026': t.rent },
      bank_name: t.bank,
      account_number: t.num,
      has_pension: true,
      has_paye: true,
      paye_number: `TIN-234${String(100000 + idx * 791).padStart(6, '0')}`,
      pension_number: `PEN100${String(345000 + idx * 439).padStart(6, '0')}`,
      pfa_name: pfas[idx % pfas.length],
      status: 'Active',
      employment_type: 'Full-Time',
      state_of_residence: 'Lagos',
      work_schedule: '5-day',
      start_date: t.hire,
      original_hire_date: t.hire,
      updated_at: new Date().toISOString()
    };
  });

  const { error: empErr } = await client.from('employees').upsert(employeeRecords);
  if (empErr) {
    console.error('Error upserting employees:', empErr);
    return;
  }
  console.log(`✅ Upserted ${employeeRecords.length} Employees successfully!`);

  // 4. Generate 59 Months of Payroll Snapshots (Jan 2022 to Nov 2026)
  console.log('Step 4: Generating 59 Monthly Snapshots (2022 to 2026) with Exact Nigerian Statutory Totals...');
  const months = [
    { key: 'jan', label: 'January' },
    { key: 'feb', label: 'February' },
    { key: 'mar', label: 'March' },
    { key: 'apr', label: 'April' },
    { key: 'may', label: 'May' },
    { key: 'jun', label: 'June' },
    { key: 'jul', label: 'July' },
    { key: 'aug', label: 'August' },
    { key: 'sep', label: 'September' },
    { key: 'oct', label: 'October' },
    { key: 'nov', label: 'November' },
    { key: 'dec', label: 'December' },
  ];

  const snapshots = [];
  const startYear = 2022;
  const endYear = 2026;

  for (let year = startYear; year <= endYear; year++) {
    for (let mIdx = 0; mIdx < 12; mIdx++) {
      // Nov 2026 is current month (mIdx = 10); skip Dec 2026
      if (year === 2026 && mIdx > 10) continue;

      const m = months[mIdx];
      const monthKey = m.key;
      const monthLabel = m.label;
      const periodKey = `${year}-${monthKey}`;
      const periodDate = new Date(year, mIdx, 25);
      const isLocked = !(year === 2026 && mIdx === 10); // Nov 2026 is active period, others locked

      // Find staff hired on or before this period
      const activeStaff = employeeRecords.filter(emp => {
        const hireDate = new Date(emp.start_date);
        return hireDate <= new Date(year, mIdx + 1, 0); // Active if hired by end of month
      });

      let totalGross = 0;
      let totalNet = 0;
      let totalPaye = 0;
      let totalEmpPension = 0;
      let totalCompPension = 0;
      let totalEmployerCost = 0;

      const items = activeStaff.map(emp => {
        // Calculate historical salary: allow a 5% raise per year past hire
        const hireYear = parseInt(emp.start_date.slice(0, 4), 10);
        const yearsTenure = Math.max(0, year - hireYear);
        const tenureFactor = 1 + (yearsTenure * 0.05);
        const monthlyGross = Math.round(emp.monthly_gross * tenureFactor);
        const annualRent = Math.round(emp.annual_rent * tenureFactor);

        const calc = calculatePayroll(monthlyGross, emp.has_pension, emp.has_paye, annualRent);

        totalGross += calc.monthlyGross;
        totalNet += calc.netTakeHome;
        totalPaye += calc.monthlyPaye;
        totalEmpPension += calc.employeePension;
        totalCompPension += calc.employerPension;
        totalEmployerCost += calc.employerTotalCost;

        return {
          employeeId: emp.id,
          employeeCode: emp.code,
          fullName: `${emp.first_name} ${emp.last_name}`,
          department: emp.department,
          position: emp.position,
          bankName: emp.bank_name,
          accountNumber: emp.account_number,
          payeNumber: emp.paye_number,
          pensionNumber: emp.pension_number,
          pfaName: emp.pfa_name,
          monthlyGross: calc.monthlyGross,
          basic: calc.basic,
          housing: calc.housing,
          transport: calc.transport,
          otherAllowances: calc.otherAllowances,
          pensionableBHT: calc.pensionableBHT,
          employeePension: calc.employeePension,
          employerPension: calc.employerPension,
          annualGross: calc.annualGross,
          rentRelief: calc.rentRelief,
          pensionRelief: calc.pensionRelief,
          extraReliefs: 0,
          totalCra: calc.totalCra,
          taxableIncome: calc.taxableIncome,
          annualTax: calc.annualTax,
          monthlyPaye: calc.monthlyPaye,
          totalDeductions: calc.totalDeductions,
          netTakeHome: calc.netTakeHome,
          employerTotalCost: calc.employerTotalCost,
          hasPension: true,
          hasPaye: true,
          employmentType: 'Full-Time',
          contractualGross: calc.monthlyGross,
          effectiveGross: calc.monthlyGross,
          workSchedule: '5-day'
        };
      });

      snapshots.push({
        id: `snap-${periodKey}`,
        company_id: COMPANY_ID,
        month_key: monthKey,
        month_label: monthLabel,
        year: year,
        version: 1,
        is_locked: isLocked,
        finalized_at: periodDate.toISOString(),
        finalized_by: 'Babatunde Balogun (CFO)',
        notes: `Statutory payroll execution finalized for ${monthLabel} ${year}. All PITA Sixth Schedule CRA and Pension Reform Act 2014 deductions reconciled.`,
        items: items,
        totals: {
          totalGross: Math.round(totalGross),
          totalNet: Math.round(totalNet),
          totalPaye: Math.round(totalPaye),
          totalEmpPension: Math.round(totalEmpPension),
          totalCompPension: Math.round(totalCompPension),
          totalEmployerCost: Math.round(totalEmployerCost),
          staffCount: activeStaff.length,
          totalLoansDeducted: 0,
          totalContributionsDeducted: 0,
          totalAbsenceDeducted: 0,
        },
        created_at: periodDate.toISOString()
      });
    }
  }

  // Batch insert snapshots in chunks of 10 to avoid payload size limits
  console.log(`Pushing ${snapshots.length} monthly snapshots in batches...`);
  for (let i = 0; i < snapshots.length; i += 10) {
    const chunk = snapshots.slice(i, i + 10);
    const { error: snapErr } = await client.from('payroll_snapshots').upsert(chunk);
    if (snapErr) console.error(`Error upserting snapshot batch ${i}:`, snapErr);
    else console.log(`  Saved snapshots ${i + 1} to ${Math.min(i + 10, snapshots.length)}`);
  }

  // 5. Populate Multi-Year Employee Loans
  console.log('Step 5: Populating 14 Multi-Year Employee Loans across 2022-2026...');
  const loans = [
    // Completed loans
    { id: 'loan-2022-01', empIdx: 2, type: 'Staff Loan', p: 1200000, m: 100000, start: '2022-mar', status: 'Paid', disbursed: '2022-03-01' },
    { id: 'loan-2022-02', empIdx: 6, type: 'Salary Advance', p: 300000, m: 50000, start: '2022-jun', status: 'Paid', disbursed: '2022-06-01' },
    { id: 'loan-2023-01', empIdx: 11, type: 'Staff Loan', p: 900000, m: 75000, start: '2023-feb', status: 'Paid', disbursed: '2023-02-01' },
    { id: 'loan-2023-02', empIdx: 14, type: 'Staff Loan', p: 1500000, m: 125000, start: '2023-may', status: 'Paid', disbursed: '2023-05-01' },
    { id: 'loan-2024-01', empIdx: 4, type: 'Salary Advance', p: 500000, m: 100000, start: '2024-jan', status: 'Paid', disbursed: '2024-01-01' },
    { id: 'loan-2024-02', empIdx: 18, type: 'Staff Loan', p: 1000000, m: 83333, start: '2024-mar', status: 'Paid', disbursed: '2024-03-01' },
    { id: 'loan-2024-03', empIdx: 20, type: 'Staff Loan', p: 600000, m: 50000, start: '2024-aug', status: 'Paid', disbursed: '2024-08-01' },
    // Active loans
    { id: 'loan-2025-01', empIdx: 7, type: 'Staff Loan', p: 2400000, m: 100000, start: '2025-jan', status: 'Active', disbursed: '2025-01-01', repaid: 2200000, rem: 200000 },
    { id: 'loan-2025-02', empIdx: 13, type: 'Staff Loan', p: 1800000, m: 75000, start: '2025-apr', status: 'Active', disbursed: '2025-04-01', repaid: 1425000, rem: 375000 },
    { id: 'loan-2025-03', empIdx: 22, type: 'Staff Loan', p: 1200000, m: 50000, start: '2025-jul', status: 'Active', disbursed: '2025-07-01', repaid: 800000, rem: 400000 },
    { id: 'loan-2026-01', empIdx: 3, type: 'Staff Loan', p: 2000000, m: 100000, start: '2026-feb', status: 'Active', disbursed: '2026-02-01', repaid: 900000, rem: 1100000 },
    { id: 'loan-2026-02', empIdx: 28, type: 'Salary Advance', p: 400000, m: 80000, start: '2026-sep', status: 'Active', disbursed: '2026-09-01', repaid: 160000, rem: 240000 },
    // Paused loans
    { id: 'loan-2025-pause-01', empIdx: 9, type: 'Staff Loan', p: 1500000, m: 62500, start: '2025-mar', status: 'Paused', disbursed: '2025-03-01', repaid: 500000, rem: 1000000 },
    { id: 'loan-2026-pause-02', empIdx: 31, type: 'Staff Loan', p: 800000, m: 40000, start: '2026-apr', status: 'Paused', disbursed: '2026-04-01', repaid: 160000, rem: 640000 },
  ];

  const loanRecords = loans.map(l => {
    const emp = employeeRecords[l.empIdx];
    const isPaid = l.status === 'Paid';
    return {
      id: l.id,
      company_id: COMPANY_ID,
      employee_id: emp.id,
      type: l.type,
      principal_amount: l.p,
      monthly_deduction: l.m,
      total_repaid: isPaid ? l.p : (l.repaid || 0),
      remaining_balance: isPaid ? 0 : (l.rem !== undefined ? l.rem : l.p - (l.repaid || 0)),
      start_period_key: l.start,
      status: l.status,
      disbursement_date: l.disbursed,
      repayment_start_date: l.disbursed,
      notes: `${l.type} approved by Board & CFO. Amortized deduction rate ₦${l.m.toLocaleString()}/mo.`,
      description: `${l.type} - Staff Support Facility`,
      history: [
        { date: l.disbursed, action: 'disbursed', amount: l.p, notes: 'Principal funds transferred to staff NUBAN account.' },
        { date: '2026-11-01', action: 'audit_check', amount: 0, notes: 'Annual audit reconciliation verified.' }
      ],
      updated_at: new Date().toISOString()
    };
  });

  const { error: loanErr } = await client.from('employee_loans').upsert(loanRecords);
  if (loanErr) console.error('Error upserting loans:', loanErr);
  else console.log(`✅ Upserted ${loanRecords.length} Employee Loans successfully!`);

  // 6. Populate Employee Voluntary Contributions (Welfare Fund)
  console.log('Step 6: Populating Employee Contributions across 2022-2026...');
  const contributions = [];
  // For 20 staff who contribute monthly
  for (let year = 2022; year <= 2026; year++) {
    for (let mIdx = 0; mIdx < 12; mIdx++) {
      if (year === 2026 && mIdx > 10) continue;
      const periodKey = `${year}-${months[mIdx].key}`;
      const periodDate = new Date(Date.UTC(year, mIdx, 25)).toISOString();

      // 15 staff contribute to Staff Cooperative Society (₦25,000)
      for (let sIdx = 0; sIdx < 15; sIdx++) {
        const emp = employeeRecords[sIdx];
        if (new Date(emp.start_date) <= new Date(year, mIdx + 1, 0)) {
          contributions.push({
            id: `contrib-coop-${periodKey}-${emp.code}`,
            company_id: COMPANY_ID,
            employee_id: emp.id,
            period_key: periodKey,
            scheme_name: 'Staff Cooperative Society',
            amount: 25000,
            is_percentage: false,
            rate: 0,
            notes: 'Monthly voluntary cooperative thrift savings',
            created_at: periodDate,
            updated_at: periodDate
          });
        }
      }

      // 10 staff contribute to Welfare Fund (5% of Net / Fixed ₦10,000)
      for (let sIdx = 10; sIdx < 20; sIdx++) {
        const emp = employeeRecords[sIdx];
        if (new Date(emp.start_date) <= new Date(year, mIdx + 1, 0)) {
          contributions.push({
            id: `contrib-welfare-${periodKey}-${emp.code}`,
            company_id: COMPANY_ID,
            employee_id: emp.id,
            period_key: periodKey,
            scheme_name: 'Internal Welfare Fund',
            amount: 10000,
            is_percentage: false,
            rate: 0,
            notes: 'Monthly mutual welfare contribution',
            created_at: periodDate,
            updated_at: periodDate
          });
        }
      }
    }
  }

  console.log(`Inserting ${contributions.length} voluntary contribution records in chunks...`);
  for (let i = 0; i < contributions.length; i += 250) {
    const chunk = contributions.slice(i, i + 250);
    const { error: cErr } = await client.from('employee_contributions').upsert(chunk);
    if (cErr) console.error(`Error upserting contributions chunk ${i}:`, cErr);
  }
  console.log(`✅ Upserted ${contributions.length} Contribution records successfully!`);

  // 7. Populate Contribution Payouts (Disbursements)
  console.log('Step 7: Populating 10 Savings Payouts / Disbursements...');
  const payouts = [
    { id: 'payout-2023-01', empIdx: 0, amount: 300000, date: '2023-12-28', reason: 'annual_payout', ref: 'CBN-DISB-2023-01' },
    { id: 'payout-2023-02', empIdx: 2, amount: 300000, date: '2023-12-28', reason: 'annual_payout', ref: 'CBN-DISB-2023-02' },
    { id: 'payout-2024-01', empIdx: 1, amount: 300000, date: '2024-12-28', reason: 'annual_payout', ref: 'CBN-DISB-2024-01' },
    { id: 'payout-2024-02', empIdx: 4, amount: 200000, date: '2024-06-20', reason: 'partial_withdrawal', ref: 'CBN-DISB-2024-02' },
    { id: 'payout-2024-03', empIdx: 6, amount: 300000, date: '2024-12-28', reason: 'annual_payout', ref: 'CBN-DISB-2024-03' },
    { id: 'payout-2025-01', empIdx: 0, amount: 300000, date: '2025-12-28', reason: 'annual_payout', ref: 'CBN-DISB-2025-01' },
    { id: 'payout-2025-02', empIdx: 3, amount: 300000, date: '2025-12-28', reason: 'annual_payout', ref: 'CBN-DISB-2025-02' },
    { id: 'payout-2025-03', empIdx: 8, amount: 150000, date: '2025-08-14', reason: 'partial_withdrawal', ref: 'CBN-DISB-2025-03' },
    { id: 'payout-2026-01', empIdx: 5, amount: 250000, date: '2026-06-30', reason: 'partial_withdrawal', ref: 'CBN-DISB-2026-01' },
    { id: 'payout-2026-02', empIdx: 11, amount: 200000, date: '2026-09-15', reason: 'partial_withdrawal', ref: 'CBN-DISB-2026-02' },
  ];

  const payoutRecords = payouts.map(p => ({
    id: p.id,
    company_id: COMPANY_ID,
    employee_id: employeeRecords[p.empIdx].id,
    scheme_name: 'Staff Cooperative Society',
    amount: p.amount,
    payout_date: p.date,
    reason: p.reason,
    payment_method: 'bank_transfer',
    reference_no: p.ref,
    notes: 'Approved cooperative thrift distribution transferred via NIBSS Instant Payment.',
    created_at: new Date(`${p.date}T10:00:00Z`).toISOString(),
    updated_at: new Date(`${p.date}T10:00:00Z`).toISOString()
  }));

  const { error: pErr } = await client.from('contribution_payouts').upsert(payoutRecords);
  if (pErr) console.error('Error upserting payouts:', pErr);
  else console.log(`✅ Upserted ${payoutRecords.length} Contribution Payouts successfully!`);

  // 8. Populate Employee Absences
  console.log('Step 8: Populating 30 Historical Employee Absences...');
  const absences = [];
  const absenceYears = [2022, 2023, 2024, 2025, 2026];
  let absCounter = 1;

  for (const yr of absenceYears) {
    for (let i = 0; i < 6; i++) {
      const empIdx = 10 + ((i * 3 + yr) % 35);
      const emp = employeeRecords[empIdx];
      const mIdx = (i * 2) % 11;
      const periodKey = `${yr}-${months[mIdx].key}`;
      const days = (i % 2 === 0) ? 1 : 2;
      const dailyRate = Math.round(emp.monthly_gross / 21);
      const deduction = dailyRate * days;

      absences.push({
        id: `abs-${yr}-${String(absCounter++).padStart(3, '0')}`,
        company_id: COMPANY_ID,
        employee_id: emp.id,
        period_key: periodKey,
        days_absent: days,
        absence_type: (i % 3 === 0) ? 'unauthorized_absence' : 'unpaid_leave',
        deduction_amount: deduction,
        custom_override: false,
        notes: `Unpaid leave (${days} day${days > 1 ? 's' : ''}) in ${months[mIdx].label} ${yr}. Section 5 Labour Act pro-rata adjustment.`,
        updated_at: new Date().toISOString()
      });
    }
  }

  const { error: aErr } = await client.from('employee_absences').upsert(absences);
  if (aErr) console.error('Error upserting absences:', aErr);
  else console.log(`✅ Upserted ${absences.length} Employee Absences successfully!`);

  // 9. Populate Audit Logs (spanning 2022-2026)
  console.log('Step 9: Populating 120 Historical Audit Logs across 2022-2026...');
  const auditLogs = [];
  let logCounter = 1;

  for (let yr = 2022; yr <= 2026; yr++) {
    for (let mIdx = 0; mIdx < 12; mIdx++) {
      if (yr === 2026 && mIdx > 10) continue;
      const mLabel = months[mIdx].label;
      const logDate = new Date(yr, mIdx, 26, 14, 30).toISOString();

      auditLogs.push({
        id: crypto.randomUUID(),
        company_id: COMPANY_ID,
        company_name: 'Apex Synergy Logistics Ltd (2122)',
        actor_id: 'usr-admin-babatunde',
        actor_name: 'Babatunde Balogun (CFO)',
        action: 'PAYROLL_SNAPSHOT_LOCKED',
        details: `Finalized and locked official statutory payroll for ${mLabel} ${yr}. All PITA, Pension, and Loan amortization schedules sealed.`,
        ip_or_device: '102.89.44.12 (macOS / Chrome Desktop)',
        created_at: logDate
      });

      if (mIdx % 3 === 0) {
        auditLogs.push({
          id: crypto.randomUUID(),
          company_id: COMPANY_ID,
          company_name: 'Apex Synergy Logistics Ltd (2122)',
          actor_id: 'usr-admin-amina',
          actor_name: 'Amina Yusuf (HR Lead)',
          action: 'EMPLOYEE_SALARY_ADJUSTMENT',
          details: `Processed quarterly performance grade adjustments and statutory allowances for Q${Math.floor(mIdx / 3) + 1} ${yr}.`,
          ip_or_device: '102.89.45.88 (Windows 11 / Edge)',
          created_at: new Date(yr, mIdx, 5, 10, 15).toISOString()
        });
      }
    }
  }

  console.log(`Pushing ${auditLogs.length} audit logs in batches...`);
  for (let i = 0; i < auditLogs.length; i += 50) {
    const chunk = auditLogs.slice(i, i + 50);
    const { error: logErr } = await client.from('audit_logs').upsert(chunk);
    if (logErr) console.error(`Error upserting audit log batch ${i}:`, logErr);
  }
  console.log(`✅ Upserted ${auditLogs.length} Audit Logs successfully!`);

  console.log('\n🎉 ALL 5-YEAR SIMULATION DATA SUCCESSFULLY SEEDED INTO SUPABASE!');
  console.log('Company: Apex Synergy Logistics Ltd (2122) (ID: ' + COMPANY_ID + ')');
  console.log('Time Range: January 2022 to November 2026 (59 locked/active snapshots)');
  console.log('Employees: 52 Active Nigerian professionals across 8 Departments');
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
