import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { 
  Search, SlidersHorizontal, Briefcase, Info, IndianRupee, Eye, 
  Activity, Target, ChevronRight, Database, RefreshCw, Filter, ArrowUpDown
} from 'lucide-react';

const LinkedInCampaigns = () => {
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [campaignGroups, setCampaignGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Table filters & controls
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [sortField, setSortField] = useState("total_spent");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    fetchAdAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchCampaigns(selectedAccountId);
      fetchCampaignGroups(selectedAccountId);
    }
  }, [selectedAccountId]);

  const fetchCampaignGroups = async (accountId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/linkedin/campaign-groups/${accountId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setCampaignGroups(result.data);
      }
    } catch (err) {
      console.error("LinkedIn Campaign Groups Fetch Error:", err);
    }
  };

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
        }
      }
    } catch (err) {
      console.error("LinkedIn Accounts Fetch Error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchCampaigns = async (accountId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const campRes = await fetch(`http://localhost:5000/api/linkedin/campaigns/${accountId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const campResult = await campRes.json();
      if (campResult.success) {
        setCampaigns(campResult.data);
      } else {
        throw new Error(campResult.message || "Failed to fetch campaigns");
      }
    } catch (err) {
      console.error("LinkedIn Campaigns Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Unique campaign types for the filter dropdown
  const campaignTypes = useMemo(() => {
    const types = new Set(campaigns.map(c => c.type));
    return ["ALL", ...Array.from(types)];
  }, [campaigns]);

  // Handle Sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filtered & Sorted campaigns list
  const processedCampaigns = useMemo(() => {
    let list = [...campaigns];

    // Search filter
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(term) || 
        c.id.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "ALL") {
      list = list.filter(c => c.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "ALL") {
      list = list.filter(c => c.type === typeFilter);
    }

    // Group filter
    if (groupFilter !== "ALL") {
      list = list.filter(c => String(c.campaign_group_id) === String(groupFilter));
    }

    // Sort sorting
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle numerical conversions if sorting by spend
      if (sortField === 'total_spent') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [campaigns, searchTerm, statusFilter, typeFilter, groupFilter, sortField, sortDirection]);

  // Aggregate stats of filtered campaigns
  const aggregateStats = useMemo(() => {
    let spend = 0;
    let runningCount = 0;
    let pausedCount = 0;

    processedCampaigns.forEach(c => {
      spend += parseFloat(c.total_spent) || 0;
      if (c.status === 'RUNNING') runningCount++;
      else pausedCount++;
    });

    return { spend, runningCount, pausedCount, totalCount: processedCampaigns.length };
  }, [processedCampaigns]);

  // Dynamic colors for campaign types
  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#306EE8'];

  // Data formatted for charts
  const typeDistributionData = useMemo(() => {
    const dist = {};
    processedCampaigns.forEach(c => {
      dist[c.type] = (dist[c.type] || 0) + (parseFloat(c.total_spent) || 0);
    });

    return Object.keys(dist).map((key, index) => ({
      name: key.replace(/_/g, ' '),
      value: dist[key],
      color: COLORS[index % COLORS.length]
    }));
  }, [processedCampaigns]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Title & Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            <span>LinkedIn Ads</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-blue-600 dark:text-blue-400">Campaigns</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Campaign Performance</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => selectedAccountId && fetchCampaigns(selectedAccountId)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl transition-all"
            title="Refresh Campaigns"
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
            <p className="text-slate-500 font-medium animate-pulse">Aggregating LinkedIn Campaigns...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-lg mx-auto text-center mt-10">
            <Info className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Fetch Failed</h3>
            <p className="text-slate-500 text-sm mb-6">{error}</p>
            <button onClick={() => fetchCampaigns(selectedAccountId)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all">Retry</button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Campaign Aggregated Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="rounded-[2rem] p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total Campaign Spend</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                  <IndianRupee className="w-5 h-5 mr-1 text-blue-500" />
                  {formatCurrency(aggregateStats.spend)}
                </h3>
              </div>
              <div className="rounded-[2rem] p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total Campaigns</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                  <Briefcase className="w-5 h-5 mr-2 text-indigo-500" />
                  {aggregateStats.totalCount}
                </h3>
              </div>
              <div className="rounded-[2rem] p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Active / Running</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
                  {aggregateStats.runningCount}
                </h3>
              </div>
              <div className="rounded-[2rem] p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Paused / Inactive</p>
                <h3 className="text-2xl font-bold text-amber-500 flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></div>
                  {aggregateStats.pausedCount}
                </h3>
              </div>
            </div>

            {/* Graphical Analysis of Campaign Spends and Types */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Spend per Campaign Bar Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold flex items-center">
                      <Briefcase className="w-5 h-5 mr-2 text-blue-500" />
                      Campaign Spend Comparison
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Comparing budget consumption across campaigns</p>
                  </div>
                </div>
                <div className="h-64">
                  {processedCampaigns.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processedCampaigns} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => '₹'+val} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                          contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-main)', fontSize: '12px' }}
                          itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="total_spent" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                          {processedCampaigns.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">No filtered campaigns.</div>
                  )}
                </div>
              </div>

              {/* Campaign Format / Type Share Pie Chart */}
              <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-lg font-bold flex items-center">
                    <SlidersHorizontal className="w-5 h-5 mr-2 text-indigo-500" />
                    Spend by Ad Format
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">LinkedIn Campaign types proportional breakdown</p>
                </div>
                <div className="h-44 relative flex items-center justify-center">
                  {typeDistributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {typeDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-main)', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-slate-500 text-sm">No type share data.</div>
                  )}
                </div>
                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold text-slate-500">
                  {typeDistributionData.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 truncate">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                      <span className="truncate text-slate-700 dark:text-slate-300">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter and Campaign Inventory Management Table */}
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Campaign Directory</h3>
                  <p className="text-xs text-slate-500 mt-1">Search, organize and detail active items fetched from the database</p>
                </div>

                {/* Dynamic Filtering Panel */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search campaign ID or name..."
                      className="pl-10 pr-4 py-2 bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-[220px]"
                    />
                  </div>

                  {/* Status filter */}
                  <div className="flex items-center space-x-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-2xl px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer focus:outline-none"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="RUNNING">Running Only</option>
                      <option value="PAUSED">Paused Only</option>
                    </select>
                  </div>

                   {/* Format filter */}
                  <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-2xl px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer focus:outline-none"
                  >
                    <option value="ALL">All Formats</option>
                    {campaignTypes.filter(t => t !== 'ALL').map(t => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </select>

                  {/* Campaign Group filter */}
                  <select 
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-2xl px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer focus:outline-none"
                  >
                    <option value="ALL">All Campaign Groups</option>
                    {campaignGroups.map(grp => (
                      <option key={grp.id} value={grp.id}>{grp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table Layout */}
              <div className="overflow-x-auto border border-slate-100 dark:border-white/5 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                      <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 dark:hover:text-white" onClick={() => handleSort('name')}>
                        <div className="flex items-center">
                          Campaign Identity
                          <ArrowUpDown className="w-3 h-3 ml-1.5" />
                        </div>
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 dark:hover:text-white" onClick={() => handleSort('status')}>
                        <div className="flex items-center">
                          Delivery Status
                          <ArrowUpDown className="w-3 h-3 ml-1.5" />
                        </div>
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 dark:hover:text-white" onClick={() => handleSort('campaign_group_name')}>
                        <div className="flex items-center">
                          Campaign Group
                          <ArrowUpDown className="w-3 h-3 ml-1.5" />
                        </div>
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 dark:hover:text-white" onClick={() => handleSort('type')}>
                        <div className="flex items-center">
                          Ad Type / Format
                          <ArrowUpDown className="w-3 h-3 ml-1.5" />
                        </div>
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right cursor-pointer hover:text-slate-600 dark:hover:text-white" onClick={() => handleSort('total_spent')}>
                        <div className="flex items-center justify-end">
                          Total Spend
                          <ArrowUpDown className="w-3 h-3 ml-1.5" />
                        </div>
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sync Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {processedCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12">
                          <Database className="w-10 h-10 text-slate-300 dark:text-white/10 mx-auto mb-2" />
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No campaigns match filters</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                            Try clearing your query or modifying the status filter panel.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      processedCampaigns.map((camp) => (
                        <tr key={camp.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-3.5 text-xs">
                            <div className="font-bold text-slate-900 dark:text-white">{camp.name}</div>
                            <div className="text-[9px] font-mono text-slate-400 mt-0.5">ID: {camp.id}</div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${
                              camp.status === 'RUNNING' 
                                ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' 
                                : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                            }`}>
                              {camp.status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                            {camp.campaign_group_name || 'N/A'}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                            {camp.type.replace(/_/g, ' ')}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(camp.total_spent)}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-slate-400 font-semibold">
                            {camp.last_synced_at ? new Date(camp.last_synced_at).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default LinkedInCampaigns;
