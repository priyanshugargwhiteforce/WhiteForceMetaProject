import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Database,
  RefreshCw,
  User,
  ShieldCheck,
  MapPin,
  Mic,
  Image,
  Video,
  FileText,
  CheckCircle2,
  Info,
  ExternalLink,
  Share2,
  HelpCircle
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../CustomSelect';

const WAChatWindow = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [filteredThreads, setFilteredThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [window24h, setWindow24h] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [error, setError] = useState(null);

  // Configuration management
  const [whatsappConfigs, setWhatsappConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(localStorage.getItem('selectedWhatsAppConfigId') || '');

  const messagesEndRef = useRef(null);
  const selectedThreadRef = useRef(selectedThread);

  // Pagination and search debouncing states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const debouncedSearchQueryRef = useRef(debouncedSearchQuery);

  useEffect(() => {
    selectedThreadRef.current = selectedThread;
  }, [selectedThread]);

  useEffect(() => {
    debouncedSearchQueryRef.current = debouncedSearchQuery;
  }, [debouncedSearchQuery]);

  // Debounce search query input (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch configs and set window event listener
  useEffect(() => {
    fetchConfigs();

    const handleConfigChanged = (e) => {
      if (e.detail.type === 'whatsapp') {
        fetchConfigs();
        setPage(1);
        fetchThreads(1, false, debouncedSearchQueryRef.current);
      }
    };
    window.addEventListener('config-changed', handleConfigChanged);
    return () => window.removeEventListener('config-changed', handleConfigChanged);
  }, []);

  // Fetch page 1 when debounced search or active config changes
  useEffect(() => {
    setPage(1);
    fetchThreads(1, false, debouncedSearchQuery);
  }, [debouncedSearchQuery, selectedConfigId]);

  // Establish Server-Sent Events (SSE) connection for real-time chat updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(`/api/whatsapp/chats/events?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'ping') return;

        console.log('[SSE] Received real-time update:', payload);

        const currentSelected = selectedThreadRef.current;
        if (currentSelected && payload.contact_id === currentSelected.id) {
          fetchMessages(currentSelected.id);
        }

        setThreads(prev => {
          const index = prev.findIndex(t => t.id === payload.contact_id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              last_message_at: payload.timestamp || new Date().toISOString(),
              event_type: payload.event_type || updated[index].event_type,
              metadata: payload.metadata || updated[index].metadata
            };
            return updated.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
          } else {
            return prev;
          }
        });
      } catch (err) {
        console.error('[SSE] Error processing event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('[SSE] EventSource connection error. Retrying...', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread.id);
    }
  }, [selectedThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/whatsapp/configs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setWhatsappConfigs(response.data.configs || []);
      }
    } catch (err) {
      console.error('Error fetching WhatsApp configs:', err);
    }
  };

  const handleConfigChange = (e) => {
    const newConfigId = e.target.value;
    setSelectedConfigId(newConfigId);
    localStorage.setItem('selectedWhatsAppConfigId', newConfigId);
    window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'whatsapp', id: newConfigId } }));
  };

  const fetchThreads = async (pageNum = 1, isAppend = false, searchVal = '') => {
    try {
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoadingThreads(true);
      }

      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedWhatsAppConfigId') || '';

      const headers = { Authorization: `Bearer ${token}` };
      if (configId) {
        headers['X-WhatsApp-Config-Id'] = configId;
      }

      const response = await axios.get(`/api/whatsapp/chats`, {
        headers,
        params: { page: pageNum, limit: 20, search: searchVal }
      });

      if (response.data.success) {
        const fetchedThreads = response.data.threads || [];
        setHasMore(response.data.hasMore);

        if (isAppend) {
          setThreads(prev => [...prev, ...fetchedThreads]);
          setFilteredThreads(prev => [...prev, ...fetchedThreads]);
        } else {
          setThreads(fetchedThreads);
          setFilteredThreads(fetchedThreads);
          if (fetchedThreads.length > 0 && !selectedThread) {
            setSelectedThread(fetchedThreads[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching chat threads:', err);
      setError(err.response?.data?.message || 'Failed to fetch conversations.');
    } fontally: () => {
      setLoadingThreads(false);
      setLoadingMore(false);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      if (!loadingMore && !loadingThreads && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchThreads(nextPage, true, debouncedSearchQuery);
      }
    }
  };

  const fetchMessages = async (contactId) => {
    try {
      setLoadingMessages(true);
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedWhatsAppConfigId') || '';

      const headers = { Authorization: `Bearer ${token}` };
      if (configId) {
        headers['X-WhatsApp-Config-Id'] = configId;
      }

      const response = await axios.get(`/api/whatsapp/chats/${contactId}/messages`, { headers });
      if (response.data.success) {
        setMessages(response.data.messages || []);
        setWindow24h(response.data.window24h || null);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedThread || !inputMessage.trim() || sendingMessage) return;

    try {
      setSendingMessage(true);
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedWhatsAppConfigId') || '';

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      if (configId) {
        headers['X-WhatsApp-Config-Id'] = configId;
      }

      const response = await axios.post(
        `/api/whatsapp/chats/${selectedThread.id}/send`,
        { message: inputMessage },
        { headers }
      );

      if (response.data.success) {
        setInputMessage('');
        fetchMessages(selectedThread.id);

        setThreads(prev =>
          prev.map(t =>
            t.id === selectedThread.id
              ? {
                ...t,
                last_message_at: new Date().toISOString(),
                event_type: 'sent',
                metadata: { body: inputMessage }
              }
              : t
          ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
        );
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />;
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />;
      case 'failed':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return null;
    }
  };

  const renderRichMessageBody = (msg) => {
    // 1. Location Message
    if (msg.location || msg.type === 'location') {
      const loc = msg.location || {};
      return (
        <div className="space-y-2 p-3 bg-slate-900/5 dark:bg-black/30 rounded-xl border border-slate-200/50 dark:border-white/10 my-1">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-slate-900 dark:text-white">
                {loc.name || 'Shared Location'}
              </p>
              {loc.address && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">{loc.address}</p>
              )}
              {loc.latitude && loc.longitude && (
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Lat: {loc.latitude}, Long: {loc.longitude}
                </p>
              )}
            </div>
          </div>
          {loc.url && (
            <a
              href={loc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm mt-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Google Maps
            </a>
          )}
        </div>
      );
    }

    // 2. Audio / Voice Note Message
    if (msg.type === 'audio' || msg.type === 'voice' || msg.media_id) {
      const isVoice = msg.type === 'voice';
      return (
        <div className="flex items-center gap-3 p-3 bg-slate-900/5 dark:bg-black/30 rounded-xl border border-slate-200/50 dark:border-white/10 my-1">
          <div className="p-2 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20 shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-xs text-slate-900 dark:text-white">
              {isVoice ? '🎙️ Voice Note Record' : '🎵 Audio Message'}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">WhatsApp Audio Attachment</p>
          </div>
        </div>
      );
    }

    // 3. Interactive / Button Click Reply
    if (msg.interactive || msg.type === 'interactive' || msg.type === 'button') {
      return (
        <div className="space-y-1 my-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Selected Button / Option
          </span>
          <p className="text-sm font-semibold text-slate-900 dark:text-white select-text">{msg.body}</p>
        </div>
      );
    }

    // 4. Photos / Videos / Documents / Stickers
    if (msg.type === 'image' || msg.type === 'video' || msg.type === 'document' || msg.type === 'sticker') {
      let icon = <FileText className="w-4 h-4 text-amber-500" />;
      let badgeLabel = 'Document';
      if (msg.type === 'image') {
        icon = <Image className="w-4 h-4 text-blue-500" />;
        badgeLabel = 'Photo';
      } else if (msg.type === 'video') {
        icon = <Video className="w-4 h-4 text-purple-500" />;
        badgeLabel = 'Video';
      }

      return (
        <div className="space-y-1.5 my-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-900/5 dark:bg-black/30 p-2.5 rounded-xl border border-slate-200/50 dark:border-white/10">
            {icon}
            <span>{badgeLabel} {msg.filename ? `: ${msg.filename}` : ''}</span>
          </div>
          {msg.body && <p className="text-sm whitespace-pre-wrap select-text">{msg.body}</p>}
        </div>
      );
    }

    // Default Text with Emojis
    return <p className="text-sm whitespace-pre-wrap leading-relaxed select-text">{msg.body}</p>;
  };

  return (
    <div className="p-4 md:p-5 space-y-3 max-w-7xl mx-auto h-[90vh] flex flex-col">
      {/* Title block */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-start leading-none">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Messages & Conversations</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">WhatsApp Web Window</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Config selector */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-1">
            <Database className="w-4 h-4 text-green-500" />
            <CustomSelect
              value={selectedConfigId}
              onChange={(val) => handleConfigChange({ target: { value: val } })}
              options={[
                { value: "", label: "Default Server Config" },
                ...whatsappConfigs.map(cfg => ({ value: cfg.id, label: cfg.name }))
              ]}
              className="border-none bg-transparent py-1 text-xs px-1 min-w-[160px]"
            />
          </div>
          <button
            onClick={() => fetchThreads(1, false, debouncedSearchQuery)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 hover:text-green-500 transition-all"
            disabled={loadingThreads}
          >
            <RefreshCw className={`w-4 h-4 ${loadingThreads ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main chat window container */}
      <div className="flex-1 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-premium flex min-h-0">

        {/* Left Side: Threads List */}
        <div className="w-80 md:w-96 border-r border-slate-200 dark:border-white/10 flex flex-col shrink-0 bg-slate-50/50 dark:bg-black/10">
          {/* Search bar */}
          <div className="p-4 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Threads list scrollable stream */}
          <div
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5"
          >
            {loadingThreads ? (
              <div className="p-8 text-center text-slate-400 animate-pulse text-sm">
                Loading conversations...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No conversations found.
              </div>
            ) : (
              <>
                {filteredThreads.map(t => {
                  const isSelected = selectedThread && selectedThread.id === t.id;
                  const lastMsgBody = t.metadata?.body || (t.event_type === 'unsubscribed' ? 'User unsubscribed' : '');

                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedThread(t)}
                      className={`w-full text-left p-4 transition-colors flex items-start space-x-3 ${isSelected
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/5 border-l-4 border-emerald-500'
                        : 'hover:bg-slate-100/50 dark:hover:bg-white/[0.01]'
                        }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm truncate text-slate-900 dark:text-white">
                            {t.name || t.phone}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatTime(t.last_message_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{t.phone}</p>

                        {/* Last message preview */}
                        <div className="flex items-center space-x-1.5 mt-1">
                          {t.event_type !== 'replied' && t.event_type !== 'unsubscribed' && (
                            <span className="shrink-0">{getStatusIcon(t.event_type)}</span>
                          )}
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">
                            {lastMsgBody ? lastMsgBody : `Template: ${t.metadata?.template_name || 'Template'}`}
                          </p>
                          {t.engagement_score > 0 && (
                            <span className="shrink-0 text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-bold">
                              {Math.round(t.engagement_score)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {loadingMore && (
                  <div className="p-4 text-center text-xs text-slate-400 animate-pulse border-t border-slate-100 dark:border-white/5">
                    Loading more...
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Side: Message Window */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-black/5">
          {selectedThread ? (
            <>
              {/* Chat Thread Header */}
              <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 backdrop-blur-md shrink-0 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedThread.name || selectedThread.phone}
                    </h4>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{selectedThread.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* 24-Hour Customer Service Window Status Badge */}
                  {window24h && (
                    window24h.isOpen ? (
                      <div
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
                        title="Meta 24-Hour Customer Service Free-Form Reply Window is Active"
                      >
                        <Clock className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                        <span>24h Reply Window: <strong>{window24h.remainingFormatted}</strong></span>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm"
                        title="24-Hour Customer Service Reply Window has Expired. Template message required."
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span>24h Reply Window: <strong>Expired</strong></span>
                      </div>
                    )
                  )}

                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-xl">
                    Score: {Math.round(selectedThread.engagement_score || 0)}%
                  </span>
                  <button
                    onClick={() => fetchMessages(selectedThread.id)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Messages Body stream area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 whatsapp-chat-bg relative">
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex justify-center items-center h-full text-slate-400 text-sm">
                    Loading messages...
                  </div>
                ) : (
                  <>
                    {/* Render Date indicators and message bubbles */}
                    {messages.map((msg, idx) => {
                      const prevMsg = messages[idx - 1];
                      const showDateLabel = !prevMsg ||
                        new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

                      return (
                        <div key={msg.id || idx} className="space-y-4">
                          {showDateLabel && (
                            <div className="flex justify-center shrink-0">
                              <span className="text-[10px] font-bold tracking-wider uppercase bg-slate-200/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full border border-slate-300/20 dark:border-white/5 shadow-sm">
                                {formatDateLabel(msg.timestamp)}
                              </span>
                            </div>
                          )}

                          <div className={`flex ${msg.isOutgoing ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-md lg:max-w-xl rounded-2xl p-4 shadow-sm relative group transition-all duration-300 ${msg.isOutgoing
                                ? 'bg-whatsapp-light dark:bg-whatsapp-dark-green text-slate-800 dark:text-slate-100 rounded-tr-none border border-emerald-500/10 dark:border-emerald-500/20'
                                : 'bg-white dark:bg-[#202c33] border border-slate-100 dark:border-white/5 text-slate-800 dark:text-slate-100 rounded-tl-none'
                                }`}
                            >
                              {/* Message bubble header (for templates) */}
                              {msg.template_name && (
                                <div className="text-[10px] font-mono tracking-wider opacity-60 uppercase mb-1 flex items-center">
                                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                  Template: {msg.template_name}
                                </div>
                              )}

                              {/* Render Rich Message Content */}
                              {renderRichMessageBody(msg)}

                              {/* Bubble bottom footer with timestamp and status ticks */}
                              <div className="flex items-center justify-end space-x-1 mt-1.5 opacity-80">
                                <span className="text-[10px] font-mono">
                                  {formatTime(msg.timestamp)}
                                </span>
                                {msg.isOutgoing && getStatusIcon(msg.status)}
                              </div>

                              {/* Error tag for failed messages */}
                              {msg.error && (
                                <div className="mt-2 text-xs text-red-200 bg-red-900/40 px-2 py-1 rounded-lg border border-red-500/20 flex items-center">
                                  <AlertCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                                  <span>{msg.error}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* 24-Hour Customer Service Window Notice Policy Bar */}
              <div className="px-4 py-2 bg-slate-100/90 dark:bg-slate-900/80 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>
                    <strong>Meta 24-Hour Policy Notice:</strong> Customer Service Messaging Window remains open for 24 hours per contact after their last message.
                  </span>
                </div>
                {window24h && (
                  <span className={`font-mono text-[11px] px-2.5 py-0.5 rounded-md ${window24h.isOpen ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'}`}>
                    {window24h.isOpen ? window24h.remainingFormatted : 'Window Expired'}
                  </span>
                )}
              </div>

              {/* Message Input replying footer bar */}
              <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 backdrop-blur-md shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder={window24h && !window24h.isOpen ? "24-Hour Window Expired (Free text allowed during active 24h window)..." : "Type a free-text reply..."}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={sendingMessage}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !inputMessage.trim()}
                    className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-8 whatsapp-chat-bg">
              <div className="w-20 h-20 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-3xl flex items-center justify-center mb-6 shadow-lg border border-emerald-500/20 backdrop-blur-md">
                <MessageSquare className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-1 text-slate-800 dark:text-white">Your Chat Window</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm backdrop-blur-sm bg-white/30 dark:bg-black/20 p-4 rounded-2xl border border-white/20 dark:border-white/5 mt-2 shadow-sm">
                Select a conversation from the sidebar list to view the full chat history logs and send replies.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default WAChatWindow;
