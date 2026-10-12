import React from 'react';
import { X, FileText, Download, AlertTriangle } from 'lucide-react';

// Presentational-only badge styling per asset type — mirrors the same semantic
// colors used elsewhere in the Media Library (blue/purple/emerald/slate)
const TYPE_BADGE_STYLES = {
    IMAGE: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    LOGO: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    BRAND: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    VIDEO: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    DOCUMENT: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

const MediaPreviewModal = ({ asset, isOpen, onClose }) => {
    if (!isOpen || !asset) return null;

    const previewUrl = `/api/media/${asset.uuid}/preview`;
    const downloadUrl = `/api/media/${asset.id}/download`;
    const typeBadgeClasses = TYPE_BADGE_STYLES[asset.asset_type] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';

    return (
        <div className="wf-preview-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Fonts, scoped to this modal only */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
                href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
                rel="stylesheet"
            />
            <style>{`
                @media screen {
                    .wf-preview-modal,
                    .wf-preview-modal button {
                        font-family: 'Poppins', sans-serif;
                    }
                }
                .wf-preview-modal .wf-mono {
                    font-family: 'JetBrains Mono', monospace;
                }
            `}</style>

            <div className="w-full max-w-4xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border ${typeBadgeClasses}`}>
                                {asset.asset_type}
                            </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[400px]">
                            {asset.asset_name}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{asset.original_filename}</p>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                        {/* Download link */}
                        <a
                            href={downloadUrl}
                            download={asset.original_filename}
                            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative flex-1 bg-slate-50 dark:bg-slate-950/40 p-8 flex items-center justify-center overflow-auto min-h-[400px]">
                    <div className="absolute inset-0 opacity-60 dark:opacity-100 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(100,116,139,0.08) 1px, transparent 0)', backgroundSize: '22px 22px' }}></div>
                    <div className="relative">
                        {asset.asset_type === 'IMAGE' || asset.asset_type === 'LOGO' || asset.asset_type === 'BRAND' ? (
                            <img
                                src={previewUrl}
                                alt={asset.asset_name}
                                className="max-h-[60vh] max-w-full object-contain rounded-2xl shadow-lg border border-slate-200/20"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://placehold.co/800x600/1e293b/ffffff?text=Image+Could+Not+Be+Loaded';
                                }}
                            />
                        ) : asset.asset_type === 'VIDEO' ? (
                            <video
                                src={previewUrl}
                                controls
                                className="max-h-[60vh] max-w-full rounded-2xl shadow-lg"
                            />
                        ) : asset.asset_type === 'DOCUMENT' ? (
                            <embed
                                src={previewUrl}
                                type="application/pdf"
                                className="w-full h-[60vh] rounded-2xl border border-slate-200 dark:border-white/5"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl max-w-md text-center shadow-sm">
                                <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                                    <FileText className="w-9 h-9 text-slate-300 dark:text-white/20" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No In-Browser Preview Available</h4>
                                <p className="text-xs text-slate-400 mt-2">
                                    We don't support online viewing for this format ({asset.extension}). Please click the button below to download the file directly.
                                </p>
                                <a
                                    href={downloadUrl}
                                    download={asset.original_filename}
                                    className="mt-6 flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Download File</span>
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Metadata */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Asset ID</span>
                        <span className="wf-mono text-slate-700 dark:text-slate-300 text-[10px] break-all">{asset.id}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5">MIME Type</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{asset.mime_type}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Storage Provider</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{asset.storage_provider}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5">LinkedIn URN</span>
                        <span className="wf-mono text-slate-700 dark:text-slate-300 text-[9px] truncate block" title={asset.linkedin_asset_urn || 'Not Registered'}>
                            {asset.linkedin_asset_urn || 'Not Registered'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaPreviewModal;