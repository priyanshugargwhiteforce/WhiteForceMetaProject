import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Calendar,
  Save,
  Database,
  Activity,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Clock
} from 'lucide-react';
import axios from 'axios';
import CustomSelect from './CustomSelect';

const AdOwner = () => {
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  // Dropdown options
  const [metaConfigs, setMetaConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(localStorage.getItem('selectedMetaConfigId') || '');
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  // Data state
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState({}); // { [adId]: { success: bool, message: string } }

  // Individual fields state per ad (for editing)
  const [edits, setEdits] = useState({}); // { [adId]: { ownerName: '', launchDate: '' } }

  useEffect(() => {
    fetchConfigs();
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    fetchAdAccounts();
  }, [selectedConfigId]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchAds();
    } else {
      setAds([]);
      setEdits({});
    }
  }, [selectedAccountId]);

  const fetchConfigs = async () => {
    try {
      const response = await axios.get('/api/meta/configs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const configs = response.data.configs || [];
        setMetaConfigs(configs);
        if (configs.length > 0 && !localStorage.getItem('selectedMetaConfigId')) {
          setSelectedConfigId(configs[0].id.toString());
          localStorage.setItem('selectedMetaConfigId', configs[0].id.toString());
        }
      }
    } catch (err) {
      console.error("Error fetching configs:", err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await axios.get('/api/meta/team', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTeamMembers(response.data.team || []);
      }
    } catch (err) {
      console.error("Error fetching team members:", err);
    }
  };

  const fetchAdAccounts = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (selectedConfigId) headers['X-Meta-Config-Id'] = selectedConfigId;

      const response = await axios.get('/api/meta/accounts', { headers });
      if (response.data.success) {
        const accounts = response.data.adaccounts?.data || [];
        setAdAccounts(accounts);
        if (accounts.length > 0) {
          setSelectedAccountId(accounts[0].id);
        } else {
          setSelectedAccountId('');
        }
      }
    } catch (err) {
      console.error("Error fetching ad accounts:", err);
      setAdAccounts([]);
      setSelectedAccountId('');
    }
  };

  const fetchAds = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (selectedConfigId) headers['X-Meta-Config-Id'] = selectedConfigId;

      const response = await axios.get(`/api/meta/accounts/${selectedAccountId}`, { headers });
      if (response.data.success) {
        const fetchedAds = response.data.data?.ads?.data || [];

        // Sort ads: newest ads at the top (using created_time or adset start_time)
        const sortedAds = fetchedAds.sort((a, b) => {
          const dateA = new Date(a.created_time || a.adset?.start_time || 0);
          const dateB = new Date(b.created_time || b.adset?.start_time || 0);
          return dateB - dateA;
        });

        setAds(sortedAds);

        // Populate edits state with initial values
        const initialEdits = {};
        sortedAds.forEach(ad => {
          initialEdits[ad.id] = {
            ownerName: ad.owner_name || '',
            launchDate: ad.launch_date ? ad.launch_date.split('T')[0] : ''
          };
        });
        setEdits(initialEdits);
      }
    } catch (err) {
      console.error("Error fetching ads details:", err);
      setError(err.response?.data?.message || 'Failed to load ads for this account.');
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (adId, field, value) => {
    setEdits(prev => ({
      ...prev,
      [adId]: {
        ...prev[adId],
        [field]: value
      }
    }));
  };

  const handleSave = async (adId) => {
    const adEdits = edits[adId] || {};
    try {
      setSaveStatus(prev => ({ ...prev, [adId]: { loading: true } }));

      const headers = { Authorization: `Bearer ${token}` };
      if (selectedConfigId) headers['X-Meta-Config-Id'] = selectedConfigId;

      const response = await axios.post('/api/meta/ads/owner', {
        adId,
        ownerName: adEdits.ownerName,
        launchDate: adEdits.launchDate
      }, { headers });

      if (response.data.success) {
        setSaveStatus(prev => ({
          ...prev,
          [adId]: { success: true, message: 'Saved!' }
        }));

        // Update local state to reflect update time and saved info
        setAds(prevAds => prevAds.map(ad => {
          if (ad.id === adId) {
            return {
              ...ad,
              owner_name: adEdits.ownerName,
              launch_date: adEdits.launchDate,
              owner_updated_at: new Date().toISOString()
            };
          }
          return ad;
        }));

        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, [adId]: null }));
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setSaveStatus(prev => ({
        ...prev,
        [adId]: { error: true, message: err.response?.data?.message || 'Failed to save' }
      }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [adId]: null }));
      }, 3000);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-2 md:p-4 max-w-7xl mx-auto space-y-4">
      {/* Title & Filter Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
            <User className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ad Owner Mapping</h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Assign owner credentials and launch date parameters to active ads</p>
          </div>
        </div>

        {/* Dropdowns Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Config select */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1 transition-colors relative">
            <Database className="w-3.5 h-3.5 text-blue-500" />
            <CustomSelect
              value={selectedConfigId}
              onChange={(val) => {
                setSelectedConfigId(val);
                localStorage.setItem('selectedMetaConfigId', val);
              }}
              options={[
                { value: "", label: "Default Server Config" },
                ...metaConfigs.map(cfg => ({ value: cfg.id, label: cfg.name }))
              ]}
              className="border-none bg-transparent py-1 text-[11px] px-1 min-w-[150px]"
            />
          </div>

          {/* Ad Account select */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1 transition-colors relative">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <CustomSelect
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              options={[
                { value: "", label: "Choose Ad Account..." },
                ...adAccounts.map(acc => ({ value: acc.id, label: acc.name }))
              ]}
              className="border-none bg-transparent py-1 text-[11px] px-1 min-w-[150px]"
            />
          </div>
        </div>
      </div>

      {/* Ads List Content Card */}
      <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm transition-colors">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-xs text-slate-500 font-medium animate-pulse">Retrieving ads details from Meta...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold mb-1">Failed to Load Ads</h3>
            <p className="text-slate-500 max-w-sm text-xs mb-4">{error}</p>
            <button
              onClick={fetchAds}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition-all"
            >
              Retry Sync
            </button>
          </div>
        ) : ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl m-4">
            <Activity className="w-10 h-10 text-slate-300 dark:text-white/10 mb-2" />
            <h4 className="font-bold text-xs text-slate-800 dark:text-white mb-1">No Ads Discovered</h4>
            <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
              No ads were found inside this Ad Account. Please ensure you have configured ads launching in this account.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ad Details</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ad Created/Start</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ad Owner</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Launch Date</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last Update</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {ads.map((ad) => {
                  const adEdits = edits[ad.id] || { ownerName: '', launchDate: '' };
                  const statusInfo = saveStatus[ad.id] || {};

                  return (
                    <tr key={ad.id} className="hover:bg-blue-500/[0.01] dark:hover:bg-blue-500/[0.02] transition-colors group">
                      {/* Name and IDs */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[260px]" title={ad.name}>
                            {ad.name}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                            Ad ID: {ad.id}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${ad.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                          }`}>
                          {ad.status}
                        </span>
                      </td>

                      {/* Ad Created/Start Date */}
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                        {ad.created_time ? formatDate(ad.created_time) : (ad.adset?.start_time ? formatDate(ad.adset.start_time) : 'N/A')}
                      </td>

                      {/* Ad Owner Select Dropdown */}
                      <td className="px-4 py-2.5">
                        <CustomSelect
                          value={adEdits.ownerName}
                          onChange={(val) => handleFieldChange(ad.id, 'ownerName', val)}
                          options={[
                            { value: "", label: "Unassigned" },
                            ...teamMembers.map(member => ({ value: member.username, label: `${member.username} (${member.role})` }))
                          ]}
                          className="w-40 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                        />
                      </td>

                      {/* Launch Date picker */}
                      <td className="px-4 py-2.5">
                        <input
                          type="date"
                          value={adEdits.launchDate}
                          onChange={(e) => handleFieldChange(ad.id, 'launchDate', e.target.value)}
                          className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-100"
                        />
                      </td>

                      {/* Last Saved timestamp */}
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(ad.owner_updated_at)}</span>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleSave(ad.id)}
                          disabled={statusInfo.loading}
                          className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 shadow-sm border ${statusInfo.success
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : statusInfo.error
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-blue-600 hover:bg-blue-500 text-white border-transparent hover:scale-[1.02] active:scale-95'
                            }`}
                        >
                          {statusInfo.loading ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : statusInfo.success ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : statusInfo.error ? (
                            <AlertCircle className="w-3 h-3" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          <span>
                            {statusInfo.loading
                              ? 'Saving...'
                              : statusInfo.success
                                ? 'Saved'
                                : statusInfo.error
                                  ? 'Failed'
                                  : 'Save'}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdOwner;
