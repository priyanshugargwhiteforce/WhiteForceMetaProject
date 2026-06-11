import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';
import {
  TrendingUp,
  Plus,
  Calendar,
  Users,
  Trash2,
  History,
  User,
  Check,
  X,
  MessageCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const WAChannels = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal / Drawer States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [selectedChannel, setSelectedChannel] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  // Create Channel Form State
  const [newChannelName, setNewChannelName] = useState("");
  const [newManagerName, setNewManagerName] = useState("");
  const [createSubmitLoading, setCreateSubmitLoading] = useState(false);

  // Update Form State
  const [updateChannelId, setUpdateChannelId] = useState("");
  const [updateMemberCount, setUpdateMemberCount] = useState("");
  // default to today's date formatted as YYYY-MM-DD
  const [updateDate, setUpdateDate] = useState(new Date().toISOString().split('T')[0]);
  const [updateSubmitLoading, setUpdateSubmitLoading] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/whatsapp/channels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setChannels(res.data.channels);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim() || !newManagerName.trim()) return;

    try {
      setCreateSubmitLoading(true);
      const res = await axios.post('/api/whatsapp/channels', {
        channel_name: newChannelName,
        manager_name: newManagerName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setNewChannelName("");
        setNewManagerName("");
        setIsCreateOpen(false);
        fetchChannels();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create channel profile");
    } finally {
      setCreateSubmitLoading(false);
    }
  };

  const handleDeleteChannel = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will permanently erase all daily member logs for this channel.`)) {
      return;
    }

    try {
      const res = await axios.delete(`/api/whatsapp/channels/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        fetchChannels();
        if (isHistoryOpen && selectedChannel?.id === id) {
          setIsHistoryOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete channel");
    }
  };

  const handleOpenUpdate = (channel = null) => {
    if (channel) {
      setUpdateChannelId(channel.id);
      // Pre-fill today's current count if it exists to make updating faster
      setUpdateMemberCount(channel.latest_member_count || "");
    } else {
      setUpdateChannelId(channels[0]?.id || "");
      setUpdateMemberCount("");
    }
    setUpdateDate(new Date().toISOString().split('T')[0]);
    setIsUpdateOpen(true);
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (!updateChannelId || !updateMemberCount) return;

    try {
      setUpdateSubmitLoading(true);
      const res = await axios.post(`/api/whatsapp/channels/${updateChannelId}/updates`, {
        member_count: parseInt(updateMemberCount, 10),
        update_date: updateDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setIsUpdateOpen(false);
        setUpdateMemberCount("");
        fetchChannels();

        // If history view is open for the updated channel, refresh its logs
        if (isHistoryOpen && selectedChannel?.id === parseInt(updateChannelId, 10)) {
          fetchHistory(updateChannelId);
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to save daily count");
    } finally {
      setUpdateSubmitLoading(false);
    }
  };

  const fetchHistory = async (channelId) => {
    try {
      setHistoryLoading(true);
      const res = await axios.get(`/api/whatsapp/channels/${channelId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHistoryData(res.data.history);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load channel update history logs.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = (channel) => {
    setSelectedChannel(channel);
    setHistorySearch("");
    setIsHistoryOpen(true);
    fetchHistory(channel.id);
  };

  const handleDeleteHistoryEntry = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this specific daily log entry? This will recalculate the channel's stats.")) {
      return;
    }

    try {
      const res = await axios.delete(`/api/whatsapp/channels/updates/${entryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        // Refresh history list
        if (selectedChannel) {
          fetchHistory(selectedChannel.id);
        }
        // Refresh dashboard statistics
        fetchChannels();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete update log");
    }
  };

  // Compute aggregate indicators
  const stats = useMemo(() => {
    const totalChannels = channels.length;
    const combinedMembers = channels.reduce((acc, c) => acc + (c.latest_member_count || 0), 0);
    const totalGrowth = channels.reduce((acc, c) => acc + (c.total_growth || 0), 0);
    return { totalChannels, combinedMembers, totalGrowth };
  }, [channels]);

  // Filter history logs dynamically based on search
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historyData;
    return historyData.filter(h =>
      h.update_date.includes(historySearch) ||
      h.member_count.toString().includes(historySearch)
    );
  }, [historyData, historySearch]);

  const primaryGreen = isDark ? '#10b981' : '#059669';

  return (
    <div className="p-4 md:p-5 space-y-4">
      {/* Title & Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-start leading-none">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Channel Tracker</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">WhatsApp Member Tracker & Stats</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchChannels}
            className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 hover:bg-emerald-500/20 transition-all active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Channel</span>
          </button>

          <button
            onClick={() => handleOpenUpdate()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-95"
            disabled={channels.length === 0}
          >
            <Calendar className="w-4 h-4" />
            <span>Log Daily Count</span>
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="space-y-8">

        {/* Aggregate Stat Banners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Stat Card 1 */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-6 rounded-2xl flex items-center justify-between group shadow-sm hover:shadow-md transition-all duration-300">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tracked Channels</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white group-hover:scale-105 transition-transform duration-300 origin-left">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : stats.totalChannels}
              </h3>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/10">
              <MessageCircle className="w-6 h-6" />
            </div>
          </div>

          {/* Stat Card 2 */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-6 rounded-2xl flex items-center justify-between group shadow-sm hover:shadow-md transition-all duration-300">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Combined Active Members</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white group-hover:scale-105 transition-transform duration-300 origin-left">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : stats.combinedMembers.toLocaleString()}
              </h3>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/10">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Stat Card 3 */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-6 rounded-2xl flex items-center justify-between group shadow-sm hover:shadow-md transition-all duration-300">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Growth Added</p>
              <h3 className="text-3xl font-extrabold text-emerald-500 group-hover:scale-105 transition-transform duration-300 origin-left flex items-center gap-1.5">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : `+${stats.totalGrowth.toLocaleString()}`}
                <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              </h3>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/10">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[40vh]">
            <div className="w-12 h-12 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium animate-pulse tracking-wide">Retrieving channel tracking sheets...</p>
          </div>
        ) : channels.length === 0 ? (

          /* Empty State */
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto mt-8 rounded-[2rem] shadow-sm">
            <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500 border border-emerald-500/5 mb-2">
              <MessageCircle className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No WhatsApp Channels Tracked Yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Get started by creating your first WhatsApp Channel profile. Once created, your team can log members daily and watch growth patterns form.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              Create Channel Profile
            </button>
          </div>

        ) : (

          /* Channels Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {channels.map((channel) => {
              // Ensure chart gets chronologically sorted updates
              const chartData = [...channel.updates].sort((a, b) => new Date(a.update_date) - new Date(b.update_date));

              return (
                <div key={channel.id} className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-300">

                  {/* Card Header */}
                  <div className="p-6 pb-4 border-b border-slate-100 dark:border-white/[0.05] space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 max-w-[70%]">
                        <h4 className="font-bold text-base text-slate-900 dark:text-white truncate" title={channel.channel_name}>
                          {channel.channel_name}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">Managed by {channel.manager_name}</span>
                        </div>
                      </div>

                      {/* Today's Update Status Badges */}
                      {channel.updated_today ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-bold">
                          <Check className="w-3 h-3" />
                          <span>Logged Today</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Pending Today</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Metrics */}
                  <div className="p-6 py-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Active Members</span>
                      <div className="text-3xl font-extrabold tracking-tight mt-1 text-slate-900 dark:text-white text-glow-green">
                        {channel.latest_member_count.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Growth</span>
                      <div className="flex items-center gap-1 justify-end font-extrabold text-sm mt-2 text-emerald-500 bg-emerald-500/10 border border-emerald-500/10 px-2.5 py-1 rounded-xl">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+{channel.total_growth.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sparkline Chart */}
                  <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-950/20 border-t border-b border-slate-100 dark:border-white/[0.05]">
                    {chartData.length < 2 ? (
                      <div className="h-[90px] flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                        Log 2+ days of logs to populate the trend graph.
                      </div>
                    ) : (
                      <div className="h-[90px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                            <defs>
                              <linearGradient id={`gradient-${channel.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={primaryGreen} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={primaryGreen} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs shadow-xl rounded-xl p-2.5 px-3.5 backdrop-blur-md text-slate-900 dark:text-white">
                                      <p className="font-semibold text-slate-500 dark:text-slate-400">{payload[0].payload.update_date}</p>
                                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">{payload[0].value.toLocaleString()} members</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="member_count"
                              stroke={primaryGreen}
                              strokeWidth={2}
                              fillOpacity={1}
                              fill={`url(#gradient-${channel.id})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-white/5 grid grid-cols-3 gap-2 mt-auto">
                    <button
                      onClick={() => handleOpenUpdate(channel)}
                      className="py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all flex items-center justify-center gap-1 hover:text-emerald-500 active:scale-95 shadow-sm"
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      <span>Update</span>
                    </button>

                    <button
                      onClick={() => handleOpenHistory(channel)}
                      className="py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all flex items-center justify-center gap-1 hover:text-emerald-500 active:scale-95 shadow-sm"
                    >
                      <History className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      <span>History</span>
                    </button>

                    <button
                      onClick={() => handleDeleteChannel(channel.id, channel.channel_name)}
                      className="py-2 text-xs font-bold text-red-500 hover:text-white bg-red-500/5 hover:bg-red-650 rounded-xl transition-all flex items-center justify-center gap-1 active:scale-95 shadow-sm border border-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Delete</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 1. Modal: Add Channel Profile */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-200 flex flex-col">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 text-slate-900 dark:text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                <span>Create Channel Profile</span>
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateChannel} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">WhatsApp Channel Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. White Force Jobs Channel"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 rounded-xl text-sm focus:outline-none text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Channel Manager Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priyanshu Sharma"
                  value={newManagerName}
                  onChange={(e) => setNewManagerName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 rounded-xl text-sm focus:outline-none text-slate-900 dark:text-white transition-all"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-end space-x-3 bg-slate-50/20 dark:bg-slate-950/10">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitLoading}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 shadow-md shadow-emerald-500/10"
                >
                  {createSubmitLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Update Daily Count */}
      {isUpdateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-200 flex flex-col">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 text-slate-900 dark:text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                <span>Log Daily Member Count</span>
              </h3>
              <button
                onClick={() => setIsUpdateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Channel</label>
                <select
                  required
                  value={updateChannelId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setUpdateChannelId(id);
                    // Autofill with latest count of newly selected channel
                    const chan = channels.find(c => c.id === parseInt(id, 10));
                    setUpdateMemberCount(chan ? chan.latest_member_count || "" : "");
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 rounded-xl text-sm focus:outline-none text-slate-900 dark:text-white transition-all cursor-pointer"
                >
                  <option value="" disabled>-- Select Channel --</option>
                  {channels.map(c => (
                    <option key={c.id} value={c.id}>{c.channel_name} (managed by {c.manager_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Update Date</label>
                <input
                  type="date"
                  required
                  value={updateDate}
                  onChange={(e) => setUpdateDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 rounded-xl text-sm focus:outline-none text-slate-900 dark:text-white transition-all cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">WhatsApp Member Count</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 5240"
                  value={updateMemberCount}
                  onChange={(e) => setUpdateMemberCount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 rounded-xl text-sm focus:outline-none text-slate-900 dark:text-white transition-all"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mt-1.5 leading-normal">
                  * Note: If a record already exists for this channel on the selected date, saving will overwrite it.
                </span>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-end space-x-3 bg-slate-50/20 dark:bg-slate-950/10">
                <button
                  type="button"
                  onClick={() => setIsUpdateOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSubmitLoading || !updateChannelId}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 shadow-md shadow-emerald-500/10"
                >
                  {updateSubmitLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Drawer: Channel History Log Sheet */}
      {isHistoryOpen && selectedChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-0 animate-in fade-in duration-350">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-850 w-full max-w-xl h-screen shadow-2xl flex flex-col transform animate-in slide-in-from-right duration-350 text-slate-900 dark:text-white">

            {/* Drawer Header */}
            <div className="px-8 py-6 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 text-slate-900 dark:text-white">
              <div className="space-y-1">
                <h3 className="font-bold text-lg flex items-center gap-2 text-glow-green text-slate-900 dark:text-white">
                  <History className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <span>Update History Logs</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[450px]">
                  {selectedChannel.channel_name} (managed by {selectedChannel.manager_name})
                </p>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Log Filters */}
            <div className="p-8 pb-4 border-b border-slate-150 dark:border-slate-850 flex gap-4 bg-slate-50/20 dark:bg-slate-950/15">
              <div className="relative flex-1 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-all" />
                <input
                  type="text"
                  placeholder="Filter logs by date or member count..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none transition-all"
                />
              </div>

              <button
                onClick={() => handleOpenUpdate(selectedChannel)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Count</span>
              </button>
            </div>

            {/* History Table logs */}
            <div className="flex-1 overflow-y-auto p-8 pt-4">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center h-[50vh]">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="mt-3 text-xs text-slate-500 font-semibold tracking-wide">Syncing channel updates history...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs font-semibold">
                  No log entries matched your criteria.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/20 shadow-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-850">
                        <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Log Date</th>
                        <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Members Count</th>
                        <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {filteredHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-emerald-500/[0.01] dark:hover:bg-emerald-500/[0.02] transition-colors group">
                          <td className="px-6 py-3.5 font-bold text-slate-700 dark:text-slate-300">
                            {new Date(item.update_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-3.5 text-center font-extrabold text-sm text-slate-900 dark:text-white">
                            {item.member_count.toLocaleString()}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              onClick={() => handleDeleteHistoryEntry(item.id)}
                              className="p-1.5 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                              title="Delete Record Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-center text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Daily counts log sheet is synced directly with MySQL
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default WAChannels;
