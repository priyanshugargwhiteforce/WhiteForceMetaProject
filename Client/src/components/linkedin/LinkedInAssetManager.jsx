import React, { useState, useEffect } from 'react';
import { 
    Briefcase, RefreshCw, ChevronRight, Globe, Database, Copy, 
    Check, AlertCircle, CheckCircle, ShieldAlert, Sparkles, Upload 
} from 'lucide-react';
import CustomSelect from '../CustomSelect';

const LinkedInAssetManager = () => {
    const [adAccounts, setAdAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    
    // Library Media assets
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Actively registering ID tracker
    const [registeringId, setRegisteringId] = useState(null);
    const [pollingId, setPollingId] = useState(null);

    // Global notifications
    const [successMsg, setSuccessMsg] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    // Copy states
    const [copiedUrnId, setCopiedUrnId] = useState(null);

    useEffect(() => {
        fetchAdAccounts();
    }, []);

    useEffect(() => {
        if (selectedAccountId) {
            fetchAssets();
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

    const fetchAssets = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            // Fetch all library assets (and show their linkedin URN states)
            const response = await fetch(`/api/media?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Failed to fetch media assets');

            setAssets(result.assets || []);
        } catch (err) {
            console.error('Fetch Assets Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterAsset = async (mediaLibraryId) => {
        setRegisteringId(mediaLibraryId);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/linkedin/assets/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    mediaLibraryId,
                    accountId: selectedAccountId
                })
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.message || 'LinkedIn asset registration failed.');
            }

            setSuccessMsg(
                result.duplicate 
                    ? 'Asset was already registered on LinkedIn. Database updated.' 
                    : 'Asset registered and uploaded to LinkedIn successfully!'
            );
            setTimeout(() => setSuccessMsg(null), 6000);
            
            // Refresh list
            fetchAssets();

        } catch (err) {
            console.error('LinkedIn Asset Register error:', err);
            setErrorMsg(err.message);
        } finally {
            setRegisteringId(null);
        }
    };

    const handlePollStatus = async (mediaLibraryId) => {
        setPollingId(mediaLibraryId);
        setErrorMsg(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/linkedin/assets/status/${mediaLibraryId}?accountId=${selectedAccountId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.message || 'Status query failed.');

            setSuccessMsg(`LinkedIn asset status checked: ${result.status}`);
            setTimeout(() => setSuccessMsg(null), 4000);
            
            // Refresh list
            fetchAssets();
        } catch (err) {
            console.error('Status check error:', err);
            setErrorMsg(err.message);
        } finally {
            setPollingId(null);
        }
    };

    const handleCopyUrn = (urn, id) => {
        navigator.clipboard.writeText(urn);
        setCopiedUrnId(id);
        setTimeout(() => setCopiedUrnId(null), 2000);
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header toolbar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        <span>LinkedIn Ads</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                        <span className="text-blue-500">Asset Manager</span>
                    </div>
                    <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
                        <Briefcase className="w-5 h-5 mr-2 text-blue-500" />
                        LinkedIn Asset Manager
                    </h2>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={fetchAssets}
                        disabled={loading}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl transition-all"
                        title="Refresh Assets"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Connected accounts select box */}
                    <CustomSelect
                        value={selectedAccountId}
                        onChange={setSelectedAccountId}
                        options={adAccounts.map(acc => ({ value: acc.id, label: acc.name }))}
                        className="min-w-[200px] rounded-2xl px-4 py-2.5 text-sm"
                    />
                </div>
            </div>

            {/* Global Notifications */}
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

            {/* Inventory table */}
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-white/5">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">Assets Register Console</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Select an uploaded Media Library asset below and register it on LinkedIn before building creatives.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Info</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">File Details</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">LinkedIn URN</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-20">
                                        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                                        <p className="text-slate-400 text-xs font-semibold animate-pulse">Scanning media library assets...</p>
                                    </td>
                                </tr>
                            ) : assets.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-20">
                                        <Database className="w-12 h-12 text-slate-300 dark:text-white/10 mx-auto mb-3" />
                                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Media Library Empty</h4>
                                        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                                            Please go to the global Media Library tab to upload image/video assets first.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                assets.map((asset) => {
                                    const isRegInProgress = registeringId === asset.id;
                                    const isPollInProgress = pollingId === asset.id;
                                    const isRegistered = !!asset.linkedin_asset_urn;

                                    return (
                                        <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.005] transition-colors">
                                            {/* Preview & Name */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                        {asset.asset_type === 'IMAGE' || asset.asset_type === 'LOGO' || asset.asset_type === 'BRAND' ? (
                                                            <img src={`/api/media/${asset.uuid}/preview`} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="font-bold text-[9px] text-slate-400 uppercase">{asset.extension}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-white">{asset.asset_name}</div>
                                                        <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[200px]">{asset.original_filename}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category & Size */}
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-700 dark:text-slate-300">{asset.asset_type}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{(asset.file_size / (1024 * 1024)).toFixed(1)} MB</div>
                                            </td>

                                            {/* URN Display */}
                                            <td className="px-6 py-4">
                                                {isRegistered ? (
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-mono text-[9px] text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md max-w-[200px] truncate block" title={asset.linkedin_asset_urn}>
                                                            {asset.linkedin_asset_urn}
                                                        </span>
                                                        <button
                                                            onClick={() => handleCopyUrn(asset.linkedin_asset_urn, asset.id)}
                                                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                                                            title="Copy URN"
                                                        >
                                                            {copiedUrnId === asset.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 font-semibold italic">Not Connected</span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${
                                                    asset.processing_status === 'AVAILABLE'
                                                        ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                                                        : asset.processing_status === 'FAILED'
                                                            ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                                                            : 'text-amber-500 bg-amber-500/10 border-amber-500/20 animate-pulse'
                                                }`}>
                                                    {asset.processing_status}
                                                </span>
                                            </td>

                                            {/* Trigger actions */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {!isRegistered ? (
                                                        <button
                                                            disabled={isRegInProgress || !selectedAccountId}
                                                            onClick={() => handleRegisterAsset(asset.id)}
                                                            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold text-[10px] transition-all disabled:opacity-40"
                                                        >
                                                            {isRegInProgress ? 'Registering...' : 'Register Asset'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled={isPollInProgress || asset.processing_status === 'AVAILABLE'}
                                                            onClick={() => handlePollStatus(asset.id)}
                                                            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-[10px] transition-all disabled:opacity-40"
                                                        >
                                                            {isPollInProgress ? 'Checking...' : 'Check Status'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LinkedInAssetManager;
