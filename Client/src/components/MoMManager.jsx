import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  Printer,
  Download,
  Users,
  Building,
  UserCheck,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  X,
  Eye,
  Loader2,
  AlertTriangle,
  HelpCircle,
  PlusCircle,
  MinusCircle,
  Layers
} from 'lucide-react';
import axios from 'axios';
import logoImg from '../assets/white-forcelogo.png';

const DEPARTMENTS = ['SEO', 'Marketing', 'IT', 'HR', 'Payroll', 'Other'];

const MoMManager = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // State
  const [moms, setMoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Filters & Search
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedMoM, setSelectedMoM] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [formTitle, setFormTitle] = useState('');
  const [formDepartment, setFormDepartment] = useState('Marketing');
  const [formMeetingDate, setFormMeetingDate] = useState(todayStr);
  const [formMeetingDay, setFormMeetingDay] = useState('');
  const [formMeetingWith, setFormMeetingWith] = useState('CEO Shailesh Rajpal');
  const [formCustomWith, setFormCustomWith] = useState('');
  const [formAttendees, setFormAttendees] = useState('');
  const [formAgenda, setFormAgenda] = useState('');
  const [formPoints, setFormPoints] = useState([
    {
      id: 'point-1',
      topic: 'Initial Project Review & Strategy',
      owner: '',
      status: 'decided',
      sub_points: ['Review key objectives for this sprint.', 'Assign responsibilities to team leads.']
    }
  ]);

  // Helper to get day name
  const computeDayName = (dateStr) => {
    if (!dateStr) return '';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : days[d.getDay()];
  };

  // Fetch MoMs
  const fetchMoMs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('/api/moms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setMoms(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch MoMs:', err);
      setError(err.response?.data?.message || 'Failed to load Minutes of Meeting.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoMs();
  }, []);

  // Update meeting day automatically when date changes
  useEffect(() => {
    if (formMeetingDate) {
      setFormMeetingDay(computeDayName(formMeetingDate));
    }
  }, [formMeetingDate]);

  // Filtered MoMs
  const filteredMoms = useMemo(() => {
    return moms.filter(item => {
      // Department filter
      if (departmentFilter !== 'All' && item.department !== departmentFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(q);
        const attendeesMatch = item.attendees?.toLowerCase().includes(q);
        const creatorMatch = item.created_by_name?.toLowerCase().includes(q);
        const deptMatch = item.department?.toLowerCase().includes(q);
        return titleMatch || attendeesMatch || creatorMatch || deptMatch;
      }
      return true;
    });
  }, [moms, departmentFilter, searchQuery]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [departmentFilter, searchQuery, itemsPerPage]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredMoms.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMoms = useMemo(() => {
    return filteredMoms.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMoms, startIndex, itemsPerPage]);

  // Reset Form
  const resetForm = () => {
    setEditingId(null);
    setFormTitle('');
    setFormDepartment('Marketing');
    setFormMeetingDate(todayStr);
    setFormMeetingDay(computeDayName(todayStr));
    setFormMeetingWith('CEO Shailesh Rajpal');
    setFormCustomWith('');
    setFormAttendees('');
    setFormAgenda('');
    setFormPoints([
      {
        id: `point-${Date.now()}`,
        topic: '',
        owner: '',
        status: 'decided',
        sub_points: ['']
      }
    ]);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (mom) => {
    setEditingId(mom.id);
    setFormTitle(mom.title || '');
    setFormDepartment(mom.department || 'Other');
    setFormMeetingDate(mom.meeting_date || todayStr);
    setFormMeetingDay(mom.meeting_day || computeDayName(mom.meeting_date));
    setFormMeetingWith(mom.meeting_with || 'CEO Shailesh Rajpal');
    setFormCustomWith(mom.custom_meeting_with || '');
    setFormAttendees(mom.attendees || '');
    setFormAgenda(mom.agenda || '');

    const pts = Array.isArray(mom.discussion_points) && mom.discussion_points.length > 0
      ? mom.discussion_points
      : [
          {
            id: `point-${Date.now()}`,
            topic: '',
            owner: '',
            status: 'decided',
            sub_points: ['']
          }
        ];

    setFormPoints(pts);
    setIsModalOpen(true);
  };

  // Dynamic Point Builder Controls
  const handleAddTopic = () => {
    setFormPoints(prev => [
      ...prev,
      {
        id: `point-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        topic: '',
        owner: '',
        status: 'decided',
        sub_points: ['']
      }
    ]);
  };

  const handleRemoveTopic = (index) => {
    if (formPoints.length <= 1) {
      alert('At least one discussion topic is required.');
      return;
    }
    setFormPoints(prev => prev.filter((_, i) => i !== index));
  };

  const handleTopicChange = (index, field, value) => {
    setFormPoints(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddSubPoint = (topicIndex) => {
    setFormPoints(prev => {
      const updated = [...prev];
      const subs = [...(updated[topicIndex].sub_points || []), ''];
      updated[topicIndex] = { ...updated[topicIndex], sub_points: subs };
      return updated;
    });
  };

  const handleRemoveSubPoint = (topicIndex, subIndex) => {
    setFormPoints(prev => {
      const updated = [...prev];
      const subs = (updated[topicIndex].sub_points || []).filter((_, i) => i !== subIndex);
      updated[topicIndex] = { ...updated[topicIndex], sub_points: subs.length > 0 ? subs : [''] };
      return updated;
    });
  };

  const handleSubPointChange = (topicIndex, subIndex, value) => {
    setFormPoints(prev => {
      const updated = [...prev];
      const subs = [...(updated[topicIndex].sub_points || [])];
      subs[subIndex] = value;
      updated[topicIndex] = { ...updated[topicIndex], sub_points: subs };
      return updated;
    });
  };

  // Form Submit Handler
  const handleSubmitMoM = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formTitle.trim()) {
      alert('Please enter a Meeting Title.');
      return;
    }

    if (!formMeetingDate) {
      alert('Please select a Meeting Date.');
      return;
    }

    // Clean empty sub-points
    const cleanedPoints = formPoints.map(p => ({
      ...p,
      topic: p.topic.trim(),
      sub_points: (p.sub_points || []).map(s => s.trim()).filter(Boolean)
    })).filter(p => p.topic.length > 0);

    if (cleanedPoints.length === 0) {
      alert('Please add at least one discussion topic.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: formTitle.trim(),
        department: formDepartment,
        meeting_date: formMeetingDate,
        meeting_day: formMeetingDay || computeDayName(formMeetingDate),
        meeting_with: formMeetingWith,
        custom_meeting_with: formMeetingWith === 'Other' ? formCustomWith.trim() : null,
        attendees: formAttendees.trim(),
        agenda: formAgenda.trim(),
        discussion_points: cleanedPoints
      };

      if (editingId) {
        const res = await axios.put(`/api/moms/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setIsModalOpen(false);
          resetForm();
          fetchMoMs();
        }
      } else {
        const res = await axios.post('/api/moms', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setIsModalOpen(false);
          resetForm();
          fetchMoMs();
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save MoM.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Soft Delete MoM
  const handleDeleteMoM = async () => {
    if (!deletingId) return;
    try {
      const res = await axios.delete(`/api/moms/${deletingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setIsDeleteModalOpen(false);
        setDeletingId(null);
        fetchMoMs();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete MoM record.');
    }
  };

  // Format date helper
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    return dateStr;
  };

  const stats = useMemo(() => {
    const total = moms.length;
    const ceoMeetings = moms.filter(m => m.meeting_with === 'CEO Shailesh Rajpal' || m.meeting_with === 'Boss Shailesh Rajpal').length;
    const marketingCount = moms.filter(m => m.department === 'Marketing').length;
    const seoCount = moms.filter(m => m.department === 'SEO').length;
    const hrCount = moms.filter(m => m.department === 'HR').length;
    return { total, ceoMeetings, marketingCount, seoCount, hrCount };
  }, [moms]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header Navigation & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-5 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/tasks')}
            className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
            title="Back to Task Manager"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Minutes of Meeting (MoM)</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-wider">
                Corporate Log
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Document, structure, and export point-wise team meeting minutes across departments
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-500/10 transition-all font-semibold text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create New MoM</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Total MoMs</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">CEO Shailesh Rajpal Meetings</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{stats.ceoMeetings}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Marketing & SEO</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{stats.marketingCount + stats.seoCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">HR & Payroll</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{stats.hrCount}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col lg:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search MoM title, attendees, creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          {/* Department Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">All Departments</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">{dept}</option>
              ))}
            </select>
          </div>

          {/* Items Per Page Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value={5} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">5</option>
              <option value={10} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">10</option>
              <option value={15} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">15</option>
              <option value={20} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">20</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main MoMs Scrollable Table Container */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading Minutes of Meeting...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-xs font-semibold">
            {error}
          </div>
        ) : filteredMoms.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Minutes of Meeting (MoM) Found</p>
            <p className="text-xs text-slate-400">Click "+ Create New MoM" to add a new meeting summary.</p>
          </div>
        ) : (
          <>
            <div className="max-h-[600px] overflow-x-auto overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-md text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-white/5">
                  <tr>
                    <th className="p-4">Meeting Title</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Meeting Date & Day</th>
                    <th className="p-4">Meeting With</th>
                    <th className="p-4">Logged By</th>
                    <th className="p-4 text-center">Topics</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium text-slate-700 dark:text-slate-200">
                  {paginatedMoms.map((item) => {
                    const withDisplay = item.meeting_with === 'Other' ? (item.custom_meeting_with || 'Other') : item.meeting_with;
                    const pointsCount = Array.isArray(item.discussion_points) ? item.discussion_points.length : 0;
                    const canEditOrDelete = user?.role === 'admin' || user?.id === item.created_by || user?.id === item.creator_manager_id;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                          <div>
                            <span className="block truncate">{item.title}</span>
                            {item.agenda && <span className="block text-[10px] text-slate-400 font-normal truncate mt-0.5">{item.agenda}</span>}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            {item.department}
                          </span>
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDateDisplay(item.meeting_date)}</span>
                            {item.meeting_day && <span className="text-[10px] text-slate-400 font-semibold">({item.meeting_day})</span>}
                          </div>
                        </td>

                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {withDisplay}
                        </td>

                        <td className="p-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[9px] flex items-center justify-center">
                              {item.created_by_name ? item.created_by_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span>{item.created_by_name || 'User'}</span>
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {pointsCount} Points
                          </span>
                        </td>

                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            {/* View Details */}
                            <button
                              onClick={() => { setSelectedMoM(item); setIsViewModalOpen(true); }}
                              className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="View Discussion Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Print / Export PDF */}
                            <button
                              onClick={() => { setSelectedMoM(item); setIsPrintModalOpen(true); }}
                              className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Print / Download PDF"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Edit */}
                            {canEditOrDelete && (
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                                title="Edit MoM"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete */}
                            {canEditOrDelete && (
                              <button
                                onClick={() => { setDeletingId(item.id); setIsDeleteModalOpen(true); }}
                                className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Delete MoM"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/20 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Showing <span className="font-bold text-slate-800 dark:text-white">{startIndex + 1}</span> to <span className="font-bold text-slate-800 dark:text-white">{Math.min(startIndex + itemsPerPage, filteredMoms.length)}</span> of <span className="font-bold text-slate-800 dark:text-white">{filteredMoms.length}</span> MoMs
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-bold text-slate-800 dark:text-white">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CREATE / EDIT MOM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-hidden">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <FileText className="w-4.5 h-4.5 text-rose-500" />
                <span>{editingId ? 'Edit Minutes of Meeting (MoM)' : 'Create Minutes of Meeting (MoM)'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitMoM} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs scrollbar-thin">
              {/* Meeting Title */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                  Meeting Title / Subject *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Weekly SEO & Campaign Performance Review"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Grid: Department, Date, Day, Meeting With */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Department *
                  </label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Meeting Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formMeetingDate}
                    onChange={(e) => setFormMeetingDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-slate-100 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Day (Auto)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formMeetingDay}
                    className="w-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Meeting With *
                  </label>
                  <select
                    value={formMeetingWith}
                    onChange={(e) => setFormMeetingWith(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="CEO Shailesh Rajpal" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">CEO Shailesh Rajpal</option>
                    <option value="Other" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Other Person</option>
                  </select>
                </div>
              </div>

              {/* Custom Meeting With Input if Other selected */}
              {formMeetingWith === 'Other' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Meeting With (Custom Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCustomWith}
                    onChange={(e) => setFormCustomWith(e.target.value)}
                    placeholder="Enter meeting person's name / title..."
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-slate-100"
                  />
                </div>
              )}

              {/* Attendees & Agenda */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Attendees / Participants
                  </label>
                  <input
                    type="text"
                    value={formAttendees}
                    onChange={(e) => setFormAttendees(e.target.value)}
                    placeholder="e.g. Shailesh Rajpal, Priyanshu Garg, Marketing Team"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Agenda / Main Goal
                  </label>
                  <input
                    type="text"
                    value={formAgenda}
                    onChange={(e) => setFormAgenda(e.target.value)}
                    placeholder="e.g. Finalize Q3 campaign budgets and content calendar"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* DYNAMIC POINT-WISE DISCUSSION BUILDER */}
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-rose-500" />
                      <span>Discussion Points & Action Items (Point-Wise)</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">Add structured main topics and nested sub-points / action decisions.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTopic}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Main Topic</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {formPoints.map((pt, tIdx) => (
                    <div key={pt.id || tIdx} className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-3">
                      {/* Topic Title Row */}
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-xs text-rose-500 whitespace-nowrap">Point {tIdx + 1}:</span>
                        <input
                          type="text"
                          required
                          value={pt.topic}
                          onChange={(e) => handleTopicChange(tIdx, 'topic', e.target.value)}
                          placeholder={`Enter Main Topic ${tIdx + 1} (e.g., Technical SEO Crawl Error Resolution)...`}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(tIdx)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remove Topic"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Sub-Points List */}
                      <div className="pl-6 space-y-2 border-l-2 border-slate-200 dark:border-white/10 ml-2">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Sub-Points / Decisions / Action Items:</span>
                        {(pt.sub_points || []).map((sub, sIdx) => (
                          <div key={sIdx} className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-slate-400">{tIdx + 1}.{sIdx + 1}</span>
                            <input
                              type="text"
                              value={sub}
                              onChange={(e) => handleSubPointChange(tIdx, sIdx, e.target.value)}
                              placeholder={`Action Item / Sub-point ${sIdx + 1}...`}
                              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveSubPoint(tIdx, sIdx)}
                              className="p-1 text-slate-300 hover:text-rose-400 transition-colors"
                              title="Remove Sub-point"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleAddSubPoint(tIdx)}
                          className="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center space-x-1 pt-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Add Sub-point</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>

                {isSubmitting ? (
                  <div className="px-5 py-2 bg-rose-600/60 text-white rounded-xl font-bold text-xs flex items-center space-x-2 cursor-not-allowed opacity-80 select-none">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{editingId ? 'Updating...' : 'Saving MoM...'}</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-500/10"
                  >
                    {editingId ? 'Save Changes' : 'Save Minutes of Meeting'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {isViewModalOpen && selectedMoM && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6 overflow-hidden">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 shrink-0">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Eye className="w-5 h-5 text-blue-500" />
                <span>Minutes of Meeting Details</span>
              </h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6 text-sm overflow-y-auto flex-1 custom-scrollbar">
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Meeting Title / Subject</span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-snug">{selectedMoM.title}</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-white/[0.02] p-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Department</span>
                  <span className="font-bold text-rose-500 text-sm">{selectedMoM.department}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Meeting Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDateDisplay(selectedMoM.meeting_date)} ({selectedMoM.meeting_day})</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Meeting With</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedMoM.meeting_with === 'Other' ? selectedMoM.custom_meeting_with : selectedMoM.meeting_with}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Logged By</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedMoM.created_by_name || 'User'}</span>
                </div>
              </div>

              {selectedMoM.attendees && (
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Attendees / Participants</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50/50 dark:bg-white/[0.01] p-3 rounded-xl border border-slate-100 dark:border-white/5">{selectedMoM.attendees}</p>
                </div>
              )}

              {selectedMoM.agenda && (
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Agenda / Purpose</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50/50 dark:bg-white/[0.01] p-3 rounded-xl border border-slate-100 dark:border-white/5">{selectedMoM.agenda}</p>
                </div>
              )}

              {/* Point-Wise Discussion */}
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-4">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Discussion Points & Decisions:</span>
                {Array.isArray(selectedMoM.discussion_points) && selectedMoM.discussion_points.length > 0 ? (
                  <div className="space-y-4">
                    {selectedMoM.discussion_points.map((pt, idx) => (
                      <div key={idx} className="bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2.5 shadow-sm">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center">
                          <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-md text-xs font-bold mr-2.5">Point {idx + 1}</span>
                          <span>{pt.topic}</span>
                        </h4>
                        {Array.isArray(pt.sub_points) && pt.sub_points.length > 0 && (
                          <ul className="pl-6 list-disc space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                            {pt.sub_points.map((sub, sIdx) => (
                              <li key={sIdx} className="leading-relaxed">{sub}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No detailed discussion points logged.</p>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  onClick={() => { setIsViewModalOpen(false); setIsPrintModalOpen(true); }}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Download PDF</span>
                </button>

                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT / PDF DOWNLOAD MODAL WITH LOGO HEADER & DEVELOPER CREDIT FOOTER */}
      {isPrintModalOpen && selectedMoM && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto print-overlay">
          {/* Embedded Print CSS */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm 10mm 10mm 10mm;
              }
              *,
              *::before,
              *::after,
              html,
              html.dark,
              body,
              body.dark,
              #root,
              #root > div,
              main {
                background-color: #ffffff !important;
                background: #ffffff !important;
                color: #0f172a !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                text-shadow: none !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              /* Hide main page by default */
              body * {
                visibility: hidden !important;
              }
              /* Unhide printable modal tree */
              .print-overlay,
              .print-modal-card,
              #mom-printable-area,
              #mom-printable-area * {
                visibility: visible !important;
              }
              /* Lock print-overlay to top-left (0,0) of Page 1 */
              .print-overlay {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                display: block !important;
                background: #ffffff !important;
                align-items: flex-start !important;
                justify-content: flex-start !important;
                transform: none !important;
                z-index: 999999 !important;
              }
              .print-modal-card {
                position: static !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                background: #ffffff !important;
                max-height: none !important;
                overflow: visible !important;
                display: block !important;
                transform: none !important;
              }
              #mom-printable-area {
                position: static !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                background: #ffffff !important;
                display: block !important;
              }
              .mom-topic-card,
              .mom-signoff-block {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              #mom-printable-area .bg-slate-900,
              #mom-printable-area .bg-slate-900 * {
                background-color: #0f172a !important;
                color: #ffffff !important;
              }
              #mom-printable-area .bg-rose-600,
              #mom-printable-area .bg-rose-600 * {
                background-color: #e11d48 !important;
                color: #ffffff !important;
              }
              #mom-printable-area table tr.bg-slate-100\/80,
              #mom-printable-area .bg-slate-100 {
                background-color: #f1f5f9 !important;
              }
              #mom-printable-area table tr.bg-slate-50\/50,
              #mom-printable-area .bg-slate-50\/40 {
                background-color: #f8fafc !important;
              }
              .no-print,
              .no-print * {
                display: none !important;
                visibility: hidden !important;
              }
            }
          `}</style>

          <div className="relative bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col p-6 sm:p-8 space-y-5 max-h-[95vh] overflow-y-auto print-modal-card">
            {/* Top Action Bar (Hidden during print) */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 no-print">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-sm text-slate-900">Executive A4 Printable Minutes of Meeting</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document (A4)</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl font-semibold text-xs transition-all"
                >
                  Close
                </button>
              </div>
            </div>

            {/* PRINTABLE DOCUMENT A4 PAGE */}
            <div className="bg-white text-slate-900 space-y-4 font-sans border border-slate-200 p-6 sm:p-8 rounded-xl shadow-sm" id="mom-printable-area">
              {/* EXECUTIVE LOGO & TITLE HEADER BANNER */}
              <div className="flex items-start justify-between pb-3 border-b-2 border-slate-900">
                <div className="flex items-center space-x-3.5">
                  <img
                    src={logoImg}
                    alt="Whiteforce Logo"
                    className="h-11 w-auto object-contain"
                  />
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">MINUTES OF MEETING</h1>
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mt-0.5">
                      WHITEFORCE CORPORATE LOG &bull; {selectedMoM.department} DEPARTMENT
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white text-[10px] font-extrabold tracking-wider uppercase rounded">
                    REF: MOM-#{selectedMoM.id}
                  </span>
                  <div className="text-[11px] font-bold text-slate-700 pt-0.5">
                    {formatDateDisplay(selectedMoM.meeting_date)} <span className="text-slate-500 font-medium">({selectedMoM.meeting_day})</span>
                  </div>
                </div>
              </div>

              {/* METADATA DETAILS TABLE */}
              <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-300 bg-slate-100/80">
                      <td className="p-1.5 px-2.5 font-bold text-slate-500 uppercase tracking-wider w-1/4 border-r border-slate-300 text-[10px]">Meeting Title</td>
                      <td className="p-1.5 px-2.5 font-extrabold text-slate-900 text-xs w-3/4" colSpan={3}>
                        {selectedMoM.title}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 px-2.5 font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 text-[10px]">Department</td>
                      <td className="p-1.5 px-2.5 font-bold text-rose-600 uppercase border-r border-slate-200 text-[11px]">{selectedMoM.department}</td>
                      <td className="p-1.5 px-2.5 font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 text-[10px]">Meeting With</td>
                      <td className="p-1.5 px-2.5 font-bold text-slate-900 text-[11px]">
                        {selectedMoM.meeting_with === 'Other' ? (selectedMoM.custom_meeting_with || 'Other') : selectedMoM.meeting_with}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <td className="p-1.5 px-2.5 font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 text-[10px]">Meeting Date & Day</td>
                      <td className="p-1.5 px-2.5 font-semibold text-slate-800 border-r border-slate-200 text-[11px]">
                        {formatDateDisplay(selectedMoM.meeting_date)} ({selectedMoM.meeting_day})
                      </td>
                      <td className="p-1.5 px-2.5 font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 text-[10px]">Logged By</td>
                      <td className="p-1.5 px-2.5 font-semibold text-slate-800 text-[11px]">{selectedMoM.created_by_name || 'User'}</td>
                    </tr>
                    {selectedMoM.attendees && (
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 px-2.5 font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 text-[10px]">Attendees</td>
                        <td className="p-1.5 px-2.5 font-semibold text-slate-800 text-[11px]" colSpan={3}>{selectedMoM.attendees}</td>
                      </tr>
                    )}
                    {selectedMoM.agenda && (
                      <tr>
                        <td className="p-1.5 px-2.5 font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 text-[10px]">Agenda / Purpose</td>
                        <td className="p-1.5 px-2.5 font-semibold text-slate-800 text-[11px]" colSpan={3}>{selectedMoM.agenda}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* POINT-WISE DISCUSSION & ACTION DECISIONS */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">
                    AGENDA, DISCUSSION & ACTION DECISIONS
                  </h3>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">
                    {Array.isArray(selectedMoM.discussion_points) ? selectedMoM.discussion_points.length : 0} Main Topics Logged
                  </span>
                </div>

                {Array.isArray(selectedMoM.discussion_points) && selectedMoM.discussion_points.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedMoM.discussion_points.map((pt, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/40 mom-topic-card">
                        {/* Topic Title Header */}
                        <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between">
                          <h4 className="font-bold text-xs text-slate-900">
                            <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-extrabold mr-2 uppercase tracking-wider">
                              POINT {idx + 1}
                            </span>
                            {pt.topic}
                          </h4>
                        </div>

                        {/* Sub-Points */}
                        {Array.isArray(pt.sub_points) && pt.sub_points.length > 0 ? (
                          <div className="p-3 pt-2">
                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Key Decisions & Action Steps:</span>
                            <ul className="space-y-1 pl-1">
                              {pt.sub_points.map((sub, sIdx) => (
                                <li key={sIdx} className="text-[11px] text-slate-800 font-medium flex items-start space-x-2 leading-tight">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 shrink-0"></span>
                                  <span>{sub}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="p-2 px-3 text-[10px] text-slate-400 italic">No action items logged for this topic.</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic p-3 text-center border border-dashed border-slate-300 rounded-xl">
                    No detailed discussion points recorded.
                  </p>
                )}
              </div>

              {/* OFFICIAL SIGN-OFF BLOCK */}
              <div className="pt-4 mt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-[11px] mom-signoff-block">
                <div>
                  <div className="border-b border-slate-400 pb-5 mb-1"></div>
                  <span className="block font-bold text-slate-900">Meeting Presided By</span>
                  <span className="text-[9px] font-semibold text-slate-500">({selectedMoM.meeting_with === 'Other' ? (selectedMoM.custom_meeting_with || 'Meeting Chair') : selectedMoM.meeting_with})</span>
                </div>

                <div>
                  <div className="border-b border-slate-400 pb-5 mb-1"></div>
                  <span className="block font-bold text-slate-900">Prepared & Logged By</span>
                  <span className="text-[9px] font-semibold text-slate-500">({selectedMoM.created_by_name || 'User'})</span>
                </div>

                <div>
                  <div className="border-b border-slate-400 pb-5 mb-1"></div>
                  <span className="block font-bold text-slate-900">Approved By</span>
                  <span className="text-[9px] font-semibold text-slate-500">(Department Head / Admin)</span>
                </div>
              </div>

              {/* DOCUMENT FOOTER WITH DEVELOPER CREDITS */}
              <div className="pt-3 mt-3 border-t-2 border-slate-900 flex justify-between items-center text-[9px] text-slate-500 font-semibold">
                <div>
                  <span className="block font-bold text-slate-900">Confidential Corporate Document</span>
                  <span>Whiteforce & Meta API Task Management System</span>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-slate-900">Developed by Priyanshu Garg</span>
                  <span className="text-slate-500">Support & Problem Resolution</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOFT DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-hidden">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Delete MoM Record?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This Minutes of Meeting record will be removed from your team's view.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMoM}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/10"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoMManager;
