import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Tv, 
  RefreshCw, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Video, 
  Eye, 
  ShieldCheck, 
  ArrowLeft,
  Sparkles,
  Layers,
  Search,
  Plus
} from 'lucide-react';

const YoutubeChannelDashboard = () => {
  const navigate = useNavigate();

  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [singleSyncing, setSingleSyncing] = useState(null);
  const [error, setError] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Format large numbers (12500 -> 12.5K, 1200000 -> 1.2M)
  const formatNumber = (num) => {
    const n = parseInt(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString();
  };

  // Fetch channels list
  const fetchChannels = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/youtube/channels', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch YouTube channels');
      }

      setChannels(data.data || []);
    } catch (err) {
      console.error('Fetch YouTube Channels Error:', err);
      setError(err.message || 'Error loading YouTube channels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  // Trigger full discovery & sync across all connected Google accounts
  const handleSyncAll = async () => {
    setSyncingAll(true);
    setError(null);
    setSyncResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/youtube/channels/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to sync YouTube channels');
      }

      setSyncResult(data.data);
      fetchChannels();
    } catch (err) {
      console.error('Channel sync error:', err);
      setError(err.message || 'Error executing YouTube channel discovery');
    } finally {
      setSyncingAll(false);
    }
  };

  // Trigger single channel sync
  const handleSingleSync = async (channelDbId, channelTitle) => {
    setSingleSyncing(channelDbId);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/youtube/channels/${channelDbId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to refresh single channel');
      }

      setSyncResult({
        summary: { accountsProcessed: 1, channelsDiscovered: 1, errors: 0 },
        message: `Successfully updated channel "${channelTitle}".`
      });
      fetchChannels();
    } catch (err) {
      console.error('Single channel sync error:', err);
      setError(err.message || `Failed to sync ${channelTitle}`);
    } finally {
      setSingleSyncing(null);
    }
  };

  // Filter channels based on search query
  const filteredChannels = channels.filter(ch => 
    ch.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.custom_url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.google_account?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group channels by Google Account email
  const groupedChannels = filteredChannels.reduce((acc, ch) => {
    const email = ch.google_account?.email || 'Unlinked Account';
    if (!acc[email]) acc[email] = [];
    acc[email].push(ch);
    return acc;
  }, {});

  // Compute aggregate stats across discovered channels
  const totalSubscribers = channels.reduce((sum, ch) => sum + (parseInt(ch.subscriber_count) || 0), 0);
  const totalVideos = channels.reduce((sum, ch) => sum + (parseInt(ch.video_count) || 0), 0);
  const totalViews = channels.reduce((sum, ch) => sum + (parseInt(ch.view_count) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 md:p-8 space-y-6 transition-colors duration-300">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 dark:bg-gradient-to-tr dark:from-red-600/20 dark:to-amber-500/20 border border-red-500/20 dark:border-red-500/30 rounded-2xl">
            <Tv className="w-8 h-8 text-red-600 dark:text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400 dark:bg-clip-text dark:text-transparent">
              YouTube Channel Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Multi-channel auto-discovery across connected Google Accounts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/google-accounts')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold border border-slate-200 dark:border-slate-700/60 transition-all text-xs shadow-sm dark:shadow-none"
          >
            <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Manage Google Accounts
          </button>

          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 dark:shadow-red-900/30 transition-all text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
            {syncingAll ? 'Discovering Channels...' : 'Sync All Channels'}
          </button>
        </div>
      </div>

      {/* Sync Summary Alert */}
      {syncResult && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-300 text-sm space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{syncResult.message || 'Sync operation completed successfully.'}</span>
            </div>
            <button onClick={() => setSyncResult(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
              Dismiss
            </button>
          </div>

          {syncResult.accountResults && syncResult.accountResults.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-500/20 text-xs">
              {syncResult.accountResults.map(res => (
                <div 
                  key={res.accountId} 
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 ${
                    res.status === 'SUCCESS'
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-500/30 text-rose-900 dark:text-rose-300'
                  }`}
                >
                  <span>{res.email}:</span>
                  <span>{res.status === 'SUCCESS' ? `${res.channelCount} channels` : 'AUTH REQUIRED'}</span>
                  {res.status === 'AUTH_REQUIRED' && (
                    <button 
                      onClick={() => navigate('/google-accounts')}
                      className="underline font-bold text-amber-600 dark:text-amber-300 ml-1 hover:text-amber-800 dark:hover:text-white"
                    >
                      Reconnect
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 rounded-2xl text-rose-800 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Discovered Channels</span>
            <Tv className="w-4 h-4 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{channels.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Subscribers</span>
            <Users className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{formatNumber(totalSubscribers)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Public Videos</span>
            <Video className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{formatNumber(totalVideos)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Lifetime Views</span>
            <Eye className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{formatNumber(totalViews)}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search channel name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500/50 transition-all shadow-sm dark:shadow-none"
          />
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing {filteredChannels.length} of {channels.length} channels
        </span>
      </div>

      {/* Channels List Grouped by Google Account */}
      {loading ? (
        <div className="bg-white/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 animate-pulse">
          Fetching discovered YouTube channels...
        </div>
      ) : Object.keys(groupedChannels).length === 0 ? (
        <div className="bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center space-y-4 shadow-sm dark:shadow-none">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700">
            <Tv className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No YouTube Channels Discovered Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Click "Sync All Channels" to discover channels associated with your connected Google Accounts.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg"
            >
              + Run Channel Discovery
            </button>
            <button
              onClick={() => navigate('/google-accounts')}
              className="px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none"
            >
              Connect Google Account
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedChannels).map(([accountEmail, channelList]) => (
            <div key={accountEmail} className="space-y-4">
              {/* Account Group Banner */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl shadow-sm dark:shadow-none backdrop-blur-md">
                <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Google Account:</span>
                <span className="text-xs font-mono text-amber-600 dark:text-amber-300 font-bold">{accountEmail}</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-extrabold ml-auto">
                  {channelList.length} {channelList.length === 1 ? 'Channel' : 'Channels'}
                </span>
              </div>

              {/* Grid of Channel Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {channelList.map((channel) => (
                  <div
                    key={channel.id}
                    className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/90 rounded-2xl p-5 space-y-4 transition-all shadow-sm dark:shadow-none backdrop-blur-md relative overflow-hidden group flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Top Banner & Thumbnail */}
                      <div className="flex items-start gap-4">
                        {channel.thumbnail ? (
                          <img
                            src={channel.thumbnail}
                            alt={channel.title}
                            className="w-14 h-14 rounded-2xl border-2 border-slate-200 dark:border-slate-700 object-cover shrink-0 group-hover:border-red-500/60 transition-all shadow-md"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center text-white font-black text-xl border border-white/10 shrink-0">
                            {channel.title[0].toUpperCase()}
                          </div>
                        )}

                        <div className="overflow-hidden space-y-0.5">
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" title={channel.title}>
                            {channel.title}
                          </h3>
                          {channel.custom_url && (
                            <p className="text-xs font-semibold text-red-600 dark:text-red-400 font-mono">
                              {channel.custom_url.startsWith('@') ? channel.custom_url : `@${channel.custom_url}`}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate" title={channel.channel_id}>
                            ID: {channel.channel_id}
                          </p>
                        </div>
                      </div>

                      {/* Description snippet */}
                      {channel.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-medium">
                          {channel.description}
                        </p>
                      )}

                      {/* Key Stats Bar */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 text-center">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Subscribers</p>
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{formatNumber(channel.subscriber_count)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Videos</p>
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{formatNumber(channel.video_count)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Views</p>
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{formatNumber(channel.view_count)}</p>
                        </div>
                      </div>

                      {/* Playlist badge & Sync time */}
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1 pt-1">
                        {channel.uploads_playlist_id && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 dark:text-slate-500 font-medium">Uploads Playlist:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{channel.uploads_playlist_id}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 dark:text-slate-500 font-medium">Last Synced:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {channel.last_synced_at ? new Date(channel.last_synced_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 gap-2 mt-4">
                      <button
                        onClick={() => handleSingleSync(channel.id, channel.title)}
                        disabled={singleSyncing === channel.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700/60 transition-all disabled:opacity-50 shadow-sm dark:shadow-none"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${singleSyncing === channel.id ? 'animate-spin text-red-500' : ''}`} />
                        Sync
                      </button>

                      <a
                        href={channel.custom_url ? `https://www.youtube.com/${channel.custom_url.startsWith('@') ? channel.custom_url : '@' + channel.custom_url}` : `https://www.youtube.com/channel/${channel.channel_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg border border-red-500/20 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View on YouTube
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default YoutubeChannelDashboard;
