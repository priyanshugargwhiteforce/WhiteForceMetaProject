import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FileText, Plus, RefreshCw, ChevronRight, Database, 
    CheckCircle, ShieldAlert, Target, Globe, Copy, Check 
} from 'lucide-react';
import CustomSelect from '../CustomSelect';

const CreativeLibrary = () => {
    const navigate = useNavigate();
    const [adAccounts, setAdAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [creatives, setCreatives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [copiedUrnId, setCopiedUrnId] = useState(null);

    useEffect(() => {
        fetchAdAccounts();
    }, []);

    useEffect(() => {
        if (selectedAccountId) {
            fetchCreatives(selectedAccountId);
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

    const fetchCreatives = async (accountId) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/linkedin/creatives?accountId=${accountId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Failed to fetch creatives.');

            setCreatives(result.data || []);
        } catch (err) {
            console.error('Fetch Creatives Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
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
                        <span className="text-blue-500">Creative Library</span>
                    </div>
                    <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
                        <FileText className="w-5 h-5 mr-2 text-blue-500" />
                        LinkedIn Creative Inventory
                    </h2>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => selectedAccountId && fetchCreatives(selectedAccountId)}
                        disabled={loading}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl transition-all"
                        title="Refresh Creatives List"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Connected Account Select box */}
                    <CustomSelect
                        value={selectedAccountId}
                        onChange={setSelectedAccountId}
                        options={adAccounts.map(acc => ({ value: acc.id, label: acc.name }))}
                        className="min-w-[200px] rounded-2xl px-4 py-2.5 text-sm"
                    />

                    {/* Creative Builder route */}
                    <button
                        onClick={() => navigate('/linkedin-creatives/new')}
                        className="flex items-center space-x-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/10 transition-all hover:scale-105"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        <span>Build Creative</span>
                    </button>
                </div>
            </div>

            {/* Inventory table */}
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-white/5">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">Active Creatives Inventory</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Displays local drafts, queued uploads, and live ad shares registered on LinkedIn.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Creative Info</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Associated IDs</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Headline / Copy</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created / Modified</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-20">
                                        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                                        <p className="text-slate-400 text-xs font-semibold animate-pulse">Scanning database creatives...</p>
                                    </td>
                                </tr>
                            ) : creatives.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-20">
                                        <Database className="w-12 h-12 text-slate-300 dark:text-white/10 mx-auto mb-3" />
                                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Creative Inventory Empty</h4>
                                        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                                            Click the "Build Creative" button above to launch the designer console.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                creatives.map((creative) => {
                                    const isPublished = !!creative.creative_urn;
                                    const isDraft = creative.status === 'DRAFT';
                                    const isFailed = creative.status === 'FAILED';

                                    return (
                                        <tr key={creative.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.005] transition-colors">
                                            {/* Preview & Type */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                        {creative.preview_url ? (
                                                            <img src={creative.preview_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="font-bold text-[9px] text-slate-400 uppercase">{creative.creative_type}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-white">{creative.creative_type}</div>
                                                        <div className="text-[9px] text-slate-400 mt-0.5">{creative.original_filename || 'No Media'}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Associated Campaign URN keys */}
                                            <td className="px-6 py-4">
                                                <div>
                                                    <span className="text-slate-400">Campaign ID: </span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{creative.campaign_id}</span>
                                                </div>
                                                {isPublished ? (
                                                    <div className="mt-1 flex items-center space-x-1.5">
                                                        <span className="font-mono text-[9px] text-slate-400 truncate max-w-[150px] block" title={creative.creative_urn}>
                                                            {creative.creative_urn}
                                                        </span>
                                                        <button
                                                            onClick={() => handleCopyUrn(creative.creative_urn, creative.id)}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-400 hover:text-blue-500"
                                                        >
                                                            {copiedUrnId === creative.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] text-slate-400 font-semibold italic mt-0.5 block">Source: {creative.creation_source}</span>
                                                )}
                                            </td>

                                            {/* Headline content copy */}
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{creative.headline || 'No Headline'}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{creative.description || 'No Description'}</div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border ${
                                                    isDraft
                                                        ? 'text-slate-400 bg-slate-100 border-slate-200 dark:bg-white/5 dark:border-white/10'
                                                        : isFailed
                                                            ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                                                            : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                                                }`}>
                                                    {creative.status}
                                                </span>
                                                {isFailed && creative.last_publish_error && (
                                                    <div className="text-[8px] text-rose-400 max-w-[150px] truncate mt-1 mx-auto" title={creative.last_publish_error}>
                                                        {creative.last_publish_error}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Timestamp details */}
                                            <td className="px-6 py-4 text-slate-500">
                                                <div className="font-semibold">{new Date(creative.created_at).toLocaleDateString()}</div>
                                                <div className="text-[9px] text-slate-400 mt-0.5">{new Date(creative.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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

export default CreativeLibrary;
