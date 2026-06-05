import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Pause,
  Play,
  RefreshCw,
  AlertCircle,
  Globe,
  CheckCircle2,
  XCircle,
  Search,
  Sliders
} from 'lucide-react';
import axios from 'axios';

const WASchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/whatsapp/campaigns/schedules', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSchedules(response.data.schedules || []);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (campaignId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/whatsapp/campaigns/${campaignId}/pause`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        // Refresh local state
        fetchSchedules();
      }
    } catch (err) {
      console.error('Error pausing campaign:', err);
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleResume = async (campaignId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/whatsapp/campaigns/${campaignId}/resume`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        // Refresh local state
        fetchSchedules();
      }
    } catch (err) {
      console.error('Error resuming campaign:', err);
      alert(err.response?.data?.message || err.message);
    }
  };

  const filteredSchedules = schedules.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.template_name && item.template_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' ? true : item.campaign_type === filterType;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status) => {
    const base = "px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ";
    switch (status) {
      case 'queued':
        return <span className={`${base} bg-blue-500/10 text-blue-400 border border-blue-500/20`}>Queued</span>;
      case 'running':
        return <span className={`${base} bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse`}>Running</span>;
      case 'paused':
        return <span className={`${base} bg-amber-500/10 text-amber-400 border border-amber-500/20`}>Paused</span>;
      case 'draft':
        return <span className={`${base} bg-slate-500/10 text-slate-400 border border-slate-500/20`}>Draft</span>;
      default:
        return <span className={`${base} bg-red-500/10 text-red-400 border border-red-500/20`}>{status}</span>;
    }
  };

  return (
    <div className="p-8 space-y-8 bg-transparent text-slate-800 dark:text-slate-100">
      {/* Header Block */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500 border border-indigo-500/20">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Campaign Schedules</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">
              Manage Delayed & Recurring BullMQ Queues
            </p>
          </div>
        </div>

        <button
          onClick={fetchSchedules}
          className="p-2.5 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-300 transition-all shadow-sm"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[1.5rem] p-4 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Sliders className="w-4 h-4 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="scheduled">One-Time Scheduled</option>
            <option value="recurring">Recurring (Cron)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-400 font-medium">Loading execution schedules...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-slate-400">{error}</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] bg-white dark:bg-white/[0.01] border border-dashed border-slate-200 dark:border-white/10 rounded-[2rem] p-8 text-center">
          <Calendar className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">No active schedules found</h3>
          <p className="text-sm text-slate-600 dark:text-slate-500 mt-1 max-w-sm">
            Create a scheduled or recurring campaign using the WhatsApp Campaigns creation wizard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {filteredSchedules.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gradient-to-b dark:from-white/[0.04] dark:to-white/[0.01] border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 shadow-md dark:shadow-xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 hover:shadow-lg transition-all duration-300"
            >
              <div>
                {/* Badge Header Row */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg border ${item.campaign_type === 'recurring'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                    }`}>
                    {item.campaign_type === 'recurring' ? 'RECURRING' : 'ONE-TIME'}
                  </span>
                  {getStatusBadge(item.status)}
                </div>

                {/* Campaign Name */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 truncate">{item.name}</h3>

                {/* Details */}
                <div className="space-y-2 mt-4 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 dark:text-slate-500 w-24">Template:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate flex-1">{item.template_name || `ID: ${item.template_id}`}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 dark:text-slate-500 w-24">Contact List:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate flex-1">{item.list_name || `ID: ${item.contact_list_id}`}</span>
                  </div>
                  {item.campaign_type === 'recurring' && (
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 dark:text-slate-500 w-24">Cron Pattern:</span>
                      <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 rounded font-mono text-purple-600 dark:text-purple-400 text-[11px]">{item.cron_expression}</code>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 dark:text-slate-500 w-24 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Timezone:
                    </span>
                    <span className="font-medium text-slate-600 dark:text-slate-400">{item.timezone}</span>
                  </div>

                  {/* BullMQ Sync Telemetry Status */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-white/5 mt-3">
                    <span className="text-slate-400 dark:text-slate-500 w-24 flex items-center gap-1">
                      Queue Sync:
                    </span>
                    <span className="flex items-center gap-1">
                      {item.isRegistered ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">Active in BullMQ</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-slate-500 dark:text-slate-400">Suspended / Pending</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Exec and Actions */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col space-y-4">
                {item.nextRun && (
                  <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      <span>Next execution:</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(item.nextRun).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}

                {/* Buttons controls */}
                <div className="flex space-x-3">
                  {(item.status === 'queued' || item.status === 'running') ? (
                    <button
                      onClick={() => handlePause(item.id)}
                      className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 rounded-xl text-xs font-bold tracking-wide transition-all"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Schedule</span>
                    </button>
                  ) : (item.status === 'paused' || item.status === 'draft') ? (
                    <button
                      onClick={() => handleResume(item.id)}
                      className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold tracking-wide transition-all"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume Schedule</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WASchedules;
