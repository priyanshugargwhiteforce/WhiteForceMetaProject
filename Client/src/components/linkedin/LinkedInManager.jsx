import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Eye, TrendingUp, Activity, Target, AlertCircle, ChevronRight, 
  IndianRupee, RefreshCw, Calendar, Users, Briefcase, Info,
  CheckCircle, Database, ShieldAlert, Award
} from 'lucide-react';

const LinkedInManager = () => {
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [insightsTrend, setInsightsTrend] = useState([]);
  const [demographics, setDemographics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Header date range filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Real-time synchronization states
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(null);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    fetchAdAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchDashboardData(selectedAccountId);
    }
  }, [selectedAccountId]);

  const fetchAdAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/linkedin/accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Failed to fetch LinkedIn accounts");
      
      if (result.adaccounts && result.adaccounts.data) {
        setAdAccounts(result.adaccounts.data);
        if (result.adaccounts.data.length > 0) {
          setSelectedAccountId(result.adaccounts.data[0].id);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("LinkedIn Accounts Fetch Error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchDashboardData = async (accountId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      // 1. Fetch campaigns
      const campRes = await fetch(`http://localhost:5000/api/linkedin/campaigns/${accountId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const campResult = await campRes.json();
      if (campResult.success) {
        setCampaigns(campResult.data);
      }

      // 2. Fetch daily trends
      const insRes = await fetch(`http://localhost:5000/api/linkedin/insights/${accountId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const insResult = await insRes.json();
      if (insResult.success) {
        setInsightsTrend(insResult.data);
      }

      // 3. Fetch audience demographics
      const audRes = await fetch(`http://localhost:5000/api/linkedin/audience/${accountId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const audResult = await audRes.json();
      if (audResult.success) {
        setDemographics(audResult.data);
      }
    } catch (err) {
      console.error("LinkedIn Dashboard Data Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncRealtimeData = async () => {
    if (!selectedAccountId) return;
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/linkedin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ accountId: selectedAccountId })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Failed to sync LinkedIn API");

      // Reload fresh database records
      await fetchDashboardData(selectedAccountId);
      
      setSyncSuccess(result.message);
      setTimeout(() => setSyncSuccess(null), 8000);
    } catch (err) {
      console.error("LinkedIn Sync Error:", err);
      setSyncError(err.message || "A connection failure occurred during LinkedIn synchronization.");
    } finally {
      setSyncing(false);
    }
  };

  // Filter insights daily trend by date pickers
  const filteredTrendData = useMemo(() => {
    return insightsTrend.filter(day => {
      if (!day.date_start) return true;
      const dayDate = new Date(day.date_start);
      dayDate.setHours(0, 0, 0, 0);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (dayDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (dayDate > end) return false;
      }
      
      return true;
    });
  }, [insightsTrend, startDate, endDate]);

  // Memoized aggregations
  const metrics = useMemo(() => {
    let spend = 0;
    let impressions = 0;
    let clicks = 0;
    let conversions = 0;
 
    filteredTrendData.forEach(day => {
      spend += parseFloat(day.spend) || 0;
      impressions += parseInt(day.impressions) || 0;
      clicks += parseInt(day.clicks) || 0;
      conversions += parseInt(day.conversions) || 0;
    });

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    return { spend, impressions, clicks, conversions, ctr };
  }, [filteredTrendData]);

  const chartData = useMemo(() => {
    return [...filteredTrendData]
      .reverse()
      .map(item => ({
        date: new Date(item.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        spend: parseFloat(item.spend) || 0,
        impressions: parseInt(item.impressions) || 0,
        clicks: parseInt(item.clicks) || 0,
        conversions: parseInt(item.conversions) || 0
      }));
  }, [filteredTrendData]);

  const demographicGroups = useMemo(() => {
    const groups = {
      job_functions: [],
      industries: [],
      seniorities: []
    };
    demographics.forEach(item => {
      const cat = item.category.toLowerCase();
      if (cat.includes('function')) {
        groups.job_functions.push(item);
      } else if (cat.includes('industry')) {
        groups.industries.push(item);
      } else if (cat.includes('seniority')) {
        groups.seniorities.push(item);
      } else {
        if (!groups[item.category]) {
          groups[item.category] = [];
        }
        groups[item.category].push(item);
      }
    });
    // Sort each group by percentage descending
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
    });
    return groups;
  }, [demographics]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const MetricCard = ({ title, value, icon: Icon, colorClass, gradientClass }) => (
    <div className={`relative overflow-hidden rounded-[2rem] p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 group hover:shadow-2xl hover:shadow-${colorClass}-500/10 transition-all duration-500 h-full flex flex-col justify-between`}>
      <div className={`absolute -right-6 -top-6 w-32 h-32 opacity-[0.03] group-hover:scale-110 transition-transform duration-700 bg-${colorClass}-500 rounded-full blur-2xl`}></div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest block pr-2">{title}</span>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg shadow-${colorClass}-500/20 shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight break-words">{value}</h3>
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
            <span className="text-blue-600 dark:text-blue-400">LinkedIn Ads Intelligence</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">LinkedIn Manager</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Header Date Filters */}
          <div className="flex items-center space-x-2 bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-2xl px-3.5 py-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-[11px] font-bold text-slate-700 dark:text-slate-300 w-[110px] cursor-pointer"
              title="Start Date"
            />
            <span className="text-slate-400 font-bold px-1">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-[11px] font-bold text-slate-700 dark:text-slate-300 w-[110px] cursor-pointer"
              title="End Date"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-[10px] font-extrabold text-red-500 hover:text-red-600 transition-colors uppercase pl-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sync Button */}
          <button 
            disabled={syncing || !selectedAccountId}
            onClick={handleSyncRealtimeData}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/10 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Realtime Data'}</span>
          </button>

          {/* LinkedIn Ad Account Selector */}
          <select 
            value={selectedAccountId} 
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-w-[200px] text-slate-800 dark:text-white cursor-pointer"
          >
            {adAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        {/* Sync Success / Error Alert */}
        {syncSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-300 mb-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{syncSuccess}</span>
            </div>
            <button onClick={() => setSyncSuccess(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
          </div>
        )}

        {syncError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-300 mb-6">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
              <span>{syncError}</span>
            </div>
            <button onClick={() => setSyncError(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
          </div>
        )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-[50vh]">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium animate-pulse">Aggregating LinkedIn Analytics...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-lg mx-auto text-center mt-10">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Sync Failed</h3>
              <p className="text-slate-500 text-sm mb-6">{error}</p>
              <button onClick={() => fetchDashboardData(selectedAccountId)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all">Retry</button>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <MetricCard 
                  title="Total Ad Spend" 
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
                  title="Clicks" 
                  value={formatNumber(metrics.clicks)} 
                  icon={Activity} 
                  colorClass="emerald"
                  gradientClass="from-emerald-500 to-teal-600"
                />
                <MetricCard 
                  title="Average CTR" 
                  value={`${metrics.ctr.toFixed(2)}%`} 
                  icon={TrendingUp} 
                  colorClass="amber"
                  gradientClass="from-amber-500 to-orange-600"
                />
                <MetricCard 
                  title="Lead Conversions" 
                  value={formatNumber(metrics.conversions)} 
                  icon={Target} 
                  colorClass="rose"
                  gradientClass="from-rose-500 to-red-600"
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
                        Visibility & Clicks Trend
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">LinkedIn daily performance visibility</p>
                    </div>
                  </div>
                  <div className="h-72">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => val > 1000 ? (val/1000).toFixed(1)+'k' : val} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-main)', fontSize: '12px' }}
                            itemStyle={{ fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorImpressions)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-sm">No trend data available.</div>
                    )}
                  </div>
                </div>

                {/* Spend Trend */}
                <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-bold flex items-center">
                        <IndianRupee className="w-5 h-5 mr-2 text-indigo-600" />
                        Daily LinkedIn Ad Spend
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">LinkedIn Ads operational burn rate</p>
                    </div>
                  </div>
                  <div className="h-72">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => '₹'+val} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                            contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-main)', fontSize: '12px' }}
                            itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="spend" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-sm">No spend data available.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Campaigns Database Section */}
              <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold flex items-center text-slate-800 dark:text-white">
                      <Briefcase className="w-5 h-5 mr-2 text-blue-500" />
                      LinkedIn Ad Campaigns
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Showing database records for active campaigns, ad setups, and budgets matching active account.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 dark:border-white/5 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign Name</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign Group</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Spend</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Synced</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {campaigns.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-12">
                            <Database className="w-10 h-10 text-slate-300 dark:text-white/10 mx-auto mb-2" />
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Campaigns Registered</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                              Click the Sync button to connect to your LinkedIn developer accounts and fetch active campaign logs.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        campaigns.map((camp) => (
                          <tr key={camp.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-3 text-xs">
                              <div className="font-bold text-slate-900 dark:text-white">{camp.name}</div>
                              <div className="text-[9px] font-mono text-slate-400 mt-0.5">ID: {camp.id}</div>
                            </td>
                            <td className="px-6 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${
                                camp.status === 'RUNNING' 
                                  ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' 
                                  : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                              }`}>
                                {camp.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                              {camp.campaign_group_name || 'N/A'}
                            </td>
                            <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                              {camp.type.replace(/_/g, ' ')}
                            </td>
                            <td className="px-6 py-3 text-xs text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(camp.total_spent)}
                            </td>
                            <td className="px-6 py-3 text-xs text-slate-400 font-semibold">
                              {camp.last_synced_at ? new Date(camp.last_synced_at).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Demographics Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Job Functions Card */}
                <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
                  <h3 className="text-lg font-bold flex items-center mb-6 text-slate-800 dark:text-white">
                    <Award className="w-5 h-5 mr-2 text-blue-500" />
                    Job Functions
                  </h3>
                  <div className="space-y-4">
                    {demographicGroups.job_functions.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No Job Function demographic records found.</p>
                    ) : (
                      demographicGroups.job_functions.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700 dark:text-slate-300">{item.key_name}</span>
                            <span className="text-blue-500 font-mono font-bold">{parseFloat(item.percentage).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000" 
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Industries Card */}
                <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
                  <h3 className="text-lg font-bold flex items-center mb-6 text-slate-800 dark:text-white">
                    <Briefcase className="w-5 h-5 mr-2 text-purple-500" />
                    Top Industries
                  </h3>
                  <div className="space-y-4">
                    {demographicGroups.industries.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No Industry demographic records found.</p>
                    ) : (
                      demographicGroups.industries.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700 dark:text-slate-300">{item.key_name}</span>
                            <span className="text-purple-500 font-mono font-bold">{parseFloat(item.percentage).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-pink-600 h-full rounded-full transition-all duration-1000" 
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Seniorities Card */}
                <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
                  <h3 className="text-lg font-bold flex items-center mb-6 text-slate-800 dark:text-white">
                    <Users className="w-5 h-5 mr-2 text-emerald-500" />
                    Seniority Levels
                  </h3>
                  <div className="space-y-4">
                    {demographicGroups.seniorities.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No Seniority demographic records found.</p>
                    ) : (
                      demographicGroups.seniorities.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700 dark:text-slate-300">{item.key_name}</span>
                            <span className="text-emerald-500 font-mono font-bold">{parseFloat(item.percentage).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-1000" 
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
  );
};

export default LinkedInManager;
