import { useState, useEffect } from 'react';
import axios from 'axios';
import CustomSelect from '../CustomSelect';
import {
    Database,
    Calendar,
    MessageCircle,
    Filter,
    Clock,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    User,
    Phone,
    SlidersHorizontal,
    MessageSquare,
    AlertCircle,
    X,
    MapPin,
    Mic,
    Image,
    Video,
    FileText,
    Smile,
    UserCheck,
    MousePointerClick,
    ShoppingBag,
    ExternalLink
} from 'lucide-react';

const renderTemplateMessage = (templateComponents, params) => {
    if (!templateComponents || !Array.isArray(templateComponents)) {
        return null;
    }

    const headerComp = templateComponents.find(c => c.type === 'HEADER');
    const bodyComp = templateComponents.find(c => c.type === 'BODY');
    const footerComp = templateComponents.find(c => c.type === 'FOOTER');
    const buttonComp = templateComponents.find(c => c.type === 'BUTTONS');

    const replaceParams = (text) => {
        if (!text) return '';
        let result = text;
        if (params) {
            if (Array.isArray(params)) {
                params.forEach((param, index) => {
                    const placeholder = `{{${index + 1}}}`;
                    const val = typeof param === 'object' && param !== null ? (param.text || JSON.stringify(param)) : String(param);
                    result = result.replaceAll(placeholder, val);
                });
            } else if (typeof params === 'object') {
                Object.entries(params).forEach(([key, param]) => {
                    const placeholder = `{{${key}}}`;
                    const val = typeof param === 'object' && param !== null ? (param.text || JSON.stringify(param)) : String(param);
                    result = result.replaceAll(placeholder, val);
                });
            }
        }
        return result;
    };

    const headerText = headerComp && headerComp.format === 'TEXT' ? replaceParams(headerComp.text) : '';
    const bodyText = bodyComp ? replaceParams(bodyComp.text) : '';
    const footerText = footerComp ? replaceParams(footerComp.text) : '';

    return {
        headerText,
        bodyText,
        footerText,
        buttons: buttonComp ? buttonComp.buttons : []
    };
};

const renderRichMessageBody = (msg) => {
    // 1. Location
    if (msg.location || msg.type === 'location') {
        const loc = msg.location || {};
        return (
            <div className="space-y-1.5 p-2.5 bg-slate-900/5 dark:bg-black/30 rounded-xl border border-slate-200/50 dark:border-white/10 my-1">
                <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                        <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-slate-900 dark:text-white">
                            {loc.name || 'Shared Location'}
                        </p>
                        {loc.address && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug mt-0.5">{loc.address}</p>
                        )}
                    </div>
                </div>
                {loc.url && (
                    <a
                        href={loc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition-colors shadow-sm mt-1"
                    >
                        <ExternalLink className="w-3 h-3" />
                        Open in Google Maps
                    </a>
                )}
            </div>
        );
    }

    // 2. Audio / Voice Note
    if (msg.type === 'audio' || msg.type === 'voice' || msg.audio_url) {
        const isVoice = msg.type === 'voice';
        const token = localStorage.getItem('token') || '';
        const audioSource = msg.audio_url || (msg.media_id ? `/api/whatsapp/media/${msg.media_id}/stream?token=${token}` : null);

        return (
            <div className="space-y-1.5 p-2.5 bg-slate-900/5 dark:bg-black/30 rounded-xl border border-slate-200/50 dark:border-white/10 my-1">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20 shrink-0">
                        <Mic className="w-4 h-4 text-purple-400 animate-pulse" />
                    </div>
                    <div>
                        <p className="font-semibold text-xs text-slate-900 dark:text-white">
                            {isVoice ? '🎙️ Voice Note' : '🎵 Audio Message'}
                        </p>
                    </div>
                </div>
                {audioSource ? (
                    <div className="pt-1">
                        <audio controls className="w-full max-w-[240px] h-8 rounded-lg outline-none" src={audioSource}>
                            Your browser does not support the audio player.
                        </audio>
                    </div>
                ) : (
                    <p className="text-[10px] text-slate-400 font-mono">Attachment ID: {msg.media_id || 'Voice Track'}</p>
                )}
            </div>
        );
    }

    // 3. Image
    if (msg.type === 'image') {
        const token = localStorage.getItem('token') || '';
        const imageSrc = msg.image_url || (msg.media_id ? `/api/whatsapp/media/${msg.media_id}/stream?token=${token}` : null);

        return (
            <div className="space-y-1.5 my-1">
                {imageSrc ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200/50 dark:border-white/10 max-w-xs">
                        <a href={imageSrc} target="_blank" rel="noopener noreferrer" title="Click to view full image">
                            <img src={imageSrc} alt={msg.caption || 'Photo'} className="w-full h-auto max-h-60 object-cover hover:scale-[1.02] transition-transform duration-200" loading="lazy" />
                        </a>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-900/5 dark:bg-black/30 p-2 rounded-lg border border-slate-200/50 dark:border-white/10">
                        <Image className="w-4 h-4 text-blue-500" />
                        <span>Photo</span>
                    </div>
                )}
                {msg.caption && <p className="text-xs select-text">{msg.caption}</p>}
                {msg.received_message_text && msg.received_message_text !== '📷 Photo' && !msg.received_message_text.startsWith('📷 Photo:') && (
                    <p className="text-xs select-text">{msg.received_message_text}</p>
                )}
            </div>
        );
    }

    // 4. Video
    if (msg.type === 'video') {
        const token = localStorage.getItem('token') || '';
        const videoSrc = msg.video_url || (msg.media_id ? `/api/whatsapp/media/${msg.media_id}/stream?token=${token}` : null);

        return (
            <div className="space-y-1.5 my-1">
                {videoSrc ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200/50 dark:border-white/10 max-w-xs">
                        <video controls className="w-full max-h-60 rounded-xl" src={videoSrc}>
                            Your browser does not support the video player.
                        </video>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-900/5 dark:bg-black/30 p-2 rounded-lg border border-slate-200/50 dark:border-white/10">
                        <Video className="w-4 h-4 text-purple-500" />
                        <span>Video</span>
                    </div>
                )}
                {msg.caption && <p className="text-xs select-text">{msg.caption}</p>}
            </div>
        );
    }

    // 5. Document
    if (msg.type === 'document') {
        const token = localStorage.getItem('token') || '';
        const docSrc = msg.document_url || (msg.media_id ? `/api/whatsapp/media/${msg.media_id}/stream?token=${token}` : null);

        return (
            <div className="space-y-1.5 my-1">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-900/5 dark:bg-black/30 p-2.5 rounded-xl border border-slate-200/50 dark:border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="truncate">{msg.filename || 'Document'}</span>
                    </div>
                    {docSrc && (
                        <a href={docSrc} target="_blank" rel="noopener noreferrer" download={msg.filename || 'document'} className="p-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-md transition-colors shrink-0" title="Download Document">
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
                {msg.caption && <p className="text-xs select-text">{msg.caption}</p>}
            </div>
        );
    }

    // 6. Sticker
    if (msg.type === 'sticker') {
        const token = localStorage.getItem('token') || '';
        const stickerSrc = msg.sticker_url || (msg.media_id ? `/api/whatsapp/media/${msg.media_id}/stream?token=${token}` : null);

        return (
            <div className="my-1">
                {stickerSrc ? (
                    <div className="inline-block p-1 rounded-2xl bg-transparent">
                        <img src={stickerSrc} alt="Sticker" className="w-24 h-24 object-contain hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-900/5 dark:bg-black/30 p-2 rounded-xl border border-slate-200/50 dark:border-white/10">
                        <Smile className="w-4 h-4 text-amber-500" />
                        <span>🎨 Sticker</span>
                    </div>
                )}
            </div>
        );
    }

    // 7. Contact Card
    if (msg.type === 'contacts' || msg.contacts) {
        const contactObj = Array.isArray(msg.contacts) ? msg.contacts[0] : (msg.contacts || {});
        const name = contactObj.name || 'Shared Contact';
        const phone = contactObj.phone || '';

        return (
            <div className="space-y-1.5 p-2.5 bg-slate-900/5 dark:bg-black/30 rounded-xl border border-slate-200/50 dark:border-white/10 my-1 max-w-xs">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shrink-0">
                        <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs truncate">{name}</p>
                        {phone && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{phone}</p>}
                    </div>
                </div>
            </div>
        );
    }

    // 8. Interactive / Button Response
    if (msg.type === 'interactive' || msg.type === 'button' || msg.interactive) {
        const interactive = msg.interactive || {};
        const title = interactive.title || msg.received_message_text || msg.body || 'Button Option Selected';

        return (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-500/20 my-1 text-xs font-semibold">
                <MousePointerClick className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{title}</span>
            </div>
        );
    }

    // 9. Reaction
    if (msg.type === 'reaction' || msg.emoji) {
        return (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/5 dark:bg-black/30 text-slate-800 dark:text-slate-200 rounded-full border border-slate-200/50 dark:border-white/10 text-xs font-medium my-0.5">
                <span>Reacted {msg.emoji || msg.received_message_text}</span>
            </div>
        );
    }

    // 10. Catalog Order
    if (msg.type === 'order' || msg.order) {
        const order = msg.order || {};
        const items = order.items || [];

        return (
            <div className="space-y-1.5 p-2.5 bg-slate-900/5 dark:bg-black/30 rounded-xl border border-slate-200/50 dark:border-white/10 my-1">
                <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-500" />
                    <p className="font-bold text-xs">Order Received ({items.length} item{items.length === 1 ? '' : 's'})</p>
                </div>
                {items.map((item, idx) => (
                    <div key={idx} className="text-[11px] flex items-center justify-between text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-black/20 p-1.5 rounded-lg">
                        <span>Item ID: {item.product_retailer_id}</span>
                        <span className="font-mono font-bold">x{item.quantity}</span>
                    </div>
                ))}
            </div>
        );
    }

    // 11. Unsupported Message Badge
    if (msg.type === 'unsupported' || (msg.received_message_text && (msg.received_message_text.includes('[unsupported message]') || msg.received_message_text.includes('Unsupported Message')))) {
        return (
            <div className="flex items-start gap-2 p-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-500/20 text-xs my-1">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="font-semibold text-xs">WhatsApp Format Notice</p>
                    <p className="text-[10px] opacity-90 leading-tight mt-0.5">
                        {msg.received_message_text && !msg.received_message_text.includes('[unsupported message]') ? msg.received_message_text : 'Received an incoming media/message format not supported by Meta API version.'}
                    </p>
                </div>
            </div>
        );
    }

    // Default text fallback
    return <p className="whitespace-pre-line select-text">{msg.received_message_text || msg.body}</p>;
};

const WAExternalTracker = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [sourceApp, setSourceApp] = useState('');
    const [sourceUserId, setSourceUserId] = useState('');
    const [recipientNumber, setRecipientNumber] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [status, setStatus] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const limit = 15;

    // Status counts state
    const [statusCounts, setStatusCounts] = useState({
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        replied: 0
    });

    // Chat Modal States
    const [selectedPhone, setSelectedPhone] = useState(null);
    const [conversation, setConversation] = useState([]);
    const [loadingChat, setLoadingChat] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false);

    // Dynamic applications state
    const [allowedApps, setAllowedApps] = useState([]);

    const fetchApps = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/whatsapp/dashboard/external-apps', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                const mappedApps = (response.data.apps || []).map(app => ({
                    id: app,
                    label: app.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                }));
                setAllowedApps(mappedApps);
            }
        } catch (err) {
            console.error('Error fetching dynamic apps:', err);
        }
    };

    // Dynamic templates state
    const [allowedTemplates, setAllowedTemplates] = useState([]);

    const fetchTemplates = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/whatsapp/dashboard/external-templates', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                setAllowedTemplates(response.data.templates || []);
            }
        } catch (err) {
            console.error('Error fetching dynamic templates:', err);
        }
    };

    // Dynamic users state
    const [allowedUsers, setAllowedUsers] = useState([]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/whatsapp/dashboard/external-users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                setAllowedUsers(response.data.users || []);
            }
        } catch (err) {
            console.error('Error fetching dynamic users:', err);
        }
    };

    const fetchMessages = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            const params = {
                page,
                limit,
                source_app: sourceApp || undefined,
                source_user_id: sourceUserId || undefined,
                recipient_number: recipientNumber || undefined,
                template_name: templateName || undefined,
                status: status || undefined,
                date_from: dateFrom ? `${dateFrom} 00:00:00` : undefined,
                date_to: dateTo ? `${dateTo} 23:59:59` : undefined
            };

            const response = await axios.get('/api/whatsapp/dashboard/external-messages', {
                params,
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                setMessages(response.data.messages || []);
                setTotalPages(response.data.totalPages || 1);
                setTotalRecords(response.data.total || 0);

                // Parse status counts
                const counts = { sent: 0, delivered: 0, read: 0, failed: 0, replied: 0 };
                if (response.data.statusCounts) {
                    response.data.statusCounts.forEach(item => {
                        const statusKey = String(item.status).toLowerCase();
                        counts[statusKey] = item.count;
                    });
                }
                setStatusCounts(counts);
            }
        } catch (err) {
            console.error('Error fetching external messages:', err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApps();
        fetchTemplates();
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchMessages();
    }, [page, sourceApp, status, templateName, sourceUserId]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchMessages();
    };

    const handleClearFilters = () => {
        setSourceApp('');
        setSourceUserId('');
        setRecipientNumber('');
        setTemplateName('');
        setStatus('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const openChatConversation = async (phone) => {
        try {
            setSelectedPhone(phone);
            setShowChatModal(true);
            setLoadingChat(true);
            setConversation([]);

            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/whatsapp/dashboard/external-conversation/${phone}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                setConversation(response.data.conversation || []);
            }
        } catch (err) {
            console.error('Error fetching conversation details:', err);
        } finally {
            setLoadingChat(false);
        }
    };

    const formatTimestamp = (dateString) => {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
        return d.toLocaleString();
    };

    const StatusBadge = ({ status }) => {
        const statuses = {
            sent: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            delivered: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
            read: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            failed: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
            replied: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
        };

        const currentStyle = statuses[String(status).toLowerCase()] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';

        return (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentStyle}`}>
                {status}
            </span>
        );
    };

    const AppBadge = ({ app }) => {
        const apps = {
            website: 'bg-sky-500/10 text-sky-500 border-sky-500/10',
            crm: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10',
            job_portal: 'bg-amber-500/10 text-amber-500 border-amber-500/10',
            wira_ai: 'bg-purple-500/10 text-purple-500 border-purple-500/10',
            ats: 'bg-rose-500/10 text-rose-500 border-rose-500/10'
        };
        
        let currentStyle = apps[String(app).toLowerCase()];
        
        if (!currentStyle) {
            // String hash color selector for dynamic/new applications
            const colors = [
                'bg-pink-500/10 text-pink-500 border-pink-500/10',
                'bg-indigo-500/10 text-indigo-500 border-indigo-500/10',
                'bg-cyan-500/10 text-cyan-500 border-cyan-500/10',
                'bg-orange-500/10 text-orange-500 border-orange-500/10',
                'bg-teal-500/10 text-teal-500 border-teal-500/10',
                'bg-lime-500/10 text-lime-500 border-lime-500/10'
            ];
            let hash = 0;
            const str = String(app || '');
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            const index = Math.abs(hash) % colors.length;
            currentStyle = colors[index];
        }

        return (
            <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${currentStyle}`}>
                {app ? app.replace(/_/g, ' ').toUpperCase() : 'N/A'}
            </span>
        );
    };

    return (
        <div className="p-4 md:p-5 space-y-5">
            {/* Header Block */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                        <Database className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">External Tracker</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">In-House Apps Integrations Logs</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Status Stats Badges */}
                    <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 px-3 py-1.5 rounded-2xl shadow-sm">
                        {/* Total Count Badge */}
                        <div className="flex items-center space-x-1.5 border-r border-slate-200 dark:border-white/10 pr-2.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total:</span>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono">{totalRecords}</span>
                        </div>
                        {/* Status Stats Badges */}
                        {Object.entries(statusCounts).map(([statusKey, count]) => {
                            const pct = totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(0) : '0';
                            
                            // Dot styles and label colors
                            const statusStyles = {
                                sent: { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/5' },
                                delivered: { dot: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/5' },
                                read: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/5' },
                                failed: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/5' },
                                replied: { dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/5' }
                            };

                            const style = statusStyles[statusKey] || { dot: 'bg-slate-500', text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/5' };

                            return (
                                <div key={statusKey} className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-lg border border-slate-200/40 dark:border-white/5 ${style.bg}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{statusKey}</span>
                                    <span className={`text-[10px] font-extrabold font-mono ${style.text}`}>{count}</span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-medium">({pct}%)</span>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        onClick={fetchMessages}
                        disabled={loading}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 hover:text-green-500 transition-all cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-white/5 pb-3">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Search Filters</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Source App Filter */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Source App</label>
                        <CustomSelect
                            value={sourceApp}
                            onChange={setSourceApp}
                            options={[
                                { value: "", label: "All Applications" },
                                ...allowedApps.map(app => ({ value: app.id, label: app.label }))
                            ]}
                            className="rounded-xl px-3 py-2 text-xs"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Delivery Status</label>
                        <CustomSelect
                            value={status}
                            onChange={setStatus}
                            options={[
                                { value: "", label: "All Statuses" },
                                { value: "sent", label: "Sent" },
                                { value: "delivered", label: "Delivered" },
                                { value: "read", label: "Read" },
                                { value: "failed", label: "Failed" },
                                { value: "replied", label: "Replied" }
                            ]}
                            className="rounded-xl px-3 py-2 text-xs"
                        />
                    </div>

                    {/* Phone Number Filter */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recipient Phone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="E.g. 919999999999"
                                value={recipientNumber}
                                onChange={(e) => setRecipientNumber(e.target.value)}
                                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 w-full text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    {/* User ID Filter */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sender User</label>
                        <CustomSelect
                            value={sourceUserId}
                            onChange={setSourceUserId}
                            options={[
                                { value: "", label: "All Users" },
                                ...allowedUsers.map(usr => ({
                                    value: usr.id,
                                    label: `${usr.name} (${usr.id})`
                                }))
                            ]}
                            className="rounded-xl px-3 py-2 text-xs"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Template Name Filter */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Template Name</label>
                        <CustomSelect
                            value={templateName}
                            onChange={setTemplateName}
                            options={[
                                { value: "", label: "All Templates" },
                                ...allowedTemplates.map(tmpl => ({ value: tmpl, label: tmpl }))
                            ]}
                            className="rounded-xl px-3 py-2 text-xs"
                        />
                    </div>

                    {/* Date From */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date From</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 w-full text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    {/* Date To */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date To</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 w-full text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-end space-x-2">
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                        >
                            <Search className="w-3.5 h-3.5" />
                            <span>Apply Search</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 transition-all cursor-pointer"
                            title="Clear Filters"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </form>

            {/* Data Table */}
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                        <p className="mt-3 text-xs text-slate-500 font-bold animate-pulse uppercase tracking-wider">Loading tracked records...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                        <h4 className="font-bold text-slate-900 dark:text-white">Fetch Error</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">{error}</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                        <h4 className="font-bold text-slate-500 dark:text-slate-400 text-sm">No Tracked Messages Found</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">No log entries fit the specified filter configuration parameters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 dark:bg-white/[0.01]">
                                    <th className="py-4 px-6">Source App</th>
                                    <th className="py-4 px-6">Sender User</th>
                                    <th className="py-4 px-6">Recipient Phone</th>
                                    <th className="py-4 px-6">Template</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6">Sent Time</th>
                                    <th className="py-4 px-6">Reply Status</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-slate-200">
                                {messages.map((msg) => (
                                    <tr key={msg.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="py-4 px-6">
                                            <AppBadge app={msg.source_app} />
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold">{msg.source_user_name || 'N/A'}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">ID: {msg.source_user_id || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 font-bold font-mono">
                                            {msg.recipient_number}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{msg.template_name}</span>
                                                {msg.template_language && (
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Lang: {msg.template_language}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <StatusBadge status={msg.status} />
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 font-semibold">
                                            {formatTimestamp(msg.sent_at)}
                                        </td>
                                        <td className="py-4 px-6 max-w-xs truncate">
                                            {msg.direction === 'incoming' ? (
                                                <span className="text-emerald-500 font-bold flex items-center">
                                                    <ArrowRight className="w-3.5 h-3.5 mr-1" />
                                                    Incoming Message
                                                </span>
                                            ) : msg.status === 'replied' ? (
                                                <span className="text-purple-500 font-bold">Replied</span>
                                            ) : (
                                                <span className="text-slate-400">No Reply</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button
                                                onClick={() => openChatConversation(msg.recipient_number)}
                                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                            >
                                                View Conversation
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer Pagination */}
                {totalPages > 1 && (
                    <div className="border-t border-slate-100 dark:border-white/5 px-6 py-4 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-semibold">
                            Showing <span className="font-bold text-slate-700 dark:text-slate-300">{messages.length}</span> of <span className="font-bold text-slate-700 dark:text-slate-300">{totalRecords}</span> entries
                        </span>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-4 text-xs font-bold">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Conversation Log Modal */}
            {showChatModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start leading-none">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Conversation Logs</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Phone: {selectedPhone}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowChatModal(false)}
                                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-slate-500 transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body: Conversation list */}
                        <div className="p-6 h-[400px] overflow-y-auto bg-slate-50/50 dark:bg-black/20 space-y-4">
                            {loadingChat ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="w-8 h-8 border-2 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                                    <p className="mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">Syncing history...</p>
                                </div>
                            ) : conversation.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">
                                    No chat messages exchanged for this number.
                                </div>
                            ) : (
                                conversation.map((chat) => {
                                    const isOutgoing = chat.direction === 'outgoing';
                                    return (
                                        <div
                                            key={chat.id}
                                            className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-2xl p-4 shadow-sm border text-xs leading-relaxed ${
                                                    isOutgoing
                                                        ? 'bg-blue-600 border-blue-500 text-white rounded-tr-none'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-none'
                                                }`}
                                            >
                                                {/* Header info */}
                                                <div className="flex items-center justify-between space-x-4 mb-2 border-b pb-1 opacity-75 border-current/10 text-[10px]">
                                                    <span className="font-bold uppercase tracking-wider">
                                                        {isOutgoing ? `Outgoing (${chat.source_app || 'Direct'})` : 'Incoming Reply'}
                                                    </span>
                                                    <span className="font-medium">
                                                        {chat.source_user_name ? `${chat.source_user_name} ` : ''}
                                                        {new Date(chat.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                {/* Message content */}
                                                {isOutgoing ? (
                                                    (() => {
                                                        const rendered = renderTemplateMessage(chat.template_components, chat.template_params_json);
                                                        if (!rendered) {
                                                            return (
                                                                <div className="space-y-1">
                                                                    <p className="font-bold text-[10px] bg-white/10 px-2 py-0.5 rounded inline-block">
                                                                        Template: {chat.template_name}
                                                                    </p>
                                                                    {chat.template_params_json && (
                                                                        <div className="bg-black/10 rounded-lg p-2 font-mono text-[10px] leading-tight space-y-0.5 text-blue-100">
                                                                            {Object.entries(chat.template_params_json).map(([k, v]) => (
                                                                                <div key={k}>
                                                                                    <span className="font-bold">{k}:</span> {v}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div className="space-y-2">
                                                                {rendered.headerText && (
                                                                    <div className="font-extrabold text-[13px] border-b border-white/10 pb-1 mb-1">
                                                                        {rendered.headerText}
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="text-[12px] whitespace-pre-wrap leading-relaxed break-words font-medium">
                                                                    {rendered.bodyText}
                                                                </div>

                                                                {rendered.footerText && (
                                                                    <div className="text-[10px] opacity-60 italic mt-1 font-semibold">
                                                                        {rendered.footerText}
                                                                    </div>
                                                                )}

                                                                {rendered.buttons && rendered.buttons.length > 0 && (
                                                                    <div className="mt-3 pt-2 border-t border-white/15 flex flex-wrap gap-1.5 justify-start">
                                                                        {rendered.buttons.map((btn, idx) => (
                                                                            <span 
                                                                                key={idx} 
                                                                                className="bg-white/20 hover:bg-white/30 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 transition-all"
                                                                            >
                                                                                {btn.text}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    renderRichMessageBody(chat)
                                                )}

                                                {/* Error logger if failed */}
                                                {chat.status === 'failed' && chat.error_message && (
                                                    <div className="mt-2 text-[10px] bg-red-500/20 text-red-200 rounded p-1 border border-red-500/30">
                                                        Error: {chat.error_message}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
                            <button
                                onClick={() => setShowChatModal(false)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                            >
                                Close Conversation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WAExternalTracker;
