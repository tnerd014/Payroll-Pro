-- ==============================================================================
-- PAYROLL PRO: COMPLETE PRODUCTION DATABASE SCHEMA & REAL-TIME SETUP
-- Compatible with PostgreSQL 14+ / Supabase
-- Fully Idempotent (Safe to run multiple times without data loss)
-- ==============================================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. RELATIONAL TABLES
-- ==============================================================================

-- 1.1 COMPANIES TABLE
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
    email_settings JSONB DEFAULT '{}'::jsonb,
    emailed_payslips JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- 1.3 EMPLOYEES TABLE
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
    start_date TEXT DEFAULT '',
    end_date TEXT DEFAULT '',
    original_hire_date TEXT DEFAULT '',
    stints JSONB DEFAULT '[]'::jsonb,
    monthly_salaries JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 PAYROLL VARIABLES TABLE (Statutory splits, pension rates)
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
    prorate_mid_month BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 PAYE TAX VARIABLES TABLE (Tax Brackets, Reliefs, PITA 2011)
CREATE TABLE IF NOT EXISTS public.paye_tax_variables (
    company_id TEXT PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    cra_base NUMERIC(15, 2) DEFAULT 800000,
    rent_relief_rate NUMERIC(5, 2) DEFAULT 0.20,
    rent_relief_cap NUMERIC(15, 2) DEFAULT 500000,
    tax_brackets JSONB DEFAULT '[]'::jsonb,
    extra_conditions JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 EMPLOYEE LOANS & SALARY ADVANCES TABLE
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

-- 1.7 PAYROLL SNAPSHOTS TABLE (Locked historical payroll runs)
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

-- 1.8 PAYSLIP DESIGN & PRESETS
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

-- 1.9 TEAM MEMBERS TABLE (Authorized staff profiles, secure login & recovery)
CREATE TABLE IF NOT EXISTS public.team_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    username TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'Payroll Officer', -- 'Admin', 'Payroll Officer', 'Auditor'
    pin TEXT DEFAULT '1234',
    password TEXT DEFAULT '',
    password_hint TEXT DEFAULT '',
    security_question TEXT DEFAULT '',
    security_answer TEXT DEFAULT '',
    recovery_email TEXT DEFAULT '',
    temp_password TEXT DEFAULT '',
    must_change_password BOOLEAN DEFAULT FALSE,
    phone TEXT DEFAULT '',
    avatar_color TEXT DEFAULT '',
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT DEFAULT '',
    biometric_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.10 AUDIT LOGS TABLE (Automated change tracking)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT DEFAULT '',
    company_name TEXT DEFAULT '',
    actor_id TEXT DEFAULT '',
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT DEFAULT '',
    ip_or_device TEXT DEFAULT 'Desktop Workspace',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. SCHEMA SELF-HEALING (Ensure all columns exist if tables pre-date updates)
-- ==============================================================================

-- Companies columns
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT FALSE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS password_hint TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS security_question TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS security_answer TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS emailed_payslips JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Employees columns
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Full-Time';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS state_of_residence TEXT DEFAULT 'Lagos';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS monthly_salaries JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS annual_rent NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS paye_number TEXT DEFAULT '';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pension_number TEXT DEFAULT '';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pfa_name TEXT DEFAULT '';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS start_date TEXT DEFAULT '';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS end_date TEXT DEFAULT '';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS original_hire_date TEXT DEFAULT '';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS stints JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Payroll Variables columns
ALTER TABLE public.payroll_variables ADD COLUMN IF NOT EXISTS salary_calculation_mode TEXT DEFAULT 'gross-to-net';
ALTER TABLE public.payroll_variables ADD COLUMN IF NOT EXISTS employment_type_rules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.payroll_variables ADD COLUMN IF NOT EXISTS prorate_mid_month BOOLEAN DEFAULT FALSE;
ALTER TABLE public.payroll_variables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- PAYE Variables columns
ALTER TABLE public.paye_tax_variables ADD COLUMN IF NOT EXISTS rent_relief_rate NUMERIC(5, 2) DEFAULT 0.20;
ALTER TABLE public.paye_tax_variables ADD COLUMN IF NOT EXISTS rent_relief_cap NUMERIC(15, 2) DEFAULT 500000;
ALTER TABLE public.paye_tax_variables ADD COLUMN IF NOT EXISTS extra_conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.paye_tax_variables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Employee Loans columns
ALTER TABLE public.employee_loans ADD COLUMN IF NOT EXISTS repayment_start_date TEXT DEFAULT '';
ALTER TABLE public.employee_loans ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.employee_loans ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.employee_loans ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.employee_loans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Snapshots columns
ALTER TABLE public.payroll_snapshots ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE public.payroll_snapshots ADD COLUMN IF NOT EXISTS totals JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.payroll_snapshots ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.payroll_snapshots ADD COLUMN IF NOT EXISTS finalized_by TEXT DEFAULT 'Administrator';

-- Team Members columns
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS username TEXT DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Payroll Officer';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT '1234';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS password_hint TEXT DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS security_question TEXT DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS security_answer TEXT DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS recovery_email TEXT DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS temp_password TEXT DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS two_factor_secret TEXT DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Audit Logs columns
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_or_device TEXT DEFAULT 'Desktop Workspace';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT '';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT '';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id TEXT DEFAULT '';

-- ==============================================================================
-- 3. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    DROP TRIGGER IF EXISTS trg_companies_updated_at ON public.companies;
    CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

    DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
    CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

    DROP TRIGGER IF EXISTS trg_payroll_variables_updated_at ON public.payroll_variables;
    CREATE TRIGGER trg_payroll_variables_updated_at BEFORE UPDATE ON public.payroll_variables
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

    DROP TRIGGER IF EXISTS trg_paye_tax_variables_updated_at ON public.paye_tax_variables;
    CREATE TRIGGER trg_paye_tax_variables_updated_at BEFORE UPDATE ON public.paye_tax_variables
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

    DROP TRIGGER IF EXISTS trg_employee_loans_updated_at ON public.employee_loans;
    CREATE TRIGGER trg_employee_loans_updated_at BEFORE UPDATE ON public.employee_loans
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

    DROP TRIGGER IF EXISTS trg_team_members_updated_at ON public.team_members;
    CREATE TRIGGER trg_team_members_updated_at BEFORE UPDATE ON public.team_members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
END $$;

-- ==============================================================================
-- 4. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_company ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(company_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(company_id, code);
CREATE INDEX IF NOT EXISTS idx_employees_dates ON public.employees(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_departments_company ON public.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_loans_company_emp ON public.employee_loans(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_company_period ON public.payroll_snapshots(company_id, year, month_key);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON public.audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON public.team_members(is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_username ON public.team_members(username);

-- ==============================================================================
-- 5. ACCESS PRIVILEGES & GRANTS (Ensures Anon & Authenticated Keys Can Query)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) & ACCESS POLICIES
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
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

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

    DROP POLICY IF EXISTS "Anon Access Team Members" ON public.team_members;
    CREATE POLICY "Anon Access Team Members" ON public.team_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Anon Access Audit Logs" ON public.audit_logs;
    CREATE POLICY "Anon Access Audit Logs" ON public.audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- 7. REPLICA IDENTITY FULL (Required for Realtime UPDATE & DELETE Filters)
-- Without FULL replica identity, PostgreSQL does not record non-PK columns
-- during UPDATE/DELETE, which breaks Realtime client filters.
-- ==============================================================================
ALTER TABLE public.companies REPLICA IDENTITY FULL;
ALTER TABLE public.departments REPLICA IDENTITY FULL;
ALTER TABLE public.employees REPLICA IDENTITY FULL;
ALTER TABLE public.payroll_variables REPLICA IDENTITY FULL;
ALTER TABLE public.paye_tax_variables REPLICA IDENTITY FULL;
ALTER TABLE public.employee_loans REPLICA IDENTITY FULL;
ALTER TABLE public.payroll_snapshots REPLICA IDENTITY FULL;
ALTER TABLE public.payslip_designs REPLICA IDENTITY FULL;
ALTER TABLE public.payslip_presets REPLICA IDENTITY FULL;
ALTER TABLE public.team_members REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;

-- ==============================================================================
-- 8. REALTIME BROADCAST REPLICATION (PostgreSQL -> Desktop Clients)
-- Safely adds each table individually to supabase_realtime publication
-- ==============================================================================
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'companies', 
        'departments', 
        'employees', 
        'payroll_variables', 
        'paye_tax_variables', 
        'employee_loans', 
        'payroll_snapshots',
        'payslip_designs',
        'payslip_presets',
        'team_members',
        'audit_logs'
    ];
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Add each table individually (safe if already added)
    FOREACH tbl IN ARRAY tables LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        EXCEPTION
            WHEN duplicate_object THEN
                NULL; -- Already in publication
            WHEN others THEN
                -- Ignore if already present or handled
                NULL;
        END;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
