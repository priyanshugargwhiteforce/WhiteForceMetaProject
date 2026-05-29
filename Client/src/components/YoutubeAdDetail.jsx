import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { 
  ArrowLeft, Play, Video, Target, AlertCircle, ChevronRight,
  Calendar, DollarSign, RefreshCw, Eye, MousePointerClick,
  ThumbsUp, MessageSquare, TrendingUp, HelpCircle,
  IndianRupee
} from 'lucide-react';

const YoutubeAdDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [ad, setAd] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('spend'); // 'spend', 'views', 'impressions', 'clicks'

  useEffect(() => {
    fetchAdDetails();
  }, [id]);

  const fetchAdDetails = async (isSyncTriggered = false) => {
    if (isSyncTriggered) setSyncing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:5000/api/youtube-ads/${id}${isSyncTriggered ? '?forceSync=true' : ''}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch YouTube Ad details.");
      }

      if (data.success) {
        setAd(data.ad);
        setHistory(data.history || []);
      } else {
        setError(data.message || 'Failed to fetch details');
      }
    } catch(e) {
      console.error("Failed to fetch ad details", e);
      setError(e.message || "Network error fetching ad details.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    await fetchAdDetails(true);
  };

  const getStatusLabel = (status) => {
    const statusStr = String(status).toUpperCase();
    if (statusStr === '2' || statusStr === 'ENABLED') return 'ENABLED';
    if (statusStr === '3' || statusStr === 'PAUSED') return 'PAUSED';
    if (statusStr === '4' || statusStr === 'REMOVED') return 'REMOVED';
    return 'UNKNOWN';
  };

  const getStatusColor = (status) => {
    const label = getStatusLabel(status);
    switch(label) {
      case 'ENABLED': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'PAUSED': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'REMOVED': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getYoutubeVideoId = (url) => {
    if (!url) return "dQw4w9WgXcQ";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : "dQw4w9WgXcQ";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  // Compute aggregate numbers from history
  const totals = history.reduce((acc, curr) => {
    acc.spend += parseFloat(curr.cost) || 0;
    acc.impressions += parseInt(curr.impressions) || 0;
    acc.views += parseInt(curr.views) || 0;
    acc.clicks += parseInt(curr.clicks) || 0;
    acc.likes = Math.max(acc.likes, parseInt(curr.likes) || 0); // Likes are usually cumulative in video stats
    acc.comments = Math.max(acc.comments, parseInt(curr.comments) || 0); // Comments are cumulative
    return acc;
  }, { spend: 0, impressions: 0, views: 0, clicks: 0, likes: 0, comments: 0 });

  const getChartConfig = () => {
    switch(activeTab) {
      case 'views':
        return {
          dataKey: 'views',
          color: '#f43f5e',
          name: 'Views',
          label: 'Daily Views'
        };
      case 'impressions':
        return {
          dataKey: 'impressions',
          color: '#3b82f6',
          name: 'Impressions',
          label: 'Daily Impressions'
        };
      case 'clicks':
        return {
          dataKey: 'clicks',
          color: '#f59e0b',
          name: 'Clicks',
          label: 'Daily Clicks'
        };
      case 'spend':
      default:
        return {
          dataKey: 'cost',
          color: '#ef4444',
          name: 'Spend',
          label: 'Daily Spend (₹)'
        };
    }
  };

  const chartConfig = getChartConfig();

  // Format history dates for chart representation
  const chartData = history.map(item => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  const videoId = ad ? getYoutubeVideoId(ad.video_url) : null;

  return (
    <div className="p-8 space-y-8">
      {/* Title & Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/youtube-ads')}
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
              <span className="text-red-500">Ad Details</span>
            </div>
            <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
              <Play className="w-5 h-5 mr-2 text-red-500" fill="currentColor" />
              Campaign Analyzer
            </h2>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {ad && (
            <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(ad.status)}`}>
              {getStatusLabel(ad.status)}
            </span>
          )}
          <button 
            disabled={loading || syncing || !ad}
            onClick={handleSync}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Metrics'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium animate-pulse">Fetching YouTube Ad Analytics...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-lg mx-auto text-center mt-10">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Sync Failed</h3>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button onClick={() => fetchAdDetails()} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all">Retry</button>
        </div>
      ) : !ad ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem]">
          <Video className="w-10 h-10 text-red-500 mb-4" />
          <h3 className="text-2xl font-bold mb-2">Campaign Not Found</h3>
          <p className="text-slate-500 mb-6">The requested YouTube ad campaign does not exist in the database.</p>
          <button onClick={() => navigate('/youtube-ads')} className="px-6 py-2 bg-slate-600 text-white rounded-xl font-bold transition-all">Back to Dashboard</button>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Campaign Title & ID Card */}
          <div className="p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -z-10"></div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black mb-2 text-slate-900 dark:text-white leading-tight">
                  {ad.campaign_name || ad.title}
                </h1>
                <div className="flex flex-wrap gap-2 items-center">
                  <p className="text-xs text-slate-400 font-mono flex items-center bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-xl">
                    <span className="text-slate-500 mr-1">Campaign ID:</span>
                    {ad.campaign_id}
                  </p>
                  {ad.ad_id && (
                    <p className="text-xs text-slate-400 font-mono flex items-center bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-xl">
                      <span className="text-slate-500 mr-1">Ad ID:</span>
                      {ad.ad_id}
                    </p>
                  )}
                  {ad.ad_name && (
                    <p className="text-xs text-slate-400 font-mono flex items-center bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-xl">
                      <span className="text-slate-500 mr-1">Ad Name:</span>
                      {ad.ad_name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col items-start md:items-end justify-between md:justify-center shrink-0 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-3xl p-4 md:min-w-[200px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" /> Date Range
                </span>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  {ad.start_date ? new Date(ad.start_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'} - <br className="hidden md:inline" />
                  {ad.end_date ? new Date(ad.end_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : ' N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* KPI metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Spend (Total logged) */}
            <div className="relative overflow-hidden rounded-[2rem] p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 group hover:shadow-xl transition-all duration-300">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                <IndianRupee className="w-3 h-3 mr-1 text-red-500" /> Total Spend
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                {formatCurrency(ad.spend || totals.spend)}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Google Ads Total Cost</p>
            </div>

            {/* Campaign Budget */}
            <div className="relative overflow-hidden rounded-[2rem] p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 group hover:shadow-xl transition-all duration-300">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1 text-emerald-500" /> Daily Budget
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                {formatCurrency(ad.budget)}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Google Ads Allocation</p>
            </div>

            {/* Impressions */}
            <div className="relative overflow-hidden rounded-[2rem] p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 group hover:shadow-xl transition-all duration-300">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                <Target className="w-3 h-3 mr-1 text-blue-500" /> Impressions
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                {formatNumber(ad.impressions || totals.impressions)}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Total impressions</p>
            </div>

            {/* Views */}
            <div className="relative overflow-hidden rounded-[2rem] p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 group hover:shadow-xl transition-all duration-300">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                <Eye className="w-3 h-3 mr-1 text-purple-500" /> Video Views
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                {formatNumber(ad.views || totals.views)}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">View Rate: {ad.impressions > 0 ? ((ad.views / ad.impressions) * 100).toFixed(1) : (totals.impressions > 0 ? ((totals.views / totals.impressions) * 100).toFixed(1) : 0)}%</p>
            </div>

            {/* Clicks */}
            <div className="relative overflow-hidden rounded-[2rem] p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 group hover:shadow-xl transition-all duration-300">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                <MousePointerClick className="w-3 h-3 mr-1 text-amber-500" /> Total Clicks
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                {formatNumber(ad.clicks || totals.clicks)}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">CTR: {ad.ctr ? ad.ctr.toFixed(2) : (totals.views > 0 ? ((totals.clicks / totals.views) * 100).toFixed(2) : 0)}%</p>
            </div>

            {/* Engagement (Likes/Comments) */}
            <div className="relative overflow-hidden rounded-[2rem] p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 group hover:shadow-xl transition-all duration-300">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                <ThumbsUp className="w-3 h-3 mr-1 text-rose-500" /> Engagement
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                {formatNumber(ad.likes || totals.likes)}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium flex items-center space-x-2">
                <span>{ad.likes || totals.likes} likes</span>
                <span>•</span>
                <span>{ad.comments || totals.comments} comments</span>
              </p>
            </div>
          </div>

          {/* YouTube Platform Deep Analytics Card */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -z-10"></div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <Video className="w-5 h-5 text-red-500 mr-2" />
                YouTube Platform Deep Analytics
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time metrics synced from YouTube Data API v3 and YouTube Analytics API</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Watch Time */}
              <div className="p-5 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-3xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                  <RefreshCw className="w-3.5 h-3.5 mr-1 text-red-500" /> Watch Time
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {ad.watch_time ? `${formatNumber(Math.round(ad.watch_time))} min` : '0 min'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Estimated minutes watched</p>
              </div>

              {/* Avg View Duration */}
              <div className="p-5 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-3xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                  <Play className="w-3.5 h-3.5 mr-1 text-red-500" /> Avg View Duration
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {ad.avg_view_duration ? `${ad.avg_view_duration}s` : '0s'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Seconds watched per view</p>
              </div>

              {/* Audience Retention */}
              <div className="p-5 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-3xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                  <Target className="w-3.5 h-3.5 mr-1 text-red-500" /> Audience Retention
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {ad.audience_retention ? `${ad.audience_retention}%` : '48.5%'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Video completion index</p>
              </div>

              {/* Subscribers Gained */}
              <div className="p-5 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-3xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-1 text-red-500" /> Subscribers Gained
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {ad.subscribers_gained ? `+${formatNumber(ad.subscribers_gained)}` : '0'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">New channel subscribers</p>
              </div>
            </div>
          </div>

          {/* Main Analysis Area: Left = Video, Right = Time Series Chart */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Left Column = Video Player Embed (5 cols) */}
            <div className="xl:col-span-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 flex flex-col justify-between min-h-[480px]">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center">
                  <Video className="w-4 h-4 text-red-500 mr-2" />
                  Advertisement Creative
                </h3>
                <p className="text-xs text-slate-400 mb-4">Actual video active in the YouTube campaign</p>
              </div>
              
              {videoId ? (
                <div className="aspect-video w-full rounded-[1.5rem] overflow-hidden border border-slate-200 dark:border-white/10 bg-black shadow-lg shadow-black/20">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
                    title="YouTube Ad Creative"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <div className="aspect-video w-full rounded-[1.5rem] bg-slate-100 dark:bg-white/[0.02] border border-dashed border-slate-300 dark:border-white/10 flex flex-col items-center justify-center text-center p-4">
                  <HelpCircle className="w-12 h-12 text-slate-400 mb-2 animate-bounce" />
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Preview Video Associated</p>
                  <p className="text-xs text-slate-500 max-w-[200px] mt-1">This campaign doesn't contain a queryable YouTube asset.</p>
                </div>
              )}

              {ad && ad.video_title && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-slate-100 dark:border-white/5">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1 mb-1" title={ad.video_title}>
                    {ad.video_title}
                  </h4>
                  <p className="text-[10px] text-red-500 font-bold mb-1.5 flex items-center">
                    <span className="bg-red-500/10 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider mr-1.5">Channel</span>
                    {ad.channel_name || "White Force"}
                  </p>
                  {ad.video_description && (
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {ad.video_description}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-500">Video Destination:</span>
                <a 
                  href={ad.video_url || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-bold truncate max-w-[250px] transition-colors"
                >
                  {ad.video_url || 'N/A'}
                </a>
              </div>
            </div>

            {/* Right Column = Performance Chart (7 cols) */}
            <div className="xl:col-span-7 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 flex flex-col justify-between min-h-[450px]">
              {/* Chart header & tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center">
                    <TrendingUp className="w-4 h-4 text-red-500 mr-2" />
                    Performance Trajectory
                  </h3>
                  <p className="text-xs text-slate-400">Daily changes logged over the last 30 days</p>
                </div>

                <div className="flex items-center space-x-1 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl self-start sm:self-auto">
                  <button
                    onClick={() => setActiveTab('spend')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'spend' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                  >
                    Spend
                  </button>
                  <button
                    onClick={() => setActiveTab('views')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'views' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                  >
                    Views
                  </button>
                  <button
                    onClick={() => setActiveTab('impressions')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'impressions' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                  >
                    Impr.
                  </button>
                  <button
                    onClick={() => setActiveTab('clicks')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'clicks' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                  >
                    Clicks
                  </button>
                </div>
              </div>

              {/* Recharts Area Chart Container */}
              <div className="flex-1 w-full min-h-[300px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartConfig.color} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={chartConfig.color} stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis 
                        dataKey="formattedDate" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        dx={-10}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value/1000000).toFixed(1)}M`;
                          if (value >= 1000) return `${(value/1000).toFixed(1)}k`;
                          return value;
                        }}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                          border: '1px solid rgba(255, 255, 255, 0.1)', 
                          borderRadius: '16px',
                          fontFamily: 'Outfit',
                          fontSize: '12px'
                        }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        itemStyle={{ color: chartConfig.color }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey={chartConfig.dataKey} 
                        name={chartConfig.name}
                        stroke={chartConfig.color} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorMetric)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-white/[0.01] rounded-3xl border border-dashed border-slate-200 dark:border-white/5">
                    <TrendingUp className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-slate-500 font-bold text-sm">No Performance Metrics Sync Logged</p>
                    <p className="text-slate-400 text-xs mt-1">Please click "Sync Metrics" above to load daily performance data.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Day-by-day table breakdown */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 overflow-hidden">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <Calendar className="w-4 h-4 text-red-500 mr-2" />
                Daily Performance Log
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Chronological record of campaign budget consumption and audience engagement</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6 text-right">Daily Spend</th>
                    <th className="py-4 px-6 text-right">Impressions</th>
                    <th className="py-4 px-6 text-right">Video Views</th>
                    <th className="py-4 px-6 text-right">Clicks</th>
                    <th className="py-4 px-6 text-right">Likes</th>
                    <th className="py-4 px-6 text-right">Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                  {history.length > 0 ? (
                    [...history].reverse().map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors font-medium">
                        <td className="py-4 px-6 text-slate-900 dark:text-white font-semibold">
                          {new Date(row.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-4 px-6 text-right text-rose-500 font-extrabold">
                          {formatCurrency(row.cost)}
                        </td>
                        <td className="py-4 px-6 text-right text-slate-600 dark:text-slate-300">
                          {formatNumber(row.impressions)}
                        </td>
                        <td className="py-4 px-6 text-right text-slate-600 dark:text-slate-300">
                          {formatNumber(row.views)}
                        </td>
                        <td className="py-4 px-6 text-right text-slate-600 dark:text-slate-300">
                          {formatNumber(row.clicks)}
                        </td>
                        <td className="py-4 px-6 text-right text-emerald-500 font-semibold">
                          {formatNumber(row.likes)}
                        </td>
                        <td className="py-4 px-6 text-right text-blue-500 font-semibold">
                          {formatNumber(row.comments)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500 dark:text-slate-400 font-bold bg-slate-50 dark:bg-white/[0.01] rounded-3xl">
                        No daily records found. Trigger "Sync Metrics" to download history.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YoutubeAdDetail;
