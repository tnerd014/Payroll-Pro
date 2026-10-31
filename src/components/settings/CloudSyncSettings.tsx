import React, { useState } from 'react';
import { 
  Cloud, 
  Copy, 
  Check, 
  Download, 
  ShieldCheck, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  CheckCircle2, 
  XCircle, 
  Code, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../../constants/supabaseSchema';
import { 
  getSavedCloudConfig, 
  saveCloudConfig, 
  testSupabaseConnection, 
  uploadCompanyDataToSupabase,
  downloadCompanyDataFromSupabase,
  setActiveTeamMember,
  SupabaseCloudConfig 
} from '../../services/supabaseClient';
import { purgeAllLocalDataOnDisconnect, confirmDisconnectWithPendingSync } from '../../store/usePayrollStore';
import { CompanyProfile, Employee, PayrollVariables, PayeTaxVariables, EmployeeLoan, PayrollSnapshot, PayslipDesignConfig, EmailSettings } from '../../types';

interface CloudSyncSettingsProps {
  company: CompanyProfile;
  employees: Employee[];
  departments?: string[];
  payrollVariables: PayrollVariables;
  payeTaxVariables: PayeTaxVariables;
  loans?: EmployeeLoan[];
  snapshots?: PayrollSnapshot[];
  payslipDesign?: PayslipDesignConfig;
  emailSettings?: EmailSettings;
  onRefreshData?: () => void;
}

export const CloudSyncSettings: React.FC<CloudSyncSettingsProps> = ({
  company,
  employees,
  departments = [],
  payrollVariables,
  payeTaxVariables,
  loans = [],
  snapshots = [],
  payslipDesign,
  emailSettings,
  onRefreshData,
}) => {
  const [config, setConfig] = useState<SupabaseCloudConfig>(() => getSavedCloudConfig());
  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [showKey, setShowKey] = useState(false);

  // Status & Testing
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Schema Copy & Download
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [showSchemaPreview, setShowSchemaPreview] = useState(false);

  // Migration & Sync Actions
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const handleDownloadSchemaFile = () => {
    const blob = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/sql;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'payroll_pro_database_setup.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSyncFeedback(null);
    try {
      const res = await testSupabaseConnection(url, anonKey);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndEnable = () => {
    const newConfig: SupabaseCloudConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      isEnabled: true,
      lastConnectedAt: new Date().toISOString(),
    };
    saveCloudConfig(newConfig);
    setConfig(newConfig);
    setSyncFeedback({
      type: 'success',
      message: 'Cloud configuration saved. Team sync active.',
    });
  };

  const handleDisableCloud = () => {
    if (!confirmDisconnectWithPendingSync()) return;
    const newConfig: SupabaseCloudConfig = {
      ...config,
      isEnabled: false,
    };
    saveCloudConfig(newConfig);
    setConfig(newConfig);
    setTestResult(null);

    // Security purge: Wipe local company caches and active team member session
    purgeAllLocalDataOnDisconnect();
    setActiveTeamMember(null);

    setSyncFeedback({
      type: 'success',
      message: 'Server disconnected successfully.',
    });
  };

  const handleUploadLocalToCloud = async () => {
    if (!config.isEnabled) return;
    setIsUploading(true);
    setSyncFeedback(null);
    try {
      const res = await uploadCompanyDataToSupabase(
        company,
        employees,
        departments,
        payrollVariables,
        payeTaxVariables,
        loans,
        snapshots,
        payslipDesign,
        [],
        emailSettings
      );
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: `Uploaded ${employees.length} employees, ${loans.length} loans, and ${snapshots.length} snapshots to cloud database.`,
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: res.error || 'Upload failed.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Upload error.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadCloudToLocal = async () => {
    if (!config.isEnabled || !company.id) return;
    setIsDownloading(true);
    setSyncFeedback(null);
    try {
      const res = await downloadCompanyDataFromSupabase(company.id);
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: `Pulled fresh data from cloud (${res.employees?.length || 0} employees). Reloading...`,
        });
        if (onRefreshData) {
          setTimeout(() => onRefreshData(), 600);
        }
      } else {
        setSyncFeedback({
          type: 'error',
          message: res.error || 'Download failed.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Download error.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl pb-10">
      {/* Header Banner */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                Team Cloud Connection
              </h3>
              {config.isEnabled ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live
                </span>
              ) : (
                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                  Local Mode
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Connect your team's cloud database to collaborate with colleagues in real time.
            </p>
          </div>
        </div>

        {config.isEnabled && (
          <button
            onClick={handleDisableCloud}
            className="self-start sm:self-center px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded transition cursor-pointer"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Step 1: Database Setup Script */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-[10px] flex items-center justify-center">
              1
            </span>
            <h4 className="font-medium text-xs text-zinc-900 dark:text-zinc-100">
              Database Setup Script
            </h4>
          </div>
          <span className="text-[11px] text-zinc-400">Required once per database</span>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Run this SQL script once in your cloud database query tool to initialize tables and live synchronization.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleCopySchema}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition shadow-xs"
          >
            {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSchema ? 'Copied!' : 'Copy Setup Script'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSchemaFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Download .sql</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSchemaPreview(!showSchemaPreview)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            <Code className="w-3 h-3" />
            <span>{showSchemaPreview ? 'Hide SQL' : 'Preview SQL'}</span>
            {showSchemaPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Schema Code Preview Accordion */}
        {showSchemaPreview && (
          <div className="mt-2 p-3 bg-zinc-950 text-zinc-200 rounded-lg font-mono text-[10px] max-h-56 overflow-y-auto border border-zinc-800 select-text">
            <pre>{SUPABASE_SQL_SCHEMA}</pre>
          </div>
        )}
      </div>

      {/* Step 2: Server Credentials */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-[10px] flex items-center justify-center">
              2
            </span>
            <h4 className="font-medium text-xs text-zinc-900 dark:text-zinc-100">
              Enter Server Details
            </h4>
          </div>
          <span className="text-[11px] text-zinc-400">Stored locally on this device</span>
        </div>

        <div className="space-y-3">
          {/* Server URL */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Server URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-cloud-database.co"
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
            />
          </div>

          {/* Anon Public Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
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
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
            />
            
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Use the public client key. Never use the master administrative key.</span>
            </div>
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !url || !anonKey}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing...' : 'Test'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndEnable}
            disabled={!url || !anonKey}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs disabled:opacity-50"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Save &amp; Connect</span>
          </button>
        </div>
      </div>

      {/* Step 3: Migration & Sync (When Connected) */}
      {config.isEnabled && (
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                3
              </span>
              <h4 className="font-medium text-xs text-zinc-900 dark:text-zinc-100">
                Workspace Data Sync
              </h4>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Live Sync Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-xs text-zinc-900 dark:text-zinc-100">
                <UploadCloud className="w-3.5 h-3.5 text-emerald-500" />
                <span>Upload to Cloud</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Pushes {employees.length} employees and {snapshots.length} historical runs to the cloud database.
              </p>
              <button
                type="button"
                onClick={handleUploadLocalToCloud}
                disabled={isUploading}
                className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition disabled:opacity-50"
              >
                {isUploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                <span>{isUploading ? 'Uploading...' : 'Upload Data'}</span>
              </button>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-xs text-zinc-900 dark:text-zinc-100">
                <DownloadCloud className="w-3.5 h-3.5 text-blue-500" />
                <span>Pull from Cloud</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Downloads fresh updates made by colleagues on other computers.
              </p>
              <button
                type="button"
                onClick={handleDownloadCloudToLocal}
                disabled={isDownloading}
                className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-800 dark:text-zinc-200 transition disabled:opacity-50"
              >
                {isDownloading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <DownloadCloud className="w-3 h-3" />}
                <span>{isDownloading ? 'Pulling...' : 'Pull Latest'}</span>
              </button>
            </div>
          </div>

          {/* Sync feedback */}
          {syncFeedback && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
