import React from 'react';
import { X, FileText, Download, AlertTriangle } from 'lucide-react';

const MediaPreviewModal = ({ asset, isOpen, onClose }) => {
    if (!isOpen || !asset) return null;

    const previewUrl = `/api/media/${asset.uuid}/preview`;
    const downloadUrl = `/api/media/${asset.id}/download`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[400px]">
                            Preview: {asset.asset_name}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">{asset.original_filename}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Download link */}
                        <a
                            href={downloadUrl}
                            download={asset.original_filename}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                        </a>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-all font-bold"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-950/40 p-8 flex items-center justify-center overflow-auto min-h-[400px]">
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
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-2xl max-w-md text-center">
                            <FileText className="w-16 h-16 text-slate-300 dark:text-white/10 mb-4" />
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No In-Browser Preview Available</h4>
                            <p className="text-xs text-slate-400 mt-2">
                                We don't support online viewing for this format ({asset.extension}). Please click the button below to download the file directly.
                            </p>
                            <a
                                href={downloadUrl}
                                download={asset.original_filename}
                                className="mt-6 flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-lg transition-all"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download File</span>
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer Metadata */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] grid grid-cols-4 gap-4 text-xs">
                    <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">Asset ID</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300 text-[10px] break-all">{asset.id}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">MIME Type</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{asset.mime_type}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">Storage Provider</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{asset.storage_provider}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">LinkedIn URN</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300 text-[9px] truncate block" title={asset.linkedin_asset_urn || 'Not Registered'}>
                            {asset.linkedin_asset_urn || 'Not Registered'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaPreviewModal;
