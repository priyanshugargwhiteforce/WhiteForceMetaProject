import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
    Search,
    Filter,
    Edit2,
    Trash2,
    UserPlus,
    ChevronLeft,
    ChevronRight,
    Shield,
    Mail,
    User,
    X,
    Lock,
    Megaphone,
    Send,
    BarChart3,
    Briefcase,
    MessageCircle,
    FolderOpen,
    PieChart,
    KeyRound,
    UserCog,
    CheckCheck,
    Eraser,
    Users,
    ShieldCheck,
    Info,
    Eye,
    EyeOff
} from 'lucide-react';

// 'head' sits between Admin and all Managers (sees every Task / MoM by default)
const ROLES = ['admin', 'head', 'user', 'manager', 'hr', 'sales', 'seo', 'marketing'];
const STATUSES = ['active', 'hold', 'rejected'];

// Access permissions shown in the Add/Edit user popup.
// adminOnly: only an Admin can see/grant it (the server also enforces this).
const PERMISSIONS = [
    { key: 'meta_access', label: 'Meta Ads', desc: 'Meta ad accounts, campaigns, analytics & leads', icon: Megaphone, group: 'Ad Platforms', color: 'blue' },
    { key: 'meta_publish', label: 'Meta Publish', desc: 'Create & publish Facebook / Instagram posts', icon: Send, group: 'Ad Platforms', color: 'indigo' },
    { key: 'google_access', label: 'Google Ads', desc: 'Google Ads campaigns & performance', icon: BarChart3, group: 'Ad Platforms', color: 'amber' },
    { key: 'linkedin_access', label: 'LinkedIn Ads', desc: 'LinkedIn campaigns, creatives & leads', icon: Briefcase, group: 'Ad Platforms', color: 'sky' },
    { key: 'whatsapp_access', label: 'WhatsApp Manager', desc: 'Templates, campaigns & conversations', icon: MessageCircle, group: 'Messaging', color: 'emerald' },
    { key: 'media_access', label: 'Media Library', desc: 'Open & manage the shared Media Library', icon: FolderOpen, group: 'Workspace (Admin only)', color: 'violet', adminOnly: true },
    { key: 'reports_access', label: 'Reports', desc: 'View spend & performance reports', icon: PieChart, group: 'Workspace (Admin only)', color: 'rose', adminOnly: true }
];

const PERMISSION_COLORS = {
    blue: 'border-blue-500/60 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    indigo: 'border-indigo-500/60 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    amber: 'border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    sky: 'border-sky-500/60 bg-sky-500/10 text-sky-600 dark:text-sky-400',
    emerald: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    violet: 'border-violet-500/60 bg-violet-500/10 text-violet-600 dark:text-violet-400',
    rose: 'border-rose-500/60 bg-rose-500/10 text-rose-600 dark:text-rose-400'
};

const EMPTY_FORM = {
    username: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active',
    meta_access: false,
    google_access: false,
    whatsapp_access: false,
    linkedin_access: false,
    meta_publish: false,
    media_access: false,
    reports_access: false,
    manager_id: ''
};

const UserManagement = () => {
    const { user, token } = useAuth();
    const [users, setUsers] = useState([]);
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modals state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Form state
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    const isAdminUser = user?.role === 'admin';
    // Permissions the logged-in user is allowed to grant
    const grantablePermissions = useMemo(
        () => PERMISSIONS.filter((p) => !p.adminOnly || isAdminUser),
        [isAdminUser]
    );

    // Filtering, Searching & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Increased items per page since table is denser

    useEffect(() => {
        fetchUsers();
        if (user?.role === 'admin') {
            fetchManagers();
        }
    }, []);

    const fetchManagers = async () => {
        try {
            const res = await axios.get('/api/users/managers/list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setManagers(res.data.managers || []);
            }
        } catch (err) {
            console.error('Failed to load managers:', err);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data.users);
        } catch (err) {
            console.error(err);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    // Derived State
    const availableRoles = useMemo(() => {
        if (user?.role === 'manager') {
            return ROLES.filter(r => r !== 'admin' && r !== 'head' && r !== 'manager');
        }
        return ROLES;
    }, [user]);

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = filterRole === 'All' || u.role === filterRole;
            const matchesStatus = filterStatus === 'All' || u.status === filterStatus;

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchQuery, filterRole, filterStatus]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const currentUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleEditClick = (u) => {
        setCurrentUser(u);
        setFormData({
            username: u.username,
            email: u.email,
            password: '',
            role: u.role,
            status: u.status,
            meta_access: !!u.meta_access,
            google_access: !!u.google_access,
            whatsapp_access: !!u.whatsapp_access,
            linkedin_access: !!u.linkedin_access,
            meta_publish: !!u.meta_publish,
            media_access: !!u.media_access,
            reports_access: !!u.reports_access,
            manager_id: u.manager_id || ''
        });
        setShowPassword(false);
        setIsEditModalOpen(true);
    };

    const handleCreateClick = () => {
        setFormData(EMPTY_FORM);
        setShowPassword(false);
        setIsCreateModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;
        setIsEditModalOpen(false);
        setIsCreateModalOpen(false);
    };

    const setAllPermissions = (value) => {
        setFormData((prev) => {
            const next = { ...prev };
            grantablePermissions.forEach((p) => { next[p.key] = value; });
            return next;
        });
    };

    const togglePermission = (key) => {
        setFormData((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Close the popup with the Escape key
    useEffect(() => {
        if (!isEditModalOpen && !isCreateModalOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            const updatePayload = {
                role: formData.role,
                status: formData.status,
                meta_access: formData.meta_access,
                google_access: formData.google_access,
                whatsapp_access: formData.whatsapp_access,
                linkedin_access: formData.linkedin_access,
                meta_publish: formData.meta_publish,
                manager_id: formData.manager_id || null
            };
            if (isAdminUser) {
                updatePayload.media_access = formData.media_access;
                updatePayload.reports_access = formData.reports_access;
            }
            if (formData.password) updatePayload.password = formData.password;
            if (formData.username) updatePayload.username = formData.username;
            if (formData.email) updatePayload.email = formData.email;

            await axios.put(`/api/users/${currentUser.id}`, updatePayload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsEditModalOpen(false);
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to update user');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateUser = async () => {
        setSaving(true);
        try {
            const createPayload = {
                ...formData,
                manager_id: formData.manager_id || null
            };
            if (!isAdminUser) {
                delete createPayload.media_access;
                delete createPayload.reports_access;
            }
            await axios.post('/api/users', createPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsCreateModalOpen(false);
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to create user');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await axios.delete(`/api/users/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchUsers();
            } catch (err) {
                console.error(err);
                alert(err.response?.data?.message || 'Failed to delete user');
            }
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30';
            case 'head': return 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/20 dark:text-teal-400 dark:border-teal-500/30';
            case 'manager': return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30';
            case 'hr': return 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-500/20 dark:text-pink-400 dark:border-pink-500/30';
            case 'sales': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30';
            case 'seo': return 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/30';
            case 'marketing': return 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/20 dark:text-fuchsia-400 dark:border-fuchsia-500/30';
            default: return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30';
        }
    };

    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30';
            case 'hold': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30';
            case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30';
            default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30';
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">

            {/* Header */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">User Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs">Manage access, roles, and accounts.</p>
                </div>
                {(user?.role === 'admin' || user?.role === 'manager') && (
                    <button
                        onClick={handleCreateClick}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Add User</span>
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-500 p-3 rounded-lg flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Filters & Search */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 flex flex-col md:flex-row gap-3 items-center shadow-sm">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
                    />
                </div>
                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:w-40">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <select
                            value={filterRole}
                            onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="All">All Roles</option>
                            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                    </div>
                    <div className="relative flex-1 md:w-40">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="All">All Statuses</option>
                            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/10">
                                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">User Details</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Role</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Manager</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Permissions</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Status</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Created At</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center">
                                        <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                    </td>
                                </tr>
                            ) : currentUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                currentUsers.map((u) => (
                                    <tr key={u.id} className="border-b border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors group">
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm text-xs">
                                                    {u.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-white leading-tight">{u.username}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Mail className="w-3 h-3" />
                                                        {u.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getRoleBadgeColor(u.role)} uppercase tracking-wider`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-xs text-slate-900 dark:text-white font-medium">
                                            {u.manager_name || <span className="text-slate-500 dark:text-slate-400 italic">None</span>}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {u.role === 'admin' ? (
                                                    <span className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded font-bold uppercase">All</span>
                                                ) : (
                                                    <>
                                                        {u.meta_access === 1 && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase border border-blue-200/20">Meta</span>}
                                                        {u.meta_publish === 1 && <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase border border-indigo-200/20">Publish</span>}
                                                        {u.google_access === 1 && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase border border-amber-200/20">Google</span>}
                                                        {u.whatsapp_access === 1 && <span className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-bold uppercase border border-green-200/20">WhatsApp</span>}
                                                        {u.linkedin_access === 1 && <span className="text-[9px] bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded font-bold uppercase border border-pink-200/20">LinkedIn</span>}
                                                        {u.media_access === 1 && <span className="text-[9px] bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded font-bold uppercase border border-violet-200/20">Media</span>}
                                                        {u.reports_access === 1 && <span className="text-[9px] bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold uppercase border border-rose-200/20">Reports</span>}
                                                        {u.meta_access !== 1 && u.meta_publish !== 1 && u.google_access !== 1 && u.whatsapp_access !== 1 && u.linkedin_access !== 1 && u.media_access !== 1 && u.reports_access !== 1 && (
                                                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">None</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeColor(u.status)} uppercase tracking-wider`}>
                                                {u.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                                            {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-2">
                                            {(user?.role === 'admin' || (user?.role === 'manager' && u.manager_id === user.id)) && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEditClick(u)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded transition-colors"
                                                        title="Edit User"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {u.id !== user?.id && (
                                                        <button
                                                            onClick={() => handleDelete(u.id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/20 rounded transition-colors"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && filteredUsers.length > 0 && (
                    <div className="px-4 py-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Showing <span className="font-medium text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="font-medium text-slate-900 dark:text-white">{filteredUsers.length}</span>
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit User Modal */}
            {(isEditModalOpen || isCreateModalOpen) && (
                <div
                    className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isEditModalOpen ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                    {isEditModalOpen ? <UserCog className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                                        {isEditModalOpen ? `Edit User: ${currentUser?.username || ''}` : 'Add New User'}
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {isEditModalOpen ? currentUser?.email : 'Create an account and choose what this user can access.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
                                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all p-2 rounded-lg shrink-0"
                                title="Close (Esc)"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                                {/* Left: Account Details */}
                                <div className="lg:col-span-2 space-y-4">
                                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <User className="w-3.5 h-3.5" /> Account Details
                                    </h3>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            <input
                                                type="text"
                                                name="username"
                                                value={formData.username}
                                                onChange={handleInputChange}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                                placeholder="Enter full name"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                                placeholder="Enter email"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            {isEditModalOpen ? 'New Password' : 'Password'}
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                autoComplete="new-password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                                placeholder={isEditModalOpen ? 'Leave empty to keep current' : '••••••••'}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                                title={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Role</label>
                                            <select
                                                name="role"
                                                value={formData.role}
                                                onChange={handleInputChange}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer transition-all"
                                            >
                                                {availableRoles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Status</label>
                                            <select
                                                name="status"
                                                value={formData.status}
                                                onChange={handleInputChange}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer transition-all"
                                            >
                                                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {formData.role !== 'admin' && formData.role !== 'head' && isAdminUser && (
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Assign Manager</label>
                                            <div className="relative">
                                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                                                <select
                                                    name="manager_id"
                                                    value={formData.manager_id || ''}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer transition-all"
                                                >
                                                    <option value="">No Manager / None</option>
                                                    {managers.map(m => (
                                                        <option key={m.id} value={m.id}>{m.username}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Access Permissions */}
                                <div className="lg:col-span-3 space-y-4 lg:border-l lg:border-slate-200 dark:lg:border-white/10 lg:pl-6">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <KeyRound className="w-3.5 h-3.5" /> Access Permissions
                                        </h3>
                                        {formData.role !== 'admin' && (
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setAllPermissions(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:border-blue-500/50 transition-all">
                                                    <CheckCheck className="w-3.5 h-3.5" /> Select all
                                                </button>
                                                <button type="button" onClick={() => setAllPermissions(false)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:border-rose-500/50 transition-all">
                                                    <Eraser className="w-3.5 h-3.5" /> Clear
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {formData.role === 'admin' ? (
                                        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-start gap-3">
                                            <ShieldCheck className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-slate-900 dark:text-white leading-relaxed">
                                                <span className="font-bold">Administrators have full access</span> to every module. No permissions need to be selected.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {[...new Set(grantablePermissions.map((p) => p.group))].map((group) => (
                                                <div key={group} className="space-y-2">
                                                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{group}</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                        {grantablePermissions.filter((p) => p.group === group).map((perm) => {
                                                            const Icon = perm.icon;
                                                            const enabled = !!formData[perm.key];
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={perm.key}
                                                                    role="switch"
                                                                    aria-checked={enabled}
                                                                    onClick={() => togglePermission(perm.key)}
                                                                    className={`text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${enabled
                                                                        ? PERMISSION_COLORS[perm.color]
                                                                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-500 dark:text-slate-400'}`}
                                                                >
                                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${enabled ? 'bg-white/70 dark:bg-white/10' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
                                                                        <Icon className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className={`text-xs font-bold ${enabled ? '' : 'text-slate-900 dark:text-white'}`}>{perm.label}</div>
                                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{perm.desc}</div>
                                                                    </div>
                                                                    <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${enabled ? 'bg-current' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}

                                            {formData.role === 'head' && (
                                                <div className="flex items-start gap-2 p-3 rounded-xl border border-teal-500/30 bg-teal-500/5 text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
                                                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-teal-500" />
                                                    <span><span className="font-bold">Head</span> always sees every Task, MoM and Daily Task of all Managers and Employees, and has their own too. Choose any other modules below.</span>
                                                </div>
                                            )}
                                            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                                                <span>
                                                    {isAdminUser
                                                        ? 'Media Library and Reports stay hidden for every Manager and User until you switch them on here.'
                                                        : 'Media Library and Reports access can only be given by an Admin.'}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/60 shrink-0">
                            <button
                                onClick={closeModal}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all text-sm font-semibold disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={isEditModalOpen ? handleSaveEdit : handleCreateUser}
                                disabled={saving}
                                className={`px-5 py-2 rounded-xl text-white transition-all text-sm font-semibold shadow-md disabled:opacity-60 ${isEditModalOpen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                                {saving ? 'Saving...' : (isEditModalOpen ? 'Save Changes' : 'Create User')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
