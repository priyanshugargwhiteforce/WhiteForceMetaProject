import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  DollarSign, Eye, MousePointerClick, Target, TrendingUp, AlertCircle, ChevronRight, LayoutDashboard, Key, IndianRupee, Calendar
} from 'lucide-react';

const TIME_RANGES = {
  TODAY: 'TODAY',
  THIS_WEEK: 'THIS_WEEK_MON_TODAY',
  THIS_MONTH: 'THIS_MONTH',
  ALL_TIME: 'ALL_TIME',
  CUSTOM: 'CUSTOM'
};

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
];

const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

const GoogleInsights = () => {
  const [timeRange, setTimeRange] = useState(TIME_RANGES.THIS_MONTH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [metrics, setMetrics] = useState({
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0
  });
  const [graphData, setGraphData] = useState([]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchGoogleData(timeRange, selectedAccount, selectedYear, selectedMonth);
    }
  }, [timeRange, selectedAccount, selectedYear, selectedMonth]);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/google/accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.accounts.length > 0) {
        setAccounts(data.accounts);
        setSelectedAccount(data.accounts.includes('7571652142') ? '7571652142' : data.accounts[0]);
      }
    } catch (e) {
      console.error("Failed to fetch accounts", e);
    }
  };

  const fetchGoogleData = async (range, customerId, year, month) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/google/dashboard');
      url.searchParams.append('range', range);
      if (customerId) url.searchParams.append('customerId', customerId);
      if (range === TIME_RANGES.CUSTOM) {
        url.searchParams.append('year', year);
        url.searchParams.append('month', month);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Failed to fetch Google Ads data.");
      setMetrics(data.metrics || { spend: 0, impressions: 0, clicks: 0, conversions: 0 });
      setGraphData(data.graphData || []);
    } catch (err) {
      console.error("Google Insights Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            <span>Google Ads</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-blue-500">Insights</span>
          </div>
          <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
            Insights & ROI Analytics
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {timeRange === TIME_RANGES.CUSTOM && (
            <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-right-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {accounts.length > 0 && (
            <select
              value={selectedAccount || ""}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-w-[200px] text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              {accounts.map(acc => (
                <option key={acc} value={acc}>Account: {acc}</option>
              ))}
            </select>
          )}

          <div className="flex bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-1 shadow-sm">
            {[
              { label: 'Today', value: TIME_RANGES.TODAY },
              { label: 'This Week', value: TIME_RANGES.THIS_WEEK },
              { label: 'This Month', value: TIME_RANGES.THIS_MONTH },
              { label: 'All Time', value: TIME_RANGES.ALL_TIME },
              { label: 'Custom', value: TIME_RANGES.CUSTOM }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setTimeRange(tab.value)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${timeRange === tab.value ? 'bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium animate-pulse">Syncing insights...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-lg mx-auto text-center mt-10">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Fetch Failed</h3>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button onClick={() => selectedAccount && fetchGoogleData(timeRange, selectedAccount, selectedYear, selectedMonth)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all">Retry</button>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Summary Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-6 rounded-3xl flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Spend</span>
              <span className="text-2xl font-extrabold text-red-550 dark:text-white mt-2">{formatCurrency(metrics.spend)}</span>
            </div>
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-6 rounded-3xl flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impressions</span>
              <span className="text-2xl font-extrabold text-slate-850 dark:text-white mt-2">{formatNumber(metrics.impressions)}</span>
            </div>
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-6 rounded-3xl flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clicks</span>
              <span className="text-2xl font-extrabold text-slate-850 mt-2 dark:text-white">{formatNumber(metrics.clicks)}</span>
            </div>
            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/10 p-6 rounded-3xl flex flex-col justify-between">
              <span className="text-[10px] font-bold text-blue-500 dark:text-blue-300 uppercase tracking-widest">Conversions</span>
              <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">{formatNumber(metrics.conversions)}</span>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Impressions Trend */}
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                    Search & Display Visibility
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Daily impressions trend</p>
                </div>
              </div>
              <div className="h-72">
                {graphData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGoogle" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => val > 1000 ? (val / 1000).toFixed(1) + 'k' : val} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-main)', fontSize: '12px' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorGoogle)" />
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
                    <IndianRupee className="w-5 h-5 mr-2 text-red-500" />
                    Daily Ad Cost
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Google Ads daily budget utilization</p>
                </div>
              </div>
              <div className="h-72">
                {graphData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => '₹' + val} />
                      <RechartsTooltip
                        cursor={{ fill: 'rgba(239, 68, 68, 0.05)' }}
                        contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-main)', fontSize: '12px' }}
                        itemStyle={{ color: '#ef4444', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="spend" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">No spend data available.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleInsights;
