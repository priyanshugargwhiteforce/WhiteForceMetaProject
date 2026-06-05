import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  DollarSign, Eye, MousePointerClick, Target, TrendingUp, AlertCircle, ChevronRight, LayoutDashboard, Key,
  IndianRupee, Search, Layers, Info
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

const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i); // Last 10 years

const GoogleDashboard = () => {
  const [timeRange, setTimeRange] = useState(TIME_RANGES.THIS_MONTH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [missingCreds, setMissingCreds] = useState(false);
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

  // Ad list states
  const [ads, setAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adsError, setAdsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // Detailed modal states
  const [selectedAd, setSelectedAd] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scaleSpend, setScaleSpend] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount || accounts.length === 0) {
      fetchGoogleData(timeRange, selectedAccount, selectedYear, selectedMonth);
      if (selectedAccount) {
        fetchGoogleAds(selectedAccount);
      }
    }
  }, [timeRange, selectedAccount, selectedYear, selectedMonth]);

  const fetchGoogleAds = async (customerId) => {
    setAdsLoading(true);
    setAdsError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/google/ads?customerId=${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch Google Ads");
      setAds(data.ads || []);
    } catch (err) {
      console.error(err);
      setAdsError(err.message);
    } finally {
      setAdsLoading(false);
    }
  };

  const filteredAds = React.useMemo(() => {
    if (!searchQuery.trim()) return ads;
    const query = searchQuery.toLowerCase();
    return ads.filter(ad =>
      ad.ad_name.toLowerCase().includes(query) ||
      ad.campaign_name.toLowerCase().includes(query) ||
      ad.campaign_id.toString().includes(query)
    );
  }, [ads, searchQuery]);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredAds.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredAds.length / recordsPerPage) || 1;

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/google/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && data.accounts.length > 0) {
        setAccounts(data.accounts);
        setSelectedAccount(data.accounts[0]);
      }
    } catch (e) {
      console.error("Failed to fetch accounts", e);
    }
  };

  const fetchGoogleData = async (range, customerId, year, month) => {
    setLoading(true);
    setError(null);
    setMissingCreds(false);
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.missingCredentials) {
          setMissingCreds(true);
          throw new Error("Missing Google Ads API Credentials.");
        }
        throw new Error(data.message || "Failed to fetch Google Ads data.");
      }

      setMetrics(data.metrics || { spend: 0, impressions: 0, clicks: 0, conversions: 0 });
      setGraphData(data.graphData || []);

    } catch (err) {
      console.error("Google Dashboard Fetch Error:", err);
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
      {/* Title & Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            <span>Overview</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-blue-500">Google Ads Dashboard</span>
          </div>
          <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
            <LayoutDashboard className="w-5 h-5 mr-2 text-blue-500" />
            Campaign Performance
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {timeRange === TIME_RANGES.CUSTOM && (
            <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-right-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none transition-all text-slate-800 dark:text-slate-100"
              >
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none transition-all text-slate-800 dark:text-slate-100"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {accounts.length > 0 && (
            <select
              value={selectedAccount || ""}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-w-[200px] text-slate-800 dark:text-slate-100"
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
          <p className="text-slate-500 font-medium animate-pulse">Aggregating Google Ads Data...</p>
        </div>
      ) : missingCreds ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-10 max-w-2xl mx-auto text-center mt-10 fade-in">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-amber-600 dark:text-amber-500">API Setup Required</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            We received your <code className="bg-white/50 dark:bg-black/20 px-2 py-1 rounded">client_id</code> and <code className="bg-white/50 dark:bg-black/20 px-2 py-1 rounded">client_secret</code>.
            However, to execute queries against your Google Ads account, we still need the following secure tokens added to the backend environment:
          </p>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-left mb-8 shadow-sm border border-slate-200 dark:border-white/10">
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 mt-0.5 text-xs font-bold text-slate-500">1</div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">Developer Token</p>
                  <p className="text-xs text-slate-500">Obtained from your Google Ads Manager Account (API Center).</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 mt-0.5 text-xs font-bold text-slate-500">2</div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">Refresh Token</p>
                  <p className="text-xs text-slate-500">Generated by authorizing the OAuth consent screen with a Google user.</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 mt-0.5 text-xs font-bold text-slate-500">3</div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">Customer ID</p>
                  <p className="text-xs text-slate-500">The specific 10-digit Google Ads account ID (e.g., 1234567890).</p>
                </div>
              </li>
            </ul>
          </div>

          <button onClick={() => fetchGoogleData(timeRange)} className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20">
            I've Added Them - Retry Connection
          </button>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-lg mx-auto text-center mt-10 fade-in">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Google Sync Failed</h3>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button onClick={() => fetchGoogleData(timeRange)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all">Retry Connection</button>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Cost"
              value={formatCurrency(metrics.spend)}
              icon={IndianRupee}
              colorClass="red"
              gradientClass="from-red-500 to-rose-600"
            />
            <MetricCard
              title="Total Impressions"
              value={formatNumber(metrics.impressions)}
              icon={Eye}
              colorClass="yellow"
              gradientClass="from-amber-400 to-orange-500"
            />
            <MetricCard
              title="Total Clicks"
              value={formatNumber(metrics.clicks)}
              icon={MousePointerClick}
              colorClass="blue"
              gradientClass="from-blue-500 to-indigo-600"
            />
            <MetricCard
              title="Total Conversions"
              value={formatNumber(metrics.conversions)}
              icon={Target}
              colorClass="emerald"
              gradientClass="from-emerald-500 to-teal-600"
            />
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

          {/* Google Ads List Section */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold flex items-center">
                  <Layers className="w-5 h-5 mr-2 text-blue-500" />
                  Google Ads Performance & Leads
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  List of ads, budgets, visibility, and captured lead conversions from Google Ads API
                </p>
              </div>

              <div className="relative flex-1 max-w-xs self-start md:self-auto">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ads or campaigns..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>

            {adsLoading ? (
              <div className="p-16 text-center">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 text-sm animate-pulse">Syncing Ad Group Data...</p>
              </div>
            ) : adsError ? (
              <div className="p-12 text-center text-red-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                <p className="text-sm font-semibold">{adsError}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ad Detail</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign Name / ID</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Spend</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Impressions</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Clicks</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">CTR / CPC</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Leads (Conversions)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                      {currentRecords.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-16 text-slate-400">
                            <AlertCircle className="w-10 h-10 text-slate-350 dark:text-white/10 mx-auto mb-2" />
                            <p className="font-semibold text-slate-600 dark:text-slate-350">No Google Ads Found</p>
                          </td>
                        </tr>
                      ) : (
                        currentRecords.map((ad, idx) => {
                          const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
                          const cpc = ad.clicks > 0 ? ad.spend / ad.clicks : 0;
                          const statusColors = {
                            ENABLED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                            PAUSED: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                            REMOVED: 'bg-red-500/10 text-red-500 border-red-500/20',
                          };
                          const statusClass = statusColors[ad.ad_status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';

                          return (
                            <tr
                              key={ad.ad_id || idx}
                              onClick={() => {
                                setSelectedAd(ad);
                                setIsModalOpen(true);
                                setScaleSpend("");
                              }}
                              className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer"
                            >
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800 dark:text-slate-100 mb-1">{ad.ad_name}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase border ${statusClass}`}>
                                      {ad.ad_status}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">ID: {ad.ad_id}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">{ad.campaign_name}</span>
                                  <span className="text-[10px] font-mono text-slate-400">ID: {ad.campaign_id}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300 font-semibold">
                                {formatCurrency(ad.spend)}
                              </td>
                              <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-300">
                                {formatNumber(ad.impressions)}
                              </td>
                              <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-300">
                                {formatNumber(ad.clicks)}
                              </td>
                              <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300">
                                {ctr.toFixed(2)}% / ₹{cpc.toFixed(1)}
                              </td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {ad.conversions}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredAds.length > 0 && (
                  <div className="p-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.01]">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-slate-500 font-medium">
                        Showing <span className="font-bold text-slate-800 dark:text-white">{indexOfFirstRecord + 1}</span> to{' '}
                        <span className="font-bold text-slate-800 dark:text-white">
                          {Math.min(indexOfLastRecord, filteredAds.length)}
                        </span> of{' '}
                        <span className="font-bold text-slate-800 dark:text-white">{filteredAds.length}</span> ads
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none text-slate-600 dark:text-slate-300"
                      >
                        Previous
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                        .map((page, idx, arr) => {
                          const showEllipsisBefore = page > 1 && arr[idx - 1] !== page - 1;
                          return (
                            <React.Fragment key={page}>
                              {showEllipsisBefore && <span className="text-slate-400 text-xs px-2">...</span>}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-xl transition-all ${currentPage === page
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
                                  }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}

                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none text-slate-600 dark:text-slate-300"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}

      {/* Google Ad Details Modal */}
      {isModalOpen && selectedAd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh] transition-all animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.01]">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Google Ad Detailed Information</h3>
                  <p className="text-[10px] text-slate-400">Deep performance analysis</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all text-xs font-bold"
              >
                Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto space-y-8 flex-1">
              {/* Ad Status & IDs */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center font-bold">
                  <Info className="w-3 h-3 mr-2" />
                  General Identifiers
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Ad Name</p>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{selectedAd.ad_name}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <div className="flex">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase border ${selectedAd.ad_status === 'ENABLED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          selectedAd.ad_status === 'PAUSED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                        {selectedAd.ad_status}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Ad ID</p>
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400">{selectedAd.ad_id}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Campaign ID</p>
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300">{selectedAd.campaign_id}</p>
                  </div>
                </div>
              </div>

              {/* Performance Cards */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center font-bold">
                  <TrendingUp className="w-3 h-3 mr-2" />
                  Performance Metrics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Spend</p>
                    <p className="text-sm font-bold font-mono mt-1 text-slate-900 dark:text-white">{formatCurrency(selectedAd.spend)}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Impressions</p>
                    <p className="text-sm font-bold font-mono mt-1 text-slate-900 dark:text-white">{formatNumber(selectedAd.impressions)}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Clicks</p>
                    <p className="text-sm font-bold font-mono mt-1 text-slate-900 dark:text-white">{formatNumber(selectedAd.clicks)}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Leads</p>
                    <p className="text-sm font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">{selectedAd.conversions}</p>
                  </div>
                </div>
              </div>

              {/* Search Result Mock Preview */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center font-bold">
                  <Eye className="w-3 h-3 mr-2" />
                  Google Sponsored Search Result Mockup
                </h4>
                <div className="border border-slate-200 dark:border-white/5 rounded-2xl p-6 bg-slate-50 dark:bg-white/[0.01]">
                  <div className="flex items-center space-x-1.5 mb-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-300">Sponsored</span>
                    <span>•</span>
                    <span>https://www.google.com/ad/{selectedAd.ad_id}</span>
                  </div>
                  <h4 className="text-lg font-bold text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-tight mb-2">
                    {selectedAd.ad_name} | {selectedAd.campaign_name}
                  </h4>
                  <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed">
                    Explore this top-tier ad placement. Spanned across the {selectedAd.campaign_name} campaign group. Generating high quality leads, CTR optimized, and driving conversions efficiently.
                  </p>
                </div>
              </div>

              {/* Calculator Section */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center font-bold">
                  <Target className="w-3 h-3 mr-2" />
                  Budget scaling projection calculator
                </h4>
                <div className="p-5 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:to-transparent border border-blue-500/10 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-750">Enter proposed budget scaling (INR):</label>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      value={scaleSpend}
                      onChange={(e) => setScaleSpend(e.target.value)}
                      className="w-32 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  {scaleSpend && parseFloat(scaleSpend) > 0 && selectedAd.spend > 0 && (
                    <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-white/5">
                      <div className="text-center p-3 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Expected Impressions</p>
                        <p className="text-sm font-bold mt-1 text-slate-800 dark:text-white">
                          {formatNumber(Math.round((selectedAd.impressions / selectedAd.spend) * parseFloat(scaleSpend)))}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Expected Clicks</p>
                        <p className="text-sm font-bold mt-1 text-slate-800 dark:text-white">
                          {formatNumber(Math.round((selectedAd.clicks / selectedAd.spend) * parseFloat(scaleSpend)))}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Expected Leads</p>
                        <p className="text-sm font-bold mt-1 text-emerald-500 font-mono">
                          {formatNumber(Math.round((selectedAd.conversions / selectedAd.spend) * parseFloat(scaleSpend)))}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-slate-100 dark:border-white/5 flex justify-end bg-slate-50 dark:bg-white/[0.01]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDashboard;
