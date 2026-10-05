import React, { useState, useEffect } from 'react';
import {
  Target, AlertCircle, ChevronRight, LayoutDashboard, Key, Search, Layers, IndianRupee, Eye, MousePointerClick
} from 'lucide-react';
import CustomSelect from './CustomSelect';

const GoogleCampaigns = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const [campaigns, setCampaigns] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchGoogleCampaigns(selectedAccount);
    }
  }, [selectedAccount]);

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

  const fetchGoogleCampaigns = async (customerId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/google/campaigns?customerId=${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch campaigns.");
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error("Google Campaigns Fetch Error:", err);
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

  const filteredCampaigns = React.useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const query = searchQuery.toLowerCase();
    return campaigns.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.id.toString().includes(query) ||
      c.channel_type.toLowerCase().includes(query)
    );
  }, [campaigns, searchQuery]);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredCampaigns.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredCampaigns.length / recordsPerPage) || 1;

  // Aggregate stats
  const aggregates = React.useMemo(() => {
    return campaigns.reduce((acc, c) => {
      acc.budget += c.budget || 0;
      acc.spend += c.spend || 0;
      acc.impressions += c.impressions || 0;
      acc.clicks += c.clicks || 0;
      acc.conversions += c.conversions || 0;
      return acc;
    }, { budget: 0, spend: 0, impressions: 0, clicks: 0, conversions: 0 });
  }, [campaigns]);

  return (
    <div className="p-8 space-y-8">
      {/* Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            <span>Google Ads</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-blue-500">Campaigns</span>
          </div>
          <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
            <Target className="w-5 h-5 mr-2 text-blue-500" />
            Campaigns Registry
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          {accounts.length > 0 && (
            <CustomSelect
              value={selectedAccount}
              onChange={setSelectedAccount}
              options={accounts}
              prefix="Account: "
              className="rounded-2xl px-4 py-2.5 text-sm min-w-[200px]"
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium animate-pulse">Syncing campaigns...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-lg mx-auto text-center mt-10">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Fetch Failed</h3>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button onClick={() => selectedAccount && fetchGoogleCampaigns(selectedAccount)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all">Retry</button>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Aggregates Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-5 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Budget</span>
              <span className="text-xl font-extrabold text-slate-850 dark:text-white">{formatCurrency(aggregates.budget)}</span>
            </div>
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-5 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Spend</span>
              <span className="text-xl font-extrabold text-slate-850 dark:text-white">{formatCurrency(aggregates.spend)}</span>
            </div>
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-5 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Impressions</span>
              <span className="text-xl font-extrabold text-slate-850 dark:text-white">{formatNumber(aggregates.impressions)}</span>
            </div>
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-5 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Clicks</span>
              <span className="text-xl font-extrabold text-slate-850 dark:text-white">{formatNumber(aggregates.clicks)}</span>
            </div>
            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-5 rounded-2xl border border-blue-500/10">
              <span className="text-[10px] font-bold text-blue-500 dark:text-blue-300 uppercase tracking-widest block mb-1">Conversions</span>
              <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{formatNumber(aggregates.conversions)} Leads</span>
            </div>
          </div>

          {/* Campaigns Table Card */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold flex items-center">
                  <Layers className="w-5 h-5 mr-2 text-blue-500" />
                  Campaigns Registry List
                </h3>
                <p className="text-xs text-slate-500 mt-1">Real-time status and delivery configuration of Google Ads campaigns</p>
              </div>

              <div className="relative flex-1 max-w-xs self-start md:self-auto">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-750 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign Name / ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Channel Type</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Budget</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Spend</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Impressions</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Clicks</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Conversions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                  {currentRecords.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-16 text-slate-400">
                        <AlertCircle className="w-10 h-10 text-slate-350 dark:text-white/10 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600 dark:text-slate-350">No Campaigns Found</p>
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map((camp) => {
                      const statusColors = {
                        ENABLED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                        PAUSED: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                        REMOVED: 'bg-red-500/10 text-red-500 border-red-500/20',
                      };
                      const statusClass = statusColors[camp.status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';

                      return (
                        <tr key={camp.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 dark:text-slate-100 mb-1">{camp.name}</span>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase border ${statusClass}`}>
                                  {camp.status}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">ID: {camp.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                            {camp.channel_type}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300 font-semibold">
                            {formatCurrency(camp.budget)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatCurrency(camp.spend)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-slate-605 dark:text-slate-300">
                            {formatNumber(camp.impressions)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-slate-605 dark:text-slate-300">
                            {formatNumber(camp.clicks)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {camp.conversions}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredCampaigns.length > 0 && (
              <div className="p-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.01]">
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-800 dark:text-white">{indexOfFirstRecord + 1}</span> to{' '}
                    <span className="font-bold text-slate-800 dark:text-white">
                      {Math.min(indexOfLastRecord, filteredCampaigns.length)}
                    </span> of{' '}
                    <span className="font-bold text-slate-800 dark:text-white">{filteredCampaigns.length}</span> campaigns
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
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleCampaigns;
