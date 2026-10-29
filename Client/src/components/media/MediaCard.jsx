import React from 'react';
import {
    Image, Film, FileText, Globe, Trash2, Eye,
    Copy, Check, RefreshCw, AlertTriangle
} from 'lucide-react';

const MediaCard = ({ asset, onPreview, onDelete, onUse }) => {
    const [copiedId, setCopiedId] = React.useState(false);
    const [copiedUrn, setCopiedUrn] = React.useState(false);
    const [copiedUrl, setCopiedUrl] = React.useState(false);

    const handleCopyId = () => {
        navigator.clipboard.writeText(asset.id);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    const handleCopyUrn = () => {
        if (asset.linkedin_asset_urn) {
            navigator.clipboard.writeText(asset.linkedin_asset_urn);
            setCopiedUrn(true);
            setTimeout(() => setCopiedUrn(false), 2000);
        }
    };

    const handleCopyUrl = () => {
        const fullUrl = `${window.location.protocol}//${window.location.host}/api/media/${asset.uuid}/preview`;
        navigator.clipboard.writeText(fullUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const getIcon = (sizeClass = 'w-5 h-5') => {
        switch (asset.asset_type) {
            case 'IMAGE':
            case 'LOGO':
            case 'BRAND':
                return <Image className={`${sizeClass} text-blue-500`} />;
            case 'VIDEO':
                return <Film className={`${sizeClass} text-purple-500`} />;
            case 'DOCUMENT':
                return <FileText className={`${sizeClass} text-emerald-500`} />;
            default:
                return <Globe className={`${sizeClass} text-slate-500`} />;
        }
    };

    // Presentational-only chip colors, keyed off the exact same asset_type cases as getIcon()
    const getChipClasses = () => {
        switch (asset.asset_type) {
            case 'IMAGE':
            case 'LOGO':
            case 'BRAND':
                return 'bg-blue-500/10 dark:bg-blue-500/15';
            case 'VIDEO':
                return 'bg-purple-500/10 dark:bg-purple-500/15';
            case 'DOCUMENT':
                return 'bg-emerald-500/10 dark:bg-emerald-500/15';
            default:
                return 'bg-slate-500/10 dark:bg-white/10';
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const dm = 1;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    // Authenticated preview endpoint path
    const previewUrl = `/api/media/${asset.uuid}/preview`;

    return (
        <div className="wf-media-card group bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-none dark:hover:ring-1 dark:hover:ring-blue-500/20 hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
            {/* Fonts, scoped to this card only */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
                href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
                rel="stylesheet"
            />
            <style>{`
                @media screen {
                    .wf-media-card,
                    .wf-media-card button {
                        font-family: 'Poppins', sans-serif;
                    }
                }
                .wf-media-card .wf-mono {
                    font-family: 'JetBrains Mono', monospace;
                }
            `}</style>

            {/* Visual Preview */}
            <div className="relative aspect-[16/10] bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-white/5">
                {asset.asset_type === 'IMAGE' || asset.asset_type === 'LOGO' || asset.asset_type === 'BRAND' ? (
                    <img
                        src={previewUrl}
                        alt={asset.asset_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/400x250/1e293b/ffffff?text=Image+Unavailable';
                        }}
                    />
                ) : asset.asset_type === 'VIDEO' ? (
                    <video
                        src={previewUrl}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-slate-400">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-2xl mb-2 ${getChipClasses()}`}>
                            {getIcon()}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{asset.extension} Document</span>
                    </div>
                )}

                {/* Status Badges */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border backdrop-blur-sm ${
                        asset.processing_status === 'AVAILABLE'
                            ? 'text-green-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : asset.processing_status === 'FAILED'
                                ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
                                : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
                    }`}>
                        {asset.processing_status === 'PROCESSING' ? (
                            <RefreshCw className="w-2 h-2 animate-spin" />
                        ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${
                                asset.processing_status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}></span>
                        )}
                        {asset.processing_status}
                    </span>
                </div>

                {/* Action Hover Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 backdrop-blur-xs">
                    <button
                        onClick={() => onPreview(asset)}
                        className="p-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-full font-bold shadow-lg transform translate-y-3 group-hover:translate-y-0 transition-all duration-300"
                        title="Quick View"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    {onUse && asset.processing_status === 'AVAILABLE' && (
                        <button
                            onClick={() => onUse(asset)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full font-bold text-xs shadow-lg shadow-blue-500/30 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300"
                        >
                            Select Asset
                        </button>
                    )}
                </div>
            </div>

            {/* Info details */}
            <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                <div>
                    <div className="flex items-center space-x-1.5 mb-1.5">
                        <span className={`flex items-center justify-center w-5 h-5 rounded-md ${getChipClasses()}`}>
                            {getIcon('w-3 h-3')}
                        </span>
                        <span className="text-[9px] font-semibold text-blue-600 dark:text-slate-500 pTagFont">{asset.asset_type}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1 pTagFont" title={asset.asset_name}>
                        {asset.asset_name}
                    </h4>
                    <p className="text-[9.5px] text-slate-800 pTagFont font-medium mt-0.5 truncate">{asset.original_filename}</p>
                </div>

                {/* Meta Attributes Inline */}
                <div className="flex justify-between items-center text-[10px] font-medium text-blue-700 border-t border-slate-100 dark:border-white/5 pt-2 pTagFont">
                    <span>File Size : <strong className="wf-mono font-bold text-slate-700 dark:text-slate-300">{formatBytes(asset.file_size)}</strong></span>
                    <span>Used : <strong className="wf-mono font-bold text-slate-700 dark:text-slate-300">{asset.used_count || 0}</strong><span> times</span></span>
                </div>

                {/* Copiers and delete */}
                <div className="border-t border-slate-100 dark:border-white/5 pt-2 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                        {/* Copy ID */}
                        <button
                            onClick={handleCopyId}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-[8.5px] font-bold text-slate-600 dark:text-slate-300 transition-all border border-slate-100 dark:border-transparent"
                            title="Copy File ID"
                        >
                            {copiedId ? <Check className="w-2 h-2 text-emerald-500" /> : <Copy className="w-2 h-2" />}
                            <span>ID</span>
                        </button>

                        {/* Copy URN */}
                        <button
                            onClick={handleCopyUrn}
                            disabled={!asset.linkedin_asset_urn}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-bold transition-all border ${
                                asset.linkedin_asset_urn
                                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100/30 dark:border-transparent hover:bg-blue-100 dark:hover:bg-blue-500/20'
                                    : 'bg-slate-100/50 dark:bg-white/5 text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed'
                            }`}
                            title={asset.linkedin_asset_urn ? 'Copy LinkedIn Asset URN' : 'Asset not registered on LinkedIn'}
                        >
                            {copiedUrn ? <Check className="w-2 h-2 text-emerald-500" /> : <Copy className="w-2 h-2" />}
                            <span>URN</span>
                        </button>

                        {/* Copy URL */}
                        <button
                            onClick={handleCopyUrl}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded text-[8.5px] font-bold text-indigo-600 dark:text-indigo-400 transition-all border border-indigo-100/30 dark:border-transparent"
                            title="Copy Shareable Preview URL"
                        >
                            {copiedUrl ? <Check className="w-2 h-2 text-emerald-500" /> : <Copy className="w-2 h-2" />}
                            <span>URL</span>
                        </button>
                    </div>

                    {onDelete && (
                        <button
                            onClick={() => onDelete(asset.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                            title="Delete Asset"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MediaCard;