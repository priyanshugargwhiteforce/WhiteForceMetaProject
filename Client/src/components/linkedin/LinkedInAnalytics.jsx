import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Activity, Target, Sliders, IndianRupee, ShieldAlert,
  ChevronRight, RefreshCw, BarChart2, PieChart, Sparkles, AlertCircle,
  Calendar, Search, Download
} from 'lucide-react';

const LinkedInAnalytics = () => {
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [insightsTrend, setInsightsTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trend list filtering & pagination states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, searchQuery]);

  useEffect(() => {
    fetchAdAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchInsights(selectedAccountId);
    }
  }, [selectedAccountId]);

  const fetchAdAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/linkedin/accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Failed to fetch LinkedIn accounts");

      if (result.adaccounts && result.adaccounts.data) {
        setAdAccounts(result.adaccounts.data);
        if (result.adaccounts.data.length > 0) {
          setSelectedAccountId(result.adaccounts.data[0].id);
        }
      }
    } catch (err) {
      console.error("LinkedIn Accounts Fetch Error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchInsights = async (accountId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const insRes = await fetch(`/api/linkedin/insights/${accountId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const insResult = await insRes.json();
      if (insResult.success) {
        setInsightsTrend(insResult.data);
      } else {
        throw new Error(insResult.message || "Failed to fetch insights");
      }
    } catch (err) {
      console.error("LinkedIn Insights Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Memoized baseline stats for current account from database
  const baselineStats = useMemo(() => {
    let spend = 0;
    let impressions = 0;
    let clicks = 0;
    let conversions = 0;

    insightsTrend.forEach(day => {
      spend += parseFloat(day.spend) || 0;
      impressions += parseInt(day.impressions) || 0;
      clicks += parseInt(day.clicks) || 0;
      conversions += parseInt(day.conversions) || 0;
    });

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const costPerLead = conversions > 0 ? spend / conversions : 0;

    return { spend, impressions, clicks, conversions, ctr, cpc, conversionRate, costPerLead };
  }, [insightsTrend]);

  // Aggregate insights daily data into month-wise breakdown segments
  const monthWiseData = useMemo(() => {
    const monthlyMap = {};
    insightsTrend.forEach(day => {
      if (!day.date_start) return;
      const dateObj = new Date(day.date_start);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`; // e.g. "2026-05"

      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          monthKey: key,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0
        };
      }
      monthlyMap[key].spend += parseFloat(day.spend) || 0;
      monthlyMap[key].impressions += parseInt(day.impressions) || 0;
      monthlyMap[key].clicks += parseInt(day.clicks) || 0;
      monthlyMap[key].conversions += parseInt(day.conversions) || 0;
    });

    return Object.values(monthlyMap)
      .map(m => {
        const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
        const cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
        return {
          ...m,
          ctr,
          cpc
        };
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey)); // Newest months first
  }, [insightsTrend]);

  // Actual daily trends dataset formatted for charts
  const actualTrendData = useMemo(() => {
    return [...insightsTrend]
      .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
      .map(item => ({
        date: new Date(item.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        spend: parseFloat(item.spend) || 0,
        impressions: parseInt(item.impressions) || 0,
        clicks: parseInt(item.clicks) || 0,
        conversions: parseInt(item.conversions) || 0
      }));
  }, [insightsTrend]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  // Memoized daily insights trend filtering
  const filteredTrendData = useMemo(() => {
    return insightsTrend.filter(row => {
      // Date start parsing
      let matchesDate = true;
      if (row.date_start) {
        const rowDate = new Date(row.date_start);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (rowDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (rowDate > end) matchesDate = false;
        }
      } else if (startDate || endDate) {
        matchesDate = false;
      }

      // Search query parsing (date format or text match)
      let matchesSearch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const formattedDate = row.date_start ? new Date(row.date_start).toLocaleDateString().toLowerCase() : '';
        const rawDateStr = row.date_start ? String(row.date_start).toLowerCase() : '';
        matchesSearch = formattedDate.includes(query) || rawDateStr.includes(query);
      }

      return matchesDate && matchesSearch;
    });
  }, [insightsTrend, startDate, endDate, searchQuery]);

  // Export Daily Insights to CSV
  const handleExportCSV = () => {
    if (filteredTrendData.length === 0) return;
    const headers = ['Date', 'Spend (INR)', 'Impressions', 'Clicks', 'CTR (%)', 'CPC (INR)', 'CPM (INR)', 'Conversions (Leads)'];
    const rows = filteredTrendData.map(row => [
      row.date_start ? new Date(row.date_start).toLocaleDateString('en-IN') : 'N/A',
      row.spend || 0,
      row.impressions || 0,
      row.clicks || 0,
      row.ctr || 0,
      row.cpc || 0,
      row.cpm || 0,
      row.conversions || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `LinkedIn_Daily_Insights_${selectedAccountId || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination calculations
  const totalRecords = filteredTrendData.length;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredTrendData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(totalRecords / recordsPerPage) || 1;

  return (
    <div className="p-8 space-y-8">
      {/* Title & Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            <span>LinkedIn Ads</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-blue-600 dark:text-blue-400">Insights & ROI Analysis</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">LinkedIn Insights & ROI</h2>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => selectedAccountId && fetchInsights(selectedAccountId)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl transition-all"
            title="Refresh Baseline Analytics"
          >
            <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>

          {/* Account Selector */}
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-w-[200px] text-slate-800 dark:text-white cursor-pointer"
          >
            {adAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[50vh]">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium animate-pulse">Analyzing Performance Data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-lg mx-auto text-center mt-10">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Analysis Failed</h3>
            <p className="text-slate-500 text-sm mb-6">{error}</p>
            <button onClick={() => fetchInsights(selectedAccountId)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all">Retry</button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Database Baseline Metrics Summary */}
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-bold flex items-center">
                  <BarChart2 className="w-5 h-5 mr-2 text-indigo-500" />
                  Database Baseline Performance Averages
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Calculated automatically from your synced MySQL history. These form the baseline for the planning calculator below.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="bg-slate-50/50 dark:bg-white/[0.01] p-5 rounded-2xl border border-slate-100 dark:border-white/5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Avg Click Rate (CTR)</span>
                  <span className="text-xl font-bold text-slate-800 dark:text-white">{baselineStats.ctr.toFixed(2)}%</span>
                </div>
                <div className="bg-slate-50/50 dark:bg-white/[0.01] p-5 rounded-2xl border border-slate-100 dark:border-white/5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Avg Cost Per Click (CPC)</span>
                  <span className="text-xl font-bold text-slate-800 dark:text-white">₹{baselineStats.cpc.toFixed(1)}</span>
                </div>
                <div className="bg-slate-50/50 dark:bg-white/[0.01] p-5 rounded-2xl border border-slate-100 dark:border-white/5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Avg Conversion Rate</span>
                  <span className="text-xl font-bold text-slate-800 dark:text-white">{baselineStats.conversionRate.toFixed(2)}%</span>
                </div>
                <div className="bg-slate-50/50 dark:bg-white/[0.01] p-5 rounded-2xl border border-slate-100 dark:border-white/5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cost Per Lead Conversion</span>
                  <span className="text-xl font-bold text-slate-800 dark:text-white">₹{baselineStats.costPerLead.toFixed(0)}</span>
                </div>
                <div className="col-span-2 md:col-span-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-5 rounded-2xl border border-blue-500/10">
                  <span className="text-[9px] font-bold text-blue-500 dark:text-blue-300 uppercase tracking-wider block mb-1">Estimated Conversions</span>
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatNumber(baselineStats.conversions)} Leads</span>
                </div>
              </div>
            </div>

            {/* Actual Sync Performance Analysis Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Column 1: Actual Performance Trend AreaChart */}
              <div className="lg:col-span-2 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
                      Actual Sync Performance Trends
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Real-time daily ad spend vs. captured conversion leads synced from LinkedIn API</p>
                  </div>
                </div>
                <div className="h-80">
                  {actualTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={actualTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorActualSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorActualLeads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-main)', fontSize: '11px' }}
                          itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Area type="monotone" name="Actual Spend (INR)" dataKey="spend" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorActualSpend)" />
                        <Area type="monotone" name="Conversion Leads" dataKey="conversions" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorActualLeads)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">No trend data registered in database.</div>
                  )}
                </div>
              </div>

              {/* Column 2: Month-Wise Performance Breakdown */}
              <div className="lg:col-span-1 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
                <div className="mb-6">
                  <h3 className="text-lg font-bold flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                    Month-Wise Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Aggregated actual monthly metrics from campaign delivery data</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] pr-1">
                  {monthWiseData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">No monthly records found.</div>
                  ) : (
                    monthWiseData.map((m) => {
                      const dateParts = m.monthKey.split('-');
                      const formattedMonth = new Date(dateParts[0], dateParts[1] - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

                      return (
                        <div key={m.monthKey} className="p-4 bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl space-y-3 hover:border-blue-500/20 transition-all duration-300">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{formattedMonth}</span>
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">Synced</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-[10px]">
                            <div>
                              <span className="text-slate-400 block">Total Spend</span>
                              <span className="font-mono font-extrabold text-slate-800 dark:text-slate-100 text-xs">{formatCurrency(m.spend)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Lead Conversions</span>
                              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">{formatNumber(m.conversions)} Leads</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Avg CTR / CPC</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{m.ctr.toFixed(2)}% / ₹{m.cpc.toFixed(1)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Clicks / Impressions</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{formatNumber(m.clicks)} / {formatNumber(m.impressions)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Date-Wise Daily Insights Trend Table */}
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              {/* Header Actions */}
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center">
                    <BarChart2 className="w-5 h-5 mr-2 text-blue-500" />
                    Date-Wise Performance Daily Insights
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Precise daily delivery metrics retrieved and synchronized from LinkedIn Marketing API
                  </p>
                </div>

                <button
                  onClick={handleExportCSV}
                  disabled={filteredTrendData.length === 0}
                  className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs text-slate-800 dark:text-white transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none self-start md:self-auto cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Insights CSV</span>
                </button>
              </div>

              {/* Filters */}
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-4 bg-slate-50/30 dark:bg-white/[0.005]">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filter Dates:</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300 cursor-pointer"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300 cursor-pointer"
                  />
                </div>

                {/* Search date */}
                <div className="relative flex-1 max-w-xs ml-auto">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search dates (YYYY-MM-DD)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 dark:text-slate-200"
                  />
                </div>

                {(startDate || endDate || searchQuery) && (
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setSearchQuery('');
                    }}
                    className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 rounded-xl cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Spend</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Impressions</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Clicks</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">CTR</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Avg CPC</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Avg CPM</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Conversions (Leads)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                    {currentRecords.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-16 text-slate-400">
                          <AlertCircle className="w-10 h-10 text-slate-300 dark:text-white/10 mx-auto mb-2" />
                          <p className="font-semibold text-slate-600 dark:text-slate-300">No Daily Performance Records Found</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Please check your synced date range or reload using refresh button.</p>
                        </td>
                      </tr>
                    ) : (
                      currentRecords.map((row, index) => {
                        const dateObj = row.date_start ? new Date(row.date_start) : null;
                        const formattedDate = dateObj ? dateObj.toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        }) : 'N/A';

                        return (
                          <tr key={row.id || index} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-slate-100">
                              {formattedDate}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300 font-semibold">
                              {formatCurrency(row.spend || 0)}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                              {formatNumber(row.impressions || 0)}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                              {formatNumber(row.clicks || 0)}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                              {(parseFloat(row.ctr) || 0).toFixed(2)}%
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                              ₹{(parseFloat(row.cpc) || 0).toFixed(1)}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                              ₹{(parseFloat(row.cpm) || 0).toFixed(0)}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {row.conversions || 0}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalRecords > 0 && (
                <div className="p-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.01]">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-500 font-medium">
                      Showing <span className="font-bold text-slate-800 dark:text-white">{indexOfFirstRecord + 1}</span> to{' '}
                      <span className="font-bold text-slate-800 dark:text-white">
                        {Math.min(indexOfLastRecord, totalRecords)}
                      </span> of{' '}
                      <span className="font-bold text-slate-800 dark:text-white">{totalRecords}</span> days
                    </span>

                    <div className="flex items-center space-x-2 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-white/5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Show:</span>
                      <select
                        value={recordsPerPage}
                        onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                        className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkedInAnalytics;
