import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, RefreshCw, Calendar,
  Phone, Mail, Database, Filter,
  ChevronRight, Eye, CheckCircle,
  AlertCircle, FileText, Download
} from 'lucide-react';
import CustomSelect from '../CustomSelect';

const LinkedInLeads = () => {
  const [leads, setLeads] = useState([]);
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

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
    fetchAdAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchLeads(selectedAccountId);
    }
  }, [selectedAccountId]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, campaignFilter, startDate, endDate]);

  // Fetch LinkedIn Ad Accounts
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

  // Fetch all saved LinkedIn leads from backend for the chosen account
  const fetchLeads = async (accountId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/linkedin/leads/${accountId}`, {
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

  // Force Sync LinkedIn account details & leads
  const handleSyncLeads = async () => {
    if (!selectedAccountId) return;
    setSyncing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/linkedin/sync', {
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
      await fetchLeads(selectedAccountId);

      setSuccessMsg(result.message);
      setTimeout(() => setSuccessMsg(null), 8000);
    } catch (err) {
      console.error("LinkedIn Sync Error:", err);
      setError(err.message || "A connection failure occurred during LinkedIn synchronization.");
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
        (l.form_name && l.form_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.ad_name && l.ad_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.campaign_name && l.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()));

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
    const headers = ['Lead ID', 'Full Name', 'Email', 'Phone', 'Form Name', 'Campaign Name', 'Submitted At'];
    const rows = filteredLeads.map(lead => [
      lead.id,
      lead.full_name || '',
      lead.email || '',
      lead.phone || '',
      lead.form_name || '',
      lead.campaign_name || '',
      lead.submitted_at ? new Date(lead.submitted_at).toLocaleString() : ''
    ]);

    const csvString = [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `LinkedIn_Leads_Account_${selectedAccountId}_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <span>LinkedIn Ads</span>
            <ChevronRight className="w-2.5 h-2.5" />
            <span className="text-blue-500">Leads Data</span>
          </div>
          <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
            <Users className="w-5 h-5 mr-2 text-blue-500" />
            LinkedIn Leads Manager
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          {/* Sync Button */}
          <button
            disabled={syncing || !selectedAccountId}
            onClick={handleSyncLeads}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/10 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Realtime Data'}</span>
          </button>

          {/* LinkedIn Ad Account Selector */}
          <CustomSelect
            value={selectedAccountId}
            onChange={setSelectedAccountId}
            options={adAccounts.map(acc => ({ value: acc.id, label: acc.name }))}
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

        {/* Filtering and Table Section */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm">

          {/* Filter and search bar */}
          <div className="p-6 border-b border-slate-100 dark:border-white/5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search leads by name, email, phone, campaign, form..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 dark:bg-white/5 px-3 py-1 rounded-2xl border border-slate-200 dark:border-white/5">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase">Campaign:</span>
                <CustomSelect
                  value={campaignFilter}
                  onChange={setCampaignFilter}
                  options={[
                    { value: "all", label: "All Campaigns" },
                    ...uniqueCampaigns.map(camp => ({ value: camp, label: camp }))
                  ]}
                  className="border-none bg-transparent py-1 text-xs px-1 min-w-[150px]"
                />
              </div>
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date Filters:</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300"
                />
              </div>

              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 rounded-xl"
                >
                  Clear Date Scope
                </button>
              )}
            </div>
          </div>

          {/* Leads Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lead Info</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Credentials</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lead Form</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted At</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-20">
                      <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-slate-400 text-xs font-semibold animate-pulse">Scanning MySQL leads records...</p>
                    </td>
                  </tr>
                ) : currentLeads.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-20">
                      <Users className="w-12 h-12 text-slate-300 dark:text-white/10 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Lead Matches Found</h4>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                        Click Sync Realtime Data above to download new captures from LinkedIn Developer dashboard.
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{lead.full_name}</div>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5">ID: {lead.id}</div>
                      </td>
                      <td className="px-6 py-3.5 space-y-1">
                        <div className="flex items-center text-xs text-slate-600 dark:text-slate-300">
                          <Mail className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{lead.email}</span>
                        </div>
                        {lead.phone && (
                          <div className="flex items-center text-xs text-slate-600 dark:text-slate-300">
                            <Phone className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <div className="max-w-[150px] truncate" title={lead.campaign_name}>
                          {lead.campaign_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                        <div className="max-w-[150px] truncate" title={lead.form_name}>
                          {lead.form_name || 'N/A'}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">Form ID: {lead.form_id}</div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-400 font-semibold">
                        {lead.submitted_at ? new Date(lead.submitted_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="p-2 hover:bg-blue-500/10 hover:text-blue-500 dark:hover:bg-blue-500/20 dark:hover:text-blue-400 rounded-xl transition-all"
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

          {/* Pagination Controls */}
          {!loading && filteredLeads.length > 0 && (
            <div className="p-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.01]">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-800 dark:text-white">{indexOfFirstRecord + 1}</span> to{' '}
                  <span className="font-bold text-slate-800 dark:text-white">
                    {Math.min(indexOfLastRecord, totalRecords)}
                  </span> of{' '}
                  <span className="font-bold text-slate-800 dark:text-white">{totalRecords}</span> entries
                </span>

                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 rounded-xl border border-slate-200 dark:border-white/5">
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
                    className="border-none bg-transparent py-0.5 text-xs px-1"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none text-slate-600 dark:text-slate-300"
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
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none text-slate-600 dark:text-slate-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-8 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Inspect Lead Fields</h3>
                <p className="text-[10px] opacity-75 mt-0.5">ID: {selectedLead.id}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-white hover:opacity-75 transition-opacity font-bold text-base p-1.5"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-2xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Full Name</p>
                  <p className="text-xs font-bold">{selectedLead.full_name}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-2xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Submitted At</p>
                  <p className="text-xs font-bold">
                    {selectedLead.submitted_at ? new Date(selectedLead.submitted_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-2xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                  <p className="text-xs font-bold truncate" title={selectedLead.email}>{selectedLead.email}</p>
                </div>
                {selectedLead.phone && (
                  <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-2xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Phone</p>
                    <p className="text-xs font-bold">{selectedLead.phone}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Custom Form field_data:</h4>
                <div className="bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-2xl p-4 font-mono text-[11px] overflow-x-auto space-y-2">
                  {selectedLead.field_data ? (
                    typeof selectedLead.field_data === 'string' ? (
                      <pre className="whitespace-pre-wrap">{selectedLead.field_data}</pre>
                    ) : Array.isArray(selectedLead.field_data) ? (
                      selectedLead.field_data.map((field, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-slate-200/20 dark:border-white/5 last:border-b-0">
                          <span className="text-blue-500 font-bold">{field.name}:</span>
                          <span className="text-slate-600 dark:text-slate-300 text-right">{field.values?.join(', ') || 'N/A'}</span>
                        </div>
                      ))
                    ) : (
                      <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLead.field_data, null, 2)}</pre>
                    )
                  ) : (
                    <span className="text-slate-400">No raw field_data details logged.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-slate-100 dark:border-white/5 flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl font-bold text-xs transition-all text-slate-700 dark:text-slate-300"
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

export default LinkedInLeads;
