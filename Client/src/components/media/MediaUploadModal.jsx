import React, { useState, useRef } from 'react';
import { Upload, X, ShieldAlert, CheckCircle, File } from 'lucide-react';

const MediaUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [customName, setCustomName] = useState('');
    const [category, setCategory] = useState('IMAGE');
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => {
        setDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            selectFile(e.dataTransfer.files[0]);
        }
    };

    const selectFile = (selectedFile) => {
        setError(null);
        setSuccessMsg(null);
        // Extension check
        const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
        const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.pdf'];

        if (!allowedExts.includes(ext)) {
            setError(`Invalid file type: ${ext}. Supported: JPG, JPEG, PNG, WEBP, MP4, MOV, PDF`);
            return;
        }

        setFile(selectedFile);
        if (!customName) {
            // Remove extension for default display name
            const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'));
            setCustomName(baseName);
        }

        // Auto-assign category
        if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            setCategory('IMAGE');
        } else if (['.mp4', '.mov'].includes(ext)) {
            setCategory('VIDEO');
        } else if (ext === '.pdf') {
            setCategory('DOCUMENT');
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            selectFile(e.target.files[0]);
        }
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file to upload.');
            return;
        }

        setUploading(true);
        setError(null);
        setProgress(20);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', customName);
        formData.append('category', category);

        try {
            const token = localStorage.getItem('token');
            setProgress(50);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/media/upload', true);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            // XMLHttpRequest progress event mapping
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    setProgress(percent);
                }
            };

            xhr.onload = () => {
                const response = JSON.parse(xhr.responseText);
                if (xhr.status === 201) {
                    setProgress(100);
                    setSuccessMsg(
                        response.duplicate
                            ? 'Duplicate file detected! Returned existing library reference.'
                            : 'File uploaded and saved to Media Library successfully.'
                    );
                    setTimeout(() => {
                        onUploadSuccess(response.data);
                        setFile(null);
                        setCustomName('');
                        setCategory('IMAGE');
                        setSuccessMsg(null);
                        setUploading(false);
                        onClose();
                    }, 2000);
                } else {
                    setError(response.message || 'File upload failed.');
                    setUploading(false);
                }
            };

            xhr.onerror = () => {
                setError('Network connection error occurred.');
                setUploading(false);
            };

            xhr.send(formData);

        } catch (err) {
            console.error('File Upload Error:', err);
            setError(err.message || 'File upload failed.');
            setUploading(false);
        }
    };

    return (
        <div className="wf-upload-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-300">
            {/* Fonts, scoped to this modal only */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
                href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
                rel="stylesheet"
            />
            <style>{`
                @media screen {
                    .wf-upload-modal,
                    .wf-upload-modal button,
                    .wf-upload-modal input,
                    .wf-upload-modal select {
                        font-family: 'Poppins', sans-serif;
                    }
                }
            `}</style>

            <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="relative overflow-hidden px-8 py-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                    <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/15 blur-2xl"></div>
                    <div className="relative flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/20 shrink-0">
                                <Upload className="w-5 h-5" />
                            </span>
                            <div>
                                <h3 className="text-base font-bold leading-tight">Upload Media Asset</h3>
                                <p className="text-[10px] text-white/70 mt-0.5">Saves files to platform-independent library</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={uploading}
                            className="p-1.5 rounded-xl text-white hover:bg-white/15 transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleUploadSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-start space-x-2.5 text-xs font-bold">
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/15 shrink-0">
                                <ShieldAlert className="w-4 h-4" />
                            </span>
                            <span className="pt-1">{error}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl flex items-start space-x-2.5 text-xs font-bold">
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/15 shrink-0">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </span>
                            <span className="pt-1">{successMsg}</span>
                        </div>
                    )}

                    {/* Drag-and-drop zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current.click()}
                        className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                            dragging
                                ? 'border-blue-500 bg-blue-500/5 scale-[1.01]'
                                : file
                                    ? 'border-emerald-500 bg-emerald-500/5'
                                    : 'border-slate-300 dark:border-white/10 hover:border-blue-400 hover:bg-blue-500/[0.02]'
                        }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.pdf"
                        />
                        {file ? (
                            <div className="flex flex-col items-center text-center">
                                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 mb-3">
                                    <File className="w-8 h-8 text-emerald-500" />
                                </div>
                                <span className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1 max-w-[250px]">{file.name}</span>
                                <span className="text-[10px] text-slate-400 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center">
                                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/10 dark:to-indigo-500/5 mb-3 ring-1 ring-blue-500/10">
                                    <Upload className="w-7 h-7 text-blue-500 dark:text-blue-400" />
                                </div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Drag & Drop files here</span>
                                <span className="text-[10px] text-slate-400 mt-1">or click to browse local drive</span>
                                <span className="text-[8px] text-slate-500 dark:text-slate-400 mt-3 font-semibold uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">JPG, PNG, WEBP, MP4, MOV, PDF</span>
                            </div>
                        )}
                    </div>

                  
                    {file && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            {/* Asset Name */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asset Display Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter custom display name"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500/40 text-slate-800 dark:text-white transition-all"
                                />
                            </div>

                   
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asset Category</label>
                                <div className="relative">
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500/40 text-slate-800 dark:text-white cursor-pointer transition-all"
                                    >
                                        <option value="IMAGE">IMAGE (Feed Graphics / Creatives)</option>
                                        <option value="VIDEO">VIDEO (Short clips / Reels)</option>
                                        <option value="DOCUMENT">DOCUMENT (PDF Lead magnets)</option>
                                        <option value="LOGO">LOGO (Corporate Brand Logos)</option>
                                        <option value="BRAND">BRAND (Styleguides / Core Guides)</option>
                                        <option value="OTHER">OTHER (General Media Files)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                 
                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                <span>UPLOADING FILE...</span>
                                <span className="text-blue-500">{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 rounded-full"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Footer Buttons */}
                    <div className="border-t border-slate-100 dark:border-white/5 pt-5 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={uploading}
                            className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl font-bold text-xs text-slate-700 dark:text-slate-300 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading || !file}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {uploading ? 'Processing...' : 'Upload Asset'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MediaUploadModal;