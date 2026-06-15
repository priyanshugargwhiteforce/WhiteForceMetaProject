import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Plus, RefreshCw, ChevronDown, ChevronUp, Play, Pause,
  Calendar, CheckCircle, ShieldAlert, AlertCircle, Database, ExternalLink, Info, ChevronRight
} from 'lucide-react';

const LinkedInCampaignManagement = () => {
  const navigate = useNavigate();
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [campaignGroups, setCampaignGroups] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Expanded groups tracking
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());

  // Campaign Group Creation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupStatus, setNewGroupStatus] = useState('ACTIVE');
  const [newGroupStart, setNewGroupStart] = useState('');
  const [newGroupEnd, setNewGroupEnd] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Action status/loader tracking
  const [actionInProgress, setActionInProgress] = useState(null); // stores campaign ID currently updating
  const [successBanner, setSuccessBanner] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);

  useEffect(() => {
    fetchAdAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchManagementData(selectedAccountId);
    }
  }, [selectedAccountId]);

  const fetchAdAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/linkedin/accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Failed to fetch LinkedIn accounts');

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
      console.error('LinkedIn Accounts Fetch Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchManagementData = async (accountId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');

      // 1. Fetch managed campaign groups (incorporates count joins)
      const groupsRes = await fetch(`/api/linkedin/campaign-groups/manage/${accountId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const groupsResult = await groupsRes.json();
      if (groupsResult.success) {
        setCampaignGroups(groupsResult.data);
      } else {
        throw new Error(groupsResult.message || 'Failed to load campaign groups');
      }

      // 2. Fetch all campaigns to display nested under expanded groups
      const campRes = await fetch(`/api/linkedin/campaigns/${accountId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const campResult = await campRes.json();
      if (campResult.success) {
        setCampaigns(campResult.data);
      }
    } catch (err) {
      console.error('LinkedIn Management Fetch Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpandGroup = (groupId) => {
    const nextIds = new Set(expandedGroupIds);
    if (nextIds.has(groupId)) {
      nextIds.delete(groupId);
    } else {
      nextIds.add(groupId);
    }
    setExpandedGroupIds(nextIds);
  };

  const handleCreateCampaignGroup = async (e) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError(null);

    const payload = {
      accountId: selectedAccountId,
      name: newGroupName,
      status: newGroupStatus
    };

    if (newGroupStart || newGroupEnd) {
      payload.runSchedule = {};
      if (newGroupStart) payload.runSchedule.start = new Date(newGroupStart).toISOString();
      if (newGroupEnd) payload.runSchedule.end = new Date(newGroupEnd).toISOString();
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/linkedin/campaign-groups/manage/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'LinkedIn Campaign Group API request failed');
      }

      // Refresh list, close modal and clear states
      await fetchManagementData(selectedAccountId);
      setIsModalOpen(false);
      setNewGroupName('');
      setNewGroupStatus('ACTIVE');
      setNewGroupStart('');
      setNewGroupEnd('');
      setSuccessBanner('Campaign Group created successfully.');
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch (err) {
      console.error('Create Campaign Group Error:', err);
      setModalError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleUpdateCampaignStatus = async (campaignId, action) => {
    setActionInProgress(campaignId);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/linkedin/campaigns/manage/${campaignId}/${action}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ accountId: selectedAccountId })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        // Build readable message from normalized error payload
        const errorDetail = result.message || 'Status update failed';
        const errCode = result.code ? `[${result.code}] ` : '';
        throw new Error(`${errCode}${errorDetail}`);
      }

      // Refresh list
      await fetchManagementData(selectedAccountId);
      setSuccessBanner(`Campaign status set to ${action === 'pause' ? 'PAUSED' : 'ACTIVE'} successfully.`);
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch (err) {
      console.error(`Campaign ${action} status update failed:`, err);
      setErrorBanner(err.message);
    } finally {
      setActionInProgress(null);
    }
  };

  const getGroupCampaigns = (groupId) => {
    return campaigns.filter(c => String(c.campaign_group_id) === String(groupId));
  };

  return (
    <div className="p-8 space-y-8">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            <span>LinkedIn Ads</span>
            <ChevronRight className="w-2.5 h-2.5 text-slate-400" />
            <span className="text-blue-500">Campaign Management</span>
          </div>
          <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
            <Briefcase className="w-5 h-5 mr-2 text-blue-500" />
            Campaign Operations Console
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => selectedAccountId && fetchManagementData(selectedAccountId)}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl transition-all"
            title="Refresh Campaigns Group"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
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

          {/* New Campaign Group Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/10 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>New Group</span>
          </button>

          {/* Create Campaign Button */}
          <button
            onClick={() => navigate('/linkedin-management/campaign/new')}
            className="flex items-center space-x-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/10 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Global Notifications */}
        {successBanner && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-300">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successBanner}</span>
            </div>
            <button onClick={() => setSuccessBanner(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
        )}

        {errorBanner && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-300">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
        )}

        {/* Campaign Groups Main Inventory table */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-white/5">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Active Campaign Groups</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select "View" under actions to inspect and pause/resume child campaigns.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10"></th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign Group Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Campaign Count</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created / Synced</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-20">
                      <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-slate-400 text-xs font-semibold animate-pulse">Scanning MySQL campaign groups...</p>
                    </td>
                  </tr>
                ) : campaignGroups.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-20">
                      <Database className="w-12 h-12 text-slate-300 dark:text-white/10 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Campaign Groups Registered</h4>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                        Click the "New Group" button above to create a campaign group or run sync to load existing groups.
                      </p>
                    </td>
                  </tr>
                ) : (
                  campaignGroups.map((group) => {
                    const isExpanded = expandedGroupIds.has(group.id);
                    const nestedCampaigns = getGroupCampaigns(group.id);

                    return (
                      <React.Fragment key={group.id}>
                        {/* Parent Row */}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.005] transition-colors">
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleExpandGroup(group.id)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{group.name}</div>
                            <div className="text-[9px] font-mono text-slate-400 mt-0.5">Group ID: {group.id}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${
                              group.status === 'ACTIVE'
                                ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                                : 'text-slate-400 bg-slate-100/50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                            }`}>
                              {group.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                            {group.campaign_count || 0} Campaigns
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            <div className="font-semibold text-slate-600 dark:text-slate-300">
                              {new Date(group.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              Source: <span className="font-bold text-slate-500">{group.creation_source}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleExpandGroup(group.id)}
                              className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-all"
                            >
                              {isExpanded ? 'Collapse' : 'View Campaigns'}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Nested Campaigns Sub-table */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50 dark:bg-white/[0.002]">
                            <td colSpan="6" className="px-8 py-4 border-l-4 border-blue-500">
                              <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-white dark:bg-white/[0.01] overflow-hidden shadow-inner p-4 space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-white/5">
                                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center">
                                    <Database className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                    Campaigns belonging to this group:
                                  </h4>
                                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                                    Local DB Cache Sync
                                  </span>
                                </div>

                                {nestedCampaigns.length === 0 ? (
                                  <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                                    No campaigns linked to this Campaign Group yet.
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {nestedCampaigns.map((camp) => {
                                      const isRunning = camp.status === 'RUNNING' || camp.status === 'ACTIVE';
                                      const isPaused = camp.status === 'PAUSED';
                                      const isUpdating = actionInProgress === camp.id;
                                      const isFinalStatus = ['COMPLETED', 'ARCHIVED', 'CANCELED', 'ENDED'].includes(camp.status.toUpperCase());
                                      let hasPastStart = false;
                                      if (camp.start_time) {
                                        hasPastStart = new Date(camp.start_time).getTime() < Date.now();
                                        if (hasPastStart && isRunning) {
                                          hasPastStart = false;
                                        }
                                      } else if (camp.creation_status === 'SYNCED' && (camp.status.toUpperCase() === 'DRAFT' || camp.status.toUpperCase() === 'PAUSED')) {
                                        hasPastStart = true;
                                      }

                                      const isImmutable = isFinalStatus || hasPastStart;

                                      return (
                                        <div key={camp.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 bg-slate-50 dark:bg-white/[0.01] hover:bg-slate-100/50 dark:hover:bg-white/[0.02] border border-slate-150 dark:border-white/5 rounded-xl transition-all gap-4">
                                          <div>
                                            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{camp.name}</div>
                                            <div className="text-[9px] font-mono text-slate-400 mt-0.5">Campaign ID: {camp.id}</div>
                                          </div>

                                          <div className="flex items-center gap-4">
                                            {isImmutable && (
                                              <div 
                                                className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-semibold cursor-help"
                                                title="LinkedIn does not allow status updates for this old campaign."
                                              >
                                                <Info className="w-3 h-3" />
                                                <span>Immutable</span>
                                              </div>
                                            )}

                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase border ${
                                              isRunning
                                                ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                                                : isPaused
                                                  ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                                                  : 'text-slate-400 bg-slate-100/50 border-slate-200 dark:bg-white/5 dark:border-white/10'
                                            }`}>
                                              {camp.status}
                                            </span>

                                            <div className="flex items-center gap-2">
                                              {/* Pause button */}
                                              <button
                                                disabled={isUpdating || isPaused || isImmutable}
                                                onClick={() => handleUpdateCampaignStatus(camp.id, 'pause')}
                                                className="flex items-center space-x-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40 disabled:pointer-events-none"
                                                title={isImmutable ? "LinkedIn does not allow status updates for this old campaign." : ""}
                                              >
                                                <Pause className="w-3 h-3 mr-0.5" />
                                                <span>{isUpdating ? 'Updating...' : 'Pause'}</span>
                                              </button>

                                              {/* Resume button */}
                                              <button
                                                disabled={isUpdating || isRunning || isImmutable}
                                                onClick={() => handleUpdateCampaignStatus(camp.id, 'resume')}
                                                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40 disabled:pointer-events-none"
                                                title={isImmutable ? "LinkedIn does not allow status updates for this old campaign." : ""}
                                              >
                                                <Play className="w-3 h-3 mr-0.5" />
                                                <span>{isUpdating ? 'Updating...' : 'Resume'}</span>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Creation Modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-8 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Create LinkedIn Campaign Group</h3>
                <p className="text-[10px] opacity-75 mt-0.5">Sets up a new container for campaign budgets on LinkedIn</p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setModalError(null);
                }}
                className="text-white hover:opacity-75 transition-opacity font-bold text-base p-1.5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaignGroup} className="p-8 space-y-6">
              {modalError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-start space-x-2 text-xs font-bold">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Group Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Funnel Group - Q3"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Initial Status</label>
                <select
                  value={newGroupStatus}
                  onChange={(e) => setNewGroupStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE (Deliverable)</option>
                  <option value="DRAFT">DRAFT (Design Mode)</option>
                </select>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Start Date</label>
                  <input
                    type="datetime-local"
                    value={newGroupStart}
                    onChange={(e) => setNewGroupStart(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">End Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={newGroupEnd}
                    onChange={(e) => setNewGroupEnd(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="border-t border-slate-100 dark:border-white/5 pt-5 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalError(null);
                  }}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl font-bold text-xs text-slate-700 dark:text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/10 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {modalSubmitting ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkedInCampaignManagement;
