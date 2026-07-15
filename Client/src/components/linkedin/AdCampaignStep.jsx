import React, { useContext, useState, useEffect } from 'react';
import AdBuilderContext from '../../context/AdBuilderContext';
import { Target, Layers, Info, AlertCircle, CheckCircle } from 'lucide-react';
import CustomSelect from '../CustomSelect';

export default function AdCampaignStep() {
  const { draft, setDraft, triggerSaveDraft } = useContext(AdBuilderContext);
  const [accounts, setAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [error, setError] = useState(null);

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/linkedin/accounts', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.adaccounts?.data) {
          setAccounts(data.adaccounts.data);
        } else {
          setError(data.message || 'Failed to load ad accounts.');
        }
      } catch (err) {
        console.error('Fetch accounts error:', err);
        setError('Network error loading LinkedIn accounts.');
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, []);

  // Fetch campaigns when accountId changes
  useEffect(() => {
    if (!draft.accountId) {
      setCampaigns([]);
      return;
    }
    const fetchCampaigns = async () => {
      setLoadingCampaigns(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/linkedin/campaigns/${draft.accountId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.campaigns?.data) {
          setCampaigns(data.campaigns.data);
        } else {
          setCampaigns([]);
        }
      } catch (err) {
        console.error('Fetch campaigns error:', err);
        setCampaigns([]);
      } finally {
        setLoadingCampaigns(false);
      }
    };
    fetchCampaigns();
  }, [draft.accountId]);

  const handleAccountChange = (e) => {
    const accId = e.target.value;
    setDraft(prev => {
      const updated = { ...prev, accountId: accId, campaignId: '' };
      localStorage.setItem('linkedinAdDraft', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCampaignChange = (e) => {
    const campId = e.target.value;
    setDraft(prev => {
      const updated = { ...prev, campaignId: campId };
      localStorage.setItem('linkedinAdDraft', JSON.stringify(updated));
      return updated;
    });
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setDraft(prev => {
      const updated = { ...prev, adName: name };
      localStorage.setItem('linkedinAdDraft', JSON.stringify(updated));
      return updated;
    });
  };

  const handleFieldBlur = () => {
    triggerSaveDraft(draft);
  };

  const selectedCampaign = campaigns.find(c => String(c.id) === String(draft.campaignId));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center space-x-2 text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5">
        <Target className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-bold">Campaign & General Settings</h3>
      </div>

      {error && (
        <div className="p-3 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ad Name Input */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Ad Name</label>
          <input
            type="text"
            placeholder="Enter a descriptive ad name..."
            value={draft.adName || ''}
            onChange={handleNameChange}
            onBlur={handleFieldBlur}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
          />
        </div>

        {/* Ad Account Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">LinkedIn Ad Account</label>
          {loadingAccounts ? (
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse"></div>
          ) : (
            <CustomSelect
              value={draft.accountId || ''}
              onChange={(val) => {
                handleAccountChange({ target: { value: val } });
                handleFieldBlur();
              }}
              options={[
                { value: "", label: "-- Select Ad Account --" },
                ...accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.id})` }))
              ]}
              className="w-full rounded-xl px-4 py-2.5 text-xs"
            />
          )}
        </div>

        {/* Campaign Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Target Campaign</label>
          {loadingCampaigns ? (
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse"></div>
          ) : (
            <CustomSelect
              value={draft.campaignId || ''}
              onChange={(val) => {
                handleCampaignChange({ target: { value: val } });
                handleFieldBlur();
              }}
              disabled={!draft.accountId}
              options={[
                { value: "", label: draft.accountId ? '-- Select Campaign --' : 'Select an ad account first' },
                ...campaigns.map(camp => ({ value: camp.id, label: camp.name }))
              ]}
              className="w-full rounded-xl px-4 py-2.5 text-xs"
            />
          )}
        </div>
      </div>

      {/* Selected Campaign Status/Detail Display */}
      {selectedCampaign && (
        <div className="mt-4 p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Campaign Details</span>
            <div className="flex items-center space-x-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                {selectedCampaign.status || 'ACTIVE'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Objective</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedCampaign.objective || 'WEBSITE_VISIT'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Type</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedCampaign.type || 'SPONSORED_UPDATES'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
