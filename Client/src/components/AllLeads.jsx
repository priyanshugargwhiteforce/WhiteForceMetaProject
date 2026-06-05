import React, { useState, useEffect } from 'react';
import {
  Users, Search, RefreshCw, Calendar,
  MapPin, Phone, Mail, Globe, Database,
  Filter, ArrowUpDown, ChevronRight, Eye,
  CheckCircle, AlertCircle, FileText, IndianRupee
} from 'lucide-react';

const AllLeads = () => {
  const [leads, setLeads] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [ads, setAds] = useState([]);
  const [selectedAdId, setSelectedAdId] = useState('');

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [adFilter, setAdFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // Modal for detail view
  const [selectedLead, setSelectedLead] = useState(null);

  // Fetch all saved leads from backend
  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedMetaConfigId') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      if (configId) headers['X-Meta-Config-Id'] = configId;

      const res = await fetch('/api/meta/leads', { headers });
      const data = await res.json();
      if (data.success) {
        setLeads(data.data);
      } else {
        setError(data.message || 'Failed to fetch leads');
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Network error connecting to backend.');
    }
  };

  // Fetch Meta Ad Accounts
  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedMetaConfigId') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      if (configId) headers['X-Meta-Config-Id'] = configId;

      const res = await fetch('/api/meta/accounts', { headers });
      const data = await res.json();
      if (data.success && data.adaccounts?.data) {
        setAccounts(data.adaccounts.data);
        if (data.adaccounts.data.length > 0) {
          setSelectedAccount(data.adaccounts.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching ad accounts:', err);
    }
  };

  // Fetch Ads for the selected account
  const fetchAdsForAccount = async (accountId) => {
    if (!accountId) return;
    try {
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedMetaConfigId') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      if (configId) headers['X-Meta-Config-Id'] = configId;

      const res = await fetch(`/api/meta/accounts/${accountId}`, { headers });
      const data = await res.json();
      if (data.success && data.data?.ads?.data) {
        setAds(data.data.ads.data);
        if (data.data.ads.data.length > 0) {
          setSelectedAdId(data.data.ads.data[0].id);
        } else {
          setSelectedAdId('');
        }
      } else {
        setAds([]);
        setSelectedAdId('');
      }
    } catch (err) {
      console.error('Error fetching ads:', err);
      setAds([]);
      setSelectedAdId('');
    }
  };

  // Sync leads for the selected Ad ID
  const handleSyncLeads = async () => {
    if (!selectedAdId) {
      setError('Please select a valid Ad ID to sync.');
      return;
    }

    setSyncing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedMetaConfigId') || '';
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      if (configId) headers['X-Meta-Config-Id'] = configId;

      const res = await fetch('/api/meta/leads/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ adId: selectedAdId })
      });
      const data = await res.json();

      if (data.success) {
        setLeads(data.data);
        setSuccessMsg(`Successfully synced live leads for Ad ${selectedAdId}!`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setError(data.message || 'Sync failed.');
      }
    } catch (err) {
      console.error('Error syncing leads:', err);
      setError('Network error during sync.');
    } finally {
      setSyncing(false);
    }
  };

  // Initialize data
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchLeads(), fetchAccounts()]);
      setLoading(false);
    };
    init();
  }, []);

  // Update ads list when selected account changes
  useEffect(() => {
    if (selectedAccount) {
      fetchAdsForAccount(selectedAccount);
    }
  }, [selectedAccount]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, platformFilter, adFilter, startDate, endDate]);

  // Compute platform stats
  const totalCount = leads.length;
  const fbCount = leads.filter(l => l.platform === 'fb').length;
  const igCount = leads.filter(l => l.platform === 'ig').length;
  const otherCount = totalCount - fbCount - igCount;

  // Filter leads based on user query/selectors/dates
  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      (l.full_name && l.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.email && l.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.phone && l.phone.includes(searchQuery)) ||
      (l.city && l.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.ad_name && l.ad_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.adset_name && l.adset_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPlatform = platformFilter === 'all' || l.platform === platformFilter;
    const matchesAd = adFilter === 'all' || l.ad_id === adFilter;

    // Date range filter
    let matchesDate = true;
    if (l.created_time) {
      const leadDate = new Date(l.created_time);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (leadDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (leadDate > end) matchesDate = false;
      }
    } else if (startDate || endDate) {
      matchesDate = false;
    }

    return matchesSearch && matchesPlatform && matchesAd && matchesDate;
  });

  // Extract unique ad configurations from leads for filtering list
  const uniqueAds = Array.from(
    new Map(leads.map(l => [l.ad_id, { id: l.ad_id, name: l.ad_name || 'N/A' }])).values()
  ).filter(a => a.id);

  // Pagination calculations
  const totalRecords = filteredLeads.length;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(totalRecords / recordsPerPage) || 1;

  return (
    <div className="p-5 space-y-5">
      {/* Title & Refresh Button Block */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center space-x-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            <span>Meta Integrations</span>
            <ChevronRight className="w-2.5 h-2.5" />
            <span className="text-blue-500">All Leads</span>
          </div>
          <h2 className="text-2xl font-bold flex items-center text-slate-900 dark:text-white">
            <Users className="w-6 h-6 mr-2 text-blue-500" />
            Meta Ads Leads Manager
          </h2>
        </div>
        <button
          disabled={loading}
          onClick={fetchLeads}
          className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl font-bold text-[11px] transition-all hover:scale-105 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Table</span>
        </button>
      </div>

      {/* Stats Section (Yellow Mark - Optimized Compact Layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-3.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl relative overflow-hidden group shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Leads</p>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">{totalCount}</h3>
            <p className="text-[8px] text-slate-400 font-medium">Saved in MySQL</p>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl relative overflow-hidden group shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Facebook Leads</p>
            <h3 className="text-xl font-extrabold text-indigo-500">{fbCount}</h3>
            <p className="text-[8px] text-slate-400 font-medium">Platform: Facebook</p>
          </div>
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
            <Globe className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl relative overflow-hidden group shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instagram Leads</p>
            <h3 className="text-xl font-extrabold text-pink-500">{igCount}</h3>
            <p className="text-[8px] text-slate-400 font-medium">Platform: Instagram</p>
          </div>
          <div className="p-2 bg-pink-500/10 rounded-xl text-pink-500">
            <Globe className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl relative overflow-hidden group shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Other Platform</p>
            <h3 className="text-xl font-extrabold text-slate-500">{otherCount}</h3>
            <p className="text-[8px] text-slate-400 font-medium">Organic & others</p>
          </div>
          <div className="p-2 bg-slate-500/10 rounded-xl text-slate-500">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Sync Dashboard Card (Red Mark - Optimized Compact Panel) */}
      <div className="p-5 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 border border-blue-500/10 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold flex items-center text-slate-800 dark:text-white">
              <Database className="w-4 h-4 text-blue-500 mr-1.5" />
              Live Sync from Meta Graph API
            </h3>
            <p className="text-[10px] text-slate-400">
              Select an active Ad Account and pick a connected Campaign to retrieve real-time lead submissions directly from Meta.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-3.5 py-2 mb-3 rounded-xl flex items-center space-x-2 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3.5 py-2 mb-3 rounded-xl flex items-center space-x-2 text-xs">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              1. Select Ad Account
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 dark:text-slate-200"
            >
              <option value="">Choose Ad Account...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              2. Select Ad Campaign / ID
            </label>
            <select
              value={selectedAdId}
              onChange={(e) => setSelectedAdId(e.target.value)}
              disabled={ads.length === 0}
              className="w-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              <option value="">
                {ads.length === 0 ? 'No Ads found for account' : 'Choose Ad ID...'}
              </option>
              {ads.map(ad => (
                <option key={ad.id} value={ad.id}>
                  {ad.name} (ID: {ad.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              disabled={syncing || !selectedAdId}
              onClick={handleSyncLeads}
              className="w-full flex items-center justify-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.01]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Live Leads'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filtering and Table Section */}
      <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">

        {/* Filter bar with Date-Wise Filters */}
        <div className="p-5 border-b border-slate-100 dark:border-white/5 space-y-3.5">

          {/* Row 1: Search Query & Dropdowns */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads by name, email, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 dark:text-slate-200"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[9px] text-slate-400 font-bold uppercase">Platform:</span>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Platforms</option>
                  <option value="fb">Facebook</option>
                  <option value="ig">Instagram</option>
                </select>
              </div>

              {uniqueAds.length > 0 && (
                <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Ad Filter:</span>
                  <select
                    value={adFilter}
                    onChange={(e) => setAdFilter(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer max-w-[150px] text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Campaigns</option>
                    {uniqueAds.map(ad => (
                      <option key={ad.id} value={ad.id}>{ad.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Date Filters & Clear short-cut (Added Feature) */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Date Filters:</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-slate-400 font-medium">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-slate-400 font-medium">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[9px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider px-2 py-1 bg-red-500/5 hover:bg-red-500/10 rounded-lg"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>

        {/* Table (Optimized Row Padding for compact screen usage) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lead Info</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Info</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Platform</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ad & Campaign</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Synced At</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-slate-400 text-xs font-medium animate-pulse">Loading leads database...</p>
                  </td>
                </tr>
              ) : currentLeads.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <Users className="w-10 h-10 text-slate-300 dark:text-white/10 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Leads Found</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                      Try searching for a different date, name, selecting another filter, or pulling live leads.
                    </p>
                  </td>
                </tr>
              ) : (
                currentLeads.map((lead) => (
                  <tr
                    key={lead.lead_id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="px-5 py-2.5">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{lead.full_name}</div>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5">ID: {lead.lead_id}</div>
                    </td>
                    <td className="px-5 py-2.5 space-y-0.5">
                      <div className="flex items-center text-xs text-slate-600 dark:text-slate-300">
                        <Mail className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{lead.email}</span>
                      </div>
                      <div className="flex items-center text-xs text-slate-600 dark:text-slate-300">
                        <Phone className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                        <span>{lead.phone}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[120px]">{lead.city === 'N/A' ? 'Not Provided' : lead.city}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${lead.platform === 'fb'
                          ? 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                          : lead.platform === 'ig'
                            ? 'text-pink-500 bg-pink-500/10 border-pink-500/20'
                            : 'text-slate-500 bg-slate-500/10 border-slate-500/20'
                        }`}>
                        {lead.platform === 'fb' ? 'Facebook' : lead.platform === 'ig' ? 'Instagram' : 'Meta'}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 max-w-[180px]">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate" title={lead.ad_name}>
                        {lead.ad_name || 'N/A'}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate mt-0.5" title={lead.adset_name}>
                        Adset: {lead.adset_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-slate-400 font-semibold">
                      {lead.synced_at ? new Date(lead.synced_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="p-1.5 hover:bg-blue-500/10 hover:text-blue-500 dark:hover:bg-blue-500/20 dark:hover:text-blue-400 rounded-xl transition-all"
                        title="Inspect Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls (Dynamic Pagination - Added Feature) */}
        {!loading && filteredLeads.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 dark:bg-white/[0.01]">
            <div className="flex items-center space-x-2.5">
              <span className="text-[11px] text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-800 dark:text-white">{indexOfFirstRecord + 1}</span> to{' '}
                <span className="font-bold text-slate-800 dark:text-white">
                  {Math.min(indexOfLastRecord, totalRecords)}
                </span> of{' '}
                <span className="font-bold text-slate-800 dark:text-white">{totalRecords}</span> entries
              </span>

              <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-white/5">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Show:</span>
                <select
                  value={recordsPerPage}
                  onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                  className="bg-transparent border-none text-[11px] font-bold focus:outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[11px] font-bold rounded-lg transition-all disabled:opacity-40 disabled:pointer-events-none text-slate-600 dark:text-slate-300"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                })
                .map((page, idx, arr) => {
                  const showEllipsisBefore = page > 1 && arr[idx - 1] !== page - 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsisBefore && <span className="text-slate-400 text-xs px-1">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded-lg transition-all ${currentPage === page
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
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[11px] font-bold rounded-lg transition-all disabled:opacity-40 disabled:pointer-events-none text-slate-600 dark:text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Inspect Lead Fields</h3>
                <p className="text-[10px] opacity-75 mt-0.5">ID: {selectedLead.lead_id}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-white hover:opacity-75 transition-opacity font-bold text-base p-1.5"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Name</p>
                  <p className="text-xs font-bold">{selectedLead.full_name}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Platform</p>
                  <p className="text-xs font-bold uppercase">{selectedLead.platform === 'fb' ? 'Facebook' : selectedLead.platform === 'ig' ? 'Instagram' : 'Meta'}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                  <p className="text-xs font-bold truncate">{selectedLead.email}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Phone</p>
                  <p className="text-xs font-bold">{selectedLead.phone}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Raw Facebook lead field_data:</h4>
                <div className="bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-xl p-3 font-mono text-[11px] overflow-x-auto space-y-1.5">
                  {selectedLead.field_data && selectedLead.field_data.length > 0 ? (
                    selectedLead.field_data.map((field, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-slate-200/20 dark:border-white/5 last:border-b-0">
                        <span className="text-blue-500 font-bold">{field.name}:</span>
                        <span className="text-slate-600 dark:text-slate-300 text-right">{field.values?.join(', ') || 'N/A'}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-400">No field_data values present</span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl font-bold text-xs transition-all text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AllLeads;
