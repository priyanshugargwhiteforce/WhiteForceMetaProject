import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Video, 
  RefreshCw, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Eye, 
  ThumbsUp, 
  MessageSquare, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  ArrowLeft,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Tv
} from 'lucide-react';

const YoutubeVideoDashboard = () => {
  const navigate = useNavigate();

  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [videos, setVideos] = useState([]);
  const [totals, setTotals] = useState({ total_videos: 0, total_views: 0, total_likes: 0, total_comments: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pages, setPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('published_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Video Detail Modal State
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Format ISO 8601 duration (e.g. PT15M33S -> 15:33, PT1H2M5S -> 1:02:05)
  const formatDuration = (isoDuration) => {
    if (!isoDuration) return '';
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return isoDuration;
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format large numbers (e.g. 12450 -> 12.5K)
  const formatNumber = (num) => {
    const n = parseInt(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString();
  };

  // Fetch channel dropdown options
  const fetchChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/youtube/channels', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setChannels(data.data || []);
      }
    } catch (err) {
      console.error('Fetch Channels dropdown error:', err);
    }
  };

  // Fetch videos from backend
  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      let url = `/api/youtube/videos/all?page=${page}&limit=${limit}&sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (selectedChannel) {
        url += `&channel_id=${encodeURIComponent(selectedChannel)}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch videos');
      }

      setVideos(data.data || []);
      setPages(data.pagination?.pages || 1);
      setTotalRecords(data.pagination?.total || 0);
      if (data.totals) {
        setTotals(data.totals);
      }
    } catch (err) {
      console.error('Fetch Videos error:', err);
      setError(err.message || 'Error loading stored YouTube videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [page, limit, selectedChannel, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchVideos();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Trigger Video Sync for selected channel (or all channels)
  const handleSyncVideos = async () => {
    setSyncing(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      let url = '/api/youtube/videos/sync-all';
      if (selectedChannel) {
        url = `/api/youtube/channels/${selectedChannel}/videos/sync`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Video sync failed');
      }

      setNotification({
        type: 'success',
        message: data.message || 'Successfully synchronized video library!'
      });

      fetchVideos();
    } catch (err) {
      console.error('Sync Videos error:', err);
      setError(err.message || 'Failed to sync videos from YouTube API');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 md:p-8 space-y-6 transition-colors duration-300">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 dark:bg-gradient-to-tr dark:from-red-600/20 dark:to-indigo-500/20 border border-red-500/20 dark:border-red-500/30 rounded-2xl">
            <Video className="w-8 h-8 text-red-600 dark:text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400 dark:bg-clip-text dark:text-transparent">
              YouTube Video Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Discover, view, and audit stored video catalog and performance metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/youtube-channel-dashboard')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold border border-slate-200 dark:border-slate-700/60 transition-all text-xs shadow-sm dark:shadow-none"
          >
            <Tv className="w-4 h-4 text-red-500 dark:text-red-400" />
            Channel Dashboard
          </button>

          <button
            onClick={handleSyncVideos}
            disabled={syncing}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 dark:shadow-red-900/30 transition-all text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Videos...' : selectedChannel ? 'Sync Channel Videos' : 'Sync All Videos'}
          </button>
        </div>
      </div>

      {/* Notifications Banner */}
      {notification && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 rounded-2xl text-rose-800 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Aggregate Stored Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Stored Video Totals</span>
            <Video className="w-4 h-4 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{formatNumber(totals.total_videos)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Video Views</span>
            <Eye className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{formatNumber(totals.total_views)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Video Likes</span>
            <ThumbsUp className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{formatNumber(totals.total_likes)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Comments</span>
            <MessageSquare className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{formatNumber(totals.total_comments)}</p>
        </div>
      </div>

      {/* Filter, Search & Controls Bar */}
      <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-4 shadow-sm dark:shadow-none backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Channel Dropdown Filter */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedChannel}
              onChange={(e) => { setSelectedChannel(e.target.value); setPage(1); }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500/50"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                All Discovered Channels ({channels.length})
              </option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {ch.title} ({ch.google_email})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by title, video ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500/50"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">Sort:</span>
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('_');
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-red-500/50"
            >
              <option value="published_at_desc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Newest First</option>
              <option value="published_at_asc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Oldest First</option>
              <option value="view_count_desc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Most Views</option>
              <option value="like_count_desc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Most Likes</option>
              <option value="comment_count_desc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Most Comments</option>
            </select>
          </div>
        </div>
      </div>

      {/* Video Grid List */}
      {loading ? (
        <div className="bg-white/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 animate-pulse">
          Loading stored YouTube videos...
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center space-y-4 shadow-sm dark:shadow-none">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700">
            <Video className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Stored YouTube Videos Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Click "Sync Channel Videos" to fetch videos from your channel's uploads playlist.
            </p>
          </div>
          <button
            onClick={handleSyncVideos}
            disabled={syncing}
            className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg"
          >
            + Run Video Sync
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {videos.map((vid) => (
              <div
                key={vid.id}
                onClick={() => setSelectedVideo(vid)}
                className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/90 rounded-2xl overflow-hidden shadow-sm dark:shadow-none backdrop-blur-md group transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video bg-slate-100 dark:bg-slate-900 overflow-hidden">
                    {vid.thumbnail ? (
                      <img
                        src={vid.thumbnail}
                        alt={vid.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-bold text-xs">
                        No Thumbnail
                      </div>
                    )}

                    {vid.duration && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-white text-[10px] font-mono font-bold rounded">
                        {formatDuration(vid.duration)}
                      </span>
                    )}

                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                      vid.privacy_status === 'public'
                        ? 'bg-emerald-500/80 text-white'
                        : 'bg-amber-500/80 text-white'
                    }`}>
                      {vid.privacy_status}
                    </span>
                  </div>

                  {/* Info Block */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" title={vid.title}>
                      {vid.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                      {vid.channel_title || 'YouTube Channel'}
                    </p>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Published {vid.published_at ? new Date(vid.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Performance Stats Footer */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-1 text-center text-xs">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Views</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatNumber(vid.view_count)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Likes</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(vid.like_count)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Comments</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{formatNumber(vid.comment_count)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing Page <span className="font-bold text-slate-900 dark:text-white">{page}</span> of <span className="font-bold text-slate-900 dark:text-white">{pages}</span> ({totalRecords} Total Videos)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-all shadow-sm dark:shadow-none"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-mono">
                {page} / {pages}
              </span>

              <button
                onClick={() => setPage(prev => Math.min(prev + 1, pages))}
                disabled={page >= pages}
                className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-all shadow-sm dark:shadow-none"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Detail Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-full">
                  YouTube Video Details
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2 leading-snug">{selectedVideo.title}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ID: <span className="font-mono text-slate-700 dark:text-slate-300">{selectedVideo.video_id}</span></p>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thumbnail Preview */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800">
              {selectedVideo.thumbnail ? (
                <img src={selectedVideo.thumbnail} alt={selectedVideo.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">No Preview</div>
              )}
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Views</p>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">{formatNumber(selectedVideo.view_count)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Likes</p>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatNumber(selectedVideo.like_count)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Comments</p>
                <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{formatNumber(selectedVideo.comment_count)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Duration</p>
                <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{formatDuration(selectedVideo.duration) || 'N/A'}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Description</h4>
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl text-xs text-slate-800 dark:text-slate-300 font-medium max-h-40 overflow-y-auto whitespace-pre-wrap">
                {selectedVideo.description || 'No description provided for this video.'}
              </div>
            </div>

            {/* Video Metadata Table */}
            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 text-xs space-y-2 text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Channel:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedVideo.channel_title}</span>
              </div>
              <div className="flex justify-between">
                <span>Published Date:</span>
                <span className="text-slate-700 dark:text-slate-200">{selectedVideo.published_at ? new Date(selectedVideo.published_at).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Privacy Status:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase">{selectedVideo.privacy_status}</span>
              </div>
              <div className="flex justify-between">
                <span>Upload Status:</span>
                <span className="text-slate-700 dark:text-slate-200 capitalize">{selectedVideo.upload_status}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Synced:</span>
                <span className="text-slate-700 dark:text-slate-200">{selectedVideo.last_synced_at ? new Date(selectedVideo.last_synced_at).toLocaleString() : 'N/A'}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all"
              >
                Close
              </button>
              <a
                href={`https://www.youtube.com/watch?v=${selectedVideo.video_id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg"
              >
                <ExternalLink className="w-4 h-4" />
                Open on YouTube
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YoutubeVideoDashboard;
