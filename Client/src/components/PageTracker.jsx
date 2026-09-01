import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CustomSelect from './CustomSelect';
import axios from 'axios';
import {
  TrendingUp,
  RefreshCw,
  Globe,
  Camera,
  Calendar,
  Plus,
  Trash2,
  AlertCircle,
  TrendingDown,
  Minus,
  X,
  ChevronRight,
  Info,
  Zap,
  Clock,
  Filter
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const PageTracker = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [configs, setConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(localStorage.getItem('selectedMetaConfigId') || '');
  const [pagesHistory, setPagesHistory] = useState([]);
  const [livePages, setLivePages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [error, setError] = useState(null);

  // Date Filter state: 'all' | '30days' | '90days' | 'thisMonth'
  const [dateFilter, setDateFilter] = useState('all');

  // Modal states
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedPageForDetails, setSelectedPageForDetails] = useState(null);

  const [selectedPageKey, setSelectedPageKey] = useState('');

  // Manual Log Entry Form State
  const [formPageId, setFormPageId] = useState('');
  const [formPageName, setFormPageName] = useState('');
  const [formPlatform, setFormPlatform] = useState('facebook');
  const [formIgUsername, setFormIgUsername] = useState('');
  const [formFollowers, setFormFollowers] = useState('');
  const [formLikes, setFormLikes] = useState('');
  const [formPosts, setFormPosts] = useState('');
  const [formRecordDate, setFormRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Fetch Meta Configs
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const res = await axios.get('/api/meta/configs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && res.data.configs) {
          setConfigs(res.data.configs);
          if (!selectedConfigId && res.data.configs.length > 0) {
            const firstId = String(res.data.configs[0].id);
            setSelectedConfigId(firstId);
            localStorage.setItem('selectedMetaConfigId', firstId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch meta configurations:", err);
      }
    };
    fetchConfigs();
  }, [token]);

  // Fetch Page Tracker History & Live Pages list
  const fetchTrackerData = async () => {
    if (!selectedConfigId) return;
    try {
      setLoading(true);
      setError(null);
      
      const configHeaders = { 
        Authorization: `Bearer ${token}`,
        'X-Meta-Config-Id': selectedConfigId
      };

      // 1. Fetch live pages first (which automatically saves/updates current date snapshot to DB)
      const liveRes = await axios.get('/api/meta/fb-pages', { headers: configHeaders });
      if (liveRes.data.success) {
        setLivePages(liveRes.data.data);
      }

      // 2. Fetch history from database after live save is complete
      const historyRes = await axios.get('/api/meta/page-tracker/history', { headers: configHeaders });
      if (historyRes.data.success) {
        setPagesHistory(historyRes.data.data);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error("Error fetching tracker data:", err);
      setError(err.response?.data?.message || err.message || "Failed to load page tracker data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, [selectedConfigId, token]);

  // Sync Live metrics and reload
  const handleSyncMetrics = async () => {
    if (!selectedConfigId) return;
    try {
      setSyncing(true);
      setError(null);
      const res = await axios.post('/api/meta/page-tracker/sync', {}, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Meta-Config-Id': selectedConfigId
        }
      });
      if (res.data.success) {
        setPagesHistory(res.data.data);
        setLastSyncTime(new Date());
        // Refresh live pages list
        const liveRes = await axios.get('/api/meta/fb-pages', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'X-Meta-Config-Id': selectedConfigId
          }
        });
        if (liveRes.data.success) {
          setLivePages(liveRes.data.data);
        }
      }
    } catch (err) {
      console.error("Error syncing metrics:", err);
      alert(err.response?.data?.message || "Failed to sync live page metrics.");
    } finally {
      setSyncing(false);
    }
  };

  // Helper date formatter
  const formatDateDisplay = (dateStr, year, month) => {
    if (dateStr) {
      const parts = String(dateStr).split('T')[0].split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
    }
    if (year && month) {
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return 'N/A';
  };

  const getMonthName = (monthNumber) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('en-US', { month: 'short' });
  };

  // Group history records by platform + page_id with Date-wise chronological metrics
  const pagesSummary = useMemo(() => {
    const listMap = new Map();

    // 1. Populate from live list first
    livePages.forEach(p => {
      const fbKey = `facebook-${p.id}`;
      listMap.set(fbKey, {
        page_id: p.id,
        page_name: p.name,
        platform: 'facebook',
        instagram_username: null,
        current_followers: p.followers_count || 0,
        current_likes: p.fan_count || 0,
        current_posts: p.posts_count || (p.published_posts?.summary?.total_count || 0),
        history: []
      });

      if (p.instagram_business_account && p.instagram_business_account.id) {
        const ig = p.instagram_business_account;
        const igKey = `instagram-${ig.id}`;
        listMap.set(igKey, {
          page_id: ig.id,
          page_name: ig.name || ig.username || p.name,
          platform: 'instagram',
          instagram_username: ig.username,
          current_followers: ig.followers_count || 0,
          current_likes: 0,
          current_posts: ig.media_count || 0,
          history: []
        });
      }
    });

    // 2. Populate and merge from history records
    pagesHistory.forEach(h => {
      const key = `${h.platform}-${h.page_id}`;
      if (!listMap.has(key)) {
        listMap.set(key, {
          page_id: h.page_id,
          page_name: h.page_name,
          platform: h.platform,
          instagram_username: h.instagram_username,
          current_followers: 0,
          current_likes: 0,
          current_posts: 0,
          history: []
        });
      }

      const item = listMap.get(key);
      const recordDate = h.record_date 
        ? h.record_date.split('T')[0] 
        : (h.recorded_at ? h.recorded_at.split('T')[0] : `${h.record_year}-${String(h.record_month).padStart(2, '0')}-01`);

      // Deduplicate date entries: keep latest ID per date
      const existingDateIdx = item.history.findIndex(existing => existing.date === recordDate);
      if (existingDateIdx !== -1) {
        if (h.id > item.history[existingDateIdx].id) {
          item.history[existingDateIdx] = {
            id: h.id,
            followers: h.followers_count,
            likes: h.likes_count,
            posts: h.posts_count,
            year: h.record_year,
            month: h.record_month,
            date: recordDate,
            recorded_at: h.recorded_at
          };
        }
      } else {
        item.history.push({
          id: h.id,
          followers: h.followers_count,
          likes: h.likes_count,
          posts: h.posts_count,
          year: h.record_year,
          month: h.record_month,
          date: recordDate,
          recorded_at: h.recorded_at
        });
      }
    });

    // 3. For each unique page/account, sort history chronologically by date and calculate period growth
    const summaryArray = Array.from(listMap.values());
    const now = new Date();
    
    summaryArray.forEach(item => {
      // Sort history chronologically: older dates first
      item.history.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate period-over-period differences
      item.history.forEach((hist, index) => {
        if (index === 0) {
          hist.growth = 0;
          hist.growthPercentage = 0;
        } else {
          const prev = item.history[index - 1];
          const diff = hist.followers - prev.followers;
          hist.growth = diff;
          hist.growthPercentage = prev.followers > 0 ? (diff / prev.followers) * 100 : 0;
        }
      });

      // Filter history for display if date filter is active
      let filteredHist = item.history;
      if (dateFilter === '30days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredHist = item.history.filter(h => new Date(h.date) >= past30);
      } else if (dateFilter === '90days') {
        const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filteredHist = item.history.filter(h => new Date(h.date) >= past90);
      } else if (dateFilter === 'thisMonth') {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        filteredHist = item.history.filter(h => h.year === currentYear && h.month === currentMonth);
      }

      item.displayHistory = filteredHist.length > 0 ? filteredHist : item.history;

      // Determine latest metrics and previous metrics to calculate growth change
      const historyLength = item.history.length;
      if (historyLength > 0) {
        const latestLog = item.history[historyLength - 1];
        item.current_followers = latestLog.followers;
        item.current_likes = latestLog.likes;
        item.current_posts = latestLog.posts;
        item.latest_date = latestLog.date;
        item.latest_year = latestLog.year;
        item.latest_month = latestLog.month;
        
        if (historyLength > 1) {
          const prevLog = item.history[historyLength - 2];
          item.period_change = latestLog.followers - prevLog.followers;
          item.period_change_percent = prevLog.followers > 0 ? ((latestLog.followers - prevLog.followers) / prevLog.followers) * 100 : 0;
          item.prev_date = prevLog.date;
        } else {
          item.period_change = 0;
          item.period_change_percent = 0;
        }
      } else {
        item.period_change = 0;
        item.period_change_percent = 0;
      }
    });

    return summaryArray;
  }, [livePages, pagesHistory, dateFilter]);

  // Pre-fill fields when selecting page in Manual Entry form
  const handlePageSelectForForm = (e) => {
    const selectedVal = e.target.value;
    setSelectedPageKey(selectedVal);
    if (!selectedVal) {
      setFormPageId('');
      setFormPageName('');
      setFormPlatform('facebook');
      setFormIgUsername('');
      setFormFollowers('');
      setFormLikes('');
      setFormPosts('');
      return;
    }

    const [platform, pageId] = selectedVal.split('|');
    const matched = pagesSummary.find(p => p.platform === platform && p.page_id === pageId);
    
    if (matched) {
      setFormPageId(matched.page_id);
      setFormPageName(matched.page_name);
      setFormPlatform(matched.platform);
      setFormIgUsername(matched.instagram_username || '');
      setFormFollowers(matched.current_followers || '');
      setFormLikes(matched.current_likes || '');
      setFormPosts(matched.current_posts || '');
    }
  };

  // Submit manual log entry with exact Date support
  const handleSubmitMetric = async (e) => {
    e.preventDefault();
    if (!formPageId || !formPageName || !formPlatform || !formRecordDate) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitLoading(true);
      const parsedDate = new Date(formRecordDate);
      const res = await axios.post('/api/meta/page-tracker/updates', {
        page_id: formPageId,
        page_name: formPageName,
        platform: formPlatform,
        instagram_username: formIgUsername || null,
        followers_count: parseInt(formFollowers) || 0,
        likes_count: parseInt(formLikes) || 0,
        posts_count: parseInt(formPosts) || 0,
        record_date: formRecordDate,
        record_year: parsedDate.getFullYear(),
        record_month: parsedDate.getMonth() + 1
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Meta-Config-Id': selectedConfigId
        }
      });

      if (res.data.success) {
        setIsUpdateModalOpen(false);
        // Reset form
        setSelectedPageKey('');
        setFormPageId('');
        setFormPageName('');
        setFormFollowers('');
        setFormLikes('');
        setFormPosts('');
        setFormRecordDate(new Date().toISOString().split('T')[0]);
        
        // Refresh
        await fetchTrackerData();

        // If history details drawer is open for this page, update details too
        if (selectedPageForDetails) {
          const updatedPage = pagesSummary.find(
            p => p.page_id === formPageId && p.platform === formPlatform
          );
          if (updatedPage) setSelectedPageForDetails(updatedPage);
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to update page metrics log.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete a specific log entry
  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this historical log entry? Growth calculations will adapt automatically.")) {
      return;
    }

    try {
      const res = await axios.delete(`/api/meta/page-tracker/entry/${entryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        await fetchTrackerData();
        if (selectedPageForDetails) {
          setTimeout(() => {
            const updatedPage = pagesSummary.find(
              p => p.page_id === selectedPageForDetails.page_id && p.platform === selectedPageForDetails.platform
            );
            setSelectedPageForDetails(updatedPage || null);
          }, 200);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete log entry.");
    }
  };

  return (
    <div className="p-8 min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 dark:border-white/10 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            <span>Social Page & Follower Tracker</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 flex items-center gap-2">
            <span>Track, manage, and present exact date-wise follower statistics and live real-time metrics across Meta accounts.</span>
            {lastSyncTime && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Clock className="w-3 h-3 mr-1" />
                Live synced at {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-3">
          {configs.length > 0 && (
            <div className="flex items-center space-x-2">
              <label htmlFor="trackerConfigSelect" className="text-xs font-bold text-slate-500 dark:text-slate-400">Meta Account:</label>
              <CustomSelect
                value={selectedConfigId}
                onChange={(val) => {
                  setSelectedConfigId(val);
                  localStorage.setItem('selectedMetaConfigId', val);
                }}
                options={configs.map((config) => ({ value: config.id, label: config.name }))}
                className="rounded-xl px-3 py-2 text-xs"
              />
            </div>
          )}

          {/* Date Filter selector */}
          <div className="flex items-center space-x-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option className="bg-white dark:bg-slate-800" value="all">All Dates</option>
              <option className="bg-white dark:bg-slate-800" value="30days">Last 30 Days</option>
              <option className="bg-white dark:bg-slate-800" value="90days">Last 90 Days</option>
              <option className="bg-white dark:bg-slate-800" value="thisMonth">This Month</option>
            </select>
          </div>

          {/* Live Sync Button */}
          <button
            onClick={handleSyncMetrics}
            disabled={syncing || !selectedConfigId}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? "Syncing Live..." : "Live Sync Data"}</span>
          </button>

          {/* Add / Edit Record Button */}
          <button
            onClick={() => setIsUpdateModalOpen(true)}
            disabled={!selectedConfigId}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add / Edit Record</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500/25 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">
            Loading metrics history...
          </p>
        </div>
      ) : pagesSummary.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-16 text-center flex flex-col items-center justify-center">
          <Globe className="w-16 h-16 text-slate-300 dark:text-white/10 mb-4" />
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Tracked Pages Found</h4>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mb-6">
            There are no saved date metrics or active Facebook Pages configured. Click the button below to sync live real-time statistics from the Meta API.
          </p>
          <button
            onClick={handleSyncMetrics}
            disabled={syncing}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/15"
          >
            <Zap className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync Meta Pages Live Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left / Middle: Page Tracking Grid */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <Globe className="w-4 h-4 mr-2 text-blue-500" />
                Connected Profiles & Date-Wise Status
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                Showing {pagesSummary.length} profiles
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {pagesSummary.map((page) => {
                const isFb = page.platform === 'facebook';
                return (
                  <div
                    key={`${page.platform}-${page.page_id}`}
                    onClick={() => setSelectedPageForDetails(page)}
                    className={`bg-white dark:bg-white/[0.02] border rounded-2xl p-5 relative overflow-hidden group cursor-pointer transition-all duration-300 flex flex-col justify-between hover:shadow-md ${
                      selectedPageForDetails && selectedPageForDetails.page_id === page.page_id && selectedPageForDetails.platform === page.platform
                        ? 'border-blue-500 shadow-md ring-2 ring-blue-500/10'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div>
                      {/* Platform header */}
                      <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isFb 
                              ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/5 dark:text-blue-400' 
                              : 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/5 dark:text-pink-400'
                          }`}>
                            {isFb ? <Globe className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors leading-tight truncate" title={page.page_name}>
                              {page.page_name}
                            </h4>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-none mt-1">
                              {isFb ? 'Facebook Page' : `@${page.instagram_username}`}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>

                      {/* Main metrics display */}
                      <div className="grid grid-cols-2 gap-4 py-2">
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Followers</span>
                          <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">
                            {page.current_followers.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Posts Count</span>
                          <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">
                            {page.current_posts.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Growth Metrics Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                        {page.history.length > 0 
                          ? `Last Logged: ${formatDateDisplay(page.latest_date, page.latest_year, page.latest_month)}` 
                          : 'No history logged'}
                      </span>
                      
                      {page.history.length > 1 ? (
                        <div className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          page.period_change > 0 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : page.period_change < 0 
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                              : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                        }`}>
                          {page.period_change > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : page.period_change < 0 ? (
                            <TrendingDown className="w-3.5 h-3.5" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {page.period_change > 0 ? '+' : ''}
                            {page.period_change.toLocaleString('en-IN')} ({page.period_change > 0 ? '+' : ''}{page.period_change_percent.toFixed(1)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center">
                          <Info className="w-3.5 h-3.5 mr-1" />
                          Requires 2+ dates
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Detailed Page History & Chart View */}
          <div className="lg:col-span-1">
            {selectedPageForDetails ? (
              <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-6 sticky top-8">
                
                {/* Header details */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-white/10">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                      {selectedPageForDetails.platform === 'facebook' ? (
                        <Globe className="w-4 h-4 mr-2 text-blue-500" />
                      ) : (
                        <Camera className="w-4 h-4 mr-2 text-pink-500" />
                      )}
                      {selectedPageForDetails.page_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedPageForDetails.platform === 'facebook' 
                        ? 'Facebook Page History' 
                        : `Instagram Account: @${selectedPageForDetails.instagram_username}`}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedPageForDetails(null)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* History Chart */}
                {selectedPageForDetails.displayHistory.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Followers Growth Trend</h4>
                    <div className="h-44 w-full bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-2 border border-slate-100 dark:border-white/5">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart 
                          data={selectedPageForDetails.displayHistory.map(h => ({
                            name: formatDateDisplay(h.date, h.year, h.month),
                            followers: h.followers
                          }))}
                          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="followerColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            stroke={isDark ? '#94a3b8' : '#64748b'} 
                            tick={{ fontSize: 8, fontWeight: 'bold' }}
                          />
                          <YAxis 
                            stroke={isDark ? '#94a3b8' : '#64748b'} 
                            tick={{ fontSize: 9, fontWeight: 'bold' }}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: isDark ? '#1e293b' : '#ffffff',
                              borderColor: isDark ? '#475569' : '#cbd5e1',
                              color: isDark ? '#f8fafc' : '#0f172a',
                              borderRadius: '8px',
                              fontSize: '10.5px',
                              fontWeight: 'bold'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="followers" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#followerColor)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No historical logs to draw chart.
                  </div>
                )}

                {/* History Log Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date-Wise Logs History</h4>
                  
                  {selectedPageForDetails.displayHistory.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-xl">
                      No logs created yet for this date range.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-60 custom-scrollbar border border-slate-100 dark:border-white/5 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/50 dark:border-white/5 text-slate-500 font-bold z-10">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-right">Followers</th>
                            <th className="py-2.5 px-3 text-right">Growth</th>
                            <th className="py-2.5 px-2 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {selectedPageForDetails.displayHistory.slice().reverse().map((hist) => (
                            <tr key={hist.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors font-medium">
                              <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-700 dark:text-slate-300">
                                {formatDateDisplay(hist.date, hist.year, hist.month)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                                {hist.followers.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                {hist.growth !== 0 ? (
                                  <span className={`font-bold ${hist.growth > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {hist.growth > 0 ? '+' : ''}
                                    {hist.growth.toLocaleString('en-IN')} ({hist.growth > 0 ? '+' : ''}{hist.growthPercentage.toFixed(1)}%)
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-bold">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  onClick={() => handleDeleteEntry(hist.id)}
                                  className="p-1 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded transition-all"
                                  title="Delete Entry"
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
              </div>
            ) : (
              <div className="bg-white dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center sticky top-8">
                <TrendingUp className="w-8 h-8 text-slate-300 dark:text-white/10 mb-2 animate-bounce" />
                <span>Select a profile from the list to view detailed date-wise follower history and trend graphs.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Metric Entry Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Add or Edit Date Metric</h3>
              <button 
                onClick={() => setIsUpdateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitMetric} className="p-6 space-y-4">
              
              {/* Select Profile */}
              <div>
                <label htmlFor="modalProfileSelect" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Select Profile *</label>
                <CustomSelect
                  value={selectedPageKey}
                  onChange={(val) => handlePageSelectForForm({ target: { value: val } })}
                  options={[
                    { value: "", label: "-- Choose Facebook Page / Instagram Account --" },
                    ...pagesSummary.map(p => ({
                      value: `${p.platform}|${p.page_id}`,
                      label: `[${p.platform === 'facebook' ? 'Facebook' : 'Instagram'}] ${p.page_name}`
                    }))
                  ]}
                  className="w-full rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {/* Selected Profile Read-only Metadata */}
              {formPageId ? (
                <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400">Platform:</span>
                    <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">{formPlatform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400">Profile Name:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formPageName}</span>
                  </div>
                  {formPlatform === 'instagram' && formIgUsername && (
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-400">Username:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">@{formIgUsername}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400">Page ID:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">{formPageId}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-500/5 border border-blue-500/10 text-blue-500 rounded-xl text-xs flex items-center space-x-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Please select a profile to log metrics for.</span>
                </div>
              )}

              {/* Only show numeric inputs and date input if a profile has been selected */}
              {formPageId && (
                <>
                  {/* Record Date Picker */}
                  <div>
                    <label htmlFor="modalDateInput" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Record Date *</label>
                    <input
                      id="modalDateInput"
                      type="date"
                      required
                      value={formRecordDate}
                      onChange={(e) => setFormRecordDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100 cursor-pointer"
                    />
                  </div>

                  {/* Grid: Followers count & Likes / Posts count */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="modalFollowersInput" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Followers Count *</label>
                      <input
                        id="modalFollowersInput"
                        type="number"
                        required
                        min="0"
                        value={formFollowers}
                        onChange={(e) => setFormFollowers(e.target.value)}
                        placeholder="e.g. 1540"
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label htmlFor="modalPostsInput" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Posts Count</label>
                      <input
                        id="modalPostsInput"
                        type="number"
                        min="0"
                        value={formPosts}
                        onChange={(e) => setFormPosts(e.target.value)}
                        placeholder="e.g. 120"
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsUpdateModalOpen(false);
                    setSelectedPageKey('');
                    setFormPageId('');
                    setFormPageName('');
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading || !formPageId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer"
                >
                  {submitLoading ? "Saving..." : "Save Record"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PageTracker;
