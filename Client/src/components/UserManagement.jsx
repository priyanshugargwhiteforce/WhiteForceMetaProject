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
    Lock
} from 'lucide-react';

const ROLES = ['admin', 'user', 'manager', 'hr', 'sales', 'seo', 'marketing'];
const STATUSES = ['active', 'hold', 'rejected'];

const UserManagement = () => {
    const { user, token } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modals state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user',
        status: 'active',
        meta_access: false,
        google_access: false,
        whatsapp_access: false,
        linkedin_access: false
    });

    // Filtering, Searching & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Increased items per page since table is denser

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/users', {
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
            linkedin_access: !!u.linkedin_access
        });
        setIsEditModalOpen(true);
    };

    const handleCreateClick = () => {
        setFormData({
            username: '',
            email: '',
            password: '',
            role: 'user',
            status: 'active',
            meta_access: false,
            google_access: false,
            whatsapp_access: false,
            linkedin_access: false
        });
        setIsCreateModalOpen(true);
    };

    const handleSaveEdit = async () => {
        try {
            const updatePayload = {
                role: formData.role,
                status: formData.status,
                meta_access: formData.meta_access,
                google_access: formData.google_access,
                whatsapp_access: formData.whatsapp_access,
                linkedin_access: formData.linkedin_access
            };
            if (formData.password) updatePayload.password = formData.password;
            if (formData.username) updatePayload.username = formData.username;
            if (formData.email) updatePayload.email = formData.email;

            await axios.put(`http://localhost:5000/api/users/${currentUser.id}`, updatePayload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsEditModalOpen(false);
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to update user');
        }
    };

    const handleCreateUser = async () => {
        try {
            await axios.post('http://localhost:5000/api/users', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsCreateModalOpen(false);
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to create user');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await axios.delete(`http://localhost:5000/api/users/${id}`, {
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
            <div className="flex justify-between items-center bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-color)] shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">User Management</h1>
                    <p className="text-[var(--text-secondary)] mt-0.5 text-xs">Manage access, roles, and accounts.</p>
                </div>
                <button
                    onClick={handleCreateClick}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Add User</span>
                </button>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-500 p-3 rounded-lg flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Filters & Search */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col md:flex-row gap-3 items-center shadow-sm">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-blue-500 transition-all"
                    />
                </div>
                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:w-40">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <select
                            value={filterRole}
                            onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="All">All Roles</option>
                            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                    </div>
                    <div className="relative flex-1 md:w-40">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <select
                            value={filterStatus}
                            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="All">All Statuses</option>
                            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]">
                                <th className="px-4 py-3 font-semibold text-[var(--text-secondary)]">User Details</th>
                                <th className="px-4 py-3 font-semibold text-[var(--text-secondary)]">Role</th>
                                <th className="px-4 py-3 font-semibold text-[var(--text-secondary)]">Permissions</th>
                                <th className="px-4 py-3 font-semibold text-[var(--text-secondary)]">Status</th>
                                <th className="px-4 py-3 font-semibold text-[var(--text-secondary)] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center">
                                        <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                    </td>
                                </tr>
                            ) : currentUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-[var(--text-secondary)]">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                currentUsers.map((u) => (
                                    <tr key={u.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors group">
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm text-xs">
                                                    {u.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-[var(--text-primary)] leading-tight">{u.username}</div>
                                                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
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
                                        <td className="px-4 py-2">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {u.role === 'admin' ? (
                                                    <span className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded font-bold uppercase">All</span>
                                                ) : (
                                                    <>
                                                        {u.meta_access === 1 && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase border border-blue-200/20">Meta</span>}
                                                        {u.google_access === 1 && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase border border-amber-200/20">Google</span>}
                                                        {u.whatsapp_access === 1 && <span className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-bold uppercase border border-green-200/20">WhatsApp</span>}
                                                        {u.linkedin_access === 1 && <span className="text-[9px] bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded font-bold uppercase border border-pink-200/20">LinkedIn</span>}
                                                        {u.meta_access !== 1 && u.google_access !== 1 && u.whatsapp_access !== 1 && u.linkedin_access !== 1 && (
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
                                        <td className="px-4 py-2 text-xs text-[var(--text-secondary)]">
                                            {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && filteredUsers.length > 0 && (
                    <div className="px-4 py-2 border-t border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-tertiary)]">
                        <span className="text-xs text-[var(--text-secondary)]">
                            Showing <span className="font-medium text-[var(--text-primary)]">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-[var(--text-primary)]">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="font-medium text-[var(--text-primary)]">{filteredUsers.length}</span>
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit User Modal */}
            {(isEditModalOpen || isCreateModalOpen) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]">
                            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEditModalOpen ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                    {isEditModalOpen ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                </div>
                                <span>{isEditModalOpen ? 'Edit User Profile' : 'Register New User'}</span>
                            </h2>
                            <button
                                onClick={() => { setIsEditModalOpen(false); setIsCreateModalOpen(false); }}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-all p-1.5 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Username */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">User Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="Enter full name"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="Enter email"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                    {isEditModalOpen ? 'New Password (leave empty to keep current)' : 'Password'}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {/* Role and Status Group */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Role */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">User Role</label>
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer transition-all"
                                    >
                                        {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                    </select>
                                </div>

                                {/* Status */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Account Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer transition-all"
                                    >
                                        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Access Permissions Section */}
                            {formData.role !== 'admin' && (
                                <div className="border-t border-[var(--border-color)] pt-4 mt-2 space-y-2">
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Access Permissions</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.meta_access
                                            ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400 font-semibold'
                                            : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}>
                                            <input
                                                type="checkbox"
                                                name="meta_access"
                                                checked={!!formData.meta_access}
                                                onChange={handleInputChange}
                                                className="rounded border-[var(--border-color)] text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                            />
                                            <span className="text-xs whitespace-nowrap">Meta Ads</span>
                                        </label>
                                        <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.google_access
                                            ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400 font-semibold'
                                            : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}>
                                            <input
                                                type="checkbox"
                                                name="google_access"
                                                checked={!!formData.google_access}
                                                onChange={handleInputChange}
                                                className="rounded border-[var(--border-color)] text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                            />
                                            <span className="text-xs whitespace-nowrap">Google Ads</span>
                                        </label>
                                        <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.whatsapp_access
                                            ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400 font-semibold'
                                            : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}>
                                            <input
                                                type="checkbox"
                                                name="whatsapp_access"
                                                checked={!!formData.whatsapp_access}
                                                onChange={handleInputChange}
                                                className="rounded border-[var(--border-color)] text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                            />
                                            <span className="text-xs whitespace-nowrap">WhatsApp Manager</span>
                                        </label>
                                        <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.linkedin_access
                                            ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400 font-semibold'
                                            : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}>
                                            <input
                                                type="checkbox"
                                                name="linkedin_access"
                                                checked={!!formData.linkedin_access}
                                                onChange={handleInputChange}
                                                className="rounded border-[var(--border-color)] text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                            />
                                            <span className="text-xs whitespace-nowrap">LinkedIn Ads</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-[var(--border-color)] flex justify-end gap-3 bg-[var(--bg-tertiary)]">
                            <button
                                onClick={() => { setIsEditModalOpen(false); setIsCreateModalOpen(false); }}
                                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-all text-sm font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={isEditModalOpen ? handleSaveEdit : handleCreateUser}
                                className={`px-5 py-2 rounded-xl text-white transition-all text-sm font-semibold shadow-md ${isEditModalOpen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                                {isEditModalOpen ? 'Save Changes' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
