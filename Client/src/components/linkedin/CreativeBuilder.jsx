import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, FolderOpen, AlertCircle, CheckCircle, ShieldAlert, Sparkles, 
    Smartphone, Monitor, Eye, Heart, MessageSquare, Share2, Send, 
    Globe, HelpCircle, ChevronRight, Check, Briefcase, ChevronDown 
} from 'lucide-react';
import MediaLibrary from '../media/MediaLibrary';
import CustomSelect from '../CustomSelect';

const CreativeBuilder = () => {
    const navigate = useNavigate();
    
    // Connected configurations
    const [adAccounts, setAdAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [campaignGroups, setCampaignGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState('');

    // Media library asset selection drawers
    const [showMediaSelector, setShowMediaSelector] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);

    // Form settings
    const [headline, setHeadline] = useState('');
    const [description, setDescription] = useState('');
    const [destinationUrl, setDestinationUrl] = useState('');
    const [callToAction, setCallToAction] = useState('LEARN_MORE');
    const [creativeType, setCreativeType] = useState('SINGLE_IMAGE');

    // Visual Preview mode
    const [previewMode, setPreviewMode] = useState('DESKTOP'); // DESKTOP or MOBILE

    // Action execution states
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [validationErrors, setValidationErrors] = useState([]);

    useEffect(() => {
        fetchAdAccounts();
    }, []);

    useEffect(() => {
        if (selectedAccountId) {
            fetchCampaignGroups(selectedAccountId);
        }
    }, [selectedAccountId]);

    useEffect(() => {
        if (selectedGroupId) {
            fetchCampaigns(selectedGroupId);
        }
    }, [selectedGroupId]);

    const fetchAdAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/linkedin/accounts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Failed to load accounts.');

            if (result.adaccounts && result.adaccounts.data && result.adaccounts.data.length > 0) {
                setAdAccounts(result.adaccounts.data);
                setSelectedAccountId(result.adaccounts.data[0].id);
            }
        } catch (err) {
            console.error('Fetch Accounts Error:', err);
            setErrorMsg(err.message);
        }
    };

    const fetchCampaignGroups = async (accountId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/linkedin/campaign-groups/manage/${accountId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                setCampaignGroups(result.data);
                setSelectedGroupId(result.data[0].id);
            } else {
                setCampaignGroups([]);
                setSelectedGroupId('');
            }
        } catch (err) {
            console.error('Fetch Groups Error:', err);
        }
    };

    const fetchCampaigns = async (groupId) => {
        try {
            const token = localStorage.getItem('token');
            // Fetch campaigns nested under this account
            const response = await fetch(`/api/linkedin/campaigns/${selectedAccountId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success && result.data) {
                const groupCamps = result.data.filter(c => String(c.campaign_group_id) === String(groupId));
                setCampaigns(groupCamps);
                if (groupCamps.length > 0) {
                    setSelectedCampaignId(groupCamps[0].id);
                } else {
                    setSelectedCampaignId('');
                }
            } else {
                setCampaigns([]);
                setSelectedCampaignId('');
            }
        } catch (err) {
            console.error('Fetch Campaigns Error:', err);
        }
    };

    const handleSelectAsset = (asset) => {
        if (!asset.linkedin_asset_urn) {
            alert('Warning: This asset has not been registered to LinkedIn. You must register it in the Asset Manager first before publishing.');
        }
        setSelectedAsset(asset);
        setShowMediaSelector(false);
    };

    const handleSaveDraft = async () => {
        setLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        setValidationErrors([]);

        const payload = {
            accountId: selectedAccountId,
            campaignGroupId: selectedGroupId,
            campaignId: selectedCampaignId,
            mediaLibraryId: selectedAsset ? selectedAsset.id : null,
            headline,
            description,
            destinationUrl,
            callToAction,
            creativeType
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/linkedin/creatives/draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!res.ok) {
                if (result.code === 'VALIDATION_FAILED' && result.validationErrors) {
                    setValidationErrors(result.validationErrors);
                    throw new Error('Validation failed.');
                }
                throw new Error(result.message || 'Draft save failed.');
            }

            setSuccessMsg('Ad creative draft saved successfully to Local database!');
            setTimeout(() => {
                setSuccessMsg(null);
                navigate('/linkedin-creatives');
            }, 2000);

        } catch (err) {
            console.error('Draft save failed:', err);
            if (err.message !== 'Validation failed.') {
                setErrorMsg(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePublishCreative = async () => {
        setLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        setValidationErrors([]);

        const payload = {
            accountId: selectedAccountId,
            campaignGroupId: selectedGroupId,
            campaignId: selectedCampaignId,
            mediaLibraryId: selectedAsset ? selectedAsset.id : null,
            headline,
            description,
            destinationUrl,
            callToAction,
            creativeType
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/linkedin/creatives/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!res.ok) {
                if (result.code === 'VALIDATION_FAILED' && result.validationErrors) {
                    setValidationErrors(result.validationErrors);
                    throw new Error('Validation failed.');
                }
                throw new Error(result.message || 'Creative publishing failed.');
            }

            setSuccessMsg(
                result.data.simulated
                    ? 'Simulation Mode: Ad Creative registered and published successfully!'
                    : 'Ad Creative created and published live successfully on LinkedIn!'
            );
            setTimeout(() => {
                setSuccessMsg(null);
                navigate('/linkedin-creatives');
            }, 2500);

        } catch (err) {
            console.error('Publish failed:', err);
            if (err.message !== 'Validation failed.') {
                setErrorMsg(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Extract hostname from destinationUrl to display in ad preview card
    const getHostName = (urlStr) => {
        if (!urlStr) return 'whiteforce.com';
        try {
            const url = new URL(urlStr);
            return url.hostname;
        } catch (_) {
            return 'whiteforce.com';
        }
    };

    const renderPreviewAsset = () => {
        if (!selectedAsset) {
            return (
                <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <FolderOpen className="w-10 h-10 mb-2 opacity-30" />
                    <span className="text-[10px] font-bold tracking-wider uppercase">No media asset selected</span>
                </div>
            );
        }

        const previewUrl = `/api/media/${selectedAsset.uuid}/preview`;

        if (selectedAsset.asset_type === 'IMAGE' || selectedAsset.asset_type === 'LOGO' || selectedAsset.asset_type === 'BRAND') {
            return (
                <img src={previewUrl} alt="" className="w-full object-cover max-h-[300px]" />
            );
        } else if (selectedAsset.asset_type === 'VIDEO') {
            return (
                <video src={previewUrl} controls className="w-full max-h-[300px] bg-black" />
            );
        } else if (selectedAsset.asset_type === 'DOCUMENT') {
            return (
                <div className="p-10 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 flex flex-col items-center justify-center text-slate-400 text-center">
                    <FileText className="w-12 h-12 text-emerald-500 mb-2" />
                    <span className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{selectedAsset.asset_name}</span>
                    <span className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">{selectedAsset.extension} Attachment</span>
                </div>
            );
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header toolbar */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        <span>LinkedIn Ads</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                        <span className="text-blue-500">Creative Builder</span>
                    </div>
                    <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
                        <Plus className="w-5 h-5 mr-2 text-blue-500" />
                        Ad Creative Studio
                    </h2>
                </div>
            </div>

            {/* Global banners */}
            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-300">
                    <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>{successMsg}</span>
                    </div>
                    <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
            )}

            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-300">
                    <div className="flex items-center space-x-2">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{errorMsg}</span>
                    </div>
                    <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
            )}

            {validationErrors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl space-y-1.5 text-xs font-bold animate-in fade-in duration-300">
                    <div className="flex items-center space-x-2 border-b border-red-500/10 pb-1.5 mb-2">
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                        <span>Please fix creative validation issues:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                        {validationErrors.map((err, i) => (
                            <li key={i}>{err.message}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Visual form editor: 7 cols */}
                <div className="lg:col-span-7 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5">Ad Creative Parameters</h3>

                    {/* Account and campaign group selector selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Ad Account</label>
                            <CustomSelect
                                value={selectedAccountId}
                                onChange={setSelectedAccountId}
                                options={adAccounts.map(acc => ({ value: acc.id, label: acc.name }))}
                                className="w-full rounded-xl px-4 py-2.5 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Campaign Group</label>
                            <CustomSelect
                                value={selectedGroupId}
                                onChange={setSelectedGroupId}
                                options={campaignGroups.map(grp => ({ value: grp.id, label: grp.name }))}
                                className="w-full rounded-xl px-4 py-2.5 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Target Campaign</label>
                            <CustomSelect
                                value={selectedCampaignId}
                                onChange={setSelectedCampaignId}
                                options={campaigns.map(camp => ({ value: camp.id, label: camp.name }))}
                                className="w-full rounded-xl px-4 py-2.5 text-xs"
                            />
                        </div>
                    </div>

                    {/* Creative Type & Media Asset Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Creative Type</label>
                            <CustomSelect
                                value={creativeType}
                                onChange={setCreativeType}
                                options={[
                                    { value: "SINGLE_IMAGE", label: "Single Image Ad" },
                                    { value: "VIDEO", label: "Video Ad" },
                                    { value: "DOCUMENT", label: "Document Ad (PDF)" },
                                    { value: "CAROUSEL", label: "Carousel Ad (Slides)" }
                                ]}
                                className="w-full rounded-xl px-4 py-2.5 text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Select Media Asset</label>
                            <button
                                type="button"
                                onClick={() => setShowMediaSelector(true)}
                                className="w-full flex items-center justify-between bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-white/5 rounded-xl px-4 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/10 transition-all"
                            >
                                <span className="truncate">{selectedAsset ? selectedAsset.asset_name : 'Browse Media Library...'}</span>
                                <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
                            </button>
                        </div>
                    </div>

                    {/* Headline and Landing Page inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Ad Card Headline</label>
                            <input
                                type="text"
                                placeholder="e.g. White Force: Executive Search Partners"
                                value={headline}
                                onChange={(e) => setHeadline(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Destination URL</label>
                            <input
                                type="text"
                                placeholder="e.g. https://whiteforce.com/services"
                                value={destinationUrl}
                                onChange={(e) => setDestinationUrl(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Description Copy */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block">Primary Text / Description Copy</label>
                        <textarea
                            rows="4"
                            placeholder="Write the post copy that will appear above the media banner. Introduce your campaigns here."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                        ></textarea>
                    </div>

                    {/* CTA select list */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block">Call to Action (CTA) Button</label>
                        <CustomSelect
                            value={callToAction}
                            onChange={setCallToAction}
                            options={[
                                { value: "LEARN_MORE", label: "LEARN MORE" },
                                { value: "REGISTER", label: "REGISTER" },
                                { value: "APPLY", label: "APPLY" },
                                { value: "DOWNLOAD", label: "DOWNLOAD" },
                                { value: "SUBSCRIBE", label: "SUBSCRIBE" },
                                { value: "SIGN_UP", label: "SIGN UP" }
                            ]}
                            className="w-full rounded-xl px-4 py-2.5 text-xs"
                        />
                    </div>

                    {/* Submit Actions */}
                    <div className="border-t border-slate-100 dark:border-white/5 pt-6 flex justify-end items-center gap-3">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleSaveDraft}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl font-bold text-xs text-slate-700 dark:text-slate-300 transition-all disabled:opacity-50"
                        >
                            Save Draft
                        </button>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={handlePublishCreative}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/10 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading ? 'Processing...' : 'Publish Creative'}
                        </button>
                    </div>
                </div>

                {/* Previews panel: 5 cols */}
                <div className="lg:col-span-5 flex flex-col space-y-6">
                    {/* View mode toggle */}
                    <div className="flex items-center justify-between bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-3 shadow-xs">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center ml-2">
                            <Eye className="w-4 h-4 mr-1.5 text-blue-500" />
                            Live Ad Preview
                        </h4>

                        <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-0.5 border border-slate-200/50 dark:border-white/5">
                            <button
                                onClick={() => setPreviewMode('DESKTOP')}
                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                    previewMode === 'DESKTOP'
                                        ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-xs'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                            >
                                <Monitor className="w-3.5 h-3.5" />
                                <span>Desktop</span>
                            </button>
                            <button
                                onClick={() => setPreviewMode('MOBILE')}
                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                    previewMode === 'MOBILE'
                                        ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-xs'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                            >
                                <Smartphone className="w-3.5 h-3.5" />
                                <span>Mobile</span>
                            </button>
                        </div>
                    </div>

                    {/* Previews container mockup */}
                    <div className="flex-1 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/40 rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-auto">
                        <div className={`transition-all duration-300 w-full ${
                            previewMode === 'MOBILE' ? 'max-w-[340px]' : 'max-w-full'
                        }`}>
                            {/* LinkedIn post frame replica */}
                            <div className="bg-white dark:bg-[#1d2226] rounded-xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden text-slate-800 dark:text-[#e1e9ee] font-sans">
                                
                                {/* Sponsor Header */}
                                <div className="p-4 flex items-center justify-between pb-2">
                                    <div className="flex items-center space-x-2.5">
                                        <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/50">
                                            <span className="text-[10px] font-bold text-white dark:text-slate-900 leading-none">WF</span>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-500 hover:underline cursor-pointer flex items-center">
                                                <span>White Force Recruitment</span>
                                                <Sparkles className="w-3 h-3 text-blue-500 ml-1 fill-blue-500" />
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">Sponsored • 🌐</div>
                                        </div>
                                    </div>
                                    <button className="text-slate-400 text-sm font-bold pb-2">•••</button>
                                </div>

                                {/* Post commentaries description text */}
                                <div className="px-4 pb-3 text-xs leading-relaxed break-words whitespace-pre-line">
                                    {description || 'Your promotional campaign text will appear here. Highlight your recruitment and hiring features.'}
                                </div>

                                {/* Media Banner Preview */}
                                <div className="w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                                    {renderPreviewAsset()}
                                </div>

                                {/* Ad Card Footer details */}
                                <div className="p-3 bg-slate-50 dark:bg-[#2e3438] flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                                    <div className="flex-1 pr-3">
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                            {getHostName(destinationUrl)}
                                        </div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-white mt-0.5 line-clamp-1">
                                            {headline || 'White Force Ad Headline'}
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        <div className="px-3.5 py-1.5 border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap">
                                            {callToAction.replace('_', ' ')}
                                        </div>
                                    </div>
                                </div>

                                {/* LinkedIn Feed reactions mock */}
                                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-bold bg-white dark:bg-[#1d2226]">
                                    <button className="flex items-center space-x-1 hover:text-blue-500">
                                        <Heart className="w-3.5 h-3.5" />
                                        <span>Like</span>
                                    </button>
                                    <button className="flex items-center space-x-1 hover:text-blue-500">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span>Comment</span>
                                    </button>
                                    <button className="flex items-center space-x-1 hover:text-blue-500">
                                        <Share2 className="w-3.5 h-3.5" />
                                        <span>Share</span>
                                    </button>
                                    <button className="flex items-center space-x-1 hover:text-blue-500">
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Send</span>
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Media Drawer Selector overlay */}
            {showMediaSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-300">
                    <div className="w-full max-w-5xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-4 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-bold">Select Creative Media Asset</h3>
                                <p className="text-[10px] opacity-75 mt-0.5">Choose an asset registered on LinkedIn from your Media Library</p>
                            </div>
                            <button
                                onClick={() => setShowMediaSelector(false)}
                                className="text-white hover:opacity-75 font-bold text-base"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950/20">
                            <MediaLibrary onSelectAsset={handleSelectAsset} selectMode={true} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreativeBuilder;
