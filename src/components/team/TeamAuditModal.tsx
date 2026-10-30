import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  History, 
  X, 
  Search, 
  RefreshCw, 
  Download,
  Building2,
  Calendar,
  User,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers
} from 'lucide-react';
import { TeamMember, AuditLogEntry } from '../../types';
import { fetchAuditLogs, getLocalAuditLogs, getSupabaseClient } from '../../services/supabaseClient';
import { loadCompaniesRegistry } from '../../store/usePayrollStore';

interface TeamAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: TeamMember | null;
}

export const TeamAuditModal: React.FC<TeamAuditModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Load registered company names for filter dropdown
  const companies = useMemo(() => {
    return loadCompaniesRegistry();
  }, [isOpen]);

  const loadAuditData = async () => {
    setIsLoading(true);
    try {
      // Pass no companyId so it fetches across ALL companies
      const res = await fetchAuditLogs(undefined, 300);
      if (res.success && res.logs) {
        setLogs(res.logs);
      } else {
        // Fallback to local logs
        setLogs(getLocalAuditLogs());
      }
    } catch {
      setLogs(getLocalAuditLogs());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAuditData();
    }
  }, [isOpen]);

  // Realtime subscription: prepend new audit entries directly from payload (no re-fetch)
  useEffect(() => {
    if (!isOpen) return;
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client
      .channel(`team-audit-logs-realtime-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
        const row = payload.new as any;
        if (!row) return;
        const newEntry = {
          id: row.id,
          companyId: row.company_id,
          companyName: row.company_name,
          actorId: row.actor_id,
          actorName: row.actor_name,
          action: row.action,
          details: row.details,
          ipOrDevice: row.ip_or_device,
          createdAt: row.created_at,
        };
        setLogs(prev => [newEntry, ...prev]);
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [isOpen]);

  // Extract distinct company names appearing in logs
  const availableCompanyNames = useMemo(() => {
    const set = new Set<string>();
    companies.forEach(c => {
      if (c.name) set.add(c.name);
    });
    logs.forEach(l => {
      if (l.companyName && l.companyName !== 'Global System') {
        set.add(l.companyName);
      }
    });
    return Array.from(set).sort();
  }, [companies, logs]);

  // Categorize action for filter & styling
  const getActionCategory = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('COMPANY') || act.includes('WORKSPACE')) return 'COMPANY';
    if (act.includes('PIN') || act.includes('PASSWORD') || act.includes('SECURITY')) return 'SECURITY';
    if (act.includes('STAFF') || act.includes('ADMIN') || act.includes('OPERATOR')) return 'STAFF';
    if (act.includes('EMPLOYEE') || act.includes('SALARY')) return 'EMPLOYEE';
    if (act.includes('PAYROLL') || act.includes('LOCK') || act.includes('TAX')) return 'PAYROLL';
    return 'OTHER';
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Company filter
      if (selectedCompanyFilter !== 'ALL') {
        const cName = (log.companyName || '').toLowerCase();
        if (cName !== selectedCompanyFilter.toLowerCase()) return false;
      }

      // 2. Category filter
      if (selectedCategoryFilter !== 'ALL') {
        const cat = getActionCategory(log.action);
        if (cat !== selectedCategoryFilter) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchActor = (log.actorName || '').toLowerCase().includes(q);
        const matchAction = (log.action || '').toLowerCase().includes(q);
        const matchDetails = (log.details || '').toLowerCase().includes(q);
        const matchCompany = (log.companyName || '').toLowerCase().includes(q);
        return matchActor || matchAction || matchDetails || matchCompany;
      }

      return true;
    });
  }, [logs, selectedCompanyFilter, selectedCategoryFilter, searchQuery]);

  // CSV Export
  const exportLogsAsCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Company', 'Action', 'Category', 'Actor', 'Details', 'Device/Terminal'];
    const rows = filteredLogs.map(l => [
      `"${new Date(l.createdAt).toLocaleString()}"`,
      `"${l.companyName || 'Global System'}"`,
      `"${l.action || ''}"`,
      `"${getActionCategory(l.action)}"`,
      `"${l.actorName || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ipOrDevice || 'Desktop Workspace'}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payroll-pro-global-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Badge styler based on action type
  const renderActionBadge = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('DELETED')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          {action.replace(/_/g, ' ')}
        </span>
      );
    }
    if (act.includes('CREATED') || act.includes('REGISTERED') || act.includes('ADDED')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/60 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {action.replace(/_/g, ' ')}
        </span>
      );
    }
    if (act.includes('SECURITY') || act.includes('PIN') || act.includes('PASSWORD')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60 inline-flex items-center gap-1">
          <Lock className="w-2.5 h-2.5 text-amber-500" />
          {action.replace(/_/g, ' ')}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col h-[90vh] max-h-[820px] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shadow-xs shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Global Audit Trail
                </h2>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
                  Admin Exclusive
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-zinc-500 dark:text-zinc-400">
                Cross-company security logging &bull; Tracks company creation, PIN updates, and staff actions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={loadAuditData}
              disabled={isLoading}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportLogsAsCSV}
              disabled={filteredLogs.length === 0}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-40"
              title="Export filtered logs as CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="p-3 sm:px-6 bg-zinc-50/70 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2 shrink-0">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search details, actor, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-lg pl-8 pr-7 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Company Filter Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
            <select
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="h-8 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg px-2 text-xs focus:outline-none focus:border-zinc-400 cursor-pointer shadow-2xs max-w-[170px]"
            >
              <option value="ALL">All Companies ({availableCompanyNames.length})</option>
              {availableCompanyNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="h-8 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg px-2 text-xs focus:outline-none focus:border-zinc-400 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Event Types</option>
              <option value="COMPANY">Company Management</option>
              <option value="SECURITY">PIN &amp; Security</option>
              <option value="STAFF">Staff &amp; Authentication</option>
              <option value="EMPLOYEE">Employees &amp; Salaries</option>
              <option value="PAYROLL">Payroll &amp; Snapshots</option>
            </select>
          </div>

          {/* Count pill */}
          <div className="ml-auto text-[11px] font-medium text-zinc-400 shrink-0">
            <span>{filteredLogs.length} {filteredLogs.length === 1 ? 'event' : 'events'}</span>
          </div>

        </div>

        {/* Logs Feed Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {isLoading && logs.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-zinc-500" />
              <span className="text-xs">Aggregating cross-company audit logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-2 max-w-sm mx-auto">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No Audit Events Found</h3>
              <p className="text-[11px] text-zinc-400">
                {searchQuery || selectedCompanyFilter !== 'ALL' || selectedCategoryFilter !== 'ALL'
                  ? 'No audit entries match the current search filters.'
                  : 'All company actions, PIN updates, and staff modifications will be logged here automatically.'}
              </p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const compName = log.companyName || 'Global System';
              const isGlobal = compName === 'Global System' || !log.companyId;

              return (
                <div 
                  key={log.id}
                  className="bg-white dark:bg-[#16161a] border border-zinc-200/90 dark:border-zinc-800/90 rounded-xl p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition shadow-2xs space-y-2"
                >
                  {/* Top Bar: Company Pill + Action Badge + Timestamp */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border inline-flex items-center gap-1 ${
                        isGlobal 
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/70 font-semibold'
                      }`}>
                        <Building2 className="w-2.5 h-2.5 opacity-70" />
                        <span className="truncate max-w-[180px]">{compName}</span>
                      </span>

                      {renderActionBadge(log.action)}
                    </div>

                    <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5" title={new Date(log.createdAt).toLocaleString()}>
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <span>{formatRelativeTime(log.createdAt)}</span>
                    </div>
                  </div>

                  {/* Details Body */}
                  <div className="text-xs text-zinc-800 dark:text-zinc-200 font-normal leading-relaxed pl-1">
                    {log.details}
                  </div>

                  {/* Footer Actor & Terminal Info */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 pl-1">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-2.5 h-2.5 text-zinc-400" />
                      <strong className="text-zinc-600 dark:text-zinc-300 font-medium">{log.actorName}</strong>
                    </span>
                    <span className="text-zinc-400 truncate max-w-[140px] sm:max-w-none">
                      {log.ipOrDevice || 'Desktop Workspace'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <span className="text-[11px] hidden sm:inline">
            Logged actions are cryptographically sealed &bull; Visible only to Administrators
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium text-xs hover:opacity-90 transition cursor-pointer text-center"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
