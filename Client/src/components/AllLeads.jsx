import React, { useState, useEffect } from 'react';
import {
  Users, Search, RefreshCw, Calendar,
  MapPin, Phone, Mail, Globe, Database,
  Filter, ArrowUpDown, ChevronRight, Eye,
  CheckCircle, AlertCircle, FileText, IndianRupee,
  Clock, Zap, Target, Layers, ChevronLeft
} from 'lucide-react';
import CustomSelect from './CustomSelect';

const AllLeadsFontStyles = () => (
  <>
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
    />
    <style>{`
      .wf-allleads, .wf-allleads * {
        font-family: 'Poppins', sans-serif;
      }
      .wf-allleads .wf-mono {
        font-family: 'JetBrains Mono', monospace;
      }
      .wf-allleads .wf-fade {
        opacity: 0;
        animation: wfAllLeadsFadeIn 0.6s ease-out forwards;
      }
      @keyframes wfAllLeadsFadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .wf-allleads .wf-sweep {
        animation: wfAllLeadsSweep 1.4s ease-in-out infinite;
      }
      @keyframes wfAllLeadsSweep {
        0% { transform: translateX(-120%); }
        100% { transform: translateX(320%); }
      }
      @media (prefers-reduced-motion: reduce) {
        .wf-allleads .wf-fade {
          opacity: 1;
          animation: none;
          transform: none;
        }
        .wf-allleads .wf-sweep {
          animation: none;
        }
      }
    `}</style>
  </>
);

// Presentation-only helpers (pure functions: no state, no network, no side effects)
const getLeadInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = Array.from(parts[0])[0] || '';
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] || '') : '';
  return (first + last).toUpperCase();
};

const getPlatformMeta = (platform) => {
  if (platform === 'fb') {
    return { avatar: 'from-blue-500 to-indigo-600', glow: 'shadow-blue-500/30', dot: 'bg-blue-500' };
  }
  if (platform === 'ig') {
    return { avatar: 'from-pink-500 via-fuchsia-500 to-purple-600', glow: 'shadow-pink-500/30', dot: 'bg-pink-500' };
  }
  return { avatar: 'from-slate-500 to-slate-600', glow: 'shadow-slate-500/25', dot: 'bg-slate-400' };
};

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

  // Export leads to Excel-compatible CSV format
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      alert('No leads available to export.');
      return;
    }

    // 1. Identify all dynamic custom questionnaire keys from field_data
    const customFieldKeys = new Set();
    filteredLeads.forEach(lead => {
      if (Array.isArray(lead.field_data)) {
        lead.field_data.forEach(field => {
          if (field.name) {
            customFieldKeys.add(field.name);
          }
        });
      }
    });
    const customFieldKeysArray = Array.from(customFieldKeys);

    const headers = [
      'Lead ID',
      'Created Time',
      'Full Name',
      'Email',
      'Phone',
      'City',
      'Platform',
      'Adset Name',
      ...customFieldKeysArray
    ];

    // Helper to escape values for CSV format
    const escapeCSV = (val) => {
      if (val === undefined || val === null) return '';
      let str = typeof val === 'string' ? val : String(val);
      // Replace double quotes with double-double quotes
      str = str.replace(/"/g, '""');
      // Wrap in double quotes if it contains commas, quotes, or newlines
      if (/[",\n\r]/.test(str)) {
        str = `"${str}"`;
      }
      return str;
    };

    // 3. Assemble rows
    const csvRows = [];
    csvRows.push(headers.map(escapeCSV).join(','));
    filteredLeads.forEach(lead => {
      const row = [
        lead.lead_id || '',
        lead.created_time ? new Date(lead.created_time).toISOString() : '',
        lead.full_name || '',
        lead.email || '',
        lead.phone || '',
        lead.city || '',
        lead.platform === 'fb' ? 'Facebook' : lead.platform === 'ig' ? 'Instagram' : 'Meta',
        lead.adset_name || ''
      ];

      // Retrieve dynamic custom fields values
      customFieldKeysArray.forEach(fieldName => {
        let val = '';
        if (Array.isArray(lead.field_data)) {
          const matched = lead.field_data.find(f => f.name === fieldName);
          if (matched && matched.values) {
            val = matched.values.join(', ');
          }
        }
        row.push(val);
      });

      csvRows.push(row.map(escapeCSV).join(','));
    });

    // 4. Create and trigger download of CSV blob with UTF-8 BOM (﻿) for Excel compatibility
    const csvContent = '﻿' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `meta_leads_export_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="wf-allleads p-5 space-y-5">
      <AllLeadsFontStyles />
      {/* Title & Refresh Button Block */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 mb-4 shadow-xl shadow-indigo-900/20 wf-fade" style={{ animationDelay: '0ms' }}>
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}></div>
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-14 -left-10 w-56 h-56 bg-black/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center space-x-1.5 text-[9px] font-bold text-white/60 uppercase tracking-widest mb-1">
              <span>Meta Integrations</span>
              <ChevronRight className="w-2.5 h-2.5" />
              <span className="text-white">All Leads</span>
            </div>
            <h2 className="text-2xl font-bold flex items-center text-white">
              <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mr-2.5">
                <Users className="w-5 h-5 text-white" />
              </span>
              Meta Ads Leads Manager
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={loading || filteredLeads.length === 0}
              className="flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-blue-50 disabled:opacity-50 text-blue-600 rounded-xl font-bold text-[11px] transition-all hover:scale-105 shadow-lg shadow-black/10"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export to Excel/CSV</span>
            </button>
            <button
              disabled={loading}
              onClick={fetchLeads}
              className="flex items-center space-x-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 disabled:opacity-50 rounded-xl font-bold text-[11px] transition-all hover:scale-105 border border-white/20 text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section (Yellow Mark - Optimized Compact Layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 wf-fade" style={{ animationDelay: '60ms' }}>
        <div className="p-3.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl relative overflow-hidden group shadow-premium hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[12px] font-medium text-slate-700 pTagFont">Total Leads</p>
            <h3 className="text-[1.5rem] pTagFont font-extrabold text-slate-800 dark:text-white wf-mono">{totalCount}</h3>
            <p className="text-[10px] text-green-700 font-medium pTagFont">Saved in MySQL</p>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl relative overflow-hidden group shadow-premium hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[12px] font-medium text-slate-700 pTagFont">Facebook Leads</p>
            <h3 className="text-[1.5rem] pTagFont font-extrabold text-indigo-500 wf-mono">{fbCount}</h3>
            <p className="text-[10px] text-green-700 font-medium pTagFont">Platform: Facebook</p>
          </div>
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 group-hover:scale-110 transition-transform">
            <Globe className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl relative overflow-hidden group shadow-premium hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[12px] font-medium text-slate-700 pTagFont">Instagram Leads</p>
            <h3 className="text-[1.5rem] pTagFont font-extrabold text-pink-500 wf-mono">{igCount}</h3>
            <p className="text-[10px] text-green-700 font-medium pTagFont">Platform: Instagram</p>
          </div>
          <div className="p-2 bg-pink-500/10 rounded-xl text-pink-500 group-hover:scale-110 transition-transform">
            <Globe className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl relative overflow-hidden group shadow-premium hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[12px] font-medium text-slate-700 pTagFont">Other Platform</p>
            <h3 className="text-[1.5rem] pTagFont font-extrabold text-purple-700 wf-mono">{otherCount}</h3>
            <p className="text-[10px] text-green-700 font-medium pTagFont">Organic & others</p>
          </div>
          <div className="p-2 bg-slate-500/10 rounded-xl text-slate-500 group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Sync Dashboard Card (Red Mark - Optimized Compact Panel) */}
      <div className="relative z-10 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-premium wf-fade" style={{ animationDelay: '100ms' }}>
        {/* Decorative layer (clipped separately so dropdowns inside the card are never cut off) */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 overflow-hidden">
            {syncing && (
              <div className="wf-sweep absolute inset-y-0 left-0 w-1/3 bg-white/70 rounded-full"></div>
            )}
          </div>
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '18px 18px' }}></div>
          <div className="absolute -top-16 -right-12 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-12 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative p-6 pt-7 space-y-5">
          {/* Header: title + live status + real counts */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="relative shrink-0">
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Database className="w-6 h-6 text-white" />
                </span>
                {syncing && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Live Sync from Meta Graph API
                </h3>
                <p className="text-[11px] text-blue-700 mt-0.5 max-w-xl pTagFont font-regular">
                  Select an active Ad Account and pick a connected Campaign to retrieve real-time lead submissions directly from Meta.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold pTagFont border ${syncing
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
                : selectedAdId
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-white/10'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${syncing ? 'bg-amber-500 animate-pulse' : selectedAdId ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                {syncing ? 'Sync in progress' : selectedAdId ? 'Ready to sync' : 'Awaiting selection'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11.5px] font-semibold pTagFont text-blue-600 dark:text-blue-400">
                <Globe className="w-3 h-3" />
                <span>Ad Accounts</span>
                <span className="wf-mono text-xs">{accounts.length}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11.5px] font-semibold pTagFont text-indigo-600 dark:text-indigo-400">
                <Layers className="w-3 h-3" />
                <span>Ads</span>
                <span className="wf-mono text-xs">{ads.length}</span>
              </span>
            </div>
          </div>

          {error && (
            <div className="relative overflow-hidden bg-red-500/10 border border-red-500/20 text-red-500 pl-4 pr-3.5 py-2.5 rounded-xl flex items-center space-x-2.5 text-xs font-medium">
              <span className="absolute left-0 inset-y-0 w-1 bg-red-500"></span>
              <span className="w-6 h-6 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertCircle className="w-3.5 h-3.5" />
              </span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="relative overflow-hidden bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 pl-4 pr-3.5 py-2.5 rounded-xl flex items-center space-x-2.5 text-xs font-medium">
              <span className="absolute left-0 inset-y-0 w-1 bg-emerald-500"></span>
              <span className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* 3-step flow: Account -> Campaign -> Sync */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_minmax(230px,0.9fr)] items-stretch gap-3">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/5 transition-all">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-blue-700 dark:text-slate-400 pTagFont">
                  <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Globe className="w-3.5 h-3.5" />
                  </span>
                  1. Select Ad Account
                </label>
                {selectedAccount ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 dark:border-white/20"></span>
                )}
              </div>
              <CustomSelect
                value={selectedAccount}
                onChange={setSelectedAccount}
                options={[
                  { value: "", label: "Choose Ad Account..." },
                  ...accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.id})` }))
                ]}
                className="w-full rounded-xl px-3 font-semibold pTagFont py-2 text-xs"
              />
              <p className="mt-2.5 text-[10.5px] text-slate-700">
                <span className="wf-mono font-semibold pTagFont text-slate-600 dark:text-slate-300">{accounts.length}</span> ad accounts available
              </p>
            </div>

            <div className="hidden lg:flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 hover:border-indigo-500/30 hover:shadow-md hover:shadow-indigo-500/5 transition-all">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-blue-700 dark:text-slate-400 pTagFont">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Target className="w-3.5 h-3.5" />
                  </span>
                  2. Select Ad Campaign / ID
                </label>
                {selectedAdId ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 dark:border-white/20"></span>
                )}
              </div>
              <CustomSelect
                value={selectedAdId}
                onChange={setSelectedAdId}
                disabled={ads.length === 0}
                options={[
                  { value: "", label: ads.length === 0 ? 'No Ads found for account' : 'Choose Ad ID...' },
                  ...ads.map(ad => ({ value: ad.id, label: `${ad.name} (ID: ${ad.id})` }))
                ]}
                className="w-full rounded-xl px-3 py-2 text-xs pTagFont font-semibold"
              />
              <p className="mt-2.5 text-[10.5px] text-slate-700">
                <span className="wf-mono font-bold text-slate-700 dark:text-slate-300 pTagFont">{ads.length}</span> ads found for this account
              </p>
            </div>

            <div className="hidden lg:flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>

            {/* Step 3: action */}
            <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-lg shadow-indigo-900/20 flex flex-col justify-between gap-3">
              <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
              <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/15 rounded-full blur-2xl pointer-events-none"></div>
              <div className="relative z-10 flex items-center gap-2 text-[11px] font-semibold text-white/80 pTagFont">
                <span className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </span>
                <span>3. Run Sync</span>
              </div>
              <button
                disabled={syncing || !selectedAdId}
                onClick={handleSyncLeads}
                className="group relative z-10 overflow-hidden w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-white hover:bg-blue-50 text-indigo-600 rounded-xl font-bold text-xs shadow-lg shadow-black/15 transition-all disabled:opacity-60 disabled:pointer-events-none hover:scale-[1.02]"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-indigo-200/60 to-transparent pointer-events-none"></span>
                <RefreshCw className={`relative w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span className="relative">{syncing ? 'Syncing...' : 'Sync Live Leads'}</span>
              </button>
              <p className="relative z-10 text-[10px] text-white/70 truncate">
                Target Ad ID: <span className="wf-mono font-semibold text-white">{selectedAdId || 'None selected'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtering and Table Section */}
      <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-premium wf-fade" style={{ animationDelay: '140ms' }}>

        {/* Table title strip */}
        <div className="px-5 pt-5 pb-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-500/[0.07] via-indigo-500/[0.03] to-transparent">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Users className="w-5 h-5 text-white" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white pTagFont">Leads Database</h3>
              <p className="text-[11px] pTagFont text-blue-700">Search, filter and inspect every lead saved from Meta Ads.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              <span className="wf-mono text-xs">{filteredLeads.length}</span>
              <span>matching</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span className="wf-mono text-xs">{leads.length}</span>
              <span>total</span>
            </span>
          </div>
        </div>

        {/* Filter bar with Date-Wise Filters */}
        <div className="px-5 pb-5 pt-1 border-b border-slate-100 dark:border-white/5 space-y-3.5">

          {/* Row 1: Search Query & Dropdowns */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads by name, email, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 focus:bg-white dark:focus:bg-white/[0.07] transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border transition-all ${platformFilter !== 'all'
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                }`}>
                <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Filter className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10.5px] text-blue-700 font-semibold pTagFont">Platform:</span>
                <CustomSelect
                  value={platformFilter}
                  onChange={setPlatformFilter}
                  options={[
                    { value: "all", label: "All Platforms" },
                    { value: "fb", label: "Facebook" },
                    { value: "ig", label: "Instagram" }
                  ]}
                  className="border-none bg-transparent py-1 pTagFont font-semibold text-xs px-1 min-w-[110px]"
                />
              </div>

              {uniqueAds.length > 0 && (
                <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border transition-all ${adFilter !== 'all'
                  ? 'bg-indigo-500/10 border-indigo-500/30'
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                  }`}>
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-purple-500 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[11px] text-purple-700 font-semibold pTagFont">Ad Filter:</span>
                  <CustomSelect
                    value={adFilter}
                    onChange={setAdFilter}
                    options={[
                      { value: "all", label: "All Campaigns" },
                      ...uniqueAds.map(ad => ({ value: ad.id, label: ad.name }))
                    ]}
                    className="border-none bg-transparent py-1 text-xs pTagFont font-semibold px-1 max-w-[150px]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Date Filters & Clear short-cut (Added Feature) */}
          <div className="flex flex-wrap items-center gap-3 pt-3.5 border-t border-dashed border-slate-200 dark:border-white/10">
            <div className="flex items-center space-x-1.5">
              <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10.5px] text-slate-700 font-semibold pTagFont">Date Filters:</span>
            </div>

            <div className={`flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-xl border transition-all ${(startDate || endDate)
              ? 'bg-amber-500/5 border-amber-500/30'
              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
              }`}>
              <span className="text-[10px] text-slate-600 font-medium">From</span>
              <input type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent rounded-md px-1 py-0.5 w-[36%] text-xs wf-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300 dark:[color-scheme:dark]"
              />
              <ChevronRight className="w-3 h-3 text-slate-300 dark:text-white/20" />
              <span className="text-[10px] text-slate-600 font-medium">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent rounded-md w-[36%] px-1 py-0.5 text-xs wf-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300 dark:[color-scheme:dark]"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[9px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider px-2.5 py-1.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-lg"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>

        {/* Table (Optimized Row Padding for compact screen usage) */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-slate-50 via-slate-50/70 to-slate-50 dark:from-white/[0.03] dark:via-white/[0.015] dark:to-white/[0.03]">
                <th className="px-5 py-3.5 text-[12px] font-semibold text-black-700 dark:text-slate-700 pTagFont whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5"><Users className="w-3 h-3 text-blue-500" />Lead Info</span>
                </th>
                <th className="px-5 py-3.5 text-[12px] font-semibold text-black-700 dark:text-slate-700 pTagFont whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5"><Mail className="w-3 h-3 text-sky-500" />Contact Info</span>
                </th>
                <th className="px-5 py-3.5 text-[12px] font-semibold text-black-700 dark:text-slate-700 pTagFont whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="w-3 h-3 text-purple-500" />Location</span>
                </th>
                <th className="px-5 py-3.5 text-[12px] font-semibold text-black-700 dark:text-slate-700 pTagFont whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5"><Globe className="w-3 h-3 text-pink-500" />Platform</span>
                </th>
                <th className="px-5 py-3.5 text-[12px] font-semibold text-black-700 dark:text-slate-700 pTagFont whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5"><Target className="w-3 h-3 text-indigo-500" />Ad & Campaign</span>
                </th>
                <th className="px-5 py-3.5 text-[12px] font-semibold text-black-700 dark:text-slate-700 pTagFont whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5"><Clock className="w-3 h-3 text-amber-500" />Synced At</span>
                </th>
                <th className="px-5 py-3.5 text-[12px] font-semibold text-black-700 dark:text-slate-700 pTagFont whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-20">
                    <div className="relative w-14 h-14 mx-auto mb-3">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-7 h-7 border-[3px] border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs font-medium animate-pulse">Loading leads database...</p>
                    <div className="mt-4 mx-auto max-w-xs space-y-2">
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse"></div>
                      <div className="h-2 w-4/5 mx-auto rounded-full bg-slate-100 dark:bg-white/5 animate-pulse"></div>
                      <div className="h-2 w-3/5 mx-auto rounded-full bg-slate-100 dark:bg-white/5 animate-pulse"></div>
                    </div>
                  </td>
                </tr>
              ) : currentLeads.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-20">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-dashed border-blue-500/25"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 shadow-premium flex items-center justify-center">
                          <Users className="w-6 h-6 text-slate-300 dark:text-white/20" />
                        </div>
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md shadow-blue-500/30">
                        <Search className="w-3.5 h-3.5 text-white" />
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Leads Found</h4>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Try searching for a different date, name, selecting another filter, or pulling live leads.
                    </p>
                  </td>
                </tr>
              ) : (
                currentLeads.map((lead) => (
                  <tr
                    key={lead.lead_id}
                    className="group hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-transparent dark:hover:from-blue-500/[0.07] dark:hover:to-transparent transition-colors"
                  >
                    <td className="relative px-5 py-3.5">
                      <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${getPlatformMeta(lead.platform).avatar} text-white flex items-center justify-center text-[13px] font-bold shadow-md ${getPlatformMeta(lead.platform).glow} shrink-0 group-hover:scale-105 transition-transform`}>
                          {getLeadInitials(lead.full_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white text-[13px] truncate max-w-[190px]">{lead.full_name}</div>
                          <div className="mt-1 inline-flex max-w-[190px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[9px] font-mono wf-mono text-slate-500 dark:text-slate-400">
                            <span className="truncate text-blue-700 text-[10px]">ID: {lead.lead_id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-1.5">
                        <div className="flex items-center text-xs text-slate-700 dark:text-slate-300">
                          <span className="w-5 h-5 rounded-md bg-sky-500/10 text-sky-500 flex items-center justify-center mr-2 shrink-0">
                            <Mail className="w-3 h-3" />
                          </span>
                          <span className="truncate max-w-[170px] pTagFont text-black-700 font-medium">{lead.email}</span>
                        </div>
                        <div className="flex items-center text-xs text-slate-700 dark:text-slate-300">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center mr-2 shrink-0">
                            <Phone className="w-3 h-3" />
                          </span>
                          <span className="wf-mono pTagFont text-black-700 font-medium">{lead.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${lead.city === 'N/A'
                        ? 'bg-slate-50 dark:bg-white/[0.03] border-slate-200/60 dark:border-white/5 text-slate-400 italic'
                        : 'bg-purple-500/5 border-purple-500/15 text-slate-700 dark:text-slate-200 font-medium'
                        }`}>
                        <MapPin className={`w-3 h-3 shrink-0 ${lead.city === 'N/A' ? 'text-slate-300 dark:text-white/20' : 'text-purple-500'}`} />
                        <span className="truncate max-w-[120px]">{lead.city === 'N/A' ? 'Not Provided' : lead.city}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full text-[9px] pTagFont text-black-700 font-medium tracking-wider border ${lead.platform === 'fb'
                        ? 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/25'
                        : lead.platform === 'ig'
                          ? 'text-pink-700 dark:text-pink-400 font-medium bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/25'
                          : 'text-slate-700 bg-slate-500/10 font-medium pTagFont border-slate-500/20'
                        }`}>
                        <span className={`w-1.5 h-1.5 text-black-700 pTagFont rounded-full font-medium ${getPlatformMeta(lead.platform).dot}`}></span>
                        {lead.platform === 'fb' ? 'Facebook' : lead.platform === 'ig' ? 'Instagram' : 'Meta'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-[230px]">
                      <div className="flex items-start gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                          <Target className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate" title={lead.ad_name}>
                            {lead.ad_name || 'N/A'}
                          </div>
                          <div className="mt-1 inline-flex max-w-full px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[9px] pTagFont text-slate-700 dark:text-slate-400 font-medium">
                            <span className="truncate" title={lead.adset_name}>
                              Adset: {lead.adset_name || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                        <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="text-[11px] pTagFont text-slate-700 dark:text-slate-400 font-semibold wf-mono">
                          {lead.synced_at ? new Date(lead.synced_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 hover:bg-gradient-to-br hover:from-blue-600 hover:to-indigo-600 hover:text-white hover:shadow-lg hover:shadow-blue-500/30 hover:scale-110 transition-all"
                        title="Inspect Details"
                      >
                        <Eye className="w-4 h-4" />
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
          <div className="px-5 py-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-slate-50/90 dark:from-white/[0.02] dark:via-transparent dark:to-white/[0.02]">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                Showing <span className="font-bold text-slate-800 dark:text-white wf-mono">{indexOfFirstRecord + 1}</span> to{' '}
                <span className="font-bold text-slate-800 dark:text-white wf-mono">
                  {Math.min(indexOfLastRecord, totalRecords)}
                </span> of{' '}
                <span className="font-bold text-slate-800 dark:text-white wf-mono">{totalRecords}</span> entries
              </span>

              <div className="flex items-center space-x-1.5 bg-white dark:bg-white/5 px-2 py-0.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Show:</span>
                <CustomSelect
                  value={recordsPerPage}
                  onChange={(val) => setRecordsPerPage(Number(val))}
                  options={[
                    { value: 5, label: "5" },
                    { value: 10, label: "10" },
                    { value: 20, label: "20" },
                    { value: 50, label: "50" },
                    { value: 100, label: "100" }
                  ]}
                  className="border-none bg-transparent py-0.5 text-[11px] px-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="inline-flex items-center gap-1 pl-2 pr-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-500/40 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 text-[11px] font-bold rounded-xl shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none text-slate-600 hover:text-blue-600 dark:text-slate-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
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
                        className={`w-8 h-8 flex items-center justify-center text-[11px] font-bold wf-mono rounded-xl transition-all ${currentPage === page
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 scale-105'
                          : 'bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-500/40 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 text-slate-600 hover:text-blue-600 dark:text-slate-300'
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
                className="inline-flex items-center gap-1 pl-3 pr-2 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-500/40 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 text-[11px] font-bold rounded-xl shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none text-slate-600 hover:text-blue-600 dark:text-slate-300"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '14px 14px' }}></div>
              <div className="relative z-10">
                <h3 className="text-base font-bold">Inspect Lead Fields</h3>
                <p className="text-[10px] opacity-75 mt-0.5 wf-mono">ID: {selectedLead.lead_id}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-white hover:opacity-75 transition-opacity font-bold text-base p-1.5 relative z-10"
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