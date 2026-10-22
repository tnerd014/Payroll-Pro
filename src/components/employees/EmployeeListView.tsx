import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  X,
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
import { SortableHeader, SortDirection } from '../common/SortableHeader';

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
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
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
    const matchesStatus = selectedStatus === 'ALL' || (emp.status || 'Active') === selectedStatus;
    return matchesSearch && matchesDept && matchesType && matchesStatus;
  });

  // Sorting State
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedEmployees = useMemo(() => {
    if (!sortField) return filteredEmployees;
    return [...filteredEmployees].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name': {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'department': {
          const deptA = `${a.department || ''} ${a.position || ''}`.trim().toLowerCase();
          const deptB = `${b.department || ''} ${b.position || ''}`.trim().toLowerCase();
          comparison = deptA.localeCompare(deptB);
          break;
        }
        case 'gross': {
          const grossA = getEmployeeGrossForPeriod(a, currentMonth, currentYear);
          const grossB = getEmployeeGrossForPeriod(b, currentMonth, currentYear);
          comparison = grossA - grossB;
          break;
        }
        case 'rent': {
          comparison = (a.annualRent || 0) - (b.annualRent || 0);
          break;
        }
        case 'bank': {
          const bankA = `${a.bankName || ''} ${a.accountNumber || ''}`.trim().toLowerCase();
          const bankB = `${b.bankName || ''} ${b.accountNumber || ''}`.trim().toLowerCase();
          comparison = bankA.localeCompare(bankB);
          break;
        }
        case 'type': {
          const typeA = (a.employmentType || 'Full-Time').toLowerCase();
          const typeB = (b.employmentType || 'Full-Time').toLowerCase();
          comparison = typeA.localeCompare(typeB);
          break;
        }
        case 'status': {
          const statusA = (a.status || 'Active').toLowerCase();
          const statusB = (b.status || 'Active').toLowerCase();
          comparison = statusA.localeCompare(statusB);
          break;
        }
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredEmployees, sortField, sortDirection, currentMonth, currentYear]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDept, selectedType, selectedStatus]);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEmployees.slice(start, start + pageSize);
  }, [sortedEmployees, currentPage, pageSize]);

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
      {/* Header - Sticky */}
      <div className="sticky top-0 z-30 bg-[#fbfbfb]/95 dark:bg-[#09090b]/95 backdrop-blur-md pt-2.5 pb-3 border-b border-zinc-200 dark:border-zinc-800 -mx-6 px-6 md:-mx-8 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded pl-8 pr-7 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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

          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as 'ALL' | 'Active' | 'Inactive')}
              className="bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer font-medium"
              title="Filter by Status"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto min-h-[260px] pb-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/70 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">
                  <SortableHeader
                    label="Full Name"
                    field="name"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th className="py-2.5 px-3.5">
                  <SortableHeader
                    label="Department & Role"
                    field="department"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th className="py-2.5 px-3.5 text-right">
                  <SortableHeader
                    label={salaryCalculationMode === 'net-to-gross' ? 'Target Net Pay' : 'Monthly Gross'}
                    field="gross"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                </th>
                <th className="py-2.5 px-3.5 text-right">
                  <SortableHeader
                    label="Annual Rent"
                    field="rent"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                </th>
                <th className="py-2.5 px-3.5">
                  <SortableHeader
                    label="Bank Account"
                    field="bank"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th className="py-2.5 px-3.5 text-center">
                  <SortableHeader
                    label="Type"
                    field="type"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="center"
                  />
                </th>
                <th className="py-2.5 px-3.5 text-center">
                  <SortableHeader
                    label="Status"
                    field="status"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="center"
                  />
                </th>
                <th className="py-2.5 px-3.5 text-right font-semibold uppercase tracking-wider text-[10px] text-zinc-400 dark:text-zinc-500">
                  Actions
                </th>
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
                paginatedEmployees.map((emp, index) => {
                  const isDropUp = paginatedEmployees.length >= 4
                    ? index >= paginatedEmployees.length - 2
                    : paginatedEmployees.length === 3
                    ? index === 2
                    : false;

                  return (
                    <tr key={emp.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 px-3.5">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{emp.firstName} {emp.lastName}</div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-[200px]">{emp.email || 'No email on file'}</div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="text-zinc-800 dark:text-zinc-200 font-medium text-xs">{emp.department}</div>
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
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          emp.employmentType === 'Contract'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : emp.employmentType === 'Part-Time'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : emp.employmentType === 'Intern / NYSC'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60'
                        }`}>
                          {emp.employmentType || 'Full-Time'}
                        </span>
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
                            <div className={`absolute right-0 ${
                              isDropUp ? 'bottom-full mb-1' : 'top-full mt-1'
                            } w-44 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-50 animate-fade-in text-left`}>
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
                  );
                })
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
