import React, { useState, useEffect } from 'react';
import { 
    FolderOpen, Upload, Search, RefreshCw, ChevronRight,
    ChevronLeft, Database, Grid, List 
} from 'lucide-react';
import MediaCard from './MediaCard';
import MediaUploadModal from './MediaUploadModal';
import MediaPreviewModal from './MediaPreviewModal';

const MediaLibrary = ({ onSelectAsset, selectMode = false }) => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalAssets, setTotalAssets] = useState(0);

    // Modal control
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [previewAsset, setPreviewAsset] = useState(null);

    useEffect(() => {
        fetchMediaAssets();
    }, [activeTab, page, sortBy]);

    const fetchMediaAssets = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            
            // Build filter queries
            let queryParams = `page=${page}&limit=12&category=${activeTab}`;
            if (searchQuery.trim()) {
                queryParams += `&search=${encodeURIComponent(searchQuery.trim())}`;
            }

            const response = await fetch(`/api/media?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to fetch media assets.');
            }

            let sorted = result.assets || [];
            if (sortBy === 'newest') {
                sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (sortBy === 'oldest') {
                sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            } else if (sortBy === 'size') {
                sorted.sort((a, b) => b.file_size - a.file_size);
            } else if (sortBy === 'popular') {
                sorted.sort((a, b) => (b.used_count || 0) - (a.used_count || 0));
            }

            setAssets(sorted);
            setTotalPages(result.pagination?.totalPages || 1);
            setTotalAssets(result.pagination?.total || 0);
        } catch (err) {
            console.error('Media fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAsset = async (id) => {
        if (!window.confirm('Are you sure you want to delete this media asset? This action will hide it from the library.')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/media/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.message || 'Delete failed.');

            fetchMediaAssets();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchMediaAssets();
    };

    const tabs = [
        { id: 'ALL', label: 'All Files' },
        { id: 'IMAGE', label: 'Images' },
        { id: 'VIDEO', label: 'Videos' },
        { id: 'DOCUMENT', label: 'Documents' },
        { id: 'LOGO', label: 'Logos' },
        { id: 'BRAND', label: 'Brand Assets' },
        { id: 'OTHER', label: 'Other' }
    ];

    return (
        <div className={`space-y-8 ${selectMode ? 'p-0' : 'p-8'}`}>
            {/* Header Toolbar */}
            {!selectMode && (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            <span>Assets</span>
                            <ChevronRight className="w-2.5 h-2.5" />
                            <span className="text-blue-500">Media Library</span>
                        </div>
                        <h2 className="text-xl font-bold flex items-center text-slate-900 dark:text-white">
                            <FolderOpen className="w-5 h-5 mr-2 text-blue-500" />
                            Enterprise Media Library
                        </h2>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={fetchMediaAssets}
                            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl transition-all"
                            title="Refresh Assets List"
                        >
                            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        <button
                            onClick={() => setIsUploadOpen(true)}
                            className="flex items-center space-x-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/10 transition-all hover:scale-105"
                        >
                            <Upload className="w-4 h-4 mr-1" />
                            <span>Upload Asset</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Filter and search bar */}
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Search Form */}
                    <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search assets by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-white/5 rounded-xl pl-11 pr-4 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-slate-800 dark:bg-white/5 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-all"
                        >
                            Search
                        </button>
                    </form>

                    {/* Sorters */}
                    <div className="flex items-center gap-3">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                        >
                            <option value="newest">Sort: Newest First</option>
                            <option value="oldest">Sort: Oldest First</option>
                            <option value="size">Sort: File Size</option>
                            <option value="popular">Sort: Most Popular</option>
                        </select>

                        {selectMode && (
                            <button
                                onClick={() => setIsUploadOpen(true)}
                                className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg"
                            >
                                <Upload className="w-4 h-4 mr-1" />
                                <span>Upload</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab select bar */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-t border-slate-100 dark:border-white/5 pt-3 scrollbar-thin">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                activeTab === tab.id
                                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Assets Inventory Grid */}
            {loading ? (
                <div className="text-center py-24">
                    <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-slate-400 text-xs font-semibold animate-pulse">Scanning media files...</p>
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-8 rounded-3xl text-center">
                    <p className="font-bold text-sm">Error Loading Assets</p>
                    <p className="text-xs mt-1">{error}</p>
                </div>
            ) : assets.length === 0 ? (
                <div className="bg-white dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-[2rem] p-20 text-center shadow-inner">
                    <Database className="w-12 h-12 text-slate-300 dark:text-white/10 mx-auto mb-4" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Assets Found</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        This category has no files yet. Click the "Upload Asset" button to import your files.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {assets.map((asset) => (
                            <MediaCard
                                key={asset.id}
                                asset={asset}
                                onPreview={setPreviewAsset}
                                onDelete={handleDeleteAsset}
                                onUse={onSelectAsset}
                            />
                        ))}
                    </div>

                    {/* Pagination Navigation */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-6">
                            <span className="text-[10px] text-slate-400 font-bold">
                                SHOWING {assets.length} OF {totalAssets} ASSETS
                            </span>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-4">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            <MediaUploadModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onUploadSuccess={() => fetchMediaAssets()}
            />

            <MediaPreviewModal
                asset={previewAsset}
                isOpen={!!previewAsset}
                onClose={() => setPreviewAsset(null)}
            />
        </div>
    );
};

export default MediaLibrary;
