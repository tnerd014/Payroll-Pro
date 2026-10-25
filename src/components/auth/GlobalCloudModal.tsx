import React, { useState } from 'react';
import { 
  Cloud, 
  X, 
  Check, 
  Copy, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  Database
} from 'lucide-react';
import { 
  getSavedCloudConfig, 
  saveCloudConfig, 
  testSupabaseConnection, 
  fetchCompaniesFromSupabase,
  uploadAllLocalCompaniesToSupabase,
  setActiveTeamMember,
  SupabaseCloudConfig 
} from '../../services/supabaseClient';
import { purgeAllLocalDataOnDisconnect } from '../../store/usePayrollStore';
import { SUPABASE_SQL_SCHEMA } from '../../constants/supabaseSchema';
import { CompanyAccount } from '../../types';

interface GlobalCloudModalProps {
  isOpen: boolean;
  onClose: () => void;
  localCompanies: CompanyAccount[];
  onCompaniesSynced: (updatedCompanies: CompanyAccount[]) => void;
}

export const GlobalCloudModal: React.FC<GlobalCloudModalProps> = ({
  isOpen,
  onClose,
  localCompanies,
  onCompaniesSynced,
}) => {
  const [config, setConfig] = useState<SupabaseCloudConfig>(() => getSavedCloudConfig());
  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [showKey, setShowKey] = useState(false);

  const [activeTab, setActiveTab] = useState<'connect' | 'schema'>('connect');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [copiedSchema, setCopiedSchema] = useState(false);

  if (!isOpen) return null;

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const handleDownloadSchema = () => {
    const blob = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/sql;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'payroll_pro_database_setup.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setActionFeedback(null);
    try {
      const res = await testSupabaseConnection(url, anonKey);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    setIsSyncing(true);
    setActionFeedback(null);
    try {
      const newConfig: SupabaseCloudConfig = {
        url: url.trim(),
        anonKey: anonKey.trim(),
        isEnabled: true,
        lastConnectedAt: new Date().toISOString(),
      };
      saveCloudConfig(newConfig);
      setConfig(newConfig);

      const res = await fetchCompaniesFromSupabase();
      if (res.success && res.companies && res.companies.length > 0) {
        onCompaniesSynced(res.companies);
        setActionFeedback({
          type: 'success',
          message: `Connected! Loaded ${res.companies.length} companies from cloud.`,
        });
      } else {
        setActionFeedback({
          type: 'success',
          message: 'Connected to cloud server. Database ready.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Failed to connect.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    const newConfig = { ...config, isEnabled: false };
    saveCloudConfig(newConfig);
    setConfig(newConfig);
    setTestResult(null);

    // Security purge: Wipe local company caches and active team member session
    purgeAllLocalDataOnDisconnect();
    setActiveTeamMember(null);
    onCompaniesSynced([]);

    setActionFeedback({
      type: 'success',
      message: 'Disconnected from cloud server. All local company records have been purged for security.',
    });
  };

  const handlePushAllToCloud = async () => {
    if (!config.isEnabled || localCompanies.length === 0) return;
    setIsSyncing(true);
    setActionFeedback(null);
    try {
      const res = await uploadAllLocalCompaniesToSupabase(localCompanies);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: `Uploaded all ${res.count || localCompanies.length} companies to cloud.`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: res.error || 'Upload failed.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Upload error.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!config.isEnabled) return;
    setIsSyncing(true);
    setActionFeedback(null);
    try {
      const res = await fetchCompaniesFromSupabase();
      if (res.success && res.companies) {
        onCompaniesSynced(res.companies);
        setActionFeedback({
          type: 'success',
          message: `Synced ${res.companies.length} companies from cloud.`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: res.error || 'Failed to fetch companies.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Sync failed.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-4 shadow-2xl space-y-3.5 text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Team Cloud Database
                </h3>
                {config.isEnabled ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                    Offline
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-md">
          <button
            onClick={() => setActiveTab('connect')}
            className={`flex-1 py-1 rounded text-[11px] font-medium transition ${
              activeTab === 'connect'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Connection Details
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex-1 py-1 rounded text-[11px] font-medium transition ${
              activeTab === 'schema'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Database Setup Script
          </button>
        </div>

        {/* Tab 1: Connection */}
        {activeTab === 'connect' && (
          <div className="space-y-2.5 pt-0.5">
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Server URL
              </label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://your-server.co"
                className="w-full px-2.5 py-1.5 font-mono rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  Access Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showKey ? 'Hide' : 'Reveal'}
                </button>
              </div>
              <input
                type={showKey ? 'text' : 'password'}
                value={anonKey}
                onChange={e => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full px-2.5 py-1.5 font-mono rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
              />
            </div>

            {/* Test result banner */}
            {testResult && (
              <div className={`p-2 rounded text-[11px] flex items-center gap-1.5 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Action Feedback */}
            {actionFeedback && (
              <div className={`p-2 rounded text-[11px] flex items-center gap-1.5 ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{actionFeedback.message}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting || !url || !anonKey}
                  className="px-2.5 py-1 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 transition disabled:opacity-50"
                >
                  {isTesting ? 'Testing...' : 'Test'}
                </button>

                {config.isEnabled && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-2 py-1 rounded text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveAndConnect}
                disabled={isSyncing || !url || !anonKey}
                className="px-3.5 py-1 rounded text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition disabled:opacity-50"
              >
                {isSyncing ? 'Connecting...' : 'Connect'}
              </button>
            </div>

            {/* Quick Sync actions when connected */}
            {config.isEnabled && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handlePushAllToCloud}
                  disabled={isSyncing}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 transition"
                  title="Upload local companies to cloud"
                >
                  <UploadCloud className="w-3 h-3 text-emerald-500" />
                  <span>Push Local Workspaces ({localCompanies.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromCloud}
                  disabled={isSyncing}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 transition"
                  title="Refresh company list from cloud"
                >
                  <RefreshCw className={`w-3 h-3 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Refresh Cloud</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: SQL Schema */}
        {activeTab === 'schema' && (
          <div className="space-y-3 pt-0.5">
            <p className="text-zinc-500 text-[11px] leading-relaxed">
              Run this script once in your database to initialize company tables and real-time synchronization.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySchema}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium transition"
              >
                {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSchema ? 'Copied' : 'Copy Script'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSchema}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 transition"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>Download .sql</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
