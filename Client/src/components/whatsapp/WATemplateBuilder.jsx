import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Type,
  Image as ImageIcon,
  FileText,
  Plus,
  Trash2,
  Send,
  Globe,
  CheckCircle,
  HelpCircle,
  Eye,
  Video,
  Phone,
  MoreVertical,
  Smile,
  Paperclip,
  Camera,
  Mic,
  ArrowRight
} from 'lucide-react';
import axios from 'axios';

const WATemplateBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('en_US');

  // Header State
  const [headerType, setHeaderType] = useState('NONE'); // NONE, TEXT, IMAGE, DOCUMENT
  const [headerText, setHeaderText] = useState('');

  // Body State
  const [bodyText, setBodyText] = useState('');

  // Footer State
  const [footerText, setFooterText] = useState('');

  // Buttons State
  const [buttons, setButtons] = useState([]); // Array of { type: 'QUICK_REPLY'|'URL'|'PHONE', text: '', value: '' }

  useEffect(() => {
    if (location.state?.cloneTemplate) {
      const t = location.state.cloneTemplate;
      setName(`clone_${t.name}`);
      setCategory(t.category || 'MARKETING');
      setLanguage(t.language || 'en_US');

      if (t.components && Array.isArray(t.components)) {
        const header = t.components.find(c => c.type === 'HEADER');
        if (header) {
          setHeaderType(header.format || 'NONE');
          if (header.format === 'TEXT') {
            setHeaderText(header.text || '');
          }
        }
        const body = t.components.find(c => c.type === 'BODY');
        if (body) {
          setBodyText(body.text || '');
        }
        const footer = t.components.find(c => c.type === 'FOOTER');
        if (footer) {
          setFooterText(footer.text || '');
        }
        const btns = t.components.find(c => c.type === 'BUTTONS');
        if (btns && Array.isArray(btns.buttons)) {
          setButtons(btns.buttons.map(b => ({
            type: b.type,
            text: b.text || '',
            url: b.url || '',
            phone_number: b.phone_number || ''
          })));
        }
      }
    }
  }, [location.state]);

  const handleAddButton = (type) => {
    if (buttons.length >= 3) return;

    if (type === 'QUICK_REPLY') {
      setButtons([...buttons, { type: 'QUICK_REPLY', text: 'Quick Reply' }]);
    } else if (type === 'URL') {
      setButtons([...buttons, { type: 'URL', text: 'Visit Website', url: 'https://white-force.com' }]);
    } else if (type === 'PHONE') {
      setButtons([...buttons, { type: 'PHONE', text: 'Call Support', phone_number: '+1234567890' }]);
    }
  };

  const handleRemoveButton = (index) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleButtonChange = (index, field, value) => {
    const updated = [...buttons];
    updated[index][field] = value;
    setButtons(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const components = [];

    // Header
    if (headerType !== 'NONE') {
      const headerObj = { type: 'HEADER', format: headerType };
      if (headerType === 'TEXT') {
        headerObj.text = headerText;
      } else {
        headerObj.example = {
          header_handle: ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"]
        };
      }
      components.push(headerObj);
    }

    // Body
    if (!bodyText.trim()) {
      setLoading(false);
      return setError('Body text is required.');
    }

    const bodyObj = {
      type: 'BODY',
      text: bodyText
    };

    const variableRegex = /\{\{(\d+)\}\}/g;
    const matches = [...bodyText.matchAll(variableRegex)];
    if (matches.length > 0) {
      bodyObj.example = {
        body_text: [matches.map((_, i) => `SampleValue${i + 1}`)]
      };
    }
    components.push(bodyObj);

    // Footer
    if (footerText.trim()) {
      components.push({
        type: 'FOOTER',
        text: footerText
      });
    }

    // Buttons
    if (buttons.length > 0) {
      const formattedButtons = buttons.map(btn => {
        if (btn.type === 'QUICK_REPLY') {
          return { type: 'QUICK_REPLY', text: btn.text };
        } else if (btn.type === 'URL') {
          return { type: 'URL', text: btn.text, url: btn.url };
        } else if (btn.type === 'PHONE') {
          return { type: 'PHONE', text: btn.text, phone_number: btn.phone_number };
        }
      });
      components.push({
        type: 'BUTTONS',
        buttons: formattedButtons
      });
    }

    const payload = {
      name: name.toLowerCase().trim().replace(/\s+/g, '_'),
      category,
      language,
      components
    };

    try {
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedWhatsAppConfigId') || '';
      const headers = { Authorization: `Bearer ${token}` };
      if (configId) headers['X-WhatsApp-Config-Id'] = configId;

      const response = await axios.post('/api/whatsapp/templates', payload, {
        headers
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/wa-templates');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-5 space-y-4 min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 transition-colors duration-300">

      {/* Title block */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/wa-templates')}
            className="p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col items-start leading-none">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center mb-1">
              Template Builder
              <Sparkles className="w-4.5 h-4.5 ml-2 text-emerald-500 dark:text-emerald-400" />
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Create & Submit New Meta Templates</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
        {/* Left Side: Builder Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-8 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm dark:shadow-2xl backdrop-blur-md">

          {/* General Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block">Template Name</label>
              <input
                type="text"
                placeholder="e.g. order_update"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-white cursor-pointer"
              >
                <option value="MARKETING" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Marketing</option>
                <option value="UTILITY" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Utility</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-white cursor-pointer"
              >
                <option value="en" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">English</option>
                <option value="hi" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Hindi</option>
                <option value="es" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Spanish</option>
              </select>
            </div>
          </div>

          {/* Header configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
              <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center">
                <Type className="w-4 h-4 mr-2" /> Header Section
              </label>
              <div className="flex space-x-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                {['NONE', 'TEXT', 'IMAGE', 'DOCUMENT'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setHeaderType(type)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${headerType === type ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {headerType === 'TEXT' && (
              <input
                type="text"
                placeholder="Enter header text (Supports max 60 chars)"
                maxLength={60}
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-white"
              />
            )}

            {(headerType === 'IMAGE' || headerType === 'DOCUMENT') && (
              <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 border-dashed rounded-xl flex flex-col items-center justify-center text-center">
                <ImageIcon className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mb-2" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Media Header Type: {headerType}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm">Users will attach individual image URLs or PDF files during template broadcasting.</p>
              </div>
            )}
          </div>

          {/* Body Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
              <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" /> Body Section (Required)
              </label>
              <button
                type="button"
                onClick={() => setBodyText(prev => prev + ` {{${(prev.match(/\{\{(\d+)\}\}/g) || []).length + 1}}}`)}
                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors flex items-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Variable Tag
              </button>
            </div>

            <textarea
              rows={5}
              placeholder="e.g. Hello {{1}}, your package has been shipped! Track it here: {{2}}"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-white leading-relaxed resize-none transition-all"
            />
          </div>

          {/* Footer configuration */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block border-b border-slate-100 dark:border-white/5 pb-2">
              Footer Section (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter template footer text (e.g. Reply STOP to opt-out)"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-white"
            />
          </div>

          {/* Buttons Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
              <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Interactive Buttons (Max 3)
              </label>
              <div className="flex space-x-1.5">
                <button
                  type="button"
                  onClick={() => handleAddButton('QUICK_REPLY')}
                  className="px-2.5 py-1 text-[9px] font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-emerald-600 dark:text-emerald-400 transition-all"
                >
                  + Quick Reply
                </button>
                <button
                  type="button"
                  onClick={() => handleAddButton('URL')}
                  className="px-2.5 py-1 text-[9px] font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-emerald-600 dark:text-emerald-400 transition-all"
                >
                  + Web Link
                </button>
                <button
                  type="button"
                  onClick={() => handleAddButton('PHONE')}
                  className="px-2.5 py-1 text-[9px] font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-emerald-600 dark:text-emerald-400 transition-all"
                >
                  + Phone Call
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {buttons.map((btn, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-md">{btn.type}</span>

                  <input
                    type="text"
                    value={btn.text}
                    placeholder="Button Text"
                    onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                    className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white"
                  />

                  {btn.type === 'URL' && (
                    <input
                      type="text"
                      value={btn.url}
                      placeholder="https://example.com"
                      onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                      className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white font-mono"
                    />
                  )}

                  {btn.type === 'PHONE' && (
                    <input
                      type="text"
                      value={btn.phone_number}
                      placeholder="+1234567890"
                      onChange={(e) => handleButtonChange(index, 'phone_number', e.target.value)}
                      className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white font-mono"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveButton(index)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-auto sm:ml-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {buttons.length === 0 && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center italic py-2">No interactive actions declared.</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            {error && <p className="text-xs font-bold text-red-500 animate-pulse">{error}</p>}
            {success && <p className="text-xs font-bold text-emerald-500 dark:text-emerald-400 flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Template Submitted!</p>}
            {!error && !success && <div></div>}

            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center disabled:opacity-50 disabled:grayscale"
            >
              {loading ? 'Submitting...' : 'Submit to Meta'}
              <Send className="w-4 h-4 ml-2" />
            </button>
          </div>
        </form>

        {/* Right Side: Smartphone Real-time Mock Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 flex items-center">
            <Eye className="w-4 h-4 mr-2 text-emerald-500 dark:text-emerald-400" /> WhatsApp Live Mockup
          </h3>

          {/* Phone body */}
          <div className="w-[335px] h-[660px] bg-slate-900 border-[10px] border-slate-800 dark:border-slate-700 rounded-[2.8rem] shadow-2xl relative overflow-hidden flex flex-col">

            {/* Camera notch */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-800 rounded-full z-30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-slate-900 rounded-full ml-12"></div>
            </div>

            {/* Chat Screen header */}
            <div className="h-16 bg-[#008069] flex items-center justify-between px-3 pt-5 pb-2 text-white z-20 shadow-md">
              <div className="flex items-center space-x-1.5">
                <button type="button" className="p-1 hover:bg-white/10 rounded-full"><ArrowLeft className="w-4 h-4" /></button>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold border border-white/10">WF</div>
                <div className="leading-tight">
                  <div className="text-xs font-bold flex items-center">
                    White Force
                    <svg className="w-3.5 h-3.5 ml-1 text-sky-400 fill-white" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                  </div>
                  <p className="text-[8px] text-white/80 font-medium">Verified Business</p>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 text-white/90">
                <Video className="w-4 h-4 cursor-pointer hover:text-white" />
                <Phone className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
                <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
              </div>
            </div>

            {/* Message list area (Simulating WhatsApp pattern doodle background) */}
            <div className="flex-1 whatsapp-chat-bg p-4 flex flex-col justify-between relative transition-colors duration-300">

              {/* Message display zone */}
              <div className="flex-1 flex flex-col justify-end space-y-3 pb-2 overflow-y-auto">

                {/* WhatsApp message bubble container */}
                <div className="bg-[#d9fdd3] dark:bg-[#005c4b] rounded-2xl rounded-tr-none p-3.5 shadow-md text-slate-800 dark:text-slate-100 text-[13px] max-w-[88%] self-end flex flex-col space-y-1.5 relative border border-emerald-100 dark:border-emerald-900 transition-colors duration-300">

                  {/* 1. Preview Header */}
                  {headerType !== 'NONE' && (
                    <div className="font-bold text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-1 mb-1 text-[13px]">
                      {headerType === 'TEXT' ? headerText || 'Header Text Preview' : `[Media Component: ${headerType}]`}
                    </div>
                  )}

                  {/* 2. Preview Body */}
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-100 text-[12.5px]">
                    {bodyText || 'Start typing in the editor to see your template mockup here...'}
                  </div>

                  {/* 3. Preview Footer */}
                  {footerText.trim() && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      {footerText}
                    </div>
                  )}

                  {/* Timestamp & Double Checkmarks inside bubble bottom-right */}
                  <div className="flex items-center space-x-0.5 self-end mt-1 text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>15:35</span>
                    <svg className="w-3.5 h-3.5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M2 12l5 5L20 4M8 17l5 5L22 7" /></svg>
                  </div>
                </div>

                {/* 4. Interactive buttons preview (Centered pills separated from bubble) */}
                {buttons.length > 0 && (
                  <div className="flex flex-col space-y-1.5 max-w-[88%] self-end w-full">
                    {buttons.map((btn, i) => (
                      <div
                        key={i}
                        className="w-full bg-white dark:bg-[#1f2c34] hover:bg-slate-50 dark:hover:bg-[#2a3942] text-[#008069] dark:text-sky-400 border border-slate-200 dark:border-white/5 py-2 px-4 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        {btn.type === 'URL' && <Globe className="w-3.5 h-3.5 text-slate-400" />}
                        {btn.type === 'PHONE' && <Phone className="w-3 h-3 text-slate-400" />}
                        {btn.type === 'QUICK_REPLY' && <ArrowRight className="w-3 h-3 text-slate-400" />}
                        <span>{btn.text || 'Button label'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom WhatsApp text input bar mock */}
              <div className="flex items-center space-x-2 mt-2 pt-1 border-t border-black/5 dark:border-white/5">
                <div className="flex-1 bg-white dark:bg-[#1f2c34] rounded-full px-3 py-2 flex items-center space-x-2 shadow-sm">
                  <Smile className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-pointer" />
                  <span className="flex-1 text-[11px] text-slate-400 dark:text-slate-500">Message</span>
                  <Paperclip className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-pointer rotate-45" />
                  <Camera className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-pointer" />
                </div>
                <div className="w-8 h-8 rounded-full bg-[#008069] flex items-center justify-center text-white shadow-sm cursor-pointer">
                  <Mic className="w-4 h-4" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WATemplateBuilder;
