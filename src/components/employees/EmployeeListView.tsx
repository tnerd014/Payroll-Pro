import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  FileSpreadsheet,
  MoreVertical,
  UserCheck,
  UserX
} from 'lucide-react';
import { Employee, SalaryCalculationMode, EmploymentTypeRule } from '../../types';
import { formatNaira, getEmployeeGrossForPeriod } from '../../engine/payePensionEngine';
import { EmployeeFormModal } from './EmployeeFormModal';
import { TablePagination } from '../common/TablePagination';

interface EmployeeListViewProps {
  employees: Employee[];
  departments?: string[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onAddEmployees?: (emps: Omit<Employee, 'id'>[]) => void;
  onUpdateEmployee: (id: string, updates: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
  onNavigateToExcel: () => void;
  currentYear?: number;
  currentMonth?: string;
  salaryCalculationMode?: SalaryCalculationMode;
  employmentTypeRules?: EmploymentTypeRule[];
  addEmployeeTrigger?: number;
}

export const EmployeeListView: React.FC<EmployeeListViewProps> = ({
  employees,
  departments: configuredDepartments = [],
  onAddEmployee,
  onAddEmployees,
  onUpdateEmployee,
  onDeleteEmployee,
  onNavigateToExcel,
  currentYear,
  currentMonth,
  salaryCalculationMode = 'gross-to-net',
  employmentTypeRules,
  addEmployeeTrigger,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'quick' | 'standard'>('quick');
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [activeMenuEmpId, setActiveMenuEmpId] = useState<string | null>(null);

  const lastAddTriggerRef = React.useRef(addEmployeeTrigger || 0);

  useEffect(() => {
    if (addEmployeeTrigger && addEmployeeTrigger > lastAddTriggerRef.current) {
      lastAddTriggerRef.current = addEmployeeTrigger;
      setEditingEmp(null);
      setModalTab('quick');
      setIsModalOpen(true);
    }
  }, [addEmployeeTrigger]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenuEmpId && !(e.target as Element).closest('.employee-actions-menu')) {
        setActiveMenuEmpId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuEmpId]);

  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees.filter(Boolean) : [], [employees]);
  const departments = ['ALL', ...Array.from(new Set([...configuredDepartments, ...safeEmployees.map(e => e.department)].filter(Boolean)))];
  const employmentTypes = ['ALL', 'Full-Time', 'Part-Time', 'Contract', 'Intern / NYSC'];

  const filteredEmployees = safeEmployees.filter(emp => {
    if (!emp) return false;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (emp.firstName || '').toLowerCase().includes(term) ||
      (emp.lastName || '').toLowerCase().includes(term) ||
      (emp.code || '').toLowerCase().includes(term) ||
      (emp.department || '').toLowerCase().includes(term) ||
      (emp.employmentType || '').toLowerCase().includes(term) ||
      (emp.payeNumber || '').toLowerCase().includes(term) ||
      (emp.pensionNumber || '').toLowerCase().includes(term) ||
      (emp.pfaName || '').toLowerCase().includes(term);
    
    const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
    const matchesType = selectedType === 'ALL' || (emp.employmentType || 'Full-Time') === selectedType;
    return matchesSearch && matchesDept && matchesType;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDept, selectedType]);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  const totalGrossCommitment = employees
    .filter(e => e.status === 'Active')
    .reduce((sum, e) => sum + e.monthlyGross, 0);

  const handleEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmp(null);
  };

  const handleSave = (empData: Omit<Employee, 'id'>) => {
    if (editingEmp) {
      onUpdateEmployee(editingEmp.id, empData);
    } else {
      onAddEmployee(empData);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Employee Directory
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Manage staff profiles, monthly gross remuneration, and statutory deduction flags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel Sync</span>
          </button>
          <button
            onClick={() => { setEditingEmp(null); setModalTab('quick'); setIsModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-none cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Staff</span>
          <p className="text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
            {employees.length}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Active Staff</span>
          <p className="text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
            {employees.filter(e => e.status === 'Active').length}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 col-span-2">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            {salaryCalculationMode === 'net-to-gross' ? 'Monthly Target Net Commitment' : 'Monthly Gross Commitment'}
          </span>
          <p className="text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
            {formatNaira(totalGrossCommitment)}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, code, dept, PAYE ID, or RSA PIN..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer font-medium"
              title="Filter by Employment Type"
            >
              {employmentTypes.map(t => (
                <option key={t} value={t}>{t === 'ALL' ? 'All Employment Types' : t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto min-h-[200px] pb-3">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/70 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">Full Name</th>
                <th className="py-2.5 px-3.5">Department & Role</th>
                <th className="py-2.5 px-3.5 text-right">
                  {salaryCalculationMode === 'net-to-gross' ? 'Target Net Pay' : 'Monthly Gross'}
                </th>
                <th className="py-2.5 px-3.5 text-right">Annual Rent</th>
                <th className="py-2.5 px-3.5">Bank Account</th>
                <th className="py-2.5 px-3.5 text-center">Statutory</th>
                <th className="py-2.5 px-3.5 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-zinc-400 text-xs">
                    No employees found matching the filters.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{emp.firstName} {emp.lastName}</div>
                      <div className="text-[11px] text-zinc-400 truncate max-w-[200px]">{emp.email || 'No email on file'}</div>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-800 dark:text-zinc-200 font-medium text-xs">{emp.department}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-normal">
                          {emp.employmentType || 'Full-Time'}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{emp.position || '—'}</div>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNaira(getEmployeeGrossForPeriod(emp, currentMonth, currentYear))}
                      {emp.monthlySalaries && Object.keys(emp.monthlySalaries).length > 0 && (
                        <span className="block text-[9px] font-sans text-amber-500 dark:text-amber-400 font-normal">
                          Variable schedule
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-xs text-zinc-500 dark:text-zinc-400 text-right">
                      {emp.annualRent > 0 ? formatNaira(emp.annualRent) : '—'}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="text-zinc-800 dark:text-zinc-200 text-xs font-medium">{emp.bankName || '—'}</div>
                      <div className="font-mono text-[11px] text-zinc-400 tracking-wider">{emp.accountNumber || '—'}</div>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono">
                        <span 
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            emp.hasPension 
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' 
                              : 'text-zinc-300 dark:text-zinc-700'
                          }`} 
                          title={`Statutory Pension ${emp.pensionNumber ? `(RSA: ${emp.pensionNumber})` : ''}`}
                        >
                          PEN
                        </span>
                        <span 
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            emp.hasPaye 
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' 
                              : 'text-zinc-300 dark:text-zinc-700'
                          }`} 
                          title={`PAYE Tax ${emp.payeNumber ? `(ID: ${emp.payeNumber})` : ''}`}
                        >
                          TAX
                        </span>
                      </div>
                      {(emp.payeNumber || emp.pensionNumber) && (
                        <div className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5 truncate max-w-[120px] mx-auto text-center" title={`PAYE: ${emp.payeNumber || '-'} | RSA: ${emp.pensionNumber || '-'} ${emp.pfaName ? `(${emp.pfaName})` : ''}`}>
                          {emp.payeNumber ? emp.payeNumber : emp.pensionNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <button
                        onClick={() => onUpdateEmployee(emp.id, { status: emp.status === 'Active' ? 'Inactive' : 'Active' })}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition cursor-pointer ${
                          emp.status === 'Active' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' 
                            : 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-500/20'
                        }`}
                        title="Click to toggle status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        <span>{emp.status}</span>
                      </button>
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <div className="relative inline-block text-left employee-actions-menu">
                        <button
                          type="button"
                          onClick={() => setActiveMenuEmpId(activeMenuEmpId === emp.id ? null : emp.id)}
                          className={`p-1.5 rounded-md transition-colors ${
                            activeMenuEmpId === emp.id
                              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                          title="Actions menu"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuEmpId === emp.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-30 animate-fade-in text-left">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuEmpId(null);
                                handleEdit(emp);
                              }}
                              className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Edit Employee</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuEmpId(null);
                                onUpdateEmployee(emp.id, {
                                  status: emp.status === 'Active' ? 'Inactive' : 'Active'
                                });
                              }}
                              className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            >
                              {emp.status === 'Active' ? (
                                <>
                                  <UserX className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Mark Inactive</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Mark Active</span>
                                </>
                              )}
                            </button>

                            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuEmpId(null);
                                if (confirm(`Are you sure you want to delete ${emp.firstName} ${emp.lastName}?`)) {
                                  onDeleteEmployee(emp.id);
                                }
                              }}
                              className="w-full px-3 py-1.5 flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Employee</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Minimalist Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredEmployees.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="staff"
        />
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <EmployeeFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          onSaveMultiple={onAddEmployees || ((emps) => emps.forEach(onAddEmployee))}
          existingEmployees={employees}
          editingEmployee={editingEmp}
          currentYear={currentYear}
          availableDepartments={configuredDepartments}
          salaryCalculationMode={salaryCalculationMode}
          employmentTypeRules={employmentTypeRules}
          initialTab={modalTab}
        />
      )}
    </div>
  );
};
