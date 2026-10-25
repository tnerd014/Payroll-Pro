import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  History, 
  Users, 
  X, 
  Search, 
  RefreshCw, 
  Plus, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Download
} from 'lucide-react';
import { TeamMember, AuditLogEntry, TeamMemberRole } from '../../types';
import { 
  fetchAuditLogs, 
  fetchTeamMembers, 
  saveTeamMemberToCloud, 
  deleteTeamMemberFromCloud,
  getActiveTeamMember,
  setActiveTeamMember
} from '../../services/supabaseClient';

interface TeamAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCompanyId?: string | null;
  activeCompanyName?: string;
}

export const TeamAuditModal: React.FC<TeamAuditModalProps> = ({
  isOpen,
  onClose,
  activeCompanyId,
  activeCompanyName,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'members' | 'switch'>('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(() => getActiveTeamMember());

  // Fast Switch User PIN state
  const [selectedMemberForPin, setSelectedMemberForPin] = useState<TeamMember | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [switchSuccess, setSwitchSuccess] = useState<string | null>(null);

  // Add Member state
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<TeamMemberRole>('Payroll Officer');
  const [newMemberPin, setNewMemberPin] = useState('1234');
  const [memberSaveError, setMemberSaveError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [logRes, memberRes] = await Promise.all([
        fetchAuditLogs(activeCompanyId || undefined),
        fetchTeamMembers()
      ]);

      if (logRes.success && logRes.logs) {
        setAuditLogs(logRes.logs);
      }
      if (memberRes.success && memberRes.members) {
        setTeamMembers(memberRes.members);
        // If no active member set, default to first member or prompt
        if (!getActiveTeamMember() && memberRes.members.length > 0) {
          const defaultAdmin = memberRes.members.find(m => m.role === 'Admin') || memberRes.members[0];
          setActiveTeamMember(defaultAdmin);
          setCurrentMember(defaultAdmin);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setCurrentMember(getActiveTeamMember());
    }
  }, [isOpen, activeCompanyId]);

  if (!isOpen) return null;

  const filteredLogs = auditLogs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.actorName || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q) ||
      (log.companyName || '').toLowerCase().includes(q)
    );
  });

  const handleVerifyAndSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForPin) return;

    const expectedPin = selectedMemberForPin.pin || '1234';
    if (pinInput.trim() !== expectedPin.trim()) {
      setPinError('Incorrect 4-digit PIN. Try again.');
      return;
    }

    setActiveTeamMember(selectedMemberForPin);
    setCurrentMember(selectedMemberForPin);
    setSwitchSuccess(`Switched active user to ${selectedMemberForPin.name}`);
    setPinError(null);
    setPinInput('');
    setTimeout(() => {
      setSelectedMemberForPin(null);
      setSwitchSuccess(null);
      setActiveTab('audit');
    }, 800);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      setMemberSaveError('Name is required.');
      return;
    }

    const member: TeamMember = {
      id: `user-${Date.now()}`,
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      role: newMemberRole,
      pin: newMemberPin.trim() || '1234',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const res = await saveTeamMemberToCloud(member);
    if (res.success) {
      setTeamMembers(prev => [...prev, member]);
      setIsAddingMember(false);
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberPin('1234');
      setMemberSaveError(null);
    } else {
      setMemberSaveError(res.error || 'Failed to save member.');
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (teamMembers.length <= 1) {
      alert('At least one team member must remain.');
      return;
    }
    const res = await deleteTeamMemberFromCloud(id);
    if (res.success) {
      setTeamMembers(prev => prev.filter(m => m.id !== id));
      if (currentMember?.id === id) {
        const remaining = teamMembers.filter(m => m.id !== id);
        setActiveTeamMember(remaining[0] || null);
        setCurrentMember(remaining[0] || null);
      }
    }
  };

  const exportLogsAsCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Actor', 'Action', 'Details', 'Company'];
    const rows = filteredLogs.map(l => [
      `"${new Date(l.createdAt).toLocaleString()}"`,
      `"${l.actorName || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.companyName || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payroll-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Team & Audit Trail</span>
                {currentMember && (
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Active: {currentMember.name} ({currentMember.role})
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500">
                Automatic change logging and team account authentication
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center justify-between px-6 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-1 py-2">
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail ({filteredLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team Accounts ({teamMembers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('switch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'switch'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Switch User</span>
            </button>
          </div>

          {activeTab === 'audit' && filteredLogs.length > 0 && (
            <button
              onClick={exportLogsAsCSV}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {/* Tab 1: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="flex-1 flex flex-col min-h-0 p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter audit logs by actor, action, salary change, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8.5 pr-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-16 text-xs text-zinc-400 space-y-1">
                  <p>No audit trail records found.</p>
                  <p className="text-[11px] text-zinc-500">Every change to salary, employee, or payroll run is automatically recorded here.</p>
                </div>
              ) : (
                filteredLogs.map(log => (
                  <div key={log.id} className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 flex items-start justify-between gap-4 transition">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {log.actorName}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
                          {log.action}
                        </span>
                        {log.companyName && (
                          <span className="text-[11px] text-zinc-400 truncate">
                            &bull; {log.companyName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300">
                        {log.details}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(log.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Team Accounts */}
        {activeTab === 'members' && (
          <div className="flex-1 flex flex-col min-h-0 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Registered Team Members
                </h3>
                <p className="text-xs text-zinc-400">Team members with authorized access and assigned PINs</p>
              </div>
              <button
                onClick={() => setIsAddingMember(!isAddingMember)}
                className="h-8 px-3 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingMember ? 'Cancel' : 'Add Team Member'}</span>
              </button>
            </div>

            {isAddingMember && (
              <form onSubmit={handleCreateMember} className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alicia Davies"
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="alicia@company.com"
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Access Role</label>
                    <select
                      value={newMemberRole}
                      onChange={e => setNewMemberRole(e.target.value as TeamMemberRole)}
                      className="w-full h-8 px-2.5 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                    >
                      <option value="Admin">Admin (Full Control)</option>
                      <option value="Payroll Officer">Payroll Officer (Edit & Run)</option>
                      <option value="Auditor">Auditor (View Only)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">4-Digit Security PIN</label>
                    <input
                      type="password"
                      maxLength={6}
                      required
                      value={newMemberPin}
                      onChange={e => setNewMemberPin(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                {memberSaveError && (
                  <p className="text-xs text-rose-500">{memberSaveError}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(false)}
                    className="h-7 px-3 text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-7 px-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium rounded-md cursor-pointer"
                  >
                    Save Member
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teamMembers.map(member => (
                <div
                  key={member.id}
                  className="p-4 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <span>{member.name}</span>
                      {currentMember?.id === member.id && (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded font-normal">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-zinc-400">{member.role} {member.email ? `&bull; ${member.email}` : ''}</p>
                    <p className="text-[10px] font-mono text-zinc-400">PIN: ••••</p>
                  </div>

                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="text-xs text-zinc-400 hover:text-rose-500 p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                    title="Remove member"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Switch Active User with PIN */}
        {activeTab === 'switch' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[300px]">
            {selectedMemberForPin ? (
              <form onSubmit={handleVerifyAndSwitch} className="w-full max-w-xs space-y-3 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMemberForPin(null);
                    setPinError(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-1 cursor-pointer flex items-center gap-1"
                >
                  &larr; Choose different member
                </button>

                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Enter PIN for {selectedMemberForPin.name}
                  </p>
                  <p className="text-[11px] text-zinc-400">Default PIN is 1234</p>
                </div>

                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoFocus
                    maxLength={6}
                    placeholder="Enter 4-digit PIN"
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-center font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {pinError && (
                  <p className="text-xs text-rose-500 text-center">{pinError}</p>
                )}

                {switchSuccess && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{switchSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg text-xs font-semibold hover:opacity-90 transition cursor-pointer"
                >
                  Confirm & Switch
                </button>
              </form>
            ) : (
              <div className="w-full max-w-md space-y-3">
                <p className="text-xs text-zinc-500 text-center mb-2">
                  Select your profile below to sign in:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {teamMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => {
                        setSelectedMemberForPin(member);
                        setPinInput('');
                        setPinError(null);
                      }}
                      className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                        currentMember?.id === member.id
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] hover:border-zinc-400'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                          {member.name}
                        </p>
                        <p className="text-[11px] text-zinc-400">{member.role}</p>
                      </div>
                      {currentMember?.id === member.id ? (
                        <span className="text-[11px] text-emerald-600 font-medium">Active</span>
                      ) : (
                        <span className="text-xs text-zinc-400">Switch &rarr;</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
