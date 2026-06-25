import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Database,
    Calendar,
    MessageCircle,
    Filter,
    Clock,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    User,
    Phone,
    SlidersHorizontal,
    MessageSquare,
    AlertCircle,
    X
} from 'lucide-react';

const WAExternalTracker = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [sourceApp, setSourceApp] = useState('');
    const [sourceUserId, setSourceUserId] = useState('');
    const [recipientNumber, setRecipientNumber] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [status, setStatus] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const limit = 15;

    // Chat Modal States
    const [selectedPhone, setSelectedPhone] = useState(null);
    const [conversation, setConversation] = useState([]);
    const [loadingChat, setLoadingChat] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false);

    // Allowed applications
    const allowedApps = [
        { id: 'website', label: 'Website' },
        { id: 'crm', label: 'CRM' },
        { id: 'job_portal', label: 'Job Portal' },
        { id: 'wira_ai', label: 'WIRA AI' },
        { id: 'ats', label: 'ATS' }
    ];

    const fetchMessages = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            const params = {
                page,
                limit,
                source_app: sourceApp || undefined,
                source_user_id: sourceUserId || undefined,
                recipient_number: recipientNumber || undefined,
                template_name: templateName || undefined,
                status: status || undefined,
                date_from: dateFrom ? `${dateFrom} 00:00:00` : undefined,
                date_to: dateTo ? `${dateTo} 23:59:59` : undefined
            };

            const response = await axios.get('/api/whatsapp/dashboard/external-messages', {
                params,
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                setMessages(response.data.messages || []);
                setTotalPages(response.data.totalPages || 1);
                setTotalRecords(response.data.total || 0);
            }
        } catch (err) {
            console.error('Error fetching external messages:', err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [page, sourceApp, status]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchMessages();
    };

    const handleClearFilters = () => {
        setSourceApp('');
        setSourceUserId('');
        setRecipientNumber('');
        setTemplateName('');
        setStatus('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const openChatConversation = async (phone) => {
        try {
            setSelectedPhone(phone);
            setShowChatModal(true);
            setLoadingChat(true);
            setConversation([]);

            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/whatsapp/dashboard/external-conversation/${phone}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                setConversation(response.data.conversation || []);
            }
        } catch (err) {
            console.error('Error fetching conversation details:', err);
        } finally {
            setLoadingChat(false);
        }
    };

    const formatTimestamp = (dateString) => {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
        return d.toLocaleString();
    };

    const StatusBadge = ({ status }) => {
        const statuses = {
            sent: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            delivered: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
            read: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            failed: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
            replied: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
        };

        const currentStyle = statuses[String(status).toLowerCase()] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';

        return (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentStyle}`}>
                {status}
            </span>
        );
    };

    const AppBadge = ({ app }) => {
        const apps = {
            website: 'bg-sky-500/10 text-sky-500 border-sky-500/10',
            crm: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10',
            job_portal: 'bg-amber-500/10 text-amber-500 border-amber-500/10',
            wira_ai: 'bg-purple-500/10 text-purple-500 border-purple-500/10',
            ats: 'bg-rose-500/10 text-rose-500 border-rose-500/10'
        };
        const currentStyle = apps[String(app).toLowerCase()] || 'bg-slate-500/10 text-slate-500 border-slate-500/10';

        return (
            <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${currentStyle}`}>
                {app ? app.replace('_', ' ').toUpperCase() : 'N/A'}
            </span>
        );
    };

    return (
        <div className="p-4 md:p-5 space-y-5">
            {/* Header Block */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                        <Database className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">External Tracker</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">In-House Apps Integrations Logs</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={fetchMessages}
                        disabled={loading}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 hover:text-green-500 transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-white/5 pb-3">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Search Filters</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Source App Filter */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Source App</label>
                        <select
                            value={sourceApp}
                            onChange={(e) => setSourceApp(e.target.value)}
                            className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-200"
                        >
                            <option value="" className="bg-white dark:bg-slate-900">All Applications</option>
                            {allowedApps.map(app => (
                                <option key={app.id} value={app.id} className="bg-white dark:bg-slate-900">{app.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Delivery Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-200"
                        >
                            <option value="" className="bg-white dark:bg-slate-900">All Statuses</option>
                            <option value="sent" className="bg-white dark:bg-slate-900">Sent</option>
                            <option value="delivered" className="bg-white dark:bg-slate-900">Delivered</option>
                            <option value="read" className="bg-white dark:bg-slate-900">Read</option>
                            <option value="failed" className="bg-white dark:bg-slate-900">Failed</option>
                            <option value="replied" className="bg-white dark:bg-slate-900">Replied</option>
                        </select>
                    </div>

                    {/* Phone Number Filter */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recipient Phone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="E.g. 919999999999"
                                value={recipientNumber}
                                onChange={(e) => setRecipientNumber(e.target.value)}
                                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 w-full text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    {/* User ID Filter */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Source User ID</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="E.g. 45"
                                value={sourceUserId}
                                onChange={(e) => setSourceUserId(e.target.value)}
                                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 w-full text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Template Name Filter */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Template Name</label>
                        <div className="relative">
                            <MessageCircle className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search template..."
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 w-full text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    {/* Date From */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date From</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 w-full text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    {/* Date To */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date To</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 w-full text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-end space-x-2">
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                        >
                            <Search className="w-3.5 h-3.5" />
                            <span>Apply Search</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 transition-all cursor-pointer"
                            title="Clear Filters"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </form>

            {/* Data Table */}
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                        <p className="mt-3 text-xs text-slate-500 font-bold animate-pulse uppercase tracking-wider">Loading tracked records...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                        <h4 className="font-bold text-slate-900 dark:text-white">Fetch Error</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">{error}</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                        <h4 className="font-bold text-slate-500 dark:text-slate-400 text-sm">No Tracked Messages Found</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">No log entries fit the specified filter configuration parameters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 dark:bg-white/[0.01]">
                                    <th className="py-4 px-6">Source App</th>
                                    <th className="py-4 px-6">Sender User</th>
                                    <th className="py-4 px-6">Recipient Phone</th>
                                    <th className="py-4 px-6">Template</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6">Sent Time</th>
                                    <th className="py-4 px-6">Reply Status</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-slate-200">
                                {messages.map((msg) => (
                                    <tr key={msg.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="py-4 px-6">
                                            <AppBadge app={msg.source_app} />
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold">{msg.source_user_name || 'N/A'}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">ID: {msg.source_user_id || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 font-bold font-mono">
                                            {msg.recipient_number}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{msg.template_name}</span>
                                                {msg.template_language && (
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Lang: {msg.template_language}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <StatusBadge status={msg.status} />
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 font-semibold">
                                            {formatTimestamp(msg.sent_at)}
                                        </td>
                                        <td className="py-4 px-6 max-w-xs truncate">
                                            {msg.direction === 'incoming' ? (
                                                <span className="text-emerald-500 font-bold flex items-center">
                                                    <ArrowRight className="w-3.5 h-3.5 mr-1" />
                                                    Incoming Message
                                                </span>
                                            ) : msg.status === 'replied' ? (
                                                <span className="text-purple-500 font-bold">Replied</span>
                                            ) : (
                                                <span className="text-slate-400">No Reply</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button
                                                onClick={() => openChatConversation(msg.recipient_number)}
                                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                            >
                                                View Conversation
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer Pagination */}
                {totalPages > 1 && (
                    <div className="border-t border-slate-100 dark:border-white/5 px-6 py-4 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-semibold">
                            Showing <span className="font-bold text-slate-700 dark:text-slate-300">{messages.length}</span> of <span className="font-bold text-slate-700 dark:text-slate-300">{totalRecords}</span> entries
                        </span>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-4 text-xs font-bold">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Conversation Log Modal */}
            {showChatModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start leading-none">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Conversation Logs</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Phone: {selectedPhone}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowChatModal(false)}
                                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-slate-500 transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body: Conversation list */}
                        <div className="p-6 h-[400px] overflow-y-auto bg-slate-50/50 dark:bg-black/20 space-y-4">
                            {loadingChat ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="w-8 h-8 border-2 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                                    <p className="mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">Syncing history...</p>
                                </div>
                            ) : conversation.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">
                                    No chat messages exchanged for this number.
                                </div>
                            ) : (
                                conversation.map((chat) => {
                                    const isOutgoing = chat.direction === 'outgoing';
                                    return (
                                        <div
                                            key={chat.id}
                                            className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-2xl p-4 shadow-sm border text-xs leading-relaxed ${
                                                    isOutgoing
                                                        ? 'bg-blue-600 border-blue-500 text-white rounded-tr-none'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-none'
                                                }`}
                                            >
                                                {/* Header info */}
                                                <div className="flex items-center justify-between space-x-4 mb-2 border-b pb-1 opacity-75 border-current/10 text-[10px]">
                                                    <span className="font-bold uppercase tracking-wider">
                                                        {isOutgoing ? `Outgoing (${chat.source_app || 'Direct'})` : 'Incoming Reply'}
                                                    </span>
                                                    <span className="font-medium">
                                                        {chat.source_user_name ? `${chat.source_user_name} ` : ''}
                                                        {new Date(chat.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                {/* Message content */}
                                                {isOutgoing ? (
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-[10px] bg-white/10 px-2 py-0.5 rounded inline-block">
                                                            Template: {chat.template_name}
                                                        </p>
                                                        {chat.template_params_json && (
                                                            <div className="bg-black/10 rounded-lg p-2 font-mono text-[10px] leading-tight space-y-0.5 text-blue-100">
                                                                {Object.entries(chat.template_params_json).map(([k, v]) => (
                                                                    <div key={k}>
                                                                        <span className="font-bold">{k}:</span> {v}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="whitespace-pre-line">{chat.received_message_text}</p>
                                                )}

                                                {/* Error logger if failed */}
                                                {chat.status === 'failed' && chat.error_message && (
                                                    <div className="mt-2 text-[10px] bg-red-500/20 text-red-200 rounded p-1 border border-red-500/30">
                                                        Error: {chat.error_message}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
                            <button
                                onClick={() => setShowChatModal(false)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                            >
                                Close Conversation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WAExternalTracker;
