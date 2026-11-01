import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  X, 
  Filter, 
  Plus,
  Building2,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { Employee, EmploymentTypeRule, SalaryCalculationMode, TeamMember } from '../../../types';
import { MobileStaffCard } from '../MobileStaffCard';
import { MobileStaffDetailSheet } from '../MobileStaffDetailSheet';
import { MobileEmployeeFormSheet } from '../MobileEmployeeFormSheet';
import { MobileDepartmentPicker } from '../MobileDepartmentPicker';

interface MobileStaffDirectoryViewProps {
  employees: Employee[];
  departments: string[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (id: string, updates: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
  salaryCalculationMode?: SalaryCalculationMode;
  employmentTypeRules?: EmploymentTypeRule[];
  currentMonth?: string;
  currentYear?: number;
  currentUser?: TeamMember | null;
  isReadOnly?: boolean;
}

export const MobileStaffDirectoryView: React.FC<MobileStaffDirectoryViewProps> = ({
  employees,
  departments = [],
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  salaryCalculationMode,
  employmentTypeRules,
  currentMonth,
  currentYear,
  currentUser,
  isReadOnly = false,
}) => {
  const isAuditor = currentUser?.role === 'Auditor';
  const isWriteDisabled = isAuditor || isReadOnly;
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  
  const [selectedStaff, setSelectedStaff] = useState<Employee | null>(null);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees.filter(Boolean) : [], [employees]);
  const deptOptions = useMemo(() => {
    return ['ALL', ...Array.from(new Set([...departments, ...safeEmployees.map(e => e.department)].filter(Boolean)))];
  }, [departments, safeEmployees]);

  const filteredEmployees = useMemo(() => {
    return safeEmployees.filter(emp => {
      const term = searchQuery.toLowerCase();
      const matchesSearch = 
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(term) ||
        (emp.code || '').toLowerCase().includes(term) ||
        (emp.department || '').toLowerCase().includes(term) ||
        (emp.position || '').toLowerCase().includes(term);

      const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
      const matchesStatus = selectedStatus === 'ALL' || emp.status === selectedStatus;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [safeEmployees, searchQuery, selectedDept, selectedStatus]);

  const activeCount = safeEmployees.filter(e => e.status === 'Active').length;

  const handleOpenAdd = () => {
    if (isAuditor) return;
    setEditingEmp(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (emp: Employee) => {
    if (isAuditor) return;
    setEditingEmp(emp);
    setIsFormModalOpen(true);
  };

  const handleSave = (empData: Omit<Employee, 'id'>) => {
    if (editingEmp) {
      onUpdateEmployee(editingEmp.id, empData);
    } else {
      onAddEmployee(empData);
    }
    setIsFormModalOpen(false);
    setEditingEmp(null);
  };

  const handleSaveMultiple = (emps: Omit<Employee, 'id'>[]) => {
    emps.forEach(emp => onAddEmployee(emp));
    setIsFormModalOpen(false);
    setEditingEmp(null);
  };

  return (
    <div className="space-y-3.5 pb-2 select-none relative">
      
      {/* ── Top Search & Filter Bar (Sticky & Compact) ── */}
      <div className="sticky -top-3.5 z-30 pt-1 pb-1 bg-[#fbfbfb] dark:bg-[#09090b]">
        <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-2.5 px-3 shadow-xs">
          {!isSearchOpen ? (
            <div className="flex items-center justify-between gap-2">
              {/* Left: Title & Status Count */}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                  Staff Directory
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono truncate">
                  {filteredEmployees.length} shown &bull; {activeCount} active{selectedDept !== 'ALL' ? ` • ${selectedDept}` : ''}
                </p>
              </div>

              {/* Right: Active Only pill + Dept filter icon + Search toggle + Add Staff button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedStatus(selectedStatus === 'Active' ? 'ALL' : 'Active')}
                  className={`px-2 py-1 rounded-xl text-[10px] font-semibold border transition-colors cursor-pointer ${
                    selectedStatus === 'Active'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60'
                  }`}
                >
                  {selectedStatus === 'Active' ? 'Active' : 'All'}
                </button>

                {/* Minimalist Department Filter Dropdown Popover */}
                <MobileDepartmentPicker
                  selectedDept={selectedDept}
                  deptOptions={deptOptions}
                  onSelectDept={setSelectedDept}
                />

                {/* Search Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                    searchQuery
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                      : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60'
                  }`}
                  title="Search Directory"
                  aria-label="Search Directory"
                >
                  <Search className="w-3.5 h-3.5" />
                  {searchQuery && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Full-Width Search Bar with Internal Dismiss (X) Button */
            <div className="relative w-full animate-in fade-in duration-150">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Search name, position, code, dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }
                }}
                className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-9 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Cancel search"
                aria-label="Cancel search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Staff Cards Stack ── */}
      <div className="space-y-2.5">
        {filteredEmployees.length === 0 ? (
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-2">
            <Users className="w-8 h-8 text-zinc-400 mx-auto" />
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              No staff members found
            </h4>
            <p className="text-[11px] text-zinc-400">
              Try adjusting your search criteria or tap "+" to enroll new staff.
            </p>
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <MobileStaffCard
              key={emp.id}
              employee={emp}
              onView={(e) => setSelectedStaff(e)}
            />
          ))
        )}
      </div>

      {/* ── Android Material 3 Floating Action Button (FAB) ── */}
      {!isWriteDisabled && (
        <div className="fixed bottom-[80px] right-4 z-50 pointer-events-auto">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-2xl flex items-center justify-center transition-all cursor-pointer border border-emerald-500/40 ring-4 ring-emerald-500/10"
            title="Add Staff Member"
            aria-label="Add Staff Member"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* ── Safe Read-Only Staff Profile Detail Sheet ── */}
      {selectedStaff && (
        <MobileStaffDetailSheet
          isOpen={Boolean(selectedStaff)}
          employee={selectedStaff}
          onClose={() => setSelectedStaff(null)}
          onEdit={(emp) => {
            setSelectedStaff(null);
            handleEdit(emp);
          }}
          onDelete={onDeleteEmployee}
          isReadOnly={isWriteDisabled}
        />
      )}

      {/* ── Native Mobile Employee Form Sheet (Apple Inset Grouped / Material 3) ── */}
      {isFormModalOpen && (
        <MobileEmployeeFormSheet
          isOpen={isFormModalOpen}
          editingEmployee={editingEmp}
          existingEmployees={safeEmployees}
          availableDepartments={departments}
          employmentTypeRules={employmentTypeRules}
          currentYear={currentYear}
          onSave={handleSave}
          onSaveMultiple={handleSaveMultiple}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingEmp(null);
          }}
        />
      )}

    </div>
  );
};
