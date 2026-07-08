import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    Send, FolderOpen, AlertCircle, CheckCircle, Eye, Monitor, Smartphone,
    Heart, MessageSquare, Share2, Loader, Search, RefreshCw,
    AlertTriangle, Sparkles, Check
} from 'lucide-react';

const Facebook = ({ className, ...props }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className} 
        {...props}
    >
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
);

const Instagram = ({ className, ...props }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className} 
        {...props}
    >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
);
import MediaLibrary from './media/MediaLibrary';
import axios from 'axios';

const MetaPosting = () => {
    const { token } = useAuth();
    
    // Accounts / Configurations
    const [configs, setConfigs] = useState([]);
    const [selectedConfigId, setSelectedConfigId] = useState('');
    const [loadingConfigs, setLoadingConfigs] = useState(false);

    // Targets discovery
    const [targets, setTargets] = useState([]);
    const [loadingTargets, setLoadingTargets] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Selection state
    // Maps pageId -> boolean (Page feed target)
    const [selectedPages, setSelectedPages] = useState({});
    // Maps igId -> boolean (Instagram target)
    const [selectedInstagrams, setSelectedInstagrams] = useState({});

    // Content Editor
    const [caption, setCaption] = useState('');
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [showMediaSelector, setShowMediaSelector] = useState(false);
    
    // UI Preview
    const [previewPlatform, setPreviewPlatform] = useState('facebook'); // 'facebook' or 'instagram'
    const [previewDevice, setPreviewDevice] = useState('DESKTOP'); // 'DESKTOP' or 'MOBILE'

    // Publishing Action States
    const [isPublishing, setIsPublishing] = useState(false);
    const [activeJobId, setActiveJobId] = useState(null);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    // Track status per target ID (can be page target or instagram target ID)
    const [progressStatus, setProgressStatus] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchConfigs();
    }, []);

    useEffect(() => {
        if (selectedConfigId) {
            fetchTargets(selectedConfigId);
        } else {
            setTargets([]);
            setSelectedPages({});
            setSelectedInstagrams({});
        }
    }, [selectedConfigId]);

    const fetchConfigs = async () => {
        setLoadingConfigs(true);
        try {
            const res = await axios.get('/api/meta/configs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success) {
                setConfigs(res.data.configs || []);
                if (res.data.configs?.length > 0) {
                    setSelectedConfigId(res.data.configs[0].id);
                }
            }
        } catch (err) {
            console.error('Fetch Configs Error:', err);
            setErrorMessage('Failed to load Meta account configurations.');
        } finally {
            setLoadingConfigs(false);
        }
    };

    const fetchTargets = async (configId) => {
        setLoadingTargets(true);
        setErrorMessage('');
        try {
            const res = await axios.get(`/api/meta/posting/targets?configId=${configId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success) {
                setTargets(res.data.targets || []);
                // Reset selections
                setSelectedPages({});
                setSelectedInstagrams({});
            }
        } catch (err) {
            console.error('Fetch Targets Error:', err);
            setErrorMessage(err.response?.data?.message || 'Failed to load publishing targets. Please reconnect Meta account.');
        } finally {
            setLoadingTargets(false);
        }
    };

    const filteredTargets = useMemo(() => {
        return targets.filter(t => 
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.instagramAccount && t.instagramAccount.username?.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [targets, searchQuery]);

    const handleSelectAsset = (asset) => {
        setSelectedAsset(asset);
        setShowMediaSelector(false);
    };

    const togglePageSelection = (pageId) => {
        setSelectedPages(prev => ({
            ...prev,
            [pageId]: !prev[pageId]
        }));
    };

    const toggleInstagramSelection = (igId) => {
        setSelectedInstagrams(prev => ({
            ...prev,
            [igId]: !prev[igId]
        }));
    };

    // Calculate count of selected targets
    const selectedTargetsCount = useMemo(() => {
        const pagesCount = Object.values(selectedPages).filter(Boolean).length;
        const igsCount = Object.values(selectedInstagrams).filter(Boolean).length;
        return pagesCount + igsCount;
    }, [selectedPages, selectedInstagrams]);

    const handleTriggerPublish = () => {
        if (selectedTargetsCount === 0) {
            alert('Please select at least one publishing destination.');
            return;
        }
        setShowConfirmModal(true);
    };

    const executePublish = async () => {
        setShowConfirmModal(false);
        setIsPublishing(true);
        setErrorMessage('');
        setSuccessMessage('');
        
        // Build targets array
        const targetsPayload = [];
        
        targets.forEach(t => {
            if (selectedPages[t.id]) {
                targetsPayload.push({
                    platform: 'facebook',
                    target_id: t.id,
                    target_name: t.name
                });
            }
            if (t.instagramAccount && selectedInstagrams[t.instagramAccount.id]) {
                targetsPayload.push({
                    platform: 'instagram',
                    target_id: t.instagramAccount.id,
                    target_name: `@${t.instagramAccount.username}`,
                    linked_page_id: t.id
                });
            }
        });

        // Generate client-side unique idempotency key
        const idempotencyKey = `meta-publish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const payload = {
            configId: selectedConfigId,
            caption,
            mediaAssetId: selectedAsset ? selectedAsset.id : null,
            targets: targetsPayload,
            idempotencyKey
        };

        // Initialize progress statuses as queued
        const initialProgress = {};
        targetsPayload.forEach(tp => {
            initialProgress[tp.target_id] = {
                targetName: tp.target_name,
                platform: tp.platform,
                status: 'queued'
            };
        });
        setProgressStatus(initialProgress);
        setShowProgressModal(true);

        // SSE Connection for real-time progress
        let sse = null;
        try {
            const sseUrl = `/api/meta/posting/progress?token=${token}`;
            sse = new EventSource(sseUrl);
            
            sse.onmessage = (event) => {
                const payload = JSON.parse(event.data);
                if (payload.type === 'progress') {
                    const update = payload.data;
                    if (update.jobId === activeJobId || activeJobId === null) {
                        setProgressStatus(prev => {
                            if (!prev[update.targetId]) return prev;
                            return {
                                ...prev,
                                [update.targetId]: {
                                    ...prev[update.targetId],
                                    status: update.status,
                                    permalink: update.permalink || null,
                                    errorMessage: update.errorMessage || null
                                }
                            };
                        });
                    }
                }
            };
            
            sse.onerror = (err) => {
                console.warn('[SSE] EventSource encountered connection error. Updates will continue via job polling.');
            };

        } catch (err) {
            console.error('[SSE] Failed to establish EventSource connection.', err);
        }

        try {
            const res = await axios.post('/api/meta/posting/publish', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.success) {
                const jobId = res.data.jobId;
                setActiveJobId(jobId);
                setSuccessMessage('Publishing campaign successfully scheduled.');
                
                // Set up polling fallback loop to ensure status updates succeed if SSE fails
                pollJobStatus(jobId, sse);
            }
        } catch (err) {
            console.error('Publish Submit Error:', err);
            setErrorMessage(err.response?.data?.message || 'Publishing request failed.');
            setIsPublishing(false);
            if (sse) sse.close();
        }
    };

    const pollJobStatus = async (jobId, sseInstance) => {
        let finished = false;
        let counter = 0;

        const interval = setInterval(async () => {
            counter++;
            try {
                const res = await axios.get(`/api/meta/posting/jobs/${jobId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data?.success) {
                    const job = res.data.job;
                    const targetsList = res.data.targets;

                    // Update UI state from polled statuses
                    setProgressStatus(prev => {
                        const next = { ...prev };
                        targetsList.forEach(t => {
                            next[t.target_id] = {
                                ...next[t.target_id],
                                status: t.status,
                                permalink: t.permalink,
                                errorMessage: t.error_message
                            };
                        });
                        return next;
                    });

                    // Terminate polling once job completes (status changes from queued/processing)
                    if (job.status === 'completed') {
                        finished = true;
                        setIsPublishing(false);
                        clearInterval(interval);
                        if (sseInstance) sseInstance.close();
                    }
                }
            } catch (pollErr) {
                console.error('[Polling] Status fetch failure:', pollErr.message);
            }

            // Stop polling after 5 minutes safety timeout
            if (counter > 150 || finished) {
                clearInterval(interval);
                setIsPublishing(false);
                if (sseInstance) sseInstance.close();
            }
        }, 2000);
    };

    const handleCloseProgress = () => {
        setShowProgressModal(false);
        setActiveJobId(null);
        setProgressStatus({});
        // Reload targets to refresh status/limits
        if (selectedConfigId) fetchTargets(selectedConfigId);
    };

    // UI Previews
    const previewImage = selectedAsset 
        ? `/api/media/${selectedAsset.uuid}/preview` 
        : null;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Send className="w-6 h-6 text-blue-500" />
                        Meta Posting Dashboard
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Publish text and photo updates to Facebook Pages & Instagram accounts simultaneously.</p>
                </div>
                
                {/* Account configuration picker */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                        value={selectedConfigId}
                        onChange={(e) => setSelectedConfigId(e.target.value)}
                        className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm rounded-xl px-4 py-2 w-full sm:w-64 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        disabled={loadingConfigs}
                    >
                        <option value="">-- Choose Account Config --</option>
                        {configs.map(cfg => (
                            <option key={cfg.id} value={cfg.id}>{cfg.name}</option>
                        ))}
                    </select>
                    
                    <button
                        onClick={() => selectedConfigId && fetchTargets(selectedConfigId)}
                        disabled={loadingTargets || !selectedConfigId}
                        className="p-2 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
                        title="Reload pages & targets"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingTargets ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Error notifications */}
            {errorMessage && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-2.5 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>{errorMessage}</div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Workspace: Targets checklist (7 columns) */}
                <div className="lg:col-span-7 space-y-6">
                    
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Publishing Destinations</h2>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filter targets..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs rounded-xl pl-9 pr-3 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {loadingTargets ? (
                            <div className="py-12 text-center flex flex-col items-center justify-center text-xs text-[var(--text-secondary)] gap-2">
                                <Loader className="w-8 h-8 animate-spin text-blue-500" />
                                <span>Loading connected Meta targets...</span>
                            </div>
                        ) : filteredTargets.length === 0 ? (
                            <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
                                {selectedConfigId ? 'No targets found matching search query.' : 'Please select a Meta Account config to load destinations.'}
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                {filteredTargets.map(target => {
                                    const pageReadiness = target.readiness || {};
                                    const hasIg = !!target.instagramAccount;
                                    const igReadiness = hasIg ? target.instagramAccount.readiness || {} : {};

                                    return (
                                        <div key={target.id} className="border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 rounded-xl space-y-3">
                                            {/* Facebook Page section */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        id={`page-${target.id}`}
                                                        checked={!!selectedPages[target.id]}
                                                        onChange={() => togglePageSelection(target.id)}
                                                        disabled={!pageReadiness.canPublish}
                                                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                    />
                                                    
                                                    {target.picture ? (
                                                        <img src={target.picture} alt="" className="w-8 h-8 rounded-full border border-[var(--border-color)] object-cover" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                                                            {target.name.charAt(0)}
                                                        </div>
                                                    )}

                                                    <div>
                                                        <div className="font-semibold text-xs flex items-center gap-1.5">
                                                            <Facebook className="w-3.5 h-3.5 text-blue-600" />
                                                            {target.name}
                                                        </div>
                                                        <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                                                            {target.category} • {target.fanCount?.toLocaleString()} followers
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* FB Readiness Badge */}
                                                {!pageReadiness.canPublish && (
                                                    <span 
                                                        className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-bold uppercase cursor-help border border-red-500/20"
                                                        title={pageReadiness.reason || 'Missing permissions'}
                                                    >
                                                        Blocked
                                                    </span>
                                                )}
                                            </div>

                                            {/* Connected Instagram Account section */}
                                            {hasIg && (
                                                <div className="ml-7 border-t border-[var(--border-color)] pt-3 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            id={`ig-${target.instagramAccount.id}`}
                                                            checked={!!selectedInstagrams[target.instagramAccount.id]}
                                                            onChange={() => toggleInstagramSelection(target.instagramAccount.id)}
                                                            disabled={!igReadiness.canPublish}
                                                            className="rounded text-pink-600 focus:ring-pink-500 w-4 h-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                        />
                                                        
                                                        {target.instagramAccount.profilePictureUrl ? (
                                                            <img src={target.instagramAccount.profilePictureUrl} alt="" className="w-6 h-6 rounded-full border border-[var(--border-color)] object-cover" />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold text-[10px]">
                                                                IG
                                                            </div>
                                                        )}

                                                        <div>
                                                            <div className="text-xs font-semibold flex items-center gap-1.5">
                                                                <Instagram className="w-3.5 h-3.5 text-pink-600" />
                                                                @{target.instagramAccount.username}
                                                            </div>
                                                            <div className="text-[10px] text-[var(--text-secondary)]">
                                                                {target.instagramAccount.followersCount?.toLocaleString()} followers
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* IG Readiness Badge */}
                                                    {!igReadiness.canPublish && (
                                                        <span 
                                                            className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-bold uppercase cursor-help border border-red-500/20"
                                                            title={igReadiness.reason || 'Missing permissions'}
                                                        >
                                                            Blocked
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Content Editor Panel */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 space-y-5 shadow-xs">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] pb-2 border-b border-[var(--border-color)]">Post Editor</h2>
                        
                        {/* Caption Editor */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Caption Copy</label>
                            <textarea
                                rows="5"
                                placeholder="Type what you want to publish. Primary text appears as page feeds or caption..."
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-[var(--text-primary)]"
                            ></textarea>
                        </div>

                        {/* Media library asset selector */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">Creative Image Asset</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowMediaSelector(true)}
                                    className="flex-1 flex items-center justify-between bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all font-semibold"
                                >
                                    <span className="truncate">{selectedAsset ? selectedAsset.asset_name : 'Select Image from Media Library...'}</span>
                                    <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
                                </button>
                                
                                {selectedAsset && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedAsset(null)}
                                        className="px-3 border border-[var(--border-color)] hover:bg-red-500/10 text-red-500 rounded-xl text-xs font-bold"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Post Submission Buttons */}
                        <div className="flex justify-end pt-3">
                            <button
                                type="button"
                                onClick={handleTriggerPublish}
                                disabled={selectedTargetsCount === 0}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/10 transition-all hover:scale-102 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {isPublishing ? 'Queueing Post...' : `Publish to ${selectedTargetsCount} Destination${selectedTargetsCount !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Previews (5 columns) */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* Preview controls */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 flex items-center justify-between shadow-xs">
                        <div className="flex rounded-lg p-0.5 bg-[var(--bg-primary)] border border-[var(--border-color)]">
                            <button
                                onClick={() => setPreviewPlatform('facebook')}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                    previewPlatform === 'facebook'
                                        ? 'bg-[var(--bg-secondary)] text-blue-600 shadow-xs'
                                        : 'text-slate-400 hover:text-[var(--text-primary)]'
                                }`}
                            >
                                Facebook
                            </button>
                            <button
                                onClick={() => setPreviewPlatform('instagram')}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                    previewPlatform === 'instagram'
                                        ? 'bg-[var(--bg-secondary)] text-pink-600 shadow-xs'
                                        : 'text-slate-400 hover:text-[var(--text-primary)]'
                                }`}
                            >
                                Instagram
                            </button>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPreviewDevice('DESKTOP')}
                                className={`p-1.5 rounded-lg border transition-all ${
                                    previewDevice === 'DESKTOP'
                                        ? 'border-blue-500 bg-blue-500/5 text-blue-500'
                                        : 'border-[var(--border-color)] text-slate-400'
                                }`}
                                title="Desktop Preview"
                            >
                                <Monitor className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setPreviewDevice('MOBILE')}
                                className={`p-1.5 rounded-lg border transition-all ${
                                    previewDevice === 'MOBILE'
                                        ? 'border-blue-500 bg-blue-500/5 text-blue-500'
                                        : 'border-[var(--border-color)] text-slate-400'
                                }`}
                                title="Mobile Preview"
                            >
                                <Smartphone className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Preview frame mockup */}
                    <div className="flex items-center justify-center p-6 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl overflow-hidden min-h-[450px]">
                        <div className={`transition-all duration-300 w-full ${previewDevice === 'MOBILE' ? 'max-w-[340px]' : 'max-w-full'}`}>
                            {previewPlatform === 'facebook' ? (
                                // Facebook Mockup
                                <div className="bg-white dark:bg-[#242526] rounded-xl border border-slate-200 dark:border-white/5 shadow-md overflow-hidden text-slate-800 dark:text-slate-200 font-sans text-xs">
                                    <div className="p-4 pb-2 flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">F</div>
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">White Force Page</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">Sponsored • 🌐</div>
                                        </div>
                                    </div>
                                    <div className="px-4 py-2 break-words whitespace-pre-line leading-relaxed">
                                        {caption || 'Your caption copy will appear here...'}
                                    </div>
                                    {previewImage && (
                                        <div className="w-full aspect-[4/3] bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden border-y border-slate-100 dark:border-white/5">
                                            <img src={previewImage} alt="Facebook post" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="px-4 py-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#242526] font-semibold">
                                        <button className="flex items-center gap-1.5 hover:text-blue-500"><Heart className="w-4 h-4" /> Like</button>
                                        <button className="flex items-center gap-1.5 hover:text-blue-500"><MessageSquare className="w-4 h-4" /> Comment</button>
                                        <button className="flex items-center gap-1.5 hover:text-blue-500"><Share2 className="w-4 h-4" /> Share</button>
                                    </div>
                                </div>
                            ) : (
                                // Instagram Mockup
                                <div className="bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-white/5 shadow-md overflow-hidden text-slate-800 dark:text-slate-200 font-sans text-xs">
                                    <div className="p-3 pb-2 flex items-center gap-2 border-b border-slate-100 dark:border-white/5">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-500 p-0.5">
                                            <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center text-[10px] font-bold">IG</div>
                                        </div>
                                        <div className="font-bold text-slate-900 dark:text-white">@whiteforce_insta</div>
                                    </div>
                                    
                                    <div className="w-full aspect-square bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                                        {previewImage ? (
                                            <img src={previewImage} alt="Instagram post" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center text-slate-400 p-6">
                                                <Instagram className="w-12 h-12 mx-auto opacity-20 mb-2" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest block">Media required for Instagram</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3 space-y-2 bg-white dark:bg-[#121212]">
                                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                                            <div className="flex items-center gap-3">
                                                <Heart className="w-5 h-5 cursor-pointer hover:text-red-500 transition-colors" />
                                                <MessageSquare className="w-5 h-5 cursor-pointer hover:text-blue-500 transition-colors" />
                                                <Share2 className="w-5 h-5 cursor-pointer hover:text-emerald-500 transition-colors" />
                                            </div>
                                        </div>
                                        <div className="leading-relaxed">
                                            <span className="font-bold text-slate-900 dark:text-white mr-1.5">whiteforce_insta</span>
                                            <span className="break-words whitespace-pre-line text-xs">{caption || 'Post caption goes here...'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Media library popup modal */}
            {showMediaSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="w-full max-w-5xl bg-white dark:bg-[#0f172a] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-bold">Select Media Library Image</h3>
                                <p className="text-[10px] opacity-75 mt-0.5">Pick an image from your saved assets to include in the Meta post</p>
                            </div>
                            <button onClick={() => setShowMediaSelector(false)} className="text-white hover:opacity-75 font-bold text-lg">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950/20">
                            <MediaLibrary onSelectAsset={handleSelectAsset} selectMode={true} />
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-[#1e293b] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-amber-500">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">Confirm Publishing Campaign</h3>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            You are about to launch a publishing campaign targeting <span className="font-bold text-slate-900 dark:text-white">{selectedTargetsCount}</span> destination(s). This operation will dispatch immediate Graph API publishing actions.
                        </p>
                        
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-secondary)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executePublish}
                                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/10"
                            >
                                Confirm & Publish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SSE & Polling Progress Overlay Modal */}
            {showProgressModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e293b] border border-[var(--border-color)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                {isPublishing ? (
                                    <Loader className="w-4 h-4 text-blue-500 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                )}
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                    {isPublishing ? 'Publishing Campaign Active' : 'Publishing Campaign Finished'}
                                </h3>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {errorMessage && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-lg font-medium">
                                    {errorMessage}
                                </div>
                            )}

                            <div className="space-y-2.5">
                                {Object.keys(progressStatus).map(id => {
                                    const target = progressStatus[id];
                                    return (
                                        <div key={id} className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-primary)] text-xs">
                                            <div className="flex items-center gap-2">
                                                {target.platform === 'facebook' ? (
                                                    <Facebook className="w-4 h-4 text-blue-600 shrink-0" />
                                                ) : (
                                                    <Instagram className="w-4 h-4 text-pink-600 shrink-0" />
                                                )}
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white">{target.targetName}</div>
                                                    {target.status === 'published' && target.permalink && (
                                                        <a 
                                                            href={target.permalink} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] text-blue-500 hover:underline mt-0.5 block"
                                                        >
                                                            View Live Post
                                                        </a>
                                                    )}
                                                    {target.status === 'failed' && target.errorMessage && (
                                                        <div className="text-[10px] text-red-500 font-medium mt-0.5 line-clamp-1" title={target.errorMessage}>
                                                            Error: {target.errorMessage}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            <div>
                                                {target.status === 'queued' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase">Queued</span>
                                                )}
                                                {target.status === 'processing' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 uppercase animate-pulse">Publishing</span>
                                                )}
                                                {target.status === 'published' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase">Success</span>
                                                )}
                                                {target.status === 'failed' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 uppercase">Failed</span>
                                                )}
                                                {target.status === 'quota_exhausted' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 uppercase">Quota Exceeded</span>
                                                )}
                                                {target.status === 'outcome_unknown' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 uppercase">Timeout</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)] flex justify-end">
                            <button
                                onClick={handleCloseProgress}
                                disabled={isPublishing}
                                className="px-5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-850 dark:bg-white dark:text-slate-900 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                Close & Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MetaPosting;
