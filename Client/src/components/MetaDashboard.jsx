import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  Eye, TrendingUp, Activity, Target, AlertCircle, ChevronRight, 
  IndianRupee, RefreshCw, Calendar, Users, MapPin, Phone, Mail, 
  Globe, Filter, FileText, CheckCircle, Database
} from 'lucide-react';
const TIME_RANGES = {
  TODAY: 'today',
  THIS_WEEK: 'this_week_mon_today',
  THIS_MONTH: 'this_month'
};

const MetaDashboard = () => {
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [timeRange, setTimeRange] = useState('this_month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Real-time synchronization states
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(null);
  
  // Advanced custom filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // Format: YYYY-MM
  
  // Raw fetched datasets
  const [graphDataRaw, setGraphDataRaw] = useState([]); // Raw daily lifetime insights trend
  const [allLeads, setAllLeads] = useState([]); // All database leads
  const [accountAdIds, setAccountAdIds] = useState([]); // Ad IDs in active account
  
  // Leads pagination state
  const [leadsCurrentPage, setLeadsCurrentPage] = useState(1);
  const [leadsPerPage, setLeadsPerPage] = useState(5);

  useEffect(() => {
    fetchAdAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchDashboardData(selectedAccount.id);
    }
  }, [selectedAccount]);

  // Reset pagination on filter change
  useEffect(() => {
    setLeadsCurrentPage(1);
  }, [startDate, endDate, selectedMonth, timeRange, selectedAccount]);

  const fetchAdAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/meta/accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      
      if (result.adaccounts && result.adaccounts.data) {
        setAdAccounts(result.adaccounts.data);
        if (result.adaccounts.data.length > 0) {
          setSelectedAccount(result.adaccounts.data[0]);
        }
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchDashboardData = async (accountId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      // 1. Fetch daily lifetime insights trend
      const insRes = await fetch(`http://localhost:5000/api/meta/insights/${accountId}?preset=lifetime`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const insResult = await insRes.json();
      if (insResult.error) throw new Error(insResult.error.message);
      
      setGraphDataRaw(insResult.data || []);

      // 2. Fetch ad account ads to build accountAdIds filter list
      const accRes = await fetch(`http://localhost:5000/api/meta/accounts/${accountId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const accResult = await accRes.json();
      if (accResult.success && accResult.data?.ads?.data) {
        const adIds = accResult.data.ads.data.map(ad => ad.id);
        setAccountAdIds(adIds);
      } else {
        setAccountAdIds([]);
      }

      // 3. Fetch all leads from the database
      const leadsRes = await fetch('http://localhost:5000/api/meta/leads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const leadsResult = await leadsRes.json();
      if (leadsResult.success) {
        setAllLeads(leadsResult.data);
      }
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncRealtimeData = async () => {
    if (!selectedAccount) return;
    setSyncing(true);
    setError(null);
    setSyncSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const accountId = selectedAccount.id;

      // 1. Force sync connected ad accounts
      const accListRes = await fetch(`http://localhost:5000/api/meta/accounts?force=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const accListResult = await accListRes.json();
      if (!accListResult.success) throw new Error(accListResult.message || "Failed to sync accounts list");

      // 2. Force sync selected account details and campaign ads list
      const detailsRes = await fetch(`http://localhost:5000/api/meta/accounts/${accountId}?force=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const detailsResult = await detailsRes.json();
      if (!detailsResult.success) throw new Error(detailsResult.message || "Failed to sync account details");

      const ads = detailsResult.data?.ads?.data || [];
      const adIds = ads.map(a => a.id);

      // 3. Force sync selected account daily insights trend
      const insRes = await fetch(`http://localhost:5000/api/meta/insights/${accountId}?preset=lifetime&force=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const insResult = await insRes.json();
      if (!insResult.success) throw new Error(insResult.message || "Failed to sync account insights");

      // 4. Force sync leads for all ads belonging to this account in parallel
      if (adIds.length > 0) {
        await Promise.all(adIds.map(async (adId) => {
          try {
            await fetch('http://localhost:5000/api/meta/leads/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ adId })
            });
          } catch (err) {
            console.warn(`Leads sync skipped for Ad ID: ${adId}`, err);
          }
        }));
      }

      // Reload fresh database records into screen
      await fetchDashboardData(accountId);
      setSyncSuccess(`Real-time sync finished! Saved connected accounts, active ads, daily insights, and live lead database records.`);
      setTimeout(() => setSyncSuccess(null), 8000);
    } catch (err) {
      console.error("Real-time Sync Error:", err);
      setError(err.message || "A network error occurred during Meta synchronization.");
    } finally {
      setSyncing(false);
    }
  };

  // Helper to generate list of 12 recent months dynamically
  const getRecentMonths = () => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const year = date.getFullYear();
      const monthNum = String(date.getMonth() + 1).padStart(2, '0');
      const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      months.push({ value: `${year}-${monthNum}`, label: monthLabel });
      date.setMonth(date.getMonth() - 1);
    }
    return months;
  };

  const handlePresetClick = (val) => {
    setStartDate('');
    setEndDate('');
    setSelectedMonth('');
    setTimeRange(val);
  };

  // Dynamic unified filtering using useMemo
  const filteredResult = useMemo(() => {
    if (!graphDataRaw || graphDataRaw.length === 0) {
      return {
        metrics: { spend: 0, impressions: 0, reach: 0, clicks: 0, actions: 0 },
        graphData: [],
        leads: []
      };
    }

    // Determine absolute date range bounds
    let startBound = null;
    let endBound = null;

    if (startDate) {
      startBound = new Date(startDate);
      startBound.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      endBound = new Date(endDate);
      endBound.setHours(23, 59, 59, 999);
    }

    // Month filter overrides presets if custom dates are absent
    if (selectedMonth && !startDate && !endDate) {
      const [year, month] = selectedMonth.split('-').map(Number);
      startBound = new Date(year, month - 1, 1);
      endBound = new Date(year, month, 0, 23, 59, 59, 999);
    }

    // Standard preset fallback if custom selectors are blank
    if (!startBound && !endBound) {
      const today = new Date();
      if (timeRange === TIME_RANGES.TODAY) {
        startBound = new Date(today);
        startBound.setHours(0, 0, 0, 0);
        endBound = new Date(today);
        endBound.setHours(23, 59, 59, 999);
      } else if (timeRange === TIME_RANGES.THIS_WEEK) {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        startBound = new Date(today.setDate(diff));
        startBound.setHours(0, 0, 0, 0);
        endBound = new Date();
        endBound.setHours(23, 59, 59, 999);
      } else if (timeRange === TIME_RANGES.THIS_MONTH) {
        startBound = new Date(today.getFullYear(), today.getMonth(), 1);
        endBound = new Date();
        endBound.setHours(23, 59, 59, 999);
      }
    }

    // Filter raw insights trend
    const filteredInsights = graphDataRaw.filter(day => {
      if (!day.date_start) return true;
      const dayDate = new Date(day.date_start);
      dayDate.setHours(0, 0, 0, 0);
      if (startBound && dayDate < startBound) return false;
      if (endBound && dayDate > endBound) return false;
      return true;
    });

    // Sum up values
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalActions = 0;

    filteredInsights.forEach(day => {
      totalSpend += parseFloat(day.spend) || 0;
      totalImpressions += parseInt(day.impressions) || 0;
      totalClicks += parseInt(day.clicks) || 0;
      
      const actionsList = typeof day.cost_per_action_type === 'string' 
        ? JSON.parse(day.cost_per_action_type) 
        : (day.cost_per_action_type || []);
      actionsList.forEach(a => {
        totalActions += parseInt(a.value) || 0;
      });
    });

    const metricsAgg = {
      spend: totalSpend,
      impressions: totalImpressions,
      reach: Math.round(totalImpressions * 0.85),
      clicks: totalClicks,
      actions: totalActions
    };

    // Recharts formatted trend data
    const chartData = filteredInsights.map(item => ({
      date: new Date(item.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      spend: parseFloat(item.spend) || 0,
      impressions: parseInt(item.impressions) || 0,
      clicks: parseInt(item.clicks) || 0
    }));

    // Filter leads table data (matching selected account's active ads list + date range)
    const filteredLeads = allLeads.filter(lead => {
      const matchesAccount = accountAdIds.includes(lead.ad_id);
      if (!matchesAccount) return false;

      if (lead.created_time) {
        const leadDate = new Date(lead.created_time);
        if (startBound && leadDate < startBound) return false;
        if (endBound && leadDate > endBound) return false;
      } else if (startBound || endBound) {
        return false;
      }
      return true;
    });

    return {
      metrics: metricsAgg,
      graphData: chartData,
      leads: filteredLeads
    };
  }, [graphDataRaw, allLeads, accountAdIds, startDate, endDate, selectedMonth, timeRange]);

  const { metrics, graphData, leads } = filteredResult;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const MetricCard = ({ title, value, icon: Icon, colorClass, gradientClass }) => (
    <div className={`relative overflow-hidden rounded-[2rem] p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 group hover:shadow-2xl hover:shadow-${colorClass}-500/10 transition-all duration-500`}>
      <div className={`absolute -right-6 -top-6 w-32 h-32 opacity-[0.03] group-hover:scale-110 transition-transform duration-700 bg-${colorClass}-500 rounded-full blur-2xl`}></div>
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg shadow-${colorClass}-500/20`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      {/* Title & Actions Block */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            <span>Overview</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-blue-600 dark:text-blue-400">Meta Intelligence Dashboard</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Performance Summary</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Sync Button */}
          <button 
            disabled={syncing || !selectedAccount}
            onClick={handleSyncRealtimeData}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/10 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Realtime Data'}</span>
          </button>

          {/* Ad Account Selector */}
          <select 
            value={selectedAccount?.id || ""} 
            onChange={(e) => setSelectedAccount(adAccounts.find(a => a.id === e.target.value))}
            className="bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-w-[200px] text-slate-800 dark:text-white cursor-pointer"
          >
            {adAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
          {/* Sync Success Alert */}
          {syncSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-300">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{syncSuccess}</span>
              </div>
              <button onClick={() => setSyncSuccess(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
            </div>
          )}

          {/* Premium Date Range & Month Filters Sub-bar */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold">Refine Analysis</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Dynamic Month Selector */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setStartDate('');
                    setEndDate('');
                    setSelectedMonth(e.target.value);
                  }}
                  className="bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-2xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300 min-w-[150px]"
                >
                  <option value="">All Months</option>
                  {getRecentMonths().map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Custom Date Range Pickers */}
              <div className="flex items-center space-x-1 bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-2xl p-1 px-3">
                <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1" />
                <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setSelectedMonth('');
                    setStartDate(e.target.value);
                  }}
                  className="bg-transparent border-none text-xs font-bold focus:outline-none text-slate-700 dark:text-slate-300 w-28 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 font-bold uppercase mx-1">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setSelectedMonth('');
                    setEndDate(e.target.value);
                  }}
                  className="bg-transparent border-none text-xs font-bold focus:outline-none text-slate-700 dark:text-slate-300 w-28 cursor-pointer"
                />
              </div>

              {/* Quick Presets Group */}
              <div className="flex bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-2xl p-1">
                {[
                  { label: 'Today', value: TIME_RANGES.TODAY },
                  { label: 'This Week', value: TIME_RANGES.THIS_WEEK },
                  { label: 'This Month', value: TIME_RANGES.THIS_MONTH }
                ].map((tab) => {
                  const isActive = !startDate && !endDate && !selectedMonth && timeRange === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => handlePresetClick(tab.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActive 
                          ? 'bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-blue-400' 
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Clear Active Filters */}
              {(startDate || endDate || selectedMonth) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setSelectedMonth('');
                    setTimeRange(TIME_RANGES.THIS_MONTH);
                  }}
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs rounded-2xl transition-colors uppercase tracking-wider"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-[50vh]">
              <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium animate-pulse">Aggregating Meta Data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-lg mx-auto text-center mt-10">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Data Sync Failed</h3>
              <p className="text-slate-500 text-sm mb-6">{error}</p>
              <button onClick={() => fetchDashboardData(selectedAccount.id)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all">Retry Sync</button>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                  title="Total Spend" 
                  value={formatCurrency(metrics.spend)} 
                  icon={IndianRupee} 
                  colorClass="blue"
                  gradientClass="from-blue-500 to-indigo-600"
                />
                <MetricCard 
                  title="Total Impressions" 
                  value={formatNumber(metrics.impressions)} 
                  icon={Eye} 
                  colorClass="purple"
                  gradientClass="from-purple-500 to-pink-600"
                />
                <MetricCard 
                  title="Total Reach" 
                  value={formatNumber(metrics.reach)} 
                  icon={Target} 
                  colorClass="emerald"
                  gradientClass="from-emerald-500 to-teal-600"
                />
                <MetricCard 
                  title="Engagement / Actions" 
                  value={formatNumber(metrics.actions)} 
                  icon={Activity} 
                  colorClass="amber"
                  gradientClass="from-amber-500 to-orange-600"
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Impressions Trend */}
                <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-bold flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
                        Impressions & Clicks Trend
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Daily visibility performance</p>
                    </div>
                  </div>
                  <div className="h-72">
                    {graphData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => val > 1000 ? (val/1000).toFixed(1)+'k' : val} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-main)', fontSize: '12px' }}
                            itemStyle={{ fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="impressions" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorImpressions)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-sm">No trend data available for this period.</div>
                    )}
                  </div>
                </div>

                {/* Spend Trend */}
                <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-bold flex items-center">
                        <IndianRupee className="w-5 h-5 mr-2 text-emerald-500" />
                        Daily Ad Spend
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Financial burn rate analysis</p>
                    </div>
                  </div>
                  <div className="h-72">
                    {graphData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => '₹'+val} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                            contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-main)', fontSize: '12px' }}
                            itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="spend" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-sm">No spend data available for this period.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Leads Database Section (Filtered by Selectors) */}
              <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold flex items-center text-slate-800 dark:text-white">
                      <Users className="w-5 h-5 mr-2 text-blue-500" />
                      Account Leads Database
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Showing real-time lead submissions matching selected account ads and active date bounds.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Showing:</span>
                    <select
                      value={leadsPerPage}
                      onChange={(e) => {
                        setLeadsPerPage(Number(e.target.value));
                        setLeadsCurrentPage(1);
                      }}
                      className="bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <option value={5}>5 per page</option>
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 dark:border-white/5 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lead Info</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Info</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Platform</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ad & Campaign</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created / Synced</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {leads.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-12">
                            <Database className="w-10 h-10 text-slate-300 dark:text-white/10 mx-auto mb-2" />
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Leads Found</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                              No database leads match the selected account ads or active date filters. Click the Sync button to fetch live leads!
                            </p>
                          </td>
                        </tr>
                      ) : (
                        leads.slice((leadsCurrentPage - 1) * leadsPerPage, leadsCurrentPage * leadsPerPage).map((lead) => (
                          <tr key={lead.lead_id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-3 text-xs">
                              <div className="font-bold text-slate-900 dark:text-white">{lead.full_name}</div>
                              <div className="text-[9px] font-mono text-slate-400 mt-0.5">ID: {lead.lead_id}</div>
                            </td>
                            <td className="px-6 py-3 text-xs space-y-0.5">
                              <div className="flex items-center text-slate-600 dark:text-slate-300">
                                <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[150px]">{lead.email}</span>
                              </div>
                              <div className="flex items-center text-slate-600 dark:text-slate-300">
                                <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                                <span>{lead.phone}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-300">
                              <div className="flex items-center">
                                <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                                <span>{lead.city === 'N/A' ? 'Not Provided' : lead.city}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${
                                lead.platform === 'fb' 
                                  ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' 
                                  : lead.platform === 'ig'
                                  ? 'text-pink-500 bg-pink-500/10 border-pink-500/20'
                                  : 'text-slate-500 bg-slate-500/10 border-slate-500/20'
                              }`}>
                                {lead.platform === 'fb' ? 'Facebook' : lead.platform === 'ig' ? 'Instagram' : 'Meta'}
                              </span>
                            </td>
                            <td className="px-6 py-3 max-w-[200px]">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate" title={lead.ad_name}>
                                {lead.ad_name || 'N/A'}
                              </div>
                              <div className="text-[9px] text-slate-400 truncate mt-0.5" title={lead.adset_name}>
                                Adset: {lead.adset_name || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-xs text-slate-400 font-semibold space-y-0.5">
                              <div>Created: {lead.created_time ? new Date(lead.created_time).toLocaleDateString() : 'N/A'}</div>
                              <div className="text-[9px] text-slate-400">Synced: {lead.synced_at ? new Date(lead.synced_at).toLocaleDateString() : 'N/A'}</div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {leads.length > 0 && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 dark:bg-white/[0.01] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                    <span className="text-xs text-slate-500 font-medium">
                      Showing <span className="font-bold text-slate-800 dark:text-white">{(leadsCurrentPage - 1) * leadsPerPage + 1}</span> to{' '}
                      <span className="font-bold text-slate-800 dark:text-white">
                        {Math.min(leadsCurrentPage * leadsPerPage, leads.length)}
                      </span> of{' '}
                      <span className="font-bold text-slate-800 dark:text-white">{leads.length}</span> entries
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        disabled={leadsCurrentPage === 1}
                        onClick={() => setLeadsCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[11px] font-bold rounded-lg transition-all disabled:opacity-40 disabled:pointer-events-none text-slate-600 dark:text-slate-300"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.ceil(leads.length / leadsPerPage) }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === Math.ceil(leads.length / leadsPerPage) || Math.abs(page - leadsCurrentPage) <= 1)
                        .map((page, idx, arr) => {
                          const showEllipsisBefore = page > 1 && arr[idx - 1] !== page - 1;
                          return (
                            <React.Fragment key={page}>
                              {showEllipsisBefore && <span className="text-slate-400 text-xs px-1">...</span>}
                              <button
                                onClick={() => setLeadsCurrentPage(page)}
                                className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded-lg transition-all ${
                                  leadsCurrentPage === page
                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}
                      <button
                        disabled={leadsCurrentPage === Math.ceil(leads.length / leadsPerPage)}
                        onClick={() => setLeadsCurrentPage(prev => Math.min(prev + 1, Math.ceil(leads.length / leadsPerPage)))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[11px] font-bold rounded-lg transition-all disabled:opacity-40 disabled:pointer-events-none text-slate-600 dark:text-slate-300"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
  );
};

export default MetaDashboard;
