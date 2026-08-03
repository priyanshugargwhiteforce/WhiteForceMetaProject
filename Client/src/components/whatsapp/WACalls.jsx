import { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Search,
  RefreshCw,
  Sliders,
  Calendar,
  X,
  Trash2,
  Eye,
  Info,
  CheckCircle2,
  AlertTriangle,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Code
} from 'lucide-react';
import axios from 'axios';

const WACalls = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({
    totalCalls: 0,
    connectedCalls: 0,
    missedCalls: 0,
    userInitiated: 0,
    businessInitiated: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchCalls = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      const params = {
        page,
        limit: pagination.limit,
        search: searchTerm,
        event: eventFilter,
        direction: directionFilter,
        startDate,
        endDate
      };

      const response = await axios.get('/api/whatsapp/calls', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      if (response.data.success) {
        setCalls(response.data.calls || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
        if (response.data.summary) {
          setSummary(response.data.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching call logs:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch call logs');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, searchTerm, eventFilter, directionFilter, startDate, endDate]);

  useEffect(() => {
    fetchCalls(1);
  }, [fetchCalls]);

  const handleDeleteCall = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this call log?')) return;

    try {
      setDeletingId(id);
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/whatsapp/calls/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCalls(prev => prev.filter(c => c.id !== id));
        fetchCalls(pagination.page);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete call log');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const renderStatusBadge = (eventStr) => {
    const ev = (eventStr || '').toLowerCase();
    if (ev === 'connect' || ev === 'connected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Connected
        </span>
      );
    }
    if (ev === 'terminate' || ev === 'ended' || ev === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
          <PhoneOff className="w-3.5 h-3.5" />
          Terminated
        </span>
      );
    }
    if (ev === 'missed' || ev === 'no_answer') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <PhoneMissed className="w-3.5 h-3.5" />
          Missed Call
        </span>
      );
    }
    if (ev === 'reject' || ev === 'rejected' || ev === 'failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5" />
          Rejected / Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 capitalize">
        <PhoneCall className="w-3.5 h-3.5" />
        {eventStr || 'Event'}
      </span>
    );
  };

  const renderDirectionBadge = (dir) => {
    if (dir === 'USER_INITIATED') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
          Incoming
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
        <PhoneOutgoing className="w-3.5 h-3.5 text-blue-500" />
        Outgoing
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">WhatsApp Call Logs</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monitor and inspect real-time WhatsApp audio call webhooks, status events & caller details
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCalls(pagination.page)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Calls Logged</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {summary.totalCalls}
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Phone className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Connected Calls</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {summary.connectedCalls}
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Missed / Rejected</p>
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {summary.missedCalls}
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <PhoneMissed className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Incoming vs Outgoing</p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              <span className="text-emerald-500">{summary.userInitiated} In</span> / <span className="text-blue-500">{summary.businessInitiated} Out</span>
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <PhoneIncoming className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by caller name, number, or call ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Event Filter */}
          <div className="w-full md:w-44">
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white transition-all cursor-pointer"
            >
              <option value="all">All Events</option>
              <option value="connect">Connected</option>
              <option value="terminate">Terminated</option>
              <option value="missed">Missed</option>
              <option value="reject">Rejected</option>
            </select>
          </div>

          {/* Direction Filter */}
          <div className="w-full md:w-44">
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white transition-all cursor-pointer"
            >
              <option value="all">All Directions</option>
              <option value="USER_INITIATED">Incoming (User)</option>
              <option value="BUSINESS_INITIATED">Outgoing (Business)</option>
            </select>
          </div>
        </div>

        {/* Date bounds filter */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-slate-900 dark:text-white text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-slate-900 dark:text-white text-xs"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-emerald-500 hover:underline ml-auto"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
            <p className="text-sm font-medium">Loading call logs...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <PhoneOff className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white">No Call Logs Found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              When WhatsApp audio calls are initiated or completed on your registered business number, webhook events will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Caller / Contact</th>
                  <th className="py-3.5 px-4">Direction</th>
                  <th className="py-3.5 px-4">Event Status</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {calls.map((call) => {
                  const initial = (call.caller_name || call.caller_phone || 'C').charAt(0).toUpperCase();

                  return (
                    <tr
                      key={call.id}
                      onClick={() => setSelectedCall(call)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/20 flex-shrink-0">
                            {initial}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">
                              {call.caller_name || 'Unknown Contact'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              +{call.caller_phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {renderDirectionBadge(call.direction)}
                      </td>

                      <td className="py-3.5 px-4">
                        {renderStatusBadge(call.event)}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatTimestamp(call.call_timestamp || call.created_at)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatDuration(call.duration)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedCall(call); }}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Inspect Call Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteCall(call.id, e)}
                            disabled={deletingId === call.id}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total calls)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchCalls(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="p-1.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold px-2 text-slate-700 dark:text-slate-200">
                {pagination.page}
              </span>
              <button
                onClick={() => fetchCalls(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Call Details Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Call Log Inspector</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedCall.call_id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-xs text-slate-400 font-medium">Caller Name</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {selectedCall.caller_name || 'N/A'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-xs text-slate-400 font-medium">Caller Phone</p>
                <p className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                  +{selectedCall.caller_phone}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-xs text-slate-400 font-medium">Receiver Phone</p>
                <p className="font-mono text-slate-900 dark:text-white mt-0.5">
                  +{selectedCall.receiver_phone || 'N/A'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-xs text-slate-400 font-medium">Direction & Event</p>
                <div className="flex items-center gap-2 mt-1">
                  {renderDirectionBadge(selectedCall.direction)}
                  {renderStatusBadge(selectedCall.event)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-xs text-slate-400 font-medium">Call Timestamp</p>
                <p className="text-slate-900 dark:text-white text-xs mt-0.5">
                  {formatTimestamp(selectedCall.call_timestamp || selectedCall.created_at)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-xs text-slate-400 font-medium">Call Duration</p>
                <p className="font-mono text-slate-900 dark:text-white mt-0.5">
                  {formatDuration(selectedCall.duration)}
                </p>
              </div>
            </div>

            {/* Session / SDP Details */}
            {selectedCall.session_data && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Code className="w-4 h-4 text-emerald-500" />
                  <span>Session Payload (SDP / WebRTC Offer)</span>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap border border-slate-800">
                  {typeof selectedCall.session_data === 'object'
                    ? JSON.stringify(selectedCall.session_data, null, 2)
                    : selectedCall.session_data}
                </pre>
              </div>
            )}

            {/* Raw Webhook Payload */}
            {selectedCall.raw_payload && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span>Raw Webhook Payload JSON</span>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap border border-slate-800">
                  {typeof selectedCall.raw_payload === 'object'
                    ? JSON.stringify(selectedCall.raw_payload, null, 2)
                    : selectedCall.raw_payload}
                </pre>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WACalls;
