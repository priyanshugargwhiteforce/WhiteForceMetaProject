import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Video, Target, AlertCircle, ChevronRight,
  Calendar, DollarSign, RefreshCw, Key,
  IndianRupee, Search
} from 'lucide-react';

const YoutubeAds = () => {
  const navigate = useNavigate();
  const [ads, setAds] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [missingCreds, setMissingCreds] = useState(false);

  // Search & Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(6);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, searchQuery]);



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
        setSelectedAccount(data.accounts.includes('7571652142') ? '7571652142' : data.accounts[0]);
      } else if (data.missingCredentials) {
        setMissingCreds(true);
        setLoading(false);
      } else {
        setError(data.message || 'No accessible Google Ads accounts found');
        setLoading(false);
      }
    } catch (e) {
      console.error("Failed to fetch accounts", e);
      setError("Failed to connect to Google Ads API");
      setLoading(false);
    }
  };

  const fetchAds = async (customerId, isSyncTriggered = false) => {
    if (isSyncTriggered) setSyncing(true);
    else setLoading(true);
    setError(null);
    setMissingCreds(false);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/youtube-ads?customerId=${customerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.missingCredentials) {
          setMissingCreds(true);
          throw new Error("Missing Google Ads API Credentials.");
        }
        throw new Error(data.message || "Failed to fetch YouTube Ads.");
      }

      if (data.success) {
        setAds(data.data);
      } else {
        setError(data.message || 'Failed to fetch YouTube Ads');
      }
    } catch (e) {
      console.error("Failed to fetch YouTube Ads", e);
      setError(e.message || "Network error fetching YouTube Ads.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleSync = () => {
    if (selectedAccount) {
      fetchAds(selectedAccount, true);
    }
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
    switch (label) {
      case 'ENABLED': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'PAUSED': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'REMOVED': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };
  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchAds(selectedAccount);
    }
  }, [selectedAccount]);

  const filteredAds = React.useMemo(() => {
    return ads.filter(ad => {
      let matchesYear = true;
      if (selectedYear) {
        const year = selectedYear.toString();
        matchesYear = (ad.start_date && ad.start_date.startsWith(year)) || (ad.end_date && ad.end_date.startsWith(year));
      }

      let matchesMonth = true;
      if (selectedMonth) {
        const monthStr = String(selectedMonth).padStart(2, '0');
        matchesMonth = (ad.start_date && ad.start_date.includes(`-${monthStr}-`)) || (ad.end_date && ad.end_date.includes(`-${monthStr}-`));
      }

      let matchesSearch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        matchesSearch = ad.title.toLowerCase().includes(query) || ad.campaign_id.toString().includes(query);
      }

      return matchesYear && matchesMonth && matchesSearch;
    });
  }, [ads, selectedYear, selectedMonth, searchQuery]);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredAds.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredAds.length / recordsPerPage) || 1;
  return (
    <div className="p-8 space-y-8">
      {/* Title & Controls Row */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            <span>Google Ads</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-red-500">YouTube Ads</span>
          </div>
          <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
            <Play className="w-5 h-5 mr-2 text-red-500" fill="currentColor" />
            YouTube Video Ads
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-w-[120px] text-slate-800 dark:text-slate-100 cursor-pointer"
          >
            <option value="">Year</option>
            {[...Array(6)].map((_, i) => {
              const yr = new Date().getFullYear() - i;
              return <option key={yr} value={yr}>{yr}</option>;
            })}
          </select>
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-w-[120px] text-slate-800 dark:text-slate-100 cursor-pointer"
          >
            <option value="">Month</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search video ads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-9 pr-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Sync button */}
          <button
            disabled={loading || syncing || !selectedAccount}
            onClick={handleSync}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>Force Sync API</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading YouTube Ads...</p>
        </div>
      ) : missingCreds ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-10 max-w-2xl mx-auto text-center mt-10 fade-in">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-amber-600 dark:text-amber-500">API Setup Required</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            To execute queries against your Google Ads account, we need your developer credentials secure tokens added to the backend environment.
          </p>
          <button onClick={fetchAccounts} className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20">
            Retry Connection
          </button>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-lg mx-auto text-center mt-10">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Sync Failed</h3>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button onClick={() => fetchAds(selectedAccount)} className="px-6 py-2 bg-red-650 hover:bg-red-500 text-white rounded-xl font-bold transition-all">Retry</button>
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem]">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <Video className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold mb-2">No Matching Video Ads Found</h3>
          <p className="text-slate-500 mb-6 max-w-md">No Video campaigns were found matching the selected filters or search terms.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Showing {filteredAds.length} of {ads.length} Campaigns
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {currentRecords.map((ad) => (
              <div
                key={ad.id}
                onClick={() => navigate(`/youtube-ad/${ad.id}`)}
                className="relative overflow-hidden rounded-[2rem] p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 group hover:shadow-2xl hover:shadow-red-500/10 hover:border-red-500/40 hover:scale-[1.01] transition-all duration-300 cursor-pointer"
              >
                <div className="absolute top-6 right-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(ad.status)}`}>
                    {getStatusLabel(ad.status)}
                  </span>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20 mb-6">
                  <Play className="w-6 h-6 text-white" fill="currentColor" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 pr-12 min-h-[3.5rem]" title={ad.title}>
                  {ad.title}
                </h3>

                <p className="text-xs text-slate-400 font-mono mb-4">
                  ID: {ad.campaign_id}
                </p>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-white/10">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                      <IndianRupee className="w-3 h-3 mr-1" /> Budget
                    </p>
                    <p className="text-lg font-bold">₹{parseFloat(ad.budget).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" /> Campaign Period
                    </p>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {ad.start_date ? new Date(ad.start_date).toLocaleDateString() : 'N/A'} -
                      {ad.end_date ? new Date(ad.end_date).toLocaleDateString() : ' N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {filteredAds.length > recordsPerPage && (
            <div className="flex items-center justify-center space-x-1 mt-8">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none text-slate-600 dark:text-slate-300"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-xl transition-all ${currentPage === page
                        ? 'bg-red-500 text-white shadow-md shadow-red-500/25'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                  >
                    {page}
                  </button>
                ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none text-slate-600 dark:text-slate-300"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default YoutubeAds;
