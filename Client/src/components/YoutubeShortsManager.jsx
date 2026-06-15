import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, Video, Target, AlertCircle, ChevronRight,
  Calendar, RefreshCw, Eye, ThumbsUp, MessageSquare,
  TrendingUp, HelpCircle, IndianRupee, Search
} from 'lucide-react';

const YoutubeShortsManager = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ad, setAd] = useState(null);
  const [shorts, setShorts] = useState([]);
  const [selectedShort, setSelectedShort] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Loading & Error states
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      // 1. Fetch Ad/Campaign metadata to obtain channel info
      const adRes = await fetch(`/api/youtube-ads/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const adData = await adRes.json();
      
      if (!adRes.ok) {
        throw new Error(adData.message || "Failed to load YouTube ad campaign details.");
      }
      
      if (adData.success) {
        setAd(adData.ad);
        
        // 2. Fetch shorts list from the channel using generic endpoint
        const shortsRes = await fetch(`/api/youtube-ads/channel-shorts?channelId=${adData.ad.channel_id}&channelName=${encodeURIComponent(adData.ad.channel_name || 'White Force')}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const shortsData = await shortsRes.json();
        
        if (shortsData.success && shortsData.data.length > 0) {
          setShorts(shortsData.data);
          
          // 3. Load details of the first short by default
          await fetchShortDetails(shortsData.data[0].video_id);
        } else {
          setShorts([]);
        }
      }
    } catch (e) {
      console.error("Failed to load initial Shorts data", e);
      setError(e.message || "Network error loading shorts list.");
    } finally {
      setLoadingList(false);
    }
  };

  const fetchShortDetails = async (videoId) => {
    setLoadingDetails(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/youtube-ads/shorts/${videoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedShort(data.data);
      }
    } catch (e) {
      console.error("Failed to load Shorts performance details", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectShort = (sh) => {
    if (selectedShort && selectedShort.video_id === sh.video_id) return;
    fetchShortDetails(sh.video_id);
  };

  const handleSyncList = async () => {
    setSyncing(true);
    await fetchInitialData();
    setSyncing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const filteredShorts = React.useMemo(() => {
    return shorts.filter(sh => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return sh.title.toLowerCase().includes(q) || sh.description.toLowerCase().includes(q);
    });
  }, [shorts, searchQuery]);

  return (
    <div className="p-8 space-y-8 min-h-screen">
      {/* Title & Navigation Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/youtube-ad/${id}`)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-300" />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              <span>Google Ads</span>
              <ChevronRight className="w-3 h-3" />
              <span className="cursor-pointer hover:text-red-500 transition-colors" onClick={() => navigate('/youtube-ads')}>YouTube Ads</span>
              <ChevronRight className="w-3 h-3" />
              <span className="cursor-pointer hover:text-red-500 transition-colors" onClick={() => navigate(`/youtube-ad/${id}`)}>Ad Details</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-red-500">Shorts</span>
            </div>
            <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
              <Video className="w-5 h-5 mr-2 text-red-500 animate-pulse" />
              YouTube Shorts Library
            </h2>
          </div>
        </div>

        <button
          disabled={loadingList || syncing}
          onClick={handleSyncList}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>Refresh Shorts</span>
        </button>
      </div>

      {loadingList ? (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading Channel Shorts...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-lg mx-auto text-center mt-10">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Failed to Load Shorts</h3>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button onClick={fetchInitialData} className="px-6 py-2 bg-red-650 hover:bg-red-500 text-white rounded-xl font-bold transition-all">Retry</button>
        </div>
      ) : shorts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem]">
          <Video className="w-10 h-10 text-red-500 mb-4" />
          <h3 className="text-2xl font-bold mb-2">No Shorts Found</h3>
          <p className="text-slate-500 mb-6 max-w-md">No organic Shorts were found for the channel associated with this campaign.</p>
          <button onClick={() => navigate(`/youtube-ad/${id}`)} className="px-6 py-2 bg-slate-600 text-white rounded-xl font-bold transition-all">Back to Campaign</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Left Column - Scrollable Shorts List (5 Cols) */}
          <div className="xl:col-span-5 space-y-6">
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    Channel Videos
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    Channel: {ad?.channel_name || "White Force"}
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-bold text-red-500 bg-red-500/10 rounded-full border border-red-500/20">
                  {shorts.length} Shorts
                </span>
              </div>

              {/* Search box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search shorts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-9 pr-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* List */}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredShorts.map((sh) => {
                  const isSelected = selectedShort && selectedShort.video_id === sh.video_id;
                  return (
                    <div
                      key={sh.video_id}
                      onClick={() => handleSelectShort(sh)}
                      className={`flex gap-4 p-3 rounded-2xl border transition-all duration-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] ${
                        isSelected
                          ? 'border-red-500/50 bg-gradient-to-r from-red-500/5 to-rose-500/5 dark:from-red-500/10 dark:to-rose-500/10 shadow-lg shadow-red-500/5'
                          : 'border-slate-100 dark:border-white/5 bg-transparent'
                      }`}
                    >
                      {/* Thumbnail Container */}
                      <div className="relative w-20 h-28 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 group">
                        <img
                          src={sh.thumbnail}
                          alt={sh.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-col justify-between py-1">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug" title={sh.title}>
                            {sh.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {sh.description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-semibold mt-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sh.published_at ? new Date(sh.published_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Selected Short Details & Analytics (7 Cols) */}
          <div className="xl:col-span-7">
            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center h-[50vh] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem]">
                <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Fetching Performance details...</p>
              </div>
            ) : selectedShort ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Short Performance Header Card */}
                <div className="p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -z-10"></div>
                  <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                    <div>
                      <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider mb-2 inline-block">
                        Active Short Performance
                      </span>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight line-clamp-1 pr-4" title={selectedShort.title}>
                        {selectedShort.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 items-center mt-2">
                        <p className="text-xs text-slate-400 font-mono flex items-center bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-xl">
                          <span className="text-slate-500 mr-1">Video ID:</span>
                          {selectedShort.video_id}
                        </p>
                        <p className="text-xs text-slate-400 font-mono flex items-center bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-xl">
                          <span className="text-slate-500 mr-1">Channel Name:</span>
                          {selectedShort.channel_name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Est. Reach Value */}
                  <div className="relative overflow-hidden rounded-[2rem] p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 hover:shadow-xl transition-all duration-300">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                      <IndianRupee className="w-3.5 h-3.5 mr-1 text-red-500" /> Reach Value
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                      {formatCurrency(selectedShort.est_value)}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Est. organic reach value</p>
                  </div>

                  {/* Views */}
                  <div className="relative overflow-hidden rounded-[2rem] p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 hover:shadow-xl transition-all duration-300">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                      <Eye className="w-3.5 h-3.5 mr-1 text-blue-500" /> Views
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                      {formatNumber(selectedShort.views)}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Total views</p>
                  </div>

                  {/* Likes */}
                  <div className="relative overflow-hidden rounded-[2rem] p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 hover:shadow-xl transition-all duration-300">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                      <ThumbsUp className="w-3.5 h-3.5 mr-1 text-rose-500" /> Likes
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                      {formatNumber(selectedShort.likes)}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Engagement Rate: {selectedShort.views > 0 ? ((selectedShort.likes / selectedShort.views) * 100).toFixed(1) : 0}%</p>
                  </div>

                  {/* Comments */}
                  <div className="relative overflow-hidden rounded-[2rem] p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 hover:shadow-xl transition-all duration-300">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                      <MessageSquare className="w-3.5 h-3.5 mr-1 text-purple-500" /> Comments
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                      {formatNumber(selectedShort.comments)}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Total reader comments</p>
                  </div>
                </div>

                {/* Main Content Layout: Left Player + Right Deep Stats */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
                  
                  {/* Smartphone Bezel Player Container (5 Cols) */}
                  <div className="md:col-span-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 flex flex-col justify-center items-center shadow-lg">
                    <div className="aspect-[9/16] w-full max-w-[240px] rounded-[2rem] overflow-hidden border-8 border-slate-900 dark:border-white/10 bg-black shadow-2xl relative">
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedShort.video_id}?autoplay=0&rel=0`}
                        title="YouTube Short Player"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <div className="mt-4 text-center">
                      <a
                        href={`https://www.youtube.com/shorts/${selectedShort.video_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-red-500 hover:text-red-650 transition-colors"
                      >
                        Open directly in YouTube
                      </a>
                    </div>
                  </div>

                  {/* Deep Analytics (7 Cols) */}
                  <div className="md:col-span-7 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                        <TrendingUp className="w-4 h-4 text-red-500 mr-2" />
                        Engagement Analytics
                      </h3>
                      <p className="text-xs text-slate-400">Synthesized retention and audience activity metrics</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 my-6">
                      {/* Watch Time */}
                      <div className="p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Watch Time</p>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white">
                          {selectedShort.watch_time ? `${formatNumber(Math.round(selectedShort.watch_time))} min` : '0 min'}
                        </h4>
                        <p className="text-[9px] text-slate-400 mt-0.5">Est. channel minutes</p>
                      </div>

                      {/* View Duration */}
                      <div className="p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg View Duration</p>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white">
                          {selectedShort.avg_view_duration ? `${selectedShort.avg_view_duration}s` : '0s'}
                        </h4>
                        <p className="text-[9px] text-slate-400 mt-0.5">Avg play duration</p>
                      </div>

                      {/* Audience Retention */}
                      <div className="p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Audience Retention</p>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white">
                          {selectedShort.audience_retention ? `${selectedShort.audience_retention}%` : '80.0%'}
                        </h4>
                        <p className="text-[9px] text-slate-400 mt-0.5">Short video loop rate</p>
                      </div>

                      {/* Subscribers */}
                      <div className="p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subscribers Gained</p>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white">
                          {selectedShort.subscribers_gained ? `+${formatNumber(selectedShort.subscribers_gained)}` : '+0'}
                        </h4>
                        <p className="text-[9px] text-slate-400 mt-0.5">New subscribers conversion</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-slate-100 dark:border-white/5">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">Description</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3">
                        {selectedShort.description || "No description provided for this YouTube Short."}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem]">
                <HelpCircle className="w-10 h-10 text-slate-400 mb-4" />
                <p className="text-slate-500 font-bold">Select a Short to begin analysis</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default YoutubeShortsManager;
