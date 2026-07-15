import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Save, Play, CheckCircle, AlertCircle, Info,
  Plus, Trash2, Calendar, Target, Award, DollarSign, Clock, ShieldAlert
} from 'lucide-react';
import AsyncSearchSelect from './AsyncSearchSelect';
import CustomSelect from '../../CustomSelect';

const LinkedInCampaignWizard = () => {
  const navigate = useNavigate();

  // 1. Account & Campaign Groups Data
  const [adAccounts, setAdAccounts] = useState([]);
  const [campaignGroups, setCampaignGroups] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // 2. Wizard Wizard Form State
  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [globalSuccess, setGlobalSuccess] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Form Field State variables
  const [accountId, setAccountId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignGroupId, setCampaignGroupId] = useState('');
  const [campaignStatus, setCampaignStatus] = useState('ACTIVE');
  const [objective, setObjective] = useState('WEBSITE_VISIT');
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('USD');

  // Budget states
  const [dailyBudget, setDailyBudget] = useState('10.00');
  const [lifetimeBudget, setLifetimeBudget] = useState('');
  const [bidStrategy, setBidStrategy] = useState('SPONSORED_UPDATES_AUTO_BID');
  const [optimizationGoal, setOptimizationGoal] = useState('WEBSITE_VISIT');
  const [costType, setCostType] = useState('CPC');
  const [unitCost, setUnitCost] = useState('2.50');

  // Schedule states
  const [timezone, setTimezone] = useState('America/New_York');
  const [startTime, setStartTime] = useState(() => {
    // Default to tomorrow
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    tom.setHours(9, 0, 0, 0);
    // Format to YYYY-MM-DDTHH:MM
    const tzoffset = tom.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(tom.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  });
  const [endTime, setEndTime] = useState('');

  // Targeting states (URN input list helper states)
  const [locationsInput, setLocationsInput] = useState('');
  const [locationsList, setLocationsList] = useState([]);

  const [languagesInput, setLanguagesInput] = useState('');
  const [languagesList, setLanguagesList] = useState([]);

  const [jobFunctionsInput, setJobFunctionsInput] = useState('');
  const [jobFunctionsList, setJobFunctionsList] = useState([]);

  const [industriesInput, setIndustriesInput] = useState('');
  const [industriesList, setIndustriesList] = useState([]);

  // 3. Keep mutable states synced for the interval callback ref
  const autosaveStateRef = useRef({});
  useEffect(() => {
    autosaveStateRef.current = {
      draftId,
      accountId,
      campaignGroupId,
      campaignName,
      objective,
      language,
      dailyBudget,
      lifetimeBudget,
      bidStrategy,
      optimizationGoal,
      costType,
      unitCost,
      timezone,
      startTime,
      endTime,
      targeting: {
        locations: locationsList,
        languages: languagesList,
        jobFunctions: jobFunctionsList,
        industries: industriesList
      },
      status: 'DRAFT'
    };
  }, [
    draftId, accountId, campaignGroupId, campaignName, objective, language,
    dailyBudget, lifetimeBudget, bidStrategy, optimizationGoal, costType, unitCost,
    timezone, startTime, endTime, locationsList, languagesList, jobFunctionsList, industriesList
  ]);

  // 4. Initial Bootstrap Data
  useEffect(() => {
    fetchAdAccounts();
  }, []);

  // Fetch campaign groups when account changes
  useEffect(() => {
    if (accountId) {
      // Find selected account currency
      const selectedAcc = adAccounts.find(acc => String(acc.id) === String(accountId));
      if (selectedAcc && selectedAcc.currency) {
        const newCurrency = selectedAcc.currency;
        setCurrency(newCurrency);
        
        // Update default budget if it was the standard default
        setDailyBudget(prev => {
          if (newCurrency === 'INR' && prev === '10.00') return '500.00';
          if (newCurrency !== 'INR' && prev === '500.00') return '10.00';
          return prev;
        });
      }
      fetchCampaignGroups(accountId);
    } else {
      setCampaignGroups([]);
    }
  }, [accountId, adAccounts]);

  // 5. Navigation/Unsaved Changes warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 6. Autosave Interval Timer (Every 30 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      const state = autosaveStateRef.current;
      // Minimum fields check for autosave
      if (state.accountId && state.campaignName.trim() && state.campaignGroupId) {
        triggerAutosave(state);
      }
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // API Call: Fetch accounts
  const fetchAdAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/linkedin/accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success && result.adaccounts?.data) {
        setAdAccounts(result.adaccounts.data);
        if (result.adaccounts.data.length > 0) {
          setAccountId(result.adaccounts.data[0].id);
        }
      } else {
        throw new Error(result.message || 'Failed to fetch accounts');
      }
    } catch (err) {
      console.error('Fetch Accounts Error:', err);
      setGlobalError('Failed to load LinkedIn Ad Accounts.');
    } finally {
      setLoadingAccounts(false);
    }
  };

  // API Call: Fetch Campaign Groups
  const fetchCampaignGroups = async (accId) => {
    setLoadingGroups(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/linkedin/campaign-groups/manage/${accId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success && result.data) {
        // Filter out status = 'REMOVED' groups as they cannot accept new campaigns
        const activeGroups = result.data.filter(grp => grp.status !== 'REMOVED');
        setCampaignGroups(activeGroups);
        if (activeGroups.length > 0) {
          setCampaignGroupId(activeGroups[0].id);
        } else {
          setCampaignGroupId('');
        }
      } else {
        throw new Error(result.message || 'Failed to fetch campaign groups');
      }
    } catch (err) {
      console.error('Fetch Campaign Groups Error:', err);
      setGlobalError('Failed to load Campaign Groups.');
    } finally {
      setLoadingGroups(false);
    }
  };

  // API Call: Autosave Draft
  const triggerAutosave = async (payload) => {
    setIsAutosaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/linkedin/campaigns/manage/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success && result.data?.draftId) {
        setDraftId(result.data.draftId);
        setLastSaved(new Date());
        setIsDirty(false); // Reset dirty flag after successful save
      }
    } catch (err) {
      console.warn('[Autosave] Failed to silently save draft:', err.message);
    } finally {
      setIsAutosaving(false);
    }
  };

  // API Call: Manual Save Draft
  const handleManualSaveDraft = async () => {
    setGlobalError(null);
    setGlobalSuccess(null);
    setValidationErrors([]);
    setSubmitting(true);

    const payload = {
      draftId,
      accountId,
      campaignGroupId,
      campaignName,
      objective,
      language,
      dailyBudget,
      lifetimeBudget,
      bidStrategy,
      optimizationGoal,
      costType,
      unitCost,
      timezone,
      startTime,
      endTime,
      targeting: {
        locations: locationsList,
        languages: languagesList,
        jobFunctions: jobFunctionsList,
        industries: industriesList
      },
      status: 'DRAFT'
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/linkedin/campaigns/manage/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setDraftId(result.data.draftId);
        setLastSaved(new Date());
        setIsDirty(false);
        setGlobalSuccess('Draft saved successfully.');
        setTimeout(() => setGlobalSuccess(null), 5000);
      } else {
        if (result.code === 'VALIDATION_FAILED' && result.validationErrors) {
          setValidationErrors(result.validationErrors);
        } else {
          setGlobalError(result.message || 'Failed to save draft.');
        }
      }
    } catch (err) {
      console.error('Manual Save Draft Error:', err);
      setGlobalError('Failed to save campaign draft due to a network error.');
    } finally {
      setSubmitting(false);
    }
  };

  // API Call: Publish Campaign
  const handlePublishCampaign = async () => {
    setGlobalError(null);
    setGlobalSuccess(null);
    setValidationErrors([]);
    setSubmitting(true);

    const payload = {
      draftId,
      accountId,
      campaignGroupId,
      campaignName,
      objective,
      language,
      dailyBudget,
      lifetimeBudget,
      bidStrategy,
      optimizationGoal,
      costType,
      unitCost,
      timezone,
      startTime,
      endTime,
      targeting: {
        locations: locationsList,
        languages: languagesList,
        jobFunctions: jobFunctionsList,
        industries: industriesList
      },
      status: campaignStatus
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/linkedin/campaigns/manage/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setIsDirty(false);
        setGlobalSuccess('Campaign created and published successfully to LinkedIn!');
        // Redirect back after 2 seconds
        setTimeout(() => {
          navigate('/linkedin-management');
        }, 2500);
      } else {
        if (result.code === 'VALIDATION_FAILED' && result.validationErrors) {
          setValidationErrors(result.validationErrors);
          setGlobalError('Validation failed. Please review the errors in the steps.');
        } else if (result.linkedinError) {
          // If we got a specific LinkedIn response error
          const errorMsg = result.message || 'LinkedIn rejected the creation payload.';
          setGlobalError(`LinkedIn API Error: ${errorMsg}`);
        } else {
          setGlobalError(result.message || 'Failed to create campaign.');
        }
      }
    } catch (err) {
      console.error('Publish Campaign Error:', err);
      setGlobalError('Failed to publish campaign due to a network error.');
    } finally {
      setSubmitting(false);
    }
  };

  // Form Field change helper
  const handleFieldChange = (setter, value) => {
    setter(value);
    setIsDirty(true);
  };

  // Targeting Helpers
  const addTargetingItem = (inputVal, setInput, list, setList, typeLabel) => {
    if (!inputVal.trim()) return;
    const cleanUrn = inputVal.trim();
    if (!cleanUrn.startsWith('urn:li:')) {
      alert(`Invalid format: ${typeLabel} targeting must be valid LinkedIn URN starting with 'urn:li:'`);
      return;
    }
    if (list.includes(cleanUrn)) {
      alert('This URN already exists in the targeting selection.');
      return;
    }
    setList([...list, cleanUrn]);
    setInput('');
    setIsDirty(true);
  };

  const removeTargetingItem = (index, list, setList) => {
    const nextList = [...list];
    nextList.splice(index, 1);
    setList(nextList);
    setIsDirty(true);
  };

  // Get Validation Error messages
  const getFieldError = (field) => {
    const found = validationErrors.find(err => err.field === field);
    return found ? found.message : null;
  };

  // Handle manual tab step navigation
  const nextStep = () => {
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <button
            onClick={() => {
              if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to leave the wizard?')) {
                return;
              }
              navigate('/linkedin-management');
            }}
            className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-bold transition-all mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Campaign Console</span>
          </button>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center">
            <Target className="w-6 h-6 mr-2 text-blue-500" />
            LinkedIn Campaign Builder
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create structured, production-ready LinkedIn campaigns step-by-step.
          </p>
        </div>

        {/* Save Status Banner */}
        <div className="flex flex-col items-end justify-center text-right">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            {isAutosaving && (
              <span className="flex items-center space-x-1 text-blue-500 animate-pulse">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Autosaving...</span>
              </span>
            )}
            {lastSaved && !isAutosaving && (
              <span className="text-[10px] text-slate-400">
                Last saved draft: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {isDirty && !isAutosaving && (
              <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <button
              onClick={handleManualSaveDraft}
              disabled={submitting || !accountId || !campaignName.trim() || !campaignGroupId}
              className="flex items-center space-x-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              <span>Save Draft</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {globalError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-start space-x-2.5 text-xs font-bold animate-in fade-in duration-300">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <div className="space-y-1">
            <p className="font-extrabold">{globalError}</p>
            {validationErrors.length > 0 && (
              <ul className="list-disc pl-4 mt-1 font-semibold space-y-1 text-red-500/90">
                {validationErrors.map((err, i) => (
                  <li key={i}><span className="font-bold uppercase text-[10px] bg-red-500/15 px-1 py-0.5 rounded">{err.field}</span>: {err.message}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {globalSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl flex items-center space-x-2 text-xs font-bold animate-in fade-in duration-300">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{globalSuccess}</span>
        </div>
      )}

      {/* Progress Stepper */}
      <div className="grid grid-cols-5 gap-2 pb-2">
        {[
          { num: 1, name: 'Basic Info', icon: Info },
          { num: 2, name: 'Budget & Bid', icon: DollarSign },
          { num: 3, name: 'Schedule', icon: Clock },
          { num: 4, name: 'Targeting', icon: Target },
          { num: 5, name: 'Review', icon: Award }
        ].map((s) => {
          const StepIcon = s.icon;
          const isActive = step === s.num;
          const isCompleted = step > s.num;

          return (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-500 bg-blue-500/5 text-blue-500 dark:text-blue-400 font-extrabold'
                  : isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-slate-200 dark:border-white/5 bg-transparent text-slate-400 dark:text-slate-500 font-medium'
              }`}
            >
              <StepIcon className="w-4 h-4 mb-1" />
              <span className="text-[10px] hidden md:inline">{s.name}</span>
              <span className="text-[10px] md:hidden">Step {s.num}</span>
            </button>
          );
        })}
      </div>

      {/* Wizard Step Panels */}
      <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
        
        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center">
              <Info className="w-4.5 h-4.5 mr-2 text-blue-500" />
              Campaign Identity & Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ad Account</label>
                {loadingAccounts ? (
                  <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse"></div>
                ) : (
                  <CustomSelect
                    value={accountId}
                    onChange={(val) => handleFieldChange(setAccountId, val)}
                    options={adAccounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.id})` }))}
                    className="w-full rounded-xl px-4 py-2.5 text-xs"
                  />
                )}
                {getFieldError('accountId') && (
                  <p className="text-[10px] text-red-500 font-bold">{getFieldError('accountId')}</p>
                )}
              </div>

              {/* Campaign Group Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign Group</label>
                {loadingGroups ? (
                  <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse"></div>
                ) : (
                  <CustomSelect
                    value={campaignGroupId}
                    onChange={(val) => handleFieldChange(setCampaignGroupId, val)}
                    options={[
                      { value: "", label: "-- Select Group --" },
                      ...campaignGroups.map(grp => ({
                        value: grp.id,
                        label: `${grp.name} (${grp.status ? grp.status.toLowerCase() : 'unknown'})`
                      }))
                    ]}
                    className="w-full rounded-xl px-4 py-2.5 text-xs"
                  />
                )}
                {getFieldError('campaignGroupId') && (
                  <p className="text-[10px] text-red-500 font-bold">{getFieldError('campaignGroupId')}</p>
                )}
              </div>

              {/* Campaign Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. Lead Gen - Franchise - Q3"
                  value={campaignName}
                  onChange={(e) => handleFieldChange(setCampaignName, e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                />
                {getFieldError('campaignName') && (
                  <p className="text-[10px] text-red-500 font-bold">{getFieldError('campaignName')}</p>
                )}
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Publish Target Status</label>
                <CustomSelect
                  value={campaignStatus}
                  onChange={(val) => handleFieldChange(setCampaignStatus, val)}
                  options={[
                    { value: "ACTIVE", label: "ACTIVE (Deliverable immediately after approval)" },
                    { value: "PAUSED", label: "PAUSED (Hold in draft-like state on LinkedIn)" }
                  ]}
                  className="w-full rounded-xl px-4 py-2.5 text-xs"
                />
              </div>

              {/* Campaign Objective Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign Objective</label>
                <CustomSelect
                  value={objective}
                  onChange={(val) => handleFieldChange(setObjective, val)}
                  options={[
                    { value: "WEBSITE_VISIT", label: "Website Visits (WEBSITE_VISIT)" },
                    { value: "LEAD_GENERATION", label: "Lead Generation (LEAD_GENERATION)" },
                    { value: "BRAND_AWARENESS", label: "Brand Awareness (BRAND_AWARENESS)" },
                    { value: "JOB_POSTING", label: "Job Search / Posting (JOB_POSTING)" }
                  ]}
                  className="w-full rounded-xl px-4 py-2.5 text-xs"
                />
                <div className="flex items-center space-x-1.5 text-[10px] text-amber-500 bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg mt-1 font-semibold">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Important: This objective MUST match the selected Campaign Group's objective type on LinkedIn.</span>
                </div>
              </div>

              {/* Language Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Language Code</label>
                <CustomSelect
                  value={language}
                  onChange={(val) => handleFieldChange(setLanguage, val)}
                  options={[
                    { value: "en", label: "English (en)" },
                    { value: "es", label: "Spanish (es)" },
                    { value: "fr", label: "French (fr)" },
                    { value: "de", label: "German (de)" }
                  ]}
                  className="w-full rounded-xl px-4 py-2.5 text-xs"
                />
              </div>

              {/* Currency Display */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Currency (Account Readonly)</label>
                <div className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-500 font-bold dark:text-slate-400 select-none">
                  {currency}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Budget & Bid */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center">
              <DollarSign className="w-4.5 h-4.5 mr-2 text-blue-500" />
              Budgeting & Bidding Configurations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Daily Budget */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daily Budget ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  min={currency === 'INR' ? 500 : (currency === 'JPY' ? 1000 : 10)}
                  value={dailyBudget}
                  onChange={(e) => handleFieldChange(setDailyBudget, e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                />
                {getFieldError('dailyBudget') && (
                  <p className="text-[10px] text-red-500 font-bold">{getFieldError('dailyBudget')}</p>
                )}
                <span className="text-[10px] text-slate-400">
                  Minimum daily budget is {currency} {currency === 'INR' ? '500.00' : (currency === 'JPY' ? '1000.00' : '10.00')}
                </span>
              </div>

              {/* Lifetime Budget */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lifetime Budget ({currency} - Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Unlimited"
                  value={lifetimeBudget}
                  onChange={(e) => handleFieldChange(setLifetimeBudget, e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                />
                {getFieldError('lifetimeBudget') && (
                  <p className="text-[10px] text-red-500 font-bold">{getFieldError('lifetimeBudget')}</p>
                )}
              </div>

              {/* Bid Strategy */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bidding Strategy</label>
                <CustomSelect
                  value={bidStrategy}
                  onChange={(val) => handleFieldChange(setBidStrategy, val)}
                  options={[
                    { value: "SPONSORED_UPDATES_AUTO_BID", label: "Automated Bid (SPONSORED_UPDATES_AUTO_BID)" },
                    { value: "SPONSORED_UPDATES_MAX_CPC", label: "Maximum CPC Bid (SPONSORED_UPDATES_MAX_CPC)" }
                  ]}
                  className="w-full rounded-xl px-4 py-2.5 text-xs"
                />
              </div>

              {/* Optimization Goal */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Optimization Goal</label>
                <CustomSelect
                  value={optimizationGoal}
                  onChange={(val) => handleFieldChange(setOptimizationGoal, val)}
                  options={[
                    { value: "WEBSITE_VISIT", label: "Website Visits (WEBSITE_VISIT)" },
                    { value: "LEAD_GENERATION", label: "Lead Generation (LEAD_GENERATION)" },
                    { value: "CLICKS", label: "Clicks (CLICKS)" },
                    { value: "IMPRESSIONS", label: "Impressions (IMPRESSIONS)" }
                  ]}
                  className="w-full rounded-xl px-4 py-2.5 text-xs"
                />
              </div>

              {/* Cost Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cost Type</label>
                <CustomSelect
                  value={costType}
                  onChange={(val) => handleFieldChange(setCostType, val)}
                  options={[
                    { value: "CPC", label: "CPC (Cost Per Click)" },
                    { value: "CPM", label: "CPM (Cost Per Mille / Impressions)" }
                  ]}
                  className="w-full rounded-xl px-4 py-2.5 text-xs"
                />
              </div>

              {/* Unit Cost (Bid amount) */}
              {(costType === 'CPC' || costType === 'CPM') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bid Amount / Unit Cost ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={unitCost}
                    onChange={(e) => handleFieldChange(setUnitCost, e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                  />
                  {getFieldError('unitCost') && (
                    <p className="text-[10px] text-red-500 font-bold">{getFieldError('unitCost')}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Schedule */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center">
              <Calendar className="w-4.5 h-4.5 mr-2 text-blue-500" />
              Schedule & Run Timeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Start Time */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => handleFieldChange(setStartTime, e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-200"
                />
                {getFieldError('startTime') && (
                  <p className="text-[10px] text-red-500 font-bold">{getFieldError('startTime')}</p>
                )}
                <div className="text-[9px] text-slate-400 font-semibold mt-1">Note: Live publication requires a start time strictly in the future.</div>
              </div>

              {/* End Time */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign End Date & Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => handleFieldChange(setEndTime, e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-705 dark:text-slate-200"
                />
                {getFieldError('endTime') && (
                  <p className="text-[10px] text-red-500 font-bold">{getFieldError('endTime')}</p>
                )}
              </div>

              {/* Timezone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Schedule Timezone</label>
                <CustomSelect
                  value={timezone}
                  onChange={(val) => handleFieldChange(setTimezone, val)}
                  options={[
                    { value: "America/New_York", label: "Eastern Time (America/New_York)" },
                    { value: "Asia/Kolkata", label: "India Standard Time (Asia/Kolkata)" },
                    { value: "UTC", label: "Coordinated Universal Time (UTC)" }
                  ]}
                  className="w-full rounded-xl px-4 py-2.5 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Targeting */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center">
                <Target className="w-4.5 h-4.5 mr-2 text-blue-500" />
                Audience Targeting Facets
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Search and select targeting fields. Leave targeting blank to match all. Free-text targeting is strictly blocked on publish.
              </p>
            </div>

            <div className="space-y-6">
              {/* Locations */}
              <div className="space-y-1.5">
                <AsyncSearchSelect
                  type="location"
                  selectedValues={locationsList}
                  onChange={(nextList) => handleFieldChange(setLocationsList, nextList)}
                  placeholder="Search target locations (e.g. Delhi, Mumbai, India)..."
                  label="Target Locations"
                />
                {getFieldError('targeting.locations') && (
                  <p className="text-[10px] text-red-500 font-bold">{getFieldError('targeting.locations')}</p>
                )}
              </div>

              {/* Languages */}
              <div className="space-y-1.5">
                <AsyncSearchSelect
                  type="language"
                  selectedValues={languagesList}
                  onChange={(nextList) => handleFieldChange(setLanguagesList, nextList)}
                  placeholder="Search target interface languages (e.g. English, French)..."
                  label="Target Languages"
                />
              </div>

              {/* Job Functions */}
              <div className="space-y-1.5">
                <AsyncSearchSelect
                  type="jobFunction"
                  selectedValues={jobFunctionsList}
                  onChange={(nextList) => handleFieldChange(setJobFunctionsList, nextList)}
                  placeholder="Search target job functions (e.g. Engineering, Sales)..."
                  label="Target Job Functions"
                />
              </div>

              {/* Industries */}
              <div className="space-y-1.5">
                <AsyncSearchSelect
                  type="industry"
                  selectedValues={industriesList}
                  onChange={(nextList) => handleFieldChange(setIndustriesList, nextList)}
                  placeholder="Search target industries (e.g. Software, Finance)..."
                  label="Target Industries"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Review */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center">
                <Award className="w-4.5 h-4.5 mr-2 text-blue-500" />
                Campaign Configurations Review
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Please double-check all metrics before publishing to LinkedIn.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-white/[0.01] p-6 rounded-3xl border border-slate-200/50 dark:border-white/5">
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-blue-500 uppercase tracking-wider">Identity & Settings</h4>
                <div className="text-xs space-y-1.5">
                  <div><span className="text-slate-400 font-semibold">Account:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{accountId}</span></div>
                  <div><span className="text-slate-400 font-semibold">Campaign Name:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{campaignName}</span></div>
                  <div><span className="text-slate-400 font-semibold">Campaign Group ID:</span> <span className="font-bold text-slate-850 dark:text-slate-200">{campaignGroupId}</span></div>
                  <div><span className="text-slate-400 font-semibold">Target Status:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{campaignStatus}</span></div>
                  <div><span className="text-slate-400 font-semibold">Objective:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{objective}</span></div>
                  <div><span className="text-slate-400 font-semibold">Language:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{language}</span></div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-blue-500 uppercase tracking-wider">Financial & Schedule</h4>
                <div className="text-xs space-y-1.5">
                  <div><span className="text-slate-400 font-semibold">Daily Budget:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{currency} {dailyBudget}</span></div>
                  {lifetimeBudget && (
                    <div><span className="text-slate-400 font-semibold">Lifetime Budget:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{currency} {lifetimeBudget}</span></div>
                  )}
                  <div><span className="text-slate-400 font-semibold">Bid Strategy:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{bidStrategy}</span></div>
                  <div><span className="text-slate-400 font-semibold">Optimization Goal:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{optimizationGoal}</span></div>
                  <div><span className="text-slate-400 font-semibold">Cost Type:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{costType}</span></div>
                  {(costType === 'CPC' || costType === 'CPM') && (
                    <div><span className="text-slate-400 font-semibold">Bid Amount:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{currency} {unitCost}</span></div>
                  )}
                  <div><span className="text-slate-400 font-semibold">Start Time:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(startTime).toLocaleString()}</span></div>
                  {endTime && (
                    <div><span className="text-slate-400 font-semibold">End Time:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(endTime).toLocaleString()}</span></div>
                  )}
                  <div><span className="text-slate-400 font-semibold">Timezone:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{timezone}</span></div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-3 pt-3 border-t border-slate-200 dark:border-white/5">
                <h4 className="text-xs font-extrabold text-blue-500 uppercase tracking-wider">Targeting Summary</h4>
                <div className="text-xs space-y-2">
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Locations ({locationsList.length}):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {locationsList.map((l, idx) => {
                        const displayName = typeof l === 'string' ? l : l.name;
                        return <span key={idx} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300">{displayName}</span>;
                      })}
                      {locationsList.length === 0 && <span className="italic text-slate-400">Omitted (no location filtering)</span>}
                    </div>
                  </div>
                  {languagesList.length > 0 && (
                    <div>
                      <span className="text-slate-400 font-semibold block mb-1">Interface Languages ({languagesList.length}):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {languagesList.map((l, idx) => {
                          const displayName = typeof l === 'string' ? l : l.name;
                          return <span key={idx} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300">{displayName}</span>;
                        })}
                      </div>
                    </div>
                  )}
                  {jobFunctionsList.length > 0 && (
                    <div>
                      <span className="text-slate-400 font-semibold block mb-1">Job Functions ({jobFunctionsList.length}):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {jobFunctionsList.map((l, idx) => {
                          const displayName = typeof l === 'string' ? l : l.name;
                          return <span key={idx} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300">{displayName}</span>;
                        })}
                      </div>
                    </div>
                  )}
                  {industriesList.length > 0 && (
                    <div>
                      <span className="text-slate-400 font-semibold block mb-1">Industries ({industriesList.length}):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {industriesList.map((l, idx) => {
                          const displayName = typeof l === 'string' ? l : l.name;
                          return <span key={idx} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300">{displayName}</span>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Warn message if start date is in past */}
            {new Date(startTime).getTime() < Date.now() && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-2xl flex items-center space-x-2 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>The start time set is in the past. Publishing will fail on LinkedIn. Please return to Step 3 and set a future start time.</span>
              </div>
            )}

            {/* Actions for Review step */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={handleManualSaveDraft}
                disabled={submitting}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs transition-all flex items-center disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-1.5" />
                <span>Save Local Draft</span>
              </button>
              <button
                type="button"
                onClick={handlePublishCampaign}
                disabled={submitting || new Date(startTime).getTime() < Date.now()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/10 transition-all hover:scale-105 flex items-center disabled:opacity-50 disabled:pointer-events-none"
              >
                <Play className="w-4 h-4 mr-1.5" />
                <span>{submitting ? 'Publishing...' : 'Publish to LinkedIn'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Control Buttons */}
        <div className="flex justify-between items-center border-t border-slate-100 dark:border-white/5 pt-6 mt-8">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className="flex items-center space-x-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Back</span>
          </button>
          
          <span className="text-xs font-bold text-slate-400">Step {step} of 5</span>

          <button
            type="button"
            onClick={nextStep}
            disabled={step === 5}
            className="flex items-center space-x-1 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl font-bold text-xs transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkedInCampaignWizard;
