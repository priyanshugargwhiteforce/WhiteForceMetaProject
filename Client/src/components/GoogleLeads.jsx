import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, RefreshCw, Calendar,
  Phone, Mail, Database, Filter,
  ChevronRight, Eye, CheckCircle,
  AlertCircle, FileText, Download
} from 'lucide-react';
import CustomSelect from './CustomSelect';

const GoogleLeads = () => {
  const [leads, setLeads] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // Modal for detail view
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchLeads(selectedAccount);
    }
  }, [selectedAccount]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, campaignFilter, startDate, endDate]);

  // Fetch Google Ad Accounts
  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/google/accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Failed to fetch Google Ad accounts");

      if (result.accounts && result.accounts.length > 0) {
        setAccounts(result.accounts);
        setSelectedAccount(result.accounts.includes('7571652142') ? '7571652142' : result.accounts[0]);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Google Accounts Fetch Error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Fetch all saved Google leads from backend for the chosen account
  const fetchLeads = async (customerId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/google/leads?customerId=${customerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setLeads(data.data);
      } else {
        setError(data.message || 'Failed to fetch leads');
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Network error connecting to backend.');
    } finally {
      setLoading(false);
    }
  };

  // Force Sync Google account details & leads
  const handleSyncLeads = async () => {
    if (!selectedAccount) return;
    setSyncing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/google/sync-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ customerId: selectedAccount })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Failed to sync Google Ads API");

      // Reload fresh database records
      await fetchLeads(selectedAccount);

      setSuccessMsg(result.message);
      setTimeout(() => setSuccessMsg(null), 8000);
    } catch (err) {
      console.error("Google Leads Sync Error:", err);
      setError(err.message || "A connection failure occurred during Google Ads synchronization.");
    } finally {
      setSyncing(false);
    }
  };

  // Filter leads based on query, campaign, and date filters
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchesSearch =
        (l.full_name && l.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.email && l.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.phone && l.phone.includes(searchQuery)) ||
        (l.campaign_name && l.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.ad_name && l.ad_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.ad_group_name && l.ad_group_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCampaign = campaignFilter === 'all' || l.campaign_name === campaignFilter;

      // Date range filter
      let matchesDate = true;
      if (l.submitted_at) {
        const leadDate = new Date(l.submitted_at);
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

      return matchesSearch && matchesCampaign && matchesDate;
    });
  }, [leads, searchQuery, campaignFilter, startDate, endDate]);

  // Extract unique campaigns for dropdown filtering
  const uniqueCampaigns = useMemo(() => {
    const list = new Set();
    leads.forEach(l => {
      if (l.campaign_name) list.add(l.campaign_name);
    });
    return Array.from(list);
  }, [leads]);

  // Export Filtered Leads to CSV File
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) return;
    const headers = ['Lead ID', 'Full Name', 'Email', 'Phone', 'Campaign Name', 'Ad Group Name', 'Ad Name', 'Submitted At'];
    const rows = filteredLeads.map(lead => [
      lead.id,
      lead.full_name || '',
      lead.email || '',
      lead.phone || '',
      lead.campaign_name || '',
      lead.ad_group_name || '',
      lead.ad_name || '',
      lead.submitted_at ? new Date(lead.submitted_at).toLocaleString() : ''
    ]);

    const csvString = [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Google_Leads_Account_${selectedAccount}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination calculations
  const totalRecords = filteredLeads.length;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(totalRecords / recordsPerPage) || 1;

  return (
    <div className="p-8 space-y-8">
      {/* Title & Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            <span>Google Ads</span>
            <ChevronRight className="w-2.5 h-2.5" />
            <span className="text-blue-500">Leads Data</span>
          </div>
          <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
            <Users className="w-5 h-5 mr-2 text-blue-500" />
            Google Leads Manager
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          {/* Sync Button */}
          <button
            disabled={syncing || !selectedAccount}
            onClick={handleSyncLeads}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/10 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Realtime Data'}</span>
          </button>

          {/* Google Ad Account Selector */}
          <CustomSelect
            value={selectedAccount}
            onChange={setSelectedAccount}
            options={accounts.map(acc => ({ value: acc, label: acc }))}
            className="min-w-[200px] rounded-2xl px-4 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Success or Error Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl flex items-center space-x-2 text-xs font-bold animate-in fade-in duration-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-2xl flex items-center space-x-2 text-xs font-bold animate-in fade-in duration-300">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Captures</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{filteredLeads.length}</h3>
              <p className="text-xs text-slate-400 font-medium">In selected date scope</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connected Campaigns</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{uniqueCampaigns.length}</h3>
              <p className="text-xs text-slate-400 font-medium">Generating ad leads</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Database className="w-6 h-6" />
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CSV Downloads</p>
              <button
                onClick={handleExportCSV}
                disabled={filteredLeads.length === 0}
                className="flex items-center space-x-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs text-slate-800 dark:text-white transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none mt-2"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                <span>Export CSV</span>
              </button>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        <div className="p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-white/5">
            <Filter className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Filter Lead Invoices</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Search Leads</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Name, email, campaign, ad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Campaign Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Campaign</label>
              <CustomSelect
                value={campaignFilter}
                onChange={setCampaignFilter}
                options={[
                  { value: 'all', label: 'All Campaigns' },
                  ...uniqueCampaigns.map(c => ({ value: c, label: c }))
                ]}
                className="w-full rounded-xl px-4 py-2.5 text-xs"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Start Date</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">End Date</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lead Table Container */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/[0.01] border-b border-slate-100 dark:border-white/5">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lead Info</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Info</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign & Ad details</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <span className="text-xs text-slate-400 font-medium">Fetching Google Leads...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentLeads.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Leads Found</h4>
                        <p className="text-xs text-slate-400 max-w-[280px]">
                          Either no leads have been synchronized or your filters are too restrictive.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-xs font-bold font-mono">
                            G
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-white">
                              {lead.full_name || 'Unnamed Lead'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              ID: {lead.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center text-xs text-slate-600 dark:text-slate-300 font-medium">
                              <Mail className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                              <span>{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                              <Phone className="w-3 h-3 text-slate-400 mr-1.5" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="max-w-[240px]">
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate" title={lead.campaign_name}>
                            {lead.campaign_name || 'N/A'}
                          </div>
                          <div className="text-[9px] text-slate-400 font-medium space-y-0.5">
                            {lead.ad_group_name && <p className="truncate">Group: {lead.ad_group_name}</p>}
                            {lead.ad_name && <p className="truncate">Ad: {lead.ad_name}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {lead.submitted_at ? new Date(lead.submitted_at).toLocaleString() : 'N/A'}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all inline-flex items-center"
                          title="Inspect Lead Details"
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

          {/* Pagination Footer */}
          {totalRecords > 0 && (
            <div className="p-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.01]">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-800 dark:text-white">{indexOfFirstRecord + 1}</span> to{' '}
                  <span className="font-bold text-slate-800 dark:text-white">
                    {Math.min(indexOfLastRecord, totalRecords)}
                  </span> of{' '}
                  <span className="font-bold text-slate-800 dark:text-white">{totalRecords}</span> leads
                </span>

                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 rounded-xl border border-slate-200 dark:border-white/5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Show:</span>
                  <CustomSelect
                    value={recordsPerPage}
                    onChange={(val) => {
                      setRecordsPerPage(Number(val));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: 5, label: "5" },
                      { value: 10, label: "10" },
                      { value: 20, label: "20" },
                      { value: 50, label: "50" }
                    ]}
                    className="border-none bg-transparent py-0.5 text-xs px-1"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold disabled:opacity-40 transition-all"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const page = idx + 1;
                  const isCurrent = page === currentPage;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold disabled:opacity-40 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inspect Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-500" />
                Lead Submission Inspector
              </h3>
              <button
                onClick={() => setSelectedLead(null)}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Full Name</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{selectedLead.full_name || 'N/A'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Lead ID</span>
                  <p className="text-xs font-mono font-bold text-slate-800 dark:text-white">{selectedLead.id}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Email Address</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{selectedLead.email || 'N/A'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Phone Number</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{selectedLead.phone || 'N/A'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Campaign</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{selectedLead.campaign_name || 'N/A'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Ad Group</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{selectedLead.ad_group_name || 'N/A'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Ad Name</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{selectedLead.ad_name || 'N/A'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Submitted At</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    {selectedLead.submitted_at ? new Date(selectedLead.submitted_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Standard Fields detail display */}
              {selectedLead.field_data && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-white/5 pb-2">
                    Raw Field Form Responses
                  </h4>
                  <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 font-bold text-slate-500">
                          <th className="px-4 py-2.5">Field / Question</th>
                          <th className="px-4 py-2.5">Answer Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/10 font-medium">
                        {/* Standard fields */}
                        {(typeof selectedLead.field_data === 'string'
                          ? JSON.parse(selectedLead.field_data)
                          : selectedLead.field_data
                        ).standard_fields?.map((sf, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-slate-400 font-mono text-[10px]">{sf.field_type}</td>
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{sf.field_value}</td>
                          </tr>
                        ))}
                        {/* Custom fields */}
                        {(typeof selectedLead.field_data === 'string'
                          ? JSON.parse(selectedLead.field_data)
                          : selectedLead.field_data
                        ).custom_fields?.map((cf, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-slate-500">{cf.question_text}</td>
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{cf.field_value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-2xl text-xs font-bold transition-all hover:scale-105"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleLeads;
