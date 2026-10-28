import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Cloud, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  ArrowLeft,
  AlertTriangle,
  Check,
  Link as LinkIcon,
  Layers
} from 'lucide-react';
import { 
  getSavedCloudConfig, 
  saveCloudConfig, 
  testSupabaseConnection, 
  fetchCompaniesFromSupabase,
  uploadAllLocalCompaniesToSupabase,
  setActiveTeamMember,
  leavePresenceChannel,
  SupabaseCloudConfig 
} from '../../services/supabaseClient';
import { purgeAllLocalDataOnDisconnect, confirmDisconnectWithPendingSync } from '../../store/usePayrollStore';
import { CompanyAccount } from '../../types';

export type PushConflictStatus = 'new' | 'update' | 'cloud_newer' | 'name_conflict';

export interface PushInspectionItem {
  company: CompanyAccount;
  status: PushConflictStatus;
  cloudMatch?: CompanyAccount;
  selected: boolean;
  resolutionAction: 'push' | 'link' | 'skip';
  diffNote: string;
}

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

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [inspectionItems, setInspectionItems] = useState<PushInspectionItem[]>([]);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

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
    if (!confirmDisconnectWithPendingSync()) return;
    const newConfig = { url: '', anonKey: '', isEnabled: false };
    saveCloudConfig(newConfig);
    setConfig(newConfig);
    setTestResult(null);

    // Security purge: Wipe local company caches and active team member session
    leavePresenceChannel();
    purgeAllLocalDataOnDisconnect();
    setActiveTeamMember(null);
    onCompaniesSynced([]);
    onClose();

    // Automatically log out and return to the gateway / setup screen
    window.location.reload();
  };

  // ── PRE-FLIGHT READ-ONLY INSPECTION ──
  const handleStartInspection = async () => {
    if (!config.isEnabled || localCompanies.length === 0) return;
    setIsInspecting(true);
    setActionFeedback(null);

    try {
      const res = await fetchCompaniesFromSupabase();
      if (!res.success) {
        setActionFeedback({
          type: 'error',
          message: res.error || 'Failed to inspect cloud database.',
        });
        return;
      }

      const cloudCompanies = res.companies || [];

      const items: PushInspectionItem[] = localCompanies.map((local) => {
        // Direct ID match
        const matchById = cloudCompanies.find(c => c.id === local.id);
        // Name match with differing ID
        const matchByName = cloudCompanies.find(
          c => c.id !== local.id && c.name.trim().toLowerCase() === local.name.trim().toLowerCase()
        );

        if (matchById) {
          const cloudTime = matchById.lastActiveAt ? new Date(matchById.lastActiveAt).getTime() : 0;
          const localTime = local.lastActiveAt 
            ? new Date(local.lastActiveAt).getTime() 
            : (local.createdAt ? new Date(local.createdAt).getTime() : 0);

          // If cloud was updated > 2 minutes after local, warn against overwriting newer team changes
          if (cloudTime > localTime + 120000) {
            return {
              company: local,
              status: 'cloud_newer',
              cloudMatch: matchById,
              selected: false, // Default unchecked for safety!
              resolutionAction: 'skip',
              diffNote: 'Cloud has newer modifications',
            };
          }

          return {
            company: local,
            status: 'update',
            cloudMatch: matchById,
            selected: true,
            resolutionAction: 'push',
            diffNote: 'Will update existing cloud workspace',
          };
        }

        if (matchByName) {
          return {
            company: local,
            status: 'name_conflict',
            cloudMatch: matchByName,
            selected: false, // Default unchecked for safety!
            resolutionAction: 'link', // Defaults to linking to prevent duplicate
            diffNote: `Cloud already has "${matchByName.name}" under another ID`,
          };
        }

        return {
          company: local,
          status: 'new',
          selected: true,
          resolutionAction: 'push',
          diffNote: 'New workspace ready to upload',
        };
      });

      setInspectionItems(items);
      setIsPreviewOpen(true);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Pre-flight check failed.',
      });
    } finally {
      setIsInspecting(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setInspectionItems(prev =>
      prev.map(item =>
        item.company.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const toggleSelectAll = () => {
    const anyUnselected = inspectionItems.some(i => !i.selected);
    setInspectionItems(prev =>
      prev.map(i => ({ ...i, selected: anyUnselected }))
    );
  };

  const setConflictResolution = (id: string, action: 'link' | 'push' | 'skip') => {
    setInspectionItems(prev =>
      prev.map(item =>
        item.company.id === id
          ? {
              ...item,
              resolutionAction: action,
              selected: action !== 'skip',
            }
          : item
      )
    );
  };

  // ── EXECUTE SAFE PUSH ──
  const handleExecutePushSelected = async () => {
    const selectedItems = inspectionItems.filter(item => item.selected);
    if (selectedItems.length === 0) return;

    setIsSyncing(true);
    setActionFeedback(null);

    try {
      const toUpload: CompanyAccount[] = selectedItems.map(item => {
        if (item.status === 'name_conflict' && item.resolutionAction === 'link' && item.cloudMatch) {
          // Adopt the cloud ID to merge seamlessly
          return {
            ...item.company,
            id: item.cloudMatch.id,
          };
        }
        return item.company;
      });

      const res = await uploadAllLocalCompaniesToSupabase(toUpload);
      if (res.success) {
        // Re-fetch to update local cache
        const refreshed = await fetchCompaniesFromSupabase();
        if (refreshed.success && refreshed.companies) {
          onCompaniesSynced(refreshed.companies);
        }

        setIsPreviewOpen(false);
        setActionFeedback({
          type: 'success',
          message: `Successfully pushed ${toUpload.length} workspace${toUpload.length > 1 ? 's' : ''} to cloud without conflicts.`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: res.error || 'Failed to upload selected workspaces.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Push error.',
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

  const selectedCount = inspectionItems.filter(i => i.selected).length;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#121215] border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-5 shadow-2xl space-y-4 text-xs max-h-[92vh] sm:max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-250 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Android Drag Handle Pill (Mobile only) */}
        <div className="sm:hidden w-full flex justify-center -mt-2 pb-1.5 cursor-grab">
          <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* ── VIEW 1: PRE-FLIGHT CONFLICT PREVIEW SHEET ── */}
        {isPreviewOpen ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span>Push Workspaces</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      Preview
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Review and prevent duplicate or overwrite conflicts
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Selection Bar */}
            <div className="flex items-center justify-between text-[11px] px-1 text-zinc-500 dark:text-zinc-400">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {selectedCount === inspectionItems.length ? 'Deselect All' : 'Select All'}
              </button>
              <span>{selectedCount} of {inspectionItems.length} selected</span>
            </div>

            {/* Workspace Inspection List */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
              {inspectionItems.map((item) => {
                const isSelected = item.selected;

                return (
                  <div
                    key={item.company.id}
                    className={`p-3 rounded-xl border transition space-y-2 ${
                      isSelected
                        ? 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 shadow-2xs'
                        : 'border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/20 opacity-80'
                    }`}
                  >
                    <div 
                      className="flex items-start gap-2.5 cursor-pointer select-none"
                      onClick={() => toggleItemSelection(item.company.id)}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition shrink-0 ${
                        isSelected
                          ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900'
                          : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                            {item.company.name}
                          </h4>

                          {/* Status Badge */}
                          {item.status === 'new' && (
                            <span className="shrink-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                              New
                            </span>
                          )}
                          {item.status === 'update' && (
                            <span className="shrink-0 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800/50">
                              Update
                            </span>
                          )}
                          {item.status === 'cloud_newer' && (
                            <span className="shrink-0 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Cloud Newer
                            </span>
                          )}
                          {item.status === 'name_conflict' && (
                            <span className="shrink-0 text-[10px] font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200/50 dark:border-purple-800/50 flex items-center gap-1">
                              <LinkIcon className="w-2.5 h-2.5" />
                              Same Name
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
                          {item.diffNote}
                        </p>
                      </div>
                    </div>

                    {/* Conflict Sub-Panels */}
                    {item.status === 'cloud_newer' && (
                      <div className="ml-6.5 p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300">
                        Someone updated this workspace in the cloud more recently. Check the box only if you intend to overwrite team changes.
                      </div>
                    )}

                    {item.status === 'name_conflict' && item.cloudMatch && (
                      <div className="ml-6.5 p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/50 space-y-1.5">
                        <p className="text-[11px] text-purple-800 dark:text-purple-300 font-medium">
                          Match found: Cloud already has <strong>"{item.cloudMatch.name}"</strong>.
                        </p>
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setConflictResolution(item.company.id, 'link')}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                              item.resolutionAction === 'link'
                                ? 'bg-purple-700 text-white'
                                : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200'
                            }`}
                          >
                            Link to Cloud ID (Recommended)
                          </button>
                          <button
                            type="button"
                            onClick={() => setConflictResolution(item.company.id, 'push')}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                              item.resolutionAction === 'push'
                                ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                            }`}
                          >
                            Upload as Duplicate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleExecutePushSelected}
                disabled={selectedCount === 0 || isSyncing}
                className="h-9 px-4 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition disabled:opacity-40 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Pushing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Push Selected ({selectedCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ── VIEW 2: STANDARD CLOUD CONNECTION VIEW ── */
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Team Cloud Database
                    </h3>
                    {config.isEnabled ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                        Offline
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Connection Form */}
            <div className="space-y-3 pt-0.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Server URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://your-server.co"
                  className="w-full h-[35px] px-3 font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Access Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {showKey ? 'Hide' : 'Reveal'}
                  </button>
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  className="w-full h-[35px] px-3 font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                />
              </div>

              {/* Test result banner */}
              {testResult && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                  <span className="font-medium">{testResult.message}</span>
                </div>
              )}

              {/* Action Feedback */}
              {actionFeedback && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                  actionFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">{actionFeedback.message}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-1 gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={isTesting || !url || !anonKey}
                    className="h-9 px-3.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    {isTesting ? 'Testing...' : 'Test'}
                  </button>

                  {config.isEnabled && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="h-9 px-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveAndConnect}
                  disabled={isSyncing || !url || !anonKey}
                  className="h-9 px-4 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSyncing ? 'Connecting...' : 'Connect'}
                </button>
              </div>

              {/* Quick Sync actions when connected */}
              {config.isEnabled && (
                <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleStartInspection}
                    disabled={isSyncing || isInspecting}
                    className="flex-1 h-[38px] flex items-center justify-center gap-1.5 px-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer shadow-2xs disabled:opacity-50"
                    title="Review and upload local workspaces to cloud"
                  >
                    <UploadCloud className={`w-3.5 h-3.5 text-emerald-500 ${isInspecting ? 'animate-bounce' : ''}`} />
                    <span>
                      {isInspecting 
                        ? 'Inspecting...' 
                        : `Push Local Workspaces (${localCompanies.length})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromCloud}
                    disabled={isSyncing}
                    className="h-[38px] flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer shadow-2xs"
                    title="Refresh company list from cloud"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Refresh Cloud</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
