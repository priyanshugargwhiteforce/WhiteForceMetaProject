import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search, UploadCloud, Plus, Trash2, Database, FileSpreadsheet,
  AlertCircle, CheckCircle2, Tag, FolderPlus, ListFilter, Loader2,
  ChevronLeft, ChevronRight, UserPlus, Info, Trophy, Zap, TrendingDown,
  EyeOff, UserX, Archive, RotateCcw, X, ChevronRight as ChevronRightIcon,
  MessageSquare, Clock, BarChart2, Shield, Edit3, Save, Mail, Building2,
  Phone, Activity, Star, Filter, Globe, RefreshCw, Calendar
} from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useTheme } from '../../context/ThemeContext';

const API = '/api/whatsapp';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ─── Engagement Score Ring ──────────────────────────────────────────────────
const ScoreRing = ({ score = 0, size = 48 }) => {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#6366f1' : score > 0 ? '#f59e0b' : '#475569';
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={size / 4}
        fontWeight="700" fill={color}>
        {Math.round(score)}
      </text>
    </svg>
  );
};

// ─── Segment Config ──────────────────────────────────────────────────────────
const SEGMENT_CONFIG = {
  all: { label: 'All Contacts', icon: Users, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  champions: { label: 'Champions', icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  engaged: { label: 'Engaged', icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  at_risk: { label: 'At Risk', icon: TrendingDown, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  never_opened: { label: 'Never Opened', icon: EyeOff, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  unsubscribed: { label: 'Unsubscribed', icon: UserX, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  archived: { label: 'Archived', icon: Archive, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
};

// ─── Event Type Badge ────────────────────────────────────────────────────────
const EventBadge = ({ type }) => {
  const map = {
    sent: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    delivered: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    read: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    replied: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    unsubscribed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  return (
    <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${map[type] || map.sent}`}>
      {type}
    </span>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const WAContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [lists, setLists] = useState([]);
  const [segments, setSegments] = useState({});
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');

  // Search & Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [limit] = useState(15);

  // Loading & States
  const [loading, setLoading] = useState(false);
  const [segmentsLoading, setSegmentsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Contact Drawer
  const [drawerContact, setDrawerContact] = useState(null);
  const [drawerActivity, setDrawerActivity] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerActivityLoading, setDrawerActivityLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Import States
  const [importFile, setImportFile] = useState(null);
  const [detectedHeaders, setDetectedHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [mappedPhoneIdx, setMappedPhoneIdx] = useState(0);
  const [mappedNameIdx, setMappedNameIdx] = useState(-1);
  const [mappedEmailIdx, setMappedEmailIdx] = useState(-1);
  const [mappedCompanyIdx, setMappedCompanyIdx] = useState(-1);
  const [mappedTagsIdx, setMappedTagsIdx] = useState(-1);
  const [importTargetListId, setImportTargetListId] = useState('');
  const [importTargetListName, setImportTargetListName] = useState('');

  // Inline action states
  const [togglingOptIn, setTogglingOptIn] = useState(null);
  const [archivingId, setArchivingId] = useState(null);

  const searchRef = useRef(null);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchSegments = useCallback(async () => {
    setSegmentsLoading(true);
    try {
      const r = await axios.get(`${API}/contacts/segments`, { headers: authHeader() });
      if (r.data.success) setSegments(r.data.segments);
    } catch { /* non-critical */ }
    finally { setSegmentsLoading(false); }
  }, []);

  const fetchLists = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/lists`, { headers: authHeader() });
      if (r.data.success) setLists(r.data.lists || []);
    } catch { /* non-critical */ }
  }, []);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit, search: search.trim() };
      if (selectedListId) params.listId = selectedListId;
      if (selectedSegment && selectedSegment !== 'all') params.segment = selectedSegment;

      const r = await axios.get(`${API}/contacts`, { params, headers: authHeader() });
      if (r.data.success) {
        setContacts(r.data.contacts || []);
        setTotalContacts(r.data.pagination?.total || 0);
        setTotalPages(r.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setLoading(false); }
  }, [page, limit, search, selectedListId, selectedSegment]);

  useEffect(() => { fetchSegments(); fetchLists(); }, [fetchSegments, fetchLists]);
  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // ── Drawer ─────────────────────────────────────────────────────────────────
  const openDrawer = async (contact) => {
    setDrawerContact(contact);
    setEditMode(false);
    setEditFields({});
    setDrawerActivity([]);
    setDrawerLoading(true);
    setDrawerActivityLoading(true);
    try {
      const [profileRes, activityRes] = await Promise.all([
        axios.get(`${API}/contacts/${contact.id}/profile`, { headers: authHeader() }),
        axios.get(`${API}/contacts/${contact.id}/activity`, { headers: authHeader() })
      ]);
      if (profileRes.data.success) setDrawerContact(profileRes.data.profile);
      if (activityRes.data.success) setDrawerActivity(activityRes.data.activity || []);
    } catch { /* show what we have */ }
    finally { setDrawerLoading(false); setDrawerActivityLoading(false); }
  };

  const closeDrawer = () => {
    setDrawerContact(null);
    setEditMode(false);
  };

  const startEdit = () => {
    setEditFields({
      name: drawerContact?.name || '',
      email: drawerContact?.email || '',
      company: drawerContact?.company || '',
    });
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!drawerContact) return;
    setSavingEdit(true);
    try {
      // Update fields via contacts service (upsert via re-import single contact)
      await axios.post(`${API}/contacts/import`, {
        contacts: [{
          phone: drawerContact.phone,
          name: editFields.name,
          email: editFields.email,
          company: editFields.company
        }]
      }, { headers: authHeader() });
      setDrawerContact(prev => ({ ...prev, ...editFields }));
      setContacts(prev => prev.map(c => c.id === drawerContact.id ? { ...c, ...editFields } : c));
      setEditMode(false);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally { setSavingEdit(false); }
  };

  // ── Opt-In Toggle ──────────────────────────────────────────────────────────
  const handleToggleOptIn = async (contactId) => {
    setTogglingOptIn(contactId);
    try {
      const r = await axios.patch(`${API}/contacts/${contactId}/opt-in`, {}, { headers: authHeader() });
      if (r.data.success) {
        const update = c => c.id === contactId ? { ...c, status: r.data.newStatus, opt_in_status: r.data.opted_in ? 1 : 0 } : c;
        setContacts(prev => prev.map(update));
        if (drawerContact?.id === contactId) setDrawerContact(prev => ({ ...prev, status: r.data.newStatus, opt_in_status: r.data.opted_in ? 1 : 0 }));
        await fetchSegments();
      }
    } catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setTogglingOptIn(null); }
  };

  // ── Archive ────────────────────────────────────────────────────────────────
  const handleArchive = async (contactId) => {
    if (!window.confirm('Archive this contact? They will be excluded from active campaigns.')) return;
    setArchivingId(contactId);
    try {
      const r = await axios.patch(`${API}/contacts/${contactId}/archive`, {}, { headers: authHeader() });
      if (r.data.success) {
        fetchContacts();
        fetchSegments();
        if (drawerContact?.id === contactId) closeDrawer();
      }
    } catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setArchivingId(null); }
  };

  const handleRestore = async (contactId) => {
    try {
      const r = await axios.patch(`${API}/contacts/${contactId}/restore`, {}, { headers: authHeader() });
      if (r.data.success) {
        fetchContacts();
        fetchSegments();
        if (drawerContact?.id === contactId) setDrawerContact(prev => ({ ...prev, status: 'active', opt_in_status: 1 }));
      }
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  // ── List Management ────────────────────────────────────────────────────────
  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      const r = await axios.post(`${API}/lists`, { name: newListName.trim() }, { headers: authHeader() });
      if (r.data.success) { setNewListName(''); setShowCreateListModal(false); fetchLists(); }
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleDeleteList = async (id, name) => {
    if (!window.confirm(`Delete list "${name}"? Contacts will remain in the directory.`)) return;
    try {
      await axios.delete(`${API}/lists/${id}`, { headers: authHeader() });
      if (selectedListId === String(id)) setSelectedListId('');
      fetchLists();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  // ── Import Wizard ──────────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file); setImportError(null); setImportResult(null);
    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    reader.onload = (ev) => {
      try {
        let rows = [];
        if (isExcel) {
          const data = new Uint8Array(ev.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        } else {
          rows = ev.target.result.split('\n')
            .map(l => l.split(',').map(c => c.trim()))
            .filter(r => r.length > 0 && r.some(c => c !== ''));
        }
        if (!rows.length) throw new Error('File is empty.');
        const headers = rows[0].map(h => String(h).trim());
        setDetectedHeaders(headers); setRawRows(rows);
        let pI = 0, nI = -1, eI = -1, cI = -1, tI = -1;
        headers.forEach((h, i) => {
          const hl = h.toLowerCase();
          if (hl.includes('phone') || hl.includes('mobile') || hl.includes('number')) pI = i;
          else if (hl.includes('name') || hl.includes('fullname')) nI = i;
          else if (hl.includes('email') || hl.includes('mail')) eI = i;
          else if (hl.includes('company') || hl.includes('org')) cI = i;
          else if (hl.includes('tag') || hl.includes('group')) tI = i;
        });
        setMappedPhoneIdx(pI); setMappedNameIdx(nI); setMappedEmailIdx(eI);
        setMappedCompanyIdx(cI); setMappedTagsIdx(tI);
      } catch (err) { setImportError(err.message); setImportFile(null); }
    };
    isExcel ? reader.readAsArrayBuffer(file) : reader.readAsText(file);
  };

  const executeImport = async () => {
    if (rawRows.length < 2) return;
    setImportLoading(true); setImportError(null);
    try {
      const dataRows = rawRows.slice(1);
      const parsedContacts = [];
      dataRows.forEach(row => {
        if (mappedPhoneIdx >= row.length) return;
        const phone = String(row[mappedPhoneIdx]).replace(/[^0-9]/g, '');
        if (!phone) return;
        const attributes = {};
        detectedHeaders.forEach((h, i) => {
          if (![mappedPhoneIdx, mappedNameIdx, mappedEmailIdx, mappedCompanyIdx, mappedTagsIdx].includes(i) && i < row.length && row[i] !== undefined) {
            attributes[h] = row[i];
          }
        });
        parsedContacts.push({
          phone,
          name: mappedNameIdx !== -1 && mappedNameIdx < row.length ? String(row[mappedNameIdx]) : '',
          email: mappedEmailIdx !== -1 && mappedEmailIdx < row.length ? String(row[mappedEmailIdx]) : '',
          company: mappedCompanyIdx !== -1 && mappedCompanyIdx < row.length ? String(row[mappedCompanyIdx]) : '',
          tags: mappedTagsIdx !== -1 && mappedTagsIdx < row.length ? String(row[mappedTagsIdx]) : [],
          attributes
        });
      });
      if (!parsedContacts.length) throw new Error('No valid contacts found in the sheet.');
      const r = await axios.post(`${API}/contacts/import`, {
        contacts: parsedContacts,
        listId: importTargetListId || null,
        listName: !importTargetListId && importTargetListName ? importTargetListName : null
      }, { headers: authHeader() });
      setImportResult(r.data);
      fetchLists(); fetchContacts(); fetchSegments();
    } catch (err) { setImportError(err.response?.data?.message || err.message); }
    finally { setImportLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchContacts(); };
  const handleSegmentClick = (key) => { setSelectedSegment(key); setSelectedListId(''); setPage(1); };
  const handleListClick = (id) => { setSelectedListId(id); setSelectedSegment('all'); setPage(1); };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-screen bg-transparent text-slate-800 dark:text-slate-100 relative transition-colors duration-300">

      {/* ── LEFT SIDEBAR ────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-white/[0.06] flex flex-col overflow-y-auto bg-white dark:bg-[#0a0f1e]/40">
        <div className="p-5 border-b border-slate-200 dark:border-white/[0.06]">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Contacts</h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Intelligence Layer</p>
            </div>
          </div>
        </div>

        {/* Dynamic Segments */}
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Activity className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Smart Segments
            </span>
            <button onClick={fetchSegments} className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <RefreshCw className={`w-3 h-3 ${segmentsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-1">
            {/* All Contacts */}
            <button
              onClick={() => handleSegmentClick('all')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${selectedSegment === 'all' && !selectedListId
                ? 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white'}`}
            >
              <span className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> All Contacts
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-lg">{totalContacts}</span>
            </button>

            {Object.entries(SEGMENT_CONFIG).filter(([k]) => k !== 'all').map(([key, cfg]) => {
              const Icon = cfg.icon;
              const count = segments[key]?.count ?? 0;
              const isActive = selectedSegment === key && !selectedListId;
              return (
                <button key={key} onClick={() => handleSegmentClick(key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive
                    ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white'}`}>
                  <span className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? cfg.color : 'text-slate-500 dark:text-slate-400'}`} />
                    {cfg.label}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isActive ? `${cfg.bg} ${cfg.color}` : 'text-slate-500 bg-slate-100 dark:bg-white/5'}`}>
                    {segmentsLoading ? '–' : count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact Lists */}
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <ListFilter className="w-3 h-3 text-indigo-400" /> Lists
            </span>
            <button onClick={() => setShowCreateListModal(true)} className="text-slate-500 hover:text-indigo-400 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
            {lists.map(list => {
              const isActive = selectedListId === String(list.id);
              return (
                <div key={list.id} className={`w-full rounded-xl text-xs font-semibold transition-all flex items-center group ${isActive ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'}`}>
                  <button onClick={() => handleListClick(String(list.id))} className="flex-1 text-left px-3 py-2.5 truncate">
                    {list.name}
                  </button>
                  <div className="flex items-center pr-2 gap-1 shrink-0">
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded-md">{list.member_count}</span>
                    <button onClick={() => handleDeleteList(list.id, list.name)} className="text-slate-500 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-0.5 cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Import Button */}
        <div className="p-4 border-t border-slate-200 dark:border-white/[0.06]">
          <button
            onClick={() => { setImportFile(null); setDetectedHeaders([]); setImportResult(null); setImportError(null); setImportTargetListId(''); setImportTargetListName(''); setShowImportModal(true); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Import Contacts
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${drawerContact ? 'mr-[440px]' : ''}`}>

        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.06] bg-white/85 dark:bg-[#0a0f1e]/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {(() => {
              const cfg = SEGMENT_CONFIG[selectedSegment] || SEGMENT_CONFIG.all;
              const Icon = cfg.icon;
              return (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label}
                  <span className="opacity-60">•</span>
                  <span>{totalContacts} contacts</span>
                </div>
              );
            })()}
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input ref={searchRef} type="text" placeholder="Search name, phone, email…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 w-64 transition-all" />
            </div>
            <button type="submit" className="px-4 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-all">Search</button>
          </form>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading contacts…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-sm text-slate-400">{error}</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/10 rounded-3xl text-center p-8">
              <Users className="w-12 h-12 text-slate-700 mb-4" />
              <h3 className="text-sm font-bold text-slate-400">No contacts found</h3>
              <p className="text-xs text-slate-600 mt-1">Try a different segment or import new contacts.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.01]">
                    <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-widest text-[9px]">Contact</th>
                    <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-widest text-[9px]">Phone</th>
                    <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-widest text-[9px]">Score</th>
                    <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-widest text-[9px]">Campaigns</th>
                    <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-widest text-[9px]">Status</th>
                    <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-widest text-[9px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {contacts.map(contact => {
                    const score = parseFloat(contact.engagement_score || 0);
                    const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-indigo-400' : score > 0 ? 'text-amber-400' : 'text-slate-600';
                    const isToggling = togglingOptIn === contact.id;
                    const isArchiving = archivingId === contact.id;
                    return (
                      <tr key={contact.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                        onClick={() => openDrawer(contact)}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                {(contact.name || contact.phone || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{contact.name || 'Unknown'}</p>
                              <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{contact.email || contact.company || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-400 text-[11px]">{contact.phone}</td>
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <div className="relative w-20 h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                              <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-indigo-500' : score > 0 ? 'bg-amber-500' : 'bg-slate-700'}`}
                                style={{ width: `${score}%` }} />
                            </div>
                            <span className={`font-bold text-[10px] ${scoreColor}`}>{Math.round(score)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 text-[10px] text-slate-500">
                            <span title="Sent" className="flex items-center gap-1"><Globe className="w-3 h-3 text-blue-400" />{contact.total_sent || 0}</span>
                            <span title="Read" className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" />{contact.total_read || 0}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          {contact.status === 'archived' ? (
                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-full">Archived</span>
                          ) : (
                            <button
                              disabled={isToggling}
                              onClick={() => handleToggleOptIn(contact.id)}
                              className={`relative inline-flex items-center h-5 w-9 rounded-full transition-all focus:outline-none ${contact.opt_in_status ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'} ${isToggling ? 'opacity-50' : ''}`}
                              title={contact.opt_in_status ? 'Click to unsubscribe' : 'Click to re-subscribe'}
                            >
                              <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform ${contact.opt_in_status ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {contact.status === 'archived' ? (
                              <button onClick={() => handleRestore(contact.id)}
                                className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-slate-500 hover:text-emerald-400 transition-all" title="Restore">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button onClick={() => handleArchive(contact.id)} disabled={isArchiving}
                                className="p-1.5 hover:bg-amber-500/10 rounded-lg text-slate-500 hover:text-amber-400 transition-all" title="Archive">
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => openDrawer(contact)}
                              className="p-1.5 hover:bg-indigo-500/10 rounded-lg text-slate-500 hover:text-indigo-400 transition-all" title="View profile">
                              <ChevronRightIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 border border-slate-200 dark:border-white/[0.06] rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 disabled:opacity-30 transition-all">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 border border-slate-200 dark:border-white/[0.06] rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 disabled:opacity-30 transition-all">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── CONTACT INTELLIGENCE DRAWER ─────────────────────────────────────── */}
      <aside className={`fixed top-0 right-0 h-full w-[440px] bg-white dark:bg-[#0d1325] border-l border-slate-200 dark:border-white/[0.07] flex flex-col z-40 transition-transform duration-300 ease-in-out shadow-2xl ${drawerContact ? 'translate-x-0' : 'translate-x-full'}`}>
        {drawerContact && (
          <>
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center">
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                    {(drawerContact.name || drawerContact.phone || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{drawerContact.name || 'Unknown Contact'}</h3>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${drawerContact.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      drawerContact.status === 'unsubscribed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>{drawerContact.status || 'active'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button onClick={startEdit} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-indigo-400 transition-all" title="Edit">
                    <Edit3 className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={saveEdit} disabled={savingEdit}
                    className="p-2 hover:bg-emerald-500/10 rounded-xl text-slate-500 hover:text-emerald-400 transition-all" title="Save">
                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                )}
                <button onClick={closeDrawer} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-slate-200 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {drawerLoading ? (
                <div className="flex flex-col items-center justify-center h-40">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Engagement Score Card */}
                  <div className="mx-6 mt-5 bg-gradient-to-br from-indigo-500/[0.05] to-purple-600/[0.03] dark:from-indigo-500/[0.08] dark:to-purple-600/[0.06] border border-indigo-500/20 rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Engagement Score</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{Math.round(parseFloat(drawerContact.engagement_score || 0))}<span className="text-lg text-slate-500 font-medium">/100</span></p>
                        <p className="text-xs text-slate-500 mt-1">
                          {parseFloat(drawerContact.engagement_score || 0) >= 80 ? '🏆 Champion Tier' :
                            parseFloat(drawerContact.engagement_score || 0) >= 50 ? '⚡ Engaged' :
                              parseFloat(drawerContact.engagement_score || 0) > 0 ? '⚠️ At Risk' : '💤 No activity yet'}
                        </p>
                      </div>
                      <ScoreRing score={parseFloat(drawerContact.engagement_score || 0)} size={72} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-5">
                      {[
                        { label: 'Sent', val: drawerContact.total_sent || 0, color: 'text-blue-600 dark:text-blue-400' },
                        { label: 'Delivered', val: drawerContact.total_delivered || 0, color: 'text-indigo-600 dark:text-indigo-400' },
                        { label: 'Read', val: drawerContact.total_read || 0, color: 'text-emerald-600 dark:text-emerald-400' },
                      ].map(m => (
                        <div key={m.label} className="bg-slate-100 dark:bg-white/[0.04] rounded-xl p-3 text-center">
                          <p className={`text-lg font-black ${m.color}`}>{m.val}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mx-6 mt-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-4 space-y-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Contact Details</p>
                    {editMode ? (
                      <div className="space-y-3">
                        {[
                          { label: 'Name', key: 'name', icon: Users },
                          { label: 'Email', key: 'email', icon: Mail },
                          { label: 'Company', key: 'company', icon: Building2 },
                        ].map(({ label, key, icon: Icon }) => (
                          <div key={key} className="flex items-center gap-3">
                            <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <input
                              value={editFields[key] || ''}
                              onChange={e => setEditFields(f => ({ ...f, [key]: e.target.value }))}
                              placeholder={label}
                              className="flex-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        ))}
                        <button onClick={() => setEditMode(false)} className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold uppercase tracking-wider">Cancel</button>
                      </div>
                    ) : (
                      <>
                        {[
                          { icon: Phone, label: 'Phone', val: drawerContact.phone },
                          { icon: Mail, label: 'Email', val: drawerContact.email },
                          { icon: Building2, label: 'Company', val: drawerContact.company },
                          { icon: Calendar, label: 'Joined', val: drawerContact.created_at ? new Date(drawerContact.created_at).toLocaleDateString() : null },
                          { icon: Clock, label: 'Last Engaged', val: drawerContact.last_engaged_at ? new Date(drawerContact.last_engaged_at).toLocaleString() : null },
                        ].filter(i => i.val).map(item => (
                          <div key={item.label} className="flex items-center gap-3 text-xs">
                            <item.icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="text-slate-500 w-20 text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{item.val}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Tags & Lists */}
                  {(drawerContact.tags?.length > 0 || drawerContact.lists?.length > 0) && (
                    <div className="mx-6 mt-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-4">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Segments & Lists</p>
                      <div className="flex flex-wrap gap-1.5">
                        {drawerContact.tags?.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/10 rounded-lg text-[9px] font-bold">#{t}</span>
                        ))}
                        {drawerContact.lists?.map(l => (
                          <span key={l} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/10 rounded-lg text-[9px] font-bold">📋 {l}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Opt-in Actions */}
                  <div className="mx-6 mt-3 flex gap-2">
                    {drawerContact.status !== 'archived' ? (
                      <>
                        <button
                          onClick={() => handleToggleOptIn(drawerContact.id)}
                          disabled={togglingOptIn === drawerContact.id}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${drawerContact.opt_in_status
                            ? 'bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/10'
                            : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'}`}
                        >
                          {togglingOptIn === drawerContact.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                          {drawerContact.opt_in_status ? 'Unsubscribe' : 'Re-subscribe'}
                        </button>
                        <button
                          onClick={() => handleArchive(drawerContact.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-amber-500/20 text-amber-400 hover:bg-amber-500/10 transition-all">
                          <Archive className="w-3.5 h-3.5" /> Archive
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleRestore(drawerContact.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-all">
                        <RotateCcw className="w-3.5 h-3.5" /> Restore Contact
                      </button>
                    )}
                  </div>

                  {/* Activity Timeline */}
                  <div className="mx-6 mt-4 mb-6">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                      <Activity className="w-3 h-3 text-indigo-400" /> Campaign Timeline
                    </p>
                    {drawerActivityLoading ? (
                      <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
                    ) : drawerActivity.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-600 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
                        No campaign activity yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {drawerActivity.slice(0, 20).map(ev => (
                          <div key={ev.id} className="flex items-start gap-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] rounded-xl p-3">
                            <div className="shrink-0 mt-0.5">
                              <EventBadge type={ev.event_type} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-800 dark:text-slate-300 truncate">{ev.campaign_name || `Campaign #${ev.campaign_id}`}</p>
                              {ev.template_name && <p className="text-[9px] text-slate-500 dark:text-slate-600 truncate">{ev.template_name}</p>}
                            </div>
                            <div className="shrink-0 text-[9px] text-slate-500 dark:text-slate-600 text-right">
                              {new Date(ev.event_timestamp).toLocaleDateString()}<br />
                              {new Date(ev.event_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Drawer backdrop (mobile) */}
      {drawerContact && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={closeDrawer} />
      )}

      {/* ── CREATE LIST MODAL ────────────────────────────────────────────────── */}
      {showCreateListModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleCreateList} className="bg-white dark:bg-[#0d1325] border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
              <FolderPlus className="w-5 h-5 text-indigo-500" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-widest">Create Contact List</h4>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">List Name</label>
              <input type="text" placeholder="e.g. June Campaigns" value={newListName} onChange={e => setNewListName(e.target.value)} required
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500/50" />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreateListModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-wider">Cancel</button>
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* ── IMPORT WIZARD MODAL ──────────────────────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0d1325] border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 md:p-8 w-full max-w-2xl space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-widest">Excel / CSV Import Wizard</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Parse, map & upload</p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white uppercase tracking-wider">Close</button>
            </div>

            {!importFile ? (
              <label className="border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-500/50 rounded-[2rem] p-12 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-indigo-500/[0.02]">
                <UploadCloud className="w-12 h-12 text-indigo-500 dark:text-indigo-400 mb-4 animate-pulse" />
                <span className="text-sm font-bold text-slate-800 dark:text-white">Click to upload spreadsheet</span>
                <span className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Supports .csv, .xlsx, .xls</span>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              </label>
            ) : importResult ? (
              <div className="space-y-6 text-center py-6">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Import Complete!</h4>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">Engagement scores will update after next campaign completion</p>
                </div>
                <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto bg-slate-50 dark:bg-white/[0.02] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                  {[['Total', importResult.processed, 'text-slate-700 dark:text-slate-300'], ['New', `+${importResult.inserted}`, 'text-emerald-500 dark:text-emerald-400'], ['Updated', `~${importResult.updated}`, 'text-indigo-600 dark:text-indigo-400']].map(([l, v, c]) => (
                    <div key={l}>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{l}</p>
                      <p className={`text-lg font-black mt-1 font-mono ${c}`}>{v}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowImportModal(false)} className="px-6 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Return to Directory</button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3 bg-indigo-500/5 p-4 border border-indigo-500/10 rounded-2xl">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400"><FileSpreadsheet className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{importFile.name}</h5>
                    <p className="text-[9.5px] font-bold text-slate-500 uppercase mt-0.5">{(importFile.size / 1024).toFixed(1)} KB · {rawRows.length - 1} rows</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Existing List</label>
                    <select value={importTargetListId} onChange={e => { setImportTargetListId(e.target.value); if (e.target.value) setImportTargetListName(''); }}
                      className="w-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none">
                      <option value="">-- Create New List --</option>
                      {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  {!importTargetListId && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">New List Name</label>
                      <input type="text" placeholder="e.g. June Upload" value={importTargetListName} onChange={e => setImportTargetListName(e.target.value)}
                        className="w-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none" />
                    </div>
                  )}
                </div>

                <div className="space-y-4 bg-slate-50 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-white/5">
                    <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h5 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">Column Mapping</h5>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      ['Phone Number *', mappedPhoneIdx, setMappedPhoneIdx, false],
                      ['Contact Name', mappedNameIdx, setMappedNameIdx, true],
                      ['Email', mappedEmailIdx, setMappedEmailIdx, true],
                      ['Company', mappedCompanyIdx, setMappedCompanyIdx, true],
                      ['Tags', mappedTagsIdx, setMappedTagsIdx, true],
                    ].map(([label, val, setter, allowIgnore]) => (
                      <div key={label} className="space-y-1.5">
                        <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest block">{label}</label>
                        <select value={val} onChange={e => setter(parseInt(e.target.value))}
                          className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none">
                          {allowIgnore && <option value={-1}>-- Ignore --</option>}
                          {detectedHeaders.map((h, i) => <option key={i} value={i}>Col {i + 1}: {h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[9.5px] text-indigo-400 leading-relaxed">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                    <span>Unmapped columns will be saved as <strong>Custom Attributes</strong> on the contact profile.</span>
                  </div>
                </div>

                {importError && (
                  <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-semibold text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {importError}
                  </div>
                )}

                <button onClick={executeImport} disabled={importLoading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
                  {importLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><UploadCloud className="w-4 h-4" /> Start Import</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WAContacts;
