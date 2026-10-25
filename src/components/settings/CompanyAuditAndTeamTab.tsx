import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Search, 
  Download,
  ShieldCheck,
  History
} from 'lucide-react';
import { CompanyProfile, AuditLogEntry } from '../../types';
import { fetchAuditLogs } from '../../services/supabaseClient';

interface CompanyAuditAndTeamTabProps {
  company: CompanyProfile;
}

export const CompanyAuditAndTeamTab: React.FC<CompanyAuditAndTeamTabProps> = ({ company }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');

  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetchAuditLogs(company.id || company.name);
      if (res.success && res.logs) {
        setLogs(res.logs);
      }
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [company.id, company.name]);

  const exportLogsAsCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Actor', 'Action', 'Details', 'Company'];
    const rows = filteredLogs.map(l => [
      `"${new Date(l.createdAt).toLocaleString()}"`,
      `"${l.actorName || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.companyName || company.name || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit-trail-${(company.name || 'company').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(log => {
    if (!logSearchQuery.trim()) return true;
    const q = logSearchQuery.toLowerCase();
    return (
      (log.action || '').toLowerCase().includes(q) ||
      (log.actorName || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4">
        
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Workspace Audit Trail
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {filteredLogs.length} Events
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Historical activity ledger of changes, approvals, and actions recorded for {company.name}.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {filteredLogs.length > 0 && (
              <button
                type="button"
                onClick={exportLogsAsCSV}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900 transition cursor-pointer"
                title="Download CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadAuditLogs}
              disabled={isLoadingLogs}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by action, operator, or details..."
            value={logSearchQuery}
            onChange={(e) => setLogSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition"
          />
        </div>

        {/* Audit Log Entries List */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden">
          {isLoadingLogs ? (
            <div className="py-12 flex items-center justify-center text-zinc-400 text-xs gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Loading audit logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs space-y-1">
              <p>{logSearchQuery ? 'No matching audit records found.' : 'No audit entries recorded for this workspace yet.'}</p>
              <p className="text-[11px] text-zinc-500">Every salary change, payroll finalization, and settings update is recorded here.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs max-h-[460px] overflow-y-auto">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-zinc-400 shrink-0">
                        &bull; {log.actorName}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono shrink-0 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}, {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                      {log.details}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
