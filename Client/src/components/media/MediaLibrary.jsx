import React, { useState, useEffect } from 'react';
import {
    FolderOpen, Upload, Search, RefreshCw, ChevronRight,
    ChevronLeft, Database, Grid, List, Image, Video, FileText, Tag, Palette
} from 'lucide-react';
import MediaCard from './MediaCard';
import MediaUploadModal from './MediaUploadModal';
import MediaPreviewModal from './MediaPreviewModal';

// Icon per category tab — purely presentational, keyed off the same tab ids used below
const TAB_ICONS = {
    ALL: Grid,
    IMAGE: Image,
    VIDEO: Video,
    DOCUMENT: FileText,
    LOGO: Tag,
    BRAND: Palette,
    OTHER: List,
};

// Human-readable label for the active sort, used by the stat strip below the hero
const SORT_LABELS = {
    newest: 'Newest First',
    oldest: 'Oldest First',
    size: 'File Size',
    popular: 'Most Popular',
};

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

    const activeTabLabel = tabs.find(t => t.id === activeTab)?.label || 'All Files';

    return (
        <div className={`media-shell ${!selectMode ? 'media-wash' : ''} space-y-6 ${selectMode ? 'p-0' : 'px-8'}`}>
            {/* Fonts + chrome polish, scoped to this page only */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
                href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap"
                rel="stylesheet"
            />
            <style>{`
                @media screen {
                    .media-shell,
                    .media-shell button,
                    .media-shell input,
                    .media-shell select {
                        font-family: 'Poppins', sans-serif;
                    }
                }
                .media-mono {
                    font-family: 'JetBrains Mono', monospace;
                }
                .media-wash {
                    background-image: radial-gradient(circle at 1px 1px, rgba(59,130,246,0.07) 1px, transparent 0);
                    background-size: 24px 24px;
                    // background-color: #fafbfd;
                    border-radius: 24px;
                }
                .dark .media-wash {
                    background-image: radial-gradient(circle at 1px 1px, rgba(99,102,241,0.09) 1px, transparent 0);
                    background-size: 24px 24px;
                    background-color: #0a0d16;
                }
                @keyframes mediaRise {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .media-fade {
                    animation: mediaRise 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both;
                }
                @media (prefers-reduced-motion: reduce) {
                    .media-fade {
                        animation: none;
                    }
                }
            `}</style>

            {!selectMode && (
                <>
                    {/* Gradient hero */}
                    <div className="media-fade relative mt-0 py-0 overflow-hidden rounded-2xl p-6 sm:p-7 shadow-xl shadow-blue-500/20 dark:shadow-none dark:ring-1 dark:ring-white/10" style={{ animationDelay: '0ms' }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600"></div>
                        <div className="absolute inset-0 opacity-20" style={{backgroundSize: '16px 16px' }}></div>
                        <div className="absolute -right-10 -top-16 w-64 h-64 rounded-full bg-white/15 blur-3xl"></div>
                        <div className="absolute -left-10 -bottom-16 w-48 h-48 rounded-full bg-black/10 blur-3xl"></div>

                        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                            <div className="min-w-[60%]">
                                <div className="flex items-center space-x-1 text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">
                                    <span>Assets</span>
                                    <ChevronRight className="w-2.5 h-2.5" />
                                    <span className="text-yellow-500">Media Library</span>
                                </div>
                                <div className="flex items-start justify-start mt-3 w-full ">
                                     <span className="flex items-center justify-center w-11 h-11 mt-1 rounded-xl bg-white/15 ring-1 ring-white/20 mr-3 shrink-0 text-white">
                                        <FolderOpen className="w-5 h-5" />
                                    </span>
                                    <div className="flex flex-col items-start justify-end w-[80%]">
<h2 className="text-2xl sm:text-[26px] font-bold flex items-center text-white tracking-tight mb-0 jakartFont letterSpace">
                                   
                                    Enterprise Media Library
                                </h2>
                                <p className="text-white text-[13px] font-medium mt-1 max-w-md pTagFont min-w-full">
                                    One place for every image, video, document and brand asset your team uses.
                                </p>
                                    </div>

                                </div>
                                
                            </div>

                            <div className="flex items-center space-x-3 shrink-0">
                                <button
                                    onClick={fetchMediaAssets}
                                    className="p-3 bg-white/15 hover:bg-white/25 ring-1 ring-white/20 rounded-2xl transition-all"
                                    title="Refresh Assets List"
                                >
                                    <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                                </button>

                                <button
                                    onClick={() => setIsUploadOpen(true)}
                                    className="flex items-center space-x-1 px-5 py-3 bg-white hover:bg-slate-50 text-blue-600 rounded-2xl font-bold text-xs shadow-lg shadow-black/10 transition-all hover:scale-105"
                                >
                                    <Upload className="w-4 h-4 mr-1" />
                                    <span>Upload Asset</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stat strip */}
                    <div className="media-fade bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 dark:ring-1 dark:ring-blue-500/10 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '80ms' }}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-white/5">
                            <div className="p-4 sm:p-5">
                                <p className="text-[11px] font-semibold pTagFont text-blue-600 dark:text-slate-600 mb-1">Total Assets</p>
                                <p className="text-3xl font-semibold colorFill dark:text-white jakartFont">{totalAssets}</p>
                            </div>
                            <div className="p-4 sm:p-5">
                                <p className="text-[11px] font-semibold pTagFont text-blue-600 dark:text-slate-600 mb-1">On This Page</p>
                                <p className="text-3xl font-semibold colorFill dark:text-white jakartFont">{assets.length}</p>
                            </div>
                            <div className="p-4 sm:p-5">
                                <p className="text-[11px] font-semibold pTagFont text-blue-600 dark:text-slate-600 mb-1">Viewing</p>
                                <p className="text-[19px] font-semibold colorFill dark:text-black-600 truncate mt-1.5 jakartFont">{activeTabLabel}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Filter and search bar */}
            <div className="media-fade bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/5 space-y-3" style={{ animationDelay: '160ms' }}>
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
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500/40 transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-white/10 dark:to-white/5 hover:from-slate-900 hover:to-black dark:hover:from-white/15 dark:hover:to-white/10 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
                        >
                            Search
                        </button>
                    </form>

                    {/* Sorters */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-4 pr-9 py-2.5 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
                            >
                                <option value="newest">Sort: Newest First</option>
                                <option value="oldest">Sort: Oldest First</option>
                                <option value="size">Sort: File Size</option>
                                <option value="popular">Sort: Most Popular</option>
                            </select>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                        </div>

                        {selectMode && (
                            <button
                                onClick={() => setIsUploadOpen(true)}
                                className="flex items-center space-x-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
                            >
                                <Upload className="w-4 h-4 mr-1" />
                                <span>Upload</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab select bar */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-t border-slate-100 dark:border-white/5 pt-3 scrollbar-thin">
                    {tabs.map((tab) => {
                        const TabIcon = TAB_ICONS[tab.id] || Grid;
                        const isTabActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setPage(1);
                                }}
                                className={`flex items-center space-x-2 pl-2 pr-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-300 ${
                                    isTabActive
                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                                        : 'text-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <span className={`flex items-center justify-center w-6 h-6 rounded-lg transition-colors duration-300 ${isTabActive ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/5'}`}>
                                    <TabIcon className="w-3.5 h-3.5" />
                                </span>
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Assets Inventory Grid */}
            {loading ? (
                <div className="media-fade text-center py-24" style={{ animationDelay: '220ms' }}>
                    <div className="relative w-14 h-14 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl"></div>
                        <div className="relative w-14 h-14 border-4 border-blue-500/15 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold animate-pulse">Scanning media files...</p>
                </div>
            ) : error ? (
                <div className="media-fade bg-red-500/5 border border-red-500/20 rounded-3xl p-10 text-center" style={{ animationDelay: '220ms' }}>
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <Database className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="font-bold text-sm text-red-600 dark:text-red-400">Error Loading Assets</p>
                    <p className="text-xs mt-1 text-red-500/80 dark:text-red-400/70">{error}</p>
                </div>
            ) : assets.length === 0 ? (
                <div className="media-fade relative overflow-hidden bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-[2rem] p-16 sm:p-20 text-center" style={{ animationDelay: '220ms' }}>
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(59,130,246,0.09) 1px, transparent 0)', backgroundSize: '22px 22px' }}></div>
                    <div className="relative">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center mx-auto mb-5 ring-1 ring-blue-500/10">
                            <Database className="w-9 h-9 text-blue-400 dark:text-blue-400/70" />
                        </div>
                        <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">No Assets Found</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-sm mx-auto">
                            This category has no files yet. Use the upload button above to add your first one.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="media-fade space-y-6" style={{ animationDelay: '220ms' }}>
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
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                                SHOWING <span className="media-mono text-slate-600 dark:text-slate-300">{assets.length}</span> OF <span className="media-mono text-slate-600 dark:text-slate-300">{totalAssets}</span> ASSETS
                            </span>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="media-mono text-xs font-bold text-slate-700 dark:text-slate-300 px-4">
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