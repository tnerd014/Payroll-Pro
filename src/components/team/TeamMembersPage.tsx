import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Plus, 
  RefreshCw, 
  X, 
  Trash2, 
  Check, 
  Copy, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  Search,
  KeyRound,
  ShieldCheck,
  Edit3,
  User as UserIcon,
  UserX,
  UserCheck,
  MoreVertical,
  Eye,
  Mail,
  AtSign,
  Shield,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { TeamMember, TeamMemberRole, DEFAULT_SECURITY_QUESTIONS } from '../../types';
import { 
  fetchTeamMembers, 
  saveTeamMemberToCloud, 
  deleteTeamMemberFromCloud, 
  logAuditEvent,
  subscribeToPresence,
  getSupabaseClient,
  StaffPresence,
  subscribeToMemberUpdates
} from '../../services/supabaseClient';

interface TeamMembersPageProps {
  onBack: () => void;
  currentUser: TeamMember | null;
}

export const TeamMembersPage: React.FC<TeamMembersPageProps> = ({
  onBack,
  currentUser,
}) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isInitialMount = useRef(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewMember, setViewMember] = useState<TeamMember | null>(null);
  const [mobileActionMember, setMobileActionMember] = useState<TeamMember | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'toggle-active' | 'delete';
    member: TeamMember;
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
  } | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Live presence: which members are currently online
  const [onlineMembers, setOnlineMembers] = useState<StaffPresence[]>([]);
  const unsubPresenceRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Only subscribe if current user is Admin
    if (currentUser?.role !== 'Admin') return;
    const unsub = subscribeToPresence((online) => {
      setOnlineMembers(online);
    });
    unsubPresenceRef.current = unsub;
    return () => { unsub(); };
  }, [currentUser]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openMenuId]);

  // New Member Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<TeamMemberRole>('Payroll Officer');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(DEFAULT_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<TeamMemberRole>('Payroll Officer');
  const [editPassword, setEditPassword] = useState('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Success Notice State
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    username: string;
    email: string;
    pass: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadMembers = async (silent = false) => {
    if (!silent) {
      if (isInitialMount.current || members.length === 0) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
    }
    try {
      const res = await fetchTeamMembers();
      if (res.success && res.members) {
        setMembers(res.members);
      }
    } catch (err) {
      console.warn('Failed to load team members:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isInitialMount.current = false;
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // Multi-layered auto-refresh: polling, window focus, WebSocket broadcast, and Postgres changes (all non-destructive)
  useEffect(() => {
    // 1. Safety background polling interval while page is open (every 30s)
    const interval = setInterval(() => {
      loadMembers(true);
    }, 30000);

    // 2. Window focus & visibility: refresh silently when admin focuses back to this window
    const handleFocus = () => { loadMembers(true); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. WebSocket Broadcast listener from other admin sessions (silent background sync)
    const unsubBroadcast = subscribeToMemberUpdates(() => {
      loadMembers(true);
    });

    // 4. Postgres Changes (Database Realtime - silent background sync)
    const client = getSupabaseClient();
    let channel: any = null;
    if (client) {
      channel = client
        .channel(`team-members-realtime-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
          loadMembers(true);
        })
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      unsubBroadcast();
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, []);

  const handleGeneratePassword = () => {
    const code = Math.floor(100000 + Math.random() * 900000);
    setPassword(`PAY-${code}`);
  };

  const handleGenerateEditPassword = () => {
    const code = Math.floor(100000 + Math.random() * 900000);
    setEditPassword(`PAY-${code}`);
  };

  const handleOpenAdd = () => {
    setName('');
    setEmail('');
    setUsername('');
    setRole('Payroll Officer');
    const code = Math.floor(100000 + Math.random() * 900000);
    setPassword(`PAY-${code}`);
    setSecurityQuestion(DEFAULT_SECURITY_QUESTIONS[0]);
    setCustomQuestion('');
    setSecurityAnswer('');
    setRequirePasswordChange(true);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter full name');
      return;
    }
    if (!email.trim()) {
      setFormError('Please enter email address');
      return;
    }
    if (!password.trim()) {
      setFormError('Please enter password');
      return;
    }

    const finalQuestion = securityQuestion === 'Write your own custom question...'
      ? customQuestion.trim()
      : securityQuestion.trim();

    if (securityQuestion === 'Write your own custom question...' && !finalQuestion) {
      setFormError('Please enter your custom security question');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const generatedUsername = username.trim() || email.split('@')[0].toLowerCase();
    const newMemberId = 'staff-' + Date.now();

    const memberPayload: TeamMember = {
      id: newMemberId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      username: generatedUsername,
      role,
      password: password.trim(),
      pin: password.trim(),
      tempPassword: requirePasswordChange ? password.trim() : '',
      mustChangePassword: requirePasswordChange,
      securityQuestion: finalQuestion,
      securityAnswer: securityAnswer.trim().toLowerCase(),
      recoveryEmail: email.trim().toLowerCase(),
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const res = await saveTeamMemberToCloud(memberPayload);
    setIsSaving(false);

    if (res.success) {
      await logAuditEvent(
        '',
        'Global System',
        'Staff Account Created',
        `Admin created staff account for ${memberPayload.name} (${memberPayload.role})`
      );
      setIsAddModalOpen(false);
      setCreatedCredentials({
        name: memberPayload.name,
        username: memberPayload.username || '',
        email: memberPayload.email || '',
        pass: password.trim(),
        role: memberPayload.role
      });
      loadMembers(true);
    } else {
      setFormError(res.error || 'Failed to save team member');
    }
  };

  // Direct Inline Role Update
  const handleRoleChange = async (member: TeamMember, newRole: TeamMemberRole) => {
    if (member.role === newRole) return;

    const oldRole = member.role;
    const updatedMember: TeamMember = { ...member, role: newRole };

    // Optimistic UI update
    setMembers(prev => prev.map(m => m.id === member.id ? updatedMember : m));

    const res = await saveTeamMemberToCloud(updatedMember);
    if (res.success) {
      await logAuditEvent(
        '',
        'Global System',
        'Staff Role Updated',
        `Admin changed role for ${member.name} from ${oldRole} to ${newRole}`
      );
    } else {
      alert(res.error || 'Failed to update role');
      loadMembers(true); // Revert on failure
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (member: TeamMember) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditEmail(member.email || '');
    setEditUsername(member.username || '');
    setEditRole(member.role);
    setEditPassword('');
    setEditIsActive(member.isActive !== false);
    setEditError(null);
  };

  // Request Toggle Member Active / Deactivated
  const handleToggleActive = (member: TeamMember) => {
    const nextActive = member.isActive === false ? true : false;
    setConfirmAction({
      type: 'toggle-active',
      member,
      title: nextActive ? `Activate ${member.name}?` : `Deactivate ${member.name}?`,
      description: nextActive 
        ? 'This user will be allowed to log into the workspace with their existing credentials.' 
        : 'This user will be immediately blocked from logging into the workspace.',
      confirmLabel: nextActive ? 'Activate Access' : 'Deactivate Access',
      danger: !nextActive,
    });
  };

  // Save Edit Member
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editName.trim()) {
      setEditError('Name is required');
      return;
    }
    if (!editEmail.trim()) {
      setEditError('Email is required');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    const updated: TeamMember = {
      ...editingMember,
      name: editName.trim(),
      email: editEmail.trim().toLowerCase(),
      username: editUsername.trim() || editEmail.split('@')[0].toLowerCase(),
      role: editRole,
      isActive: editIsActive,
      updatedAt: new Date().toISOString()
    };

    if (editPassword.trim()) {
      updated.password = editPassword.trim();
      updated.pin = editPassword.trim();
      updated.tempPassword = editPassword.trim();
      updated.mustChangePassword = true;
    }

    const res = await saveTeamMemberToCloud(updated);
    setIsSavingEdit(false);

    if (res.success) {
      await logAuditEvent(
        '',
        'Global System',
        'Staff Details Updated',
        `Admin updated details for ${updated.name} (${updated.role})${editPassword.trim() ? ' and reset password' : ''}${updated.isActive === false ? ' [Deactivated]' : ' [Active]'}`
      );
      setEditingMember(null);
      loadMembers(true);
    } else {
      setEditError(res.error || 'Failed to update member');
    }
  };

  const handleDeleteMember = (memberId: string, memberName: string) => {
    const member = members.find(m => m.id === memberId) || ({ id: memberId, name: memberName } as TeamMember);
    setConfirmAction({
      type: 'delete',
      member,
      title: `Delete ${memberName}?`,
      description: `Permanently delete authorized user ${memberName}? They will lose all access to this workspace and this cannot be undone.`,
      confirmLabel: 'Delete Operator',
      danger: true,
    });
  };

  const handleExecuteConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, member } = confirmAction;
    setIsExecutingAction(true);
    try {
      if (type === 'toggle-active') {
        const nextActive = member.isActive === false ? true : false;
        const actionLabel = nextActive ? 'activate' : 'deactivate';
        const updated: TeamMember = {
          ...member,
          isActive: nextActive,
          updatedAt: new Date().toISOString()
        };
        const res = await saveTeamMemberToCloud(updated);
        if (res.success) {
          await logAuditEvent(
            '',
            'Global System',
            nextActive ? 'Staff Member Activated' : 'Staff Member Deactivated',
            `Admin ${actionLabel}d access for ${member.name} (${member.role})`
          );
          await loadMembers(true);
          if (viewMember?.id === member.id) {
            setViewMember(updated);
          }
        } else {
          alert(res.error || `Failed to ${actionLabel} member`);
        }
      } else if (type === 'delete') {
        const res = await deleteTeamMemberFromCloud(member.id);
        if (res.success) {
          await logAuditEvent(
            '',
            'Global System',
            'Staff Access Deleted',
            `Admin deleted authorized user ${member.name}`
          );
          await loadMembers(true);
          if (viewMember?.id === member.id) {
            setViewMember(null);
          }
        } else {
          alert(res.error || 'Failed to delete user');
        }
      }
    } finally {
      setIsExecutingAction(false);
      setConfirmAction(null);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Payroll Pro Staff Credentials:
Name: ${createdCredentials.name}
Role: ${createdCredentials.role}
Email: ${createdCredentials.email}
Username: ${createdCredentials.username}
Password: ${createdCredentials.pass}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredMembers = members.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.username || '').toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q)
    );
  });

  // Reset to page 1 whenever the search query changes
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const pagedMembers = filteredMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full animate-in fade-in duration-150">
      
      {/* Pinned Top Toolbar */}
      <div className="shrink-0 pt-3 pb-3 bg-[#fbfbfb] dark:bg-[#09090b] z-20 flex flex-col gap-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
        
        {/* Top Row: Back Action, Title, & Live Presence Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs shrink-0"
              title="Return to workspaces"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Workspaces</span>
            </button>

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                Authorized Team Members
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 hidden sm:block">
                Staff authorized to sign in and process payroll across all company workspaces.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50">
              {members.length} {members.length === 1 ? 'Operator' : 'Operators'}
            </span>
            {currentUser?.role === 'Admin' && onlineMembers.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-500"></span>
                </span>
                {onlineMembers.length} Online
              </span>
            )}
          </div>
        </div>

        {/* Action Row: Search Filter + Refresh + Add Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter staff by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-xl pl-9 pr-8 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => loadMembers(false)}
            disabled={isLoading || isRefreshing}
            className="h-10 w-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="h-10 px-4 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium text-xs transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>

      </div>

      {/* Sticky Table Header — visible ONLY on sm+ screens */}
      <div className="hidden sm:block shrink-0 bg-white dark:bg-[#121215] border-x border-t border-zinc-200 dark:border-zinc-800 rounded-t-xl mt-4 mx-0">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 rounded-t-xl">
          <div className="col-span-5 sm:col-span-4">Operator Name &amp; ID</div>
          <div className="col-span-4 sm:col-span-3">Work Email</div>
          <div className="col-span-3 sm:col-span-2">Access Role</div>
          <div className="hidden sm:block sm:col-span-2">Status</div>
          <div className="hidden sm:block sm:col-span-1 text-right">Actions</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        
        {isLoading && members.length === 0 ? (
          <div className="py-16 flex items-center justify-center text-zinc-400 text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading team members...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-xs space-y-2">
            <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
            <p>{searchQuery ? `No staff member matches "${searchQuery}"` : 'No team members registered yet.'}</p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── MOBILE VIEW: Minimalist Succinct Operator Cards (< sm screens) ── */}
            <div className="sm:hidden space-y-2.5 py-3">
              {pagedMembers.map((member) => {
                const isSelf = Boolean(
                  (currentUser?.id && member.id && currentUser.id === member.id) ||
                  (currentUser?.email && member.email && currentUser.email.toLowerCase() === member.email.toLowerCase()) ||
                  (currentUser?.username && member.username && currentUser.username.toLowerCase() === member.username.toLowerCase())
                );
                const isAdmin = currentUser?.role === 'Admin';
                const canManageMember = isAdmin && !isSelf;
                const presence = onlineMembers.find((p) => p.memberId === member.id);
                const isOnline = Boolean(presence);
                const nameParts = (member.name || 'User').trim().split(/\s+/);
                const initials = `${nameParts[0]?.charAt(0) || ''}${nameParts[1]?.charAt(0) || ''}`.toUpperCase() || 'U';

                return (
                  <div
                    key={member.id}
                    onClick={() => setViewMember(member)}
                    className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-[0.99] transition cursor-pointer"
                  >
                    {/* Header Row: Avatar with Live Pulse, Name, Username, and Actions */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar with Live Online Badge */}
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 text-zinc-800 dark:text-zinc-100 font-bold text-xs flex items-center justify-center border border-zinc-200/80 dark:border-zinc-700/80">
                            {initials}
                          </div>
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white dark:ring-[#121215]"></span>
                            </span>
                          )}
                        </div>

                        {/* Unclipped Operator Name and Handle */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
                              {member.name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                            @{member.username || member.email?.split('@')[0]}
                          </div>
                        </div>
                      </div>

                      {/* Right Action Menu Button - Only Admins managing other operators */}
                      <div 
                        className="relative shrink-0" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canManageMember ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMobileActionMember(member);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                            title="Member actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="w-8 h-8 flex items-center justify-center text-zinc-300 dark:text-zinc-700 text-xs">
                            —
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Strip */}
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl px-2.5 py-1.5 border border-zinc-200/60 dark:border-zinc-800/60">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate select-all">{member.email || 'No email registered'}</span>
                    </div>

                    {/* Card Footer: Role Pill, Status, and View Chevron */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/70 flex items-center justify-between text-xs">
                      {/* Access Role & Status Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold text-[11px] ${
                          member.role === 'Admin'
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                            : member.role === 'Auditor'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}>
                          <Shield className="w-3 h-3" />
                          <span>{member.role}</span>
                        </span>

                        {member.isActive === false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            Deactivated
                          </span>
                        ) : isOnline ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                            Offline
                          </span>
                        )}
                      </div>

                      {/* Tap to View Profile Hint */}
                      <div className="flex items-center gap-1 text-zinc-400 text-[11px] font-medium">
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── DESKTOP VIEW: Ledger Table Card (>= sm screens) ── */}
            <div className="hidden sm:block bg-white dark:bg-[#121215] border-x border-b border-zinc-200 dark:border-zinc-800 rounded-b-xl overflow-hidden shadow-2xs">
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                {pagedMembers.map(member => {
                  const isSelf = Boolean(
                    (currentUser?.id && member.id && currentUser.id === member.id) ||
                    (currentUser?.email && member.email && currentUser.email.toLowerCase() === member.email.toLowerCase()) ||
                    (currentUser?.username && member.username && currentUser.username.toLowerCase() === member.username.toLowerCase())
                  );
                  const isAdmin = currentUser?.role === 'Admin';
                  const canManageMember = isAdmin && !isSelf;
                  return (
                    <div 
                      key={member.id} 
                      className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition cursor-pointer"
                      onClick={(e) => {
                        const tag = (e.target as HTMLElement).closest('select,button,a');
                        if (!tag) setViewMember(member);
                      }}
                    >
                      {/* Col 1: Operator Name & Avatar */}
                      <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 font-semibold text-xs shrink-0 border border-zinc-200 dark:border-zinc-700/60">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {member.name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-normal bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate font-mono">
                            @{member.username || member.email?.split('@')[0]}
                          </div>
                        </div>
                      </div>

                      {/* Col 2: Work Email */}
                      <div className="col-span-4 sm:col-span-3 text-zinc-600 dark:text-zinc-300 truncate">
                        {member.email || <span className="text-zinc-400 italic">None</span>}
                      </div>

                      {/* Col 3: Role Selector / Badge */}
                      <div className="col-span-3 sm:col-span-2">
                        {!canManageMember ? (
                          <span className="inline-flex items-center text-[11px] px-2.5 py-0.5 rounded font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                            {member.role}
                          </span>
                        ) : (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member, e.target.value as TeamMemberRole)}
                            className={`h-7 text-[11px] px-2 py-0 rounded font-medium border focus:outline-none cursor-pointer transition shadow-2xs ${
                              member.role === 'Admin'
                                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                                : member.role === 'Auditor'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            }`}
                            title="Change operator access role"
                          >
                            <option value="Payroll Officer" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Payroll Officer</option>
                            <option value="Auditor" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Auditor (View Only)</option>
                            <option value="Admin" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Administrator</option>
                          </select>
                        )}
                      </div>

                      {/* Col 4: Status */}
                      <div className="hidden sm:flex sm:col-span-2 items-center gap-1.5 text-xs">
                        {member.isActive === false ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                            Deactivated
                          </span>
                        ) : (() => {
                          const presence = onlineMembers.find(p => p.memberId === member.id);
                          if (presence) {
                            const since = new Date(presence.joinedAt);
                            const sinceStr = since.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            return (
                              <span
                                title={`Online since ${sinceStr}${presence.companyName ? ` — ${presence.companyName}` : ''}`}
                                className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium"
                              >
                                <span className="relative flex w-2 h-2 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500"></span>
                                </span>
                                Online
                              </span>
                            );
                          }
                          return (
                            <span className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                              <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0"></span>
                              Offline
                            </span>
                          );
                        })()}
                      </div>

                      {/* Col 5: Actions — 3-dot dropdown (Only Admins managing other operators) */}
                      <div className="flex sm:col-span-1 justify-end items-center" ref={openMenuId === member.id ? menuRef : undefined}>
                        {canManageMember ? (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(prev => prev === member.id ? null : member.id)}
                              className="p-1.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              title="Member actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {openMenuId === member.id && (
                              <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white dark:bg-[#1a1a1e] border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 text-xs overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuId(null); handleOpenEdit(member); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                                  Edit Details
                                </button>

                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuId(null); handleToggleActive(member); }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition cursor-pointer ${
                                    member.isActive === false
                                      ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                      : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                  }`}
                                >
                                  {member.isActive === false ? (
                                    <><UserCheck className="w-3.5 h-3.5" />Activate Access</>
                                  ) : (
                                    <><UserX className="w-3.5 h-3.5" />Deactivate Access</>
                                  )}
                                </button>

                                <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuId(null); handleDeleteMember(member.id, member.name); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete User
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-700 text-xs select-none pr-1">&mdash;</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

      </div>

      {/* Pinned Pagination Footer */}
      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-[#fbfbfb] dark:bg-[#09090b] px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: count info */}
        <span className="text-[11px] text-zinc-400">
          {filteredMembers.length === 0
            ? 'No results'
            : `Showing ${Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredMembers.length)}–${Math.min(currentPage * PAGE_SIZE, filteredMembers.length)} of ${filteredMembers.length} operator${filteredMembers.length !== 1 ? 's' : ''}`
          }
        </span>

        {/* Right: page controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 w-7 flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs cursor-pointer"
              title="Previous page"
            >
              &#8249;
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-zinc-400 text-xs select-none">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p as number)}
                    className={`h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded border text-xs font-medium transition cursor-pointer ${
                      currentPage === p
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                        : 'bg-white dark:bg-[#121215] border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {p}
                  </button>
                )
              )
            }

            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 w-7 flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs cursor-pointer"
              title="Next page"
            >
              &#8250;
            </button>
          </div>
        )}
      </div>

      {/* EDIT MEMBER MODAL */}
      {editingMember && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setEditingMember(null)}
        >
          <div 
            className="w-full sm:max-w-md bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-3.5 text-xs max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
                  <Edit3 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    Edit Operator Profile
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono truncate">
                    @{editingMember.username || editingMember.email?.split('@')[0]} &bull; {editingMember.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-md">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Access Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as TeamMemberRole)}
                  className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 cursor-pointer"
                >
                  <option value="Payroll Officer">Payroll Officer</option>
                  <option value="Auditor">Auditor (View Only)</option>
                  <option value="Admin">Administrator</option>
                </select>
              </div>

              {/* Account Status (Active / Deactivated) */}
              <div className="flex items-center justify-between py-2 px-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="block text-[11px] font-medium text-zinc-800 dark:text-zinc-200">Account Status</span>
                  <span className="text-[10px] text-zinc-500">
                    {editIsActive ? 'Active — allowed to log into workspace' : 'Deactivated — blocked from logging in'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    editIsActive ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      editIsActive ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Reset Password (Optional)</label>
                  <button
                    type="button"
                    onClick={handleGenerateEditPassword}
                    className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Generate Secure
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Leave blank to keep existing password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                {editingMember.id !== currentUser?.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      const toDeleteId = editingMember.id;
                      const toDeleteName = editingMember.name;
                      setEditingMember(null);
                      handleDeleteMember(toDeleteId, toDeleteName);
                    }}
                    className="px-2.5 py-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs transition cursor-pointer flex items-center gap-1 font-medium"
                    title="Permanently delete user"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="px-3.5 py-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl font-semibold text-xs hover:opacity-90 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    {isSavingEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ADD MEMBER MODAL */}
      {isAddModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div 
            className="w-full sm:max-w-md bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-3.5 text-xs max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    Add Team Member
                  </h3>
                  <p className="text-[11px] text-zinc-400 truncate">
                    Authorize staff to process company payroll
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-md">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adeola Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="email@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (!username) setUsername(e.target.value.split('@')[0].toLowerCase());
                    }}
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Access Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as TeamMemberRole)}
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 cursor-pointer"
                  >
                    <option value="Payroll Officer">Payroll Officer</option>
                    <option value="Auditor">Auditor (View Only)</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Initial Password *</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Generate Secure
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Security Question</label>
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 cursor-pointer"
                >
                  {DEFAULT_SECURITY_QUESTIONS.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              {securityQuestion === 'Write your own custom question...' && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Custom Security Question *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. What was your childhood nickname?"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Security Answer</label>
                <input
                  type="text"
                  placeholder="Answer used for password recovery"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={requirePasswordChange}
                    onChange={(e) => setRequirePasswordChange(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
                  />
                  <span>Require password change on first login</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl font-semibold text-xs hover:opacity-90 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CREDENTIALS SHARE NOTICE */}
      {createdCredentials && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setCreatedCredentials(null)}
        >
          <div 
            className="w-full sm:max-w-md bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-3.5 text-xs animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Member Account Created</span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Share these credentials with your colleague to sign in from their computer:
            </p>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono text-xs space-y-1.5">
              <div><span className="text-zinc-400 font-sans">Email:</span> {createdCredentials.email}</div>
              <div><span className="text-zinc-400 font-sans">Username:</span> {createdCredentials.username}</div>
              <div><span className="text-zinc-400 font-sans">Initial Password:</span> <strong className="text-blue-500 font-mono">{createdCredentials.pass}</strong></div>
              <div><span className="text-zinc-400 font-sans">Role:</span> {createdCredentials.role}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl text-xs font-semibold cursor-pointer hover:opacity-90 shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Member View Modal ── */}
      {viewMember && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setViewMember(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />
            {/* Close */}
            <button
              type="button"
              onClick={() => setViewMember(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Avatar + Name header */}
            <div className="px-6 pt-6 pb-4 flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 font-bold text-lg border border-zinc-200 dark:border-zinc-700 shrink-0">
                {viewMember.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">
                    {viewMember.name}
                  </span>
                  {currentUser?.id === viewMember.id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                      You
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
                  @{viewMember.username || viewMember.email?.split('@')[0] || '—'}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="px-6 py-4 space-y-3 text-xs">
              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="text-zinc-500 dark:text-zinc-400 w-16 shrink-0">Email</span>
                <span className="text-zinc-800 dark:text-zinc-200 truncate">
                  {viewMember.email || <span className="italic text-zinc-400">None on file</span>}
                </span>
              </div>

              {/* Role */}
              <div className="flex items-center gap-3">
                <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="text-zinc-500 dark:text-zinc-400 w-16 shrink-0">Role</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                  viewMember.role === 'Admin'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : viewMember.role === 'Auditor'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                }`}>
                  {viewMember.role}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <Eye className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="text-zinc-500 dark:text-zinc-400 w-16 shrink-0">Status</span>
                {viewMember.isActive === false ? (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    Deactivated
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    Active
                  </span>
                )}
              </div>

              {/* Joined */}
              {viewMember.createdAt && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="text-zinc-500 dark:text-zinc-400 w-16 shrink-0">Joined</span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {new Date(viewMember.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}

              {/* Recovery email */}
              {viewMember.recoveryEmail && (
                <div className="flex items-center gap-3">
                  <AtSign className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="text-zinc-500 dark:text-zinc-400 w-16 shrink-0">Recovery</span>
                  <span className="text-zinc-800 dark:text-zinc-200 truncate">{viewMember.recoveryEmail}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            {(() => {
              const isViewingSelf = Boolean(
                (currentUser?.id && viewMember.id && currentUser.id === viewMember.id) ||
                (currentUser?.email && viewMember.email && currentUser.email.toLowerCase() === viewMember.email.toLowerCase()) ||
                (currentUser?.username && viewMember.username && currentUser.username.toLowerCase() === viewMember.username.toLowerCase())
              );
              const canManageViewed = currentUser?.role === 'Admin' && !isViewingSelf;

              return (
                <div className="px-6 pb-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
                  {canManageViewed ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const m = viewMember;
                          setViewMember(null);
                          handleOpenEdit(m);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleToggleActive(viewMember);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                          viewMember.isActive === false
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {viewMember.isActive === false ? (
                          <><UserCheck className="w-3.5 h-3.5" /><span>Activate</span></>
                        ) : (
                          <><UserX className="w-3.5 h-3.5" /><span>Deactivate</span></>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteMember(viewMember.id, viewMember.name);
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Delete Operator"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div />
                  )}

                  <button
                    type="button"
                    onClick={() => setViewMember(null)}
                    className="px-4 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition cursor-pointer ml-auto"
                  >
                    Close
                  </button>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* ── MOBILE ACTION SHEET ── */}
      {mobileActionMember && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setMobileActionMember(null)}
        >
          <div 
            className="w-full sm:max-w-md bg-white dark:bg-[#121215] rounded-t-3xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xl space-y-3.5 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {mobileActionMember.name}
                </h4>
                <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
                  @{mobileActionMember.username || mobileActionMember.email?.split('@')[0]} &bull; {mobileActionMember.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileActionMember(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const m = mobileActionMember;
                  setMobileActionMember(null);
                  handleOpenEdit(m);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-zinc-400" />
                <span>Edit Operator Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const m = mobileActionMember;
                  setMobileActionMember(null);
                  handleToggleActive(m);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  mobileActionMember.isActive === false
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
                    : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
                }`}
              >
                {mobileActionMember.isActive === false ? (
                  <><UserCheck className="w-4 h-4" /><span>Activate Access</span></>
                ) : (
                  <><UserX className="w-4 h-4" /><span>Deactivate Access</span></>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  const m = mobileActionMember;
                  setMobileActionMember(null);
                  handleDeleteMember(m.id, m.name);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Delete Operator</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileActionMember(null)}
              className="w-full py-3 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── CONFIRM ACTION MODAL (Replaces browser confirm) ── */}
      {confirmAction && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => !isExecutingAction && setConfirmAction(null)}
        >
          <div 
            className="w-full sm:max-w-md bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                confirmAction.danger 
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400' 
                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}>
                {confirmAction.danger ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {confirmAction.title}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {confirmAction.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={isExecutingAction}
                onClick={() => setConfirmAction(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecutingAction}
                onClick={handleExecuteConfirmAction}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs ${
                  confirmAction.danger
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {isExecutingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{confirmAction.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
