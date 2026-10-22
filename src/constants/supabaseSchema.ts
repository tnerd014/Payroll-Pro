/**
 * Payroll Pro - Enterprise Supabase PostgreSQL Schema
 * 
 * Paste and run this entire script inside your Supabase project's SQL Editor.
 * This establishes all relational tables, indexes, Row-Level Security (RLS) policies,
 * and Supabase Realtime publication for multi-user live collaboration.
 */

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- PAYROLL PRO: POSTGRESQL RELATIONAL SCHEMA & REALTIME SETUP
-- Compatible with Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subtitle TEXT DEFAULT '',
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    has_password BOOLEAN DEFAULT FALSE,
    password TEXT DEFAULT '',
    password_hint TEXT DEFAULT '',
    security_question TEXT DEFAULT '',
    security_answer TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- 3. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    department TEXT DEFAULT 'GENERAL',
    position TEXT DEFAULT 'STAFF',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    monthly_gross NUMERIC(15, 2) DEFAULT 0,
    annual_rent NUMERIC(15, 2) DEFAULT 0,
    bank_name TEXT DEFAULT '',
    account_number TEXT DEFAULT '',
    has_pension BOOLEAN DEFAULT TRUE,
    has_paye BOOLEAN DEFAULT TRUE,
    paye_number TEXT DEFAULT '',
    pension_number TEXT DEFAULT '',
    pfa_name TEXT DEFAULT '',
    status TEXT DEFAULT 'Active',
    employment_type TEXT DEFAULT 'Full-Time',
    state_of_residence TEXT DEFAULT 'Lagos',
    monthly_salaries JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PAYROLL VARIABLES (Statutory splits, pension rates)
CREATE TABLE IF NOT EXISTS public.payroll_variables (
    company_id TEXT PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    basic NUMERIC(5, 2) DEFAULT 40,
    housing NUMERIC(5, 2) DEFAULT 30,
    transport NUMERIC(5, 2) DEFAULT 20,
    other_allowances NUMERIC(5, 2) DEFAULT 10,
    employee_pension_rate NUMERIC(5, 2) DEFAULT 8,
    employer_pension_rate NUMERIC(5, 2) DEFAULT 10,
    salary_calculation_mode TEXT DEFAULT 'gross-to-net',
    employment_type_rules JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PAYE TAX VARIABLES (Tax Brackets, Reliefs, PITA 2011)
CREATE TABLE IF NOT EXISTS public.paye_tax_variables (
    company_id TEXT PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    cra_base NUMERIC(15, 2) DEFAULT 800000,
    rent_relief_rate NUMERIC(5, 2) DEFAULT 0.20,
    rent_relief_cap NUMERIC(15, 2) DEFAULT 500000,
    tax_brackets JSONB DEFAULT '[]'::jsonb,
    extra_conditions JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EMPLOYEE LOANS & SALARY ADVANCES
CREATE TABLE IF NOT EXISTS public.employee_loans (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'Staff Loan',
    principal_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    monthly_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_repaid NUMERIC(15, 2) NOT NULL DEFAULT 0,
    remaining_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    start_period_key TEXT NOT NULL DEFAULT '2026-jan',
    status TEXT NOT NULL DEFAULT 'Active',
    disbursement_date TEXT DEFAULT '',
    repayment_date TEXT DEFAULT '',
    repayment_start_date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    description TEXT DEFAULT '',
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PAYROLL SNAPSHOTS (Finalized historical periods)
CREATE TABLE IF NOT EXISTS public.payroll_snapshots (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL,
    month_label TEXT NOT NULL,
    year INT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_locked BOOLEAN DEFAULT TRUE,
    finalized_at TIMESTAMPTZ DEFAULT NOW(),
    finalized_by TEXT DEFAULT 'Administrator',
    notes TEXT DEFAULT '',
    items JSONB DEFAULT '[]'::jsonb,
    totals JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PAYSLIP DESIGN & PRESETS
CREATE TABLE IF NOT EXISTS public.payslip_designs (
    company_id TEXT PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payslip_presets (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_company ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(company_id, status);
CREATE INDEX IF NOT EXISTS idx_departments_company ON public.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_loans_company_emp ON public.employee_loans(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_company_period ON public.payroll_snapshots(company_id, year, month_key);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & PUBLIC ANON PERMISSIONS
-- Allows connected instances using the anon public key to read and write records.
-- ==============================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paye_tax_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_presets ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated users full CRUD access
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anon Access Companies" ON public.companies;
    CREATE POLICY "Anon Access Companies" ON public.companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Anon Access Departments" ON public.departments;
    CREATE POLICY "Anon Access Departments" ON public.departments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Anon Access Employees" ON public.employees;
    CREATE POLICY "Anon Access Employees" ON public.employees FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Anon Access Payroll Variables" ON public.payroll_variables;
    CREATE POLICY "Anon Access Payroll Variables" ON public.payroll_variables FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Anon Access Paye Variables" ON public.paye_tax_variables;
    CREATE POLICY "Anon Access Paye Variables" ON public.paye_tax_variables FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Anon Access Employee Loans" ON public.employee_loans;
    CREATE POLICY "Anon Access Employee Loans" ON public.employee_loans FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Anon Access Payroll Snapshots" ON public.payroll_snapshots;
    CREATE POLICY "Anon Access Payroll Snapshots" ON public.payroll_snapshots FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Anon Access Payslip Designs" ON public.payslip_designs;
    CREATE POLICY "Anon Access Payslip Designs" ON public.payslip_designs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Anon Access Payslip Presets" ON public.payslip_presets;
    CREATE POLICY "Anon Access Payslip Presets" ON public.payslip_presets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- SUPABASE REALTIME REPLICATION (For live team synchronization)
-- Broadcasts inserts, updates, and deletes across all connected desktop clients.
-- ==============================================================================
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE 
            public.companies, 
            public.departments, 
            public.employees, 
            public.payroll_variables, 
            public.paye_tax_variables, 
            public.employee_loans, 
            public.payroll_snapshots,
            public.payslip_designs,
            public.payslip_presets;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL; -- Table is already in publication
        WHEN others THEN
            RAISE NOTICE 'Skipping publication adjustment or table already added: %', SQLERRM;
    END;
END $$;
`;
