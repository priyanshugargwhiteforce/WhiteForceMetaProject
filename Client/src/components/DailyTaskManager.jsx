import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Calendar,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  User,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Download,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Share2,
  Building,
  Tag,
  Briefcase,
  RefreshCw,
  FileSpreadsheet,
  ArrowLeft,
  FileDown,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const KPICard = ({ title, value, color, icon: Icon, subtitle }) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/[0.08]',
      border: 'border-blue-500/20 dark:border-blue-500/20',
      iconBg: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    },
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/[0.08]',
      border: 'border-emerald-500/20 dark:border-emerald-500/20',
      iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    },
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/[0.08]',
      border: 'border-indigo-500/20 dark:border-indigo-500/20',
      iconBg: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/[0.08]',
      border: 'border-rose-500/20 dark:border-rose-500/20',
      iconBg: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
    },
    sky: {
      bg: 'bg-sky-500/10 dark:bg-sky-500/[0.08]',
      border: 'border-sky-500/20 dark:border-sky-500/20',
      iconBg: 'bg-sky-500/20 text-sky-600 dark:text-sky-400',
    }
  };

  const style = colorMap[color] || colorMap.blue;

  return (
    <div className={`p-4 rounded-2xl border ${style.border} ${style.bg} backdrop-blur-xl shadow-sm transition-all duration-200 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{title}</span>
        <div className={`p-2 rounded-xl ${style.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value || 0}</p>
      {subtitle && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium truncate">{subtitle}</p>}
    </div>
  );
};

const DailyTaskManager = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Summary & Breakdown State
  const [summary, setSummary] = useState({
    totalTasks: 0,
    todayTasks: 0,
    facebookTasks: 0,
    linkedinTasks: 0,
    youtubeTasks: 0,
    twitterTasks: 0
  });
  const [breakdown, setBreakdown] = useState({
    departmentCounts: [],
    employeeCounts: [],
    platformCounts: [],
    themeCounts: []
  });

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterTheme, setFilterTheme] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [todayOnlyFilter, setTodayOnlyFilter] = useState(false);

  // Modals state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  const canUserEditOrDelete = (task) => {
    if (!user || !task) return false;
    if (user.role === 'admin' || user.role === 'manager') return true;
    const isCreator = task.created_by && Number(task.created_by) === Number(user.id);
    const isAssignee = task.employee && (
      task.employee.trim().toLowerCase() === (user.username || '').toLowerCase() ||
      task.employee.trim().toLowerCase() === (user.email || '').toLowerCase()
    );
    const isGivenBy = task.given_by && task.given_by.trim().toLowerCase() === (user.username || '').toLowerCase();
    return isCreator || isAssignee || isGivenBy;
  };

  // Form State for Manual Entry / Edit
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    theme: '',
    social_media_platform: 'General',
    page_name: '',
    department: '',
    manager_name: '',
    given_by: '',
    employee: '',
    poster_name: '',
    position: '',
    location: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    youtube: '',
    twitter: ''
  });

  useEffect(() => {
    fetchTasks();
    fetchReports();
  }, [pagination.page, pagination.limit, sortBy, sortOrder, filterDate, filterEmployee, filterDepartment, filterTheme, filterPlatform, todayOnlyFilter]);

  // Handle Real-time Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Prevent background scrolling when any modal is open (both body and main container)
  useEffect(() => {
    const isAnyModalOpen = isManualModalOpen || isUploadModalOpen || isViewModalOpen || isDeleteModalOpen;
    const mainElem = document.querySelector('main');
    if (isAnyModalOpen) {
      if (mainElem) mainElem.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      if (mainElem) mainElem.style.overflow = 'auto';
      document.body.style.overflow = 'unset';
    }
    return () => {
      if (mainElem) mainElem.style.overflow = 'auto';
      document.body.style.overflow = 'unset';
    };
  }, [isManualModalOpen, isUploadModalOpen, isViewModalOpen, isDeleteModalOpen]);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/daily-tasks', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery,
          date: filterDate,
          employee: filterEmployee,
          department: filterDepartment,
          theme: filterTheme,
          platform: filterPlatform,
          sortBy,
          sortOrder,
          todayOnly: todayOnlyFilter ? 'true' : 'false'
        }
      });
      if (res.data.success) {
        setTasks(res.data.tasks || []);
        if (res.data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: res.data.pagination.total,
            totalPages: res.data.pagination.totalPages
          }));
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load Daily Tasks.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const res = await axios.get('/api/daily-tasks/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSummary(res.data.summary || {});
        setBreakdown(res.data.breakdown || {});
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      theme: '',
      social_media_platform: 'General',
      page_name: '',
      department: '',
      manager_name: '',
      given_by: '',
      employee: '',
      poster_name: '',
      position: '',
      location: '',
      facebook: '',
      instagram: '',
      linkedin: '',
      youtube: '',
      twitter: ''
    });
    setIsEditMode(false);
    setCurrentTaskId(null);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.date) {
      alert('Please enter a valid Date.');
      return;
    }
    if (!formData.employee.trim()) {
      alert('Employee Name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditMode) {
        const res = await axios.put(`/api/daily-tasks/${currentTaskId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          showToast('Daily Task updated successfully.');
          setIsManualModalOpen(false);
          resetForm();
          fetchTasks();
          fetchReports();
        }
      } else {
        const res = await axios.post('/api/daily-tasks', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          showToast('Daily Task created successfully.');
          setIsManualModalOpen(false);
          resetForm();
          fetchTasks();
          fetchReports();
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (task) => {
    setIsEditMode(true);
    setCurrentTaskId(task.id);
    setFormData({
      date: task.date ? task.date.split('T')[0] : '',
      theme: task.theme || '',
      social_media_platform: task.social_media_platform || 'General',
      page_name: task.page_name || '',
      department: task.department || '',
      manager_name: task.manager_name || '',
      given_by: task.given_by || '',
      employee: task.employee || '',
      poster_name: task.poster_name || task.position || '',
      position: task.position || task.poster_name || '',
      location: task.location || '',
      facebook: task.facebook || '',
      instagram: task.instagram || '',
      linkedin: task.linkedin || '',
      youtube: task.youtube || '',
      twitter: task.twitter || ''
    });
    setIsManualModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTaskId) return;
    try {
      const res = await axios.delete(`/api/daily-tasks/${deletingTaskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        showToast('Daily Task soft-deleted successfully.');
        setIsDeleteModalOpen(false);
        setDeletingTaskId(null);
        fetchTasks();
        fetchReports();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select an Excel file (.xlsx or .xls).');
      return;
    }

    const payload = new FormData();
    payload.append('file', uploadFile);

    setUploading(true);
    setUploadSummary(null);

    try {
      const res = await axios.post('/api/daily-tasks/upload', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data.success) {
        setUploadSummary(res.data.summary);
        showToast('Excel upload processed successfully.');
        fetchTasks();
        fetchReports();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Excel upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await axios.get('/api/daily-tasks/export', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          search: searchQuery,
          date: filterDate,
          employee: filterEmployee,
          department: filterDepartment,
          theme: filterTheme,
          platform: filterPlatform
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `daily_tasks_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Excel file exported successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to export Excel file.');
    }
  };

  const handleDownloadSampleTemplate = async () => {
    try {
      const response = await axios.get('/api/daily-tasks/sample-template', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'daily_tasks_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Sample Excel template downloaded successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to download Excel template sheet.');
    }
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterDate('');
    setFilterEmployee('');
    setFilterDepartment('');
    setFilterTheme('');
    setFilterPlatform('');
    setTodayOnlyFilter(false);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getPlatformBadge = (platform) => {
    switch ((platform || '').toLowerCase()) {
      case 'facebook':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-600/10 text-blue-500 border border-blue-500/20 uppercase">Facebook</span>;
      case 'linkedin':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-600/10 text-indigo-500 border border-indigo-500/20 uppercase">LinkedIn</span>;
      case 'youtube':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-600/10 text-rose-500 border border-rose-500/20 uppercase">YouTube</span>;
      case 'twitter':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">Twitter</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 uppercase">{platform || 'General'}</span>;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-7 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle className="w-4 h-4 text-emerald-200" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Header Block */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-5 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-md">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/tasks')} 
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
            title="Back to Task Manager"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Daily Task</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                Module
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Today's Tasks, manual entries, bulk Excel upload & performance reports</p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => { resetForm(); setIsManualModalOpen(true); }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/10 transition-all font-semibold text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Manual Entry</span>
          </button>

          <button
            onClick={() => { setUploadFile(null); setUploadSummary(null); setIsUploadModalOpen(true); }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/10 transition-all font-semibold text-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Excel</span>
          </button>

          <button
            onClick={handleDownloadSampleTemplate}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl transition-all font-semibold text-xs"
            title="Download formatted sample Excel sheet"
          >
            <FileDown className="w-4 h-4 text-emerald-500" />
            <span>Download Template</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl transition-all font-semibold text-xs"
            title="Export filtered records to Excel"
          >
            <Download className="w-4 h-4 text-blue-500" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <KPICard title="Total Tasks" value={summary.totalTasks} color="blue" icon={FileText} subtitle="All Active Records" />
        <KPICard title="Today's Tasks" value={summary.todayTasks} color="emerald" icon={Calendar} subtitle="Logged Today" />
        <KPICard title="Facebook" value={summary.facebookTasks} color="blue" icon={Share2} subtitle="FB Activity Posts" />
        <KPICard title="LinkedIn" value={summary.linkedinTasks} color="indigo" icon={Briefcase} subtitle="LinkedIn Posts" />
        <KPICard title="YouTube" value={summary.youtubeTasks} color="rose" icon={Tag} subtitle="Videos & Shorts" />
        <KPICard title="Twitter" value={summary.twitterTasks} color="sky" icon={Share2} subtitle="Tweets & Retweets" />
      </div>

      {/* Clean & Aligned Filter Toolbar */}
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 shadow-sm dark:shadow-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          
          {/* Realtime Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Realtime search daily tasks..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="w-full bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & Controls Grouped In Single Line */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Compact Date Selector */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="w-[130px] bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer dark:[color-scheme:dark]"
              title="Filter by Date"
            />

            {/* Department Filter */}
            <select
              value={filterDepartment}
              onChange={(e) => { setFilterDepartment(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="w-[140px] bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer truncate"
            >
              <option className="bg-white dark:bg-slate-800" value="">All Departments</option>
              {breakdown.departmentCounts && breakdown.departmentCounts.map(d => (
                <option className="bg-white dark:bg-slate-800" key={d.name} value={d.name}>{d.name} ({d.count})</option>
              ))}
            </select>

            {/* Employee Filter */}
            <select
              value={filterEmployee}
              onChange={(e) => { setFilterEmployee(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="w-[140px] bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer truncate"
            >
              <option className="bg-white dark:bg-slate-800" value="">All Employees</option>
              {breakdown.employeeCounts && breakdown.employeeCounts.map(e => (
                <option className="bg-white dark:bg-slate-800" key={e.name} value={e.name}>{e.name} ({e.count})</option>
              ))}
            </select>

            {/* Platform Filter */}
            <select
              value={filterPlatform}
              onChange={(e) => { setFilterPlatform(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="w-[125px] bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            >
              <option className="bg-white dark:bg-slate-800" value="">All Platforms</option>
              <option className="bg-white dark:bg-slate-800" value="Facebook">Facebook</option>
              <option className="bg-white dark:bg-slate-800" value="LinkedIn">LinkedIn</option>
              <option className="bg-white dark:bg-slate-800" value="YouTube">YouTube</option>
              <option className="bg-white dark:bg-slate-800" value="Twitter">Twitter</option>
              <option className="bg-white dark:bg-slate-800" value="General">General</option>
            </select>

            {/* Today's Only Toggle */}
            <button
              onClick={() => setTodayOnlyFilter(!todayOnlyFilter)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                todayOnlyFilter
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                  : 'bg-slate-100/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Today's Only
            </button>

            {/* Reset Filters */}
            {(searchQuery || filterDate || filterEmployee || filterDepartment || filterTheme || filterPlatform || todayOnlyFilter) && (
              <button
                onClick={resetFilters}
                className="px-2.5 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                title="Reset Filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm dark:shadow-md">
        
        {/* Table Header Section */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.03]">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-2">
            <span>Today's & Active Daily Tasks</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-semibold">
              {pagination.total} records
            </span>
          </h2>

          {/* Rows Per Page Selector */}
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            <span>Rows per page:</span>
            <select
              value={pagination.limit}
              onChange={(e) => setPagination(p => ({ ...p, limit: Number(e.target.value), page: 1 }))}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-xs text-slate-500 font-semibold animate-pulse">Loading daily tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 dark:text-white/10 mb-3" />
            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1">No Daily Tasks Found</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-4">
              Upload an Excel file or click '+ Manual Entry' to record daily tasks.
            </p>
            <button
              onClick={() => { resetForm(); setIsManualModalOpen(true); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-lg shadow-blue-500/10"
            >
              + Create First Daily Task
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-100 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                  <th className="px-4 py-3.5 text-center w-12">S.No</th>
                  
                  <th 
                    onClick={() => handleSortChange('date')}
                    className="px-4 py-3.5 cursor-pointer hover:text-blue-500 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSortChange('theme')}
                    className="px-4 py-3.5 cursor-pointer hover:text-blue-500 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Theme</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>

                  <th className="px-4 py-3.5">Platform</th>

                  <th 
                    onClick={() => handleSortChange('page_name')}
                    className="px-4 py-3.5 cursor-pointer hover:text-blue-500 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Page Name</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSortChange('department')}
                    className="px-4 py-3.5 cursor-pointer hover:text-blue-500 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Department</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSortChange('manager_name')}
                    className="px-4 py-3.5 cursor-pointer hover:text-blue-500 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Manager Name</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>

                  <th className="px-4 py-3.5">Given By</th>

                  <th 
                    onClick={() => handleSortChange('employee')}
                    className="px-4 py-3.5 cursor-pointer hover:text-blue-500 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Employee</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>

                  <th className="px-4 py-3.5">Poster Name</th>
                  <th className="px-4 py-3.5">Location</th>
                  <th className="px-4 py-3.5">Facebook</th>
                  <th className="px-4 py-3.5">Instagram</th>
                  <th className="px-4 py-3.5">LinkedIn</th>
                  <th className="px-4 py-3.5">YouTube</th>
                  <th className="px-4 py-3.5">Twitter</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {tasks.map((task, idx) => {
                  const serialNo = (pagination.page - 1) * pagination.limit + idx + 1;
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3.5 text-center font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {serialNo}
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {task.date ? new Date(task.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                      </td>

                      <td className="px-4 py-3.5 max-w-[150px] truncate font-medium text-slate-700 dark:text-slate-300" title={task.theme}>
                        {task.theme || '-'}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getPlatformBadge(task.social_media_platform)}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-medium text-blue-600 dark:text-blue-400">
                        {task.page_name || '-'}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-350">
                        {task.department || '-'}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-700 dark:text-slate-300 font-semibold">
                        {task.manager_name || '-'}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-350">
                        {task.given_by || '-'}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        {task.employee || '-'}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                        {task.poster_name || task.position || '-'}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                        {task.location || '-'}
                      </td>

                      <td className="px-4 py-3.5 max-w-[120px] truncate text-slate-500" title={task.facebook}>
                        {task.facebook || '-'}
                      </td>

                      <td className="px-4 py-3.5 max-w-[120px] truncate text-slate-500" title={task.instagram}>
                        {task.instagram || '-'}
                      </td>

                      <td className="px-4 py-3.5 max-w-[120px] truncate text-slate-500" title={task.linkedin}>
                        {task.linkedin || '-'}
                      </td>

                      <td className="px-4 py-3.5 max-w-[120px] truncate text-slate-500" title={task.youtube}>
                        {task.youtube || '-'}
                      </td>

                      <td className="px-4 py-3.5 max-w-[120px] truncate text-slate-500" title={task.twitter}>
                        {task.twitter || '-'}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setViewingTask(task); setIsViewModalOpen(true); }}
                            className="p-1.5 text-slate-500 hover:bg-slate-500/10 dark:text-slate-400 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canUserEditOrDelete(task) && (
                            <>
                              <button
                                onClick={() => handleEditClick(task)}
                                className="p-1.5 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400 rounded-lg transition-colors"
                                title="Edit Daily Task"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => { setDeletingTaskId(task.id); setIsDeleteModalOpen(true); }}
                                className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <span className="text-xs text-slate-500 font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <div className="flex items-center space-x-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>

              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reports Section (Breakdown Analytics) */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
          <span>Reports Breakdown Section</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Department Breakdown */}
          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 space-y-3 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span>Department Wise</span>
              <Building className="w-3.5 h-3.5 text-blue-500" />
            </h4>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {breakdown.departmentCounts && breakdown.departmentCounts.map(item => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">{item.name}</span>
                    <span className="font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded text-[10px]">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (item.count / (summary.totalTasks || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Employee Breakdown */}
          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 space-y-3 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span>Employee Wise</span>
              <User className="w-3.5 h-3.5 text-emerald-500" />
            </h4>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {breakdown.employeeCounts && breakdown.employeeCounts.map(item => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">{item.name}</span>
                    <span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (item.count / (summary.totalTasks || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Breakdown */}
          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 space-y-3 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span>Platform Wise</span>
              <Share2 className="w-3.5 h-3.5 text-indigo-500" />
            </h4>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {breakdown.platformCounts && breakdown.platformCounts.map(item => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">{item.name}</span>
                    <span className="font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded text-[10px]">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (item.count / (summary.totalTasks || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Theme Breakdown */}
          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 space-y-3 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span>Theme Wise</span>
              <Tag className="w-3.5 h-3.5 text-rose-500" />
            </h4>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {breakdown.themeCounts && breakdown.themeCounts.map(item => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">{item.name}</span>
                    <span className="font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded text-[10px]">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (item.count / (summary.totalTasks || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals Area (Rendered via React Portal directly into document.body) ── */}

      {/* Manual Entry / Edit Form Modal */}
      {isManualModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-hidden">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>{isEditMode ? 'Edit Daily Task' : 'Manual Entry — Create Daily Task'}</span>
              </h3>
              <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:[color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employee Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priyanshu Garg"
                    value={formData.employee}
                    onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Themes</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Gen Campaign"
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Social Media Platform</label>
                  <select
                    value={formData.social_media_platform}
                    onChange={(e) => setFormData({ ...formData, social_media_platform: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="General">General</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Twitter">Twitter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Page Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Shailesh Rajpal / White force"
                    value={formData.page_name}
                    onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Boss / Onrole / Offrole"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Manager Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Deepali maam / Juhi maam"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Given By</label>
                  <input
                    type="text"
                    placeholder="e.g. Tanya / Shruti"
                    value={formData.given_by}
                    onChange={(e) => setFormData({ ...formData, given_by: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Poster Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Marketing Specialist"
                    value={formData.poster_name}
                    onChange={(e) => setFormData({ ...formData, poster_name: e.target.value, position: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Delhi / Noida"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Social Specific Posts / Notes */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform Specific Actions / URLs</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Facebook Action / Post Link"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Instagram Action / Post Link"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="LinkedIn Action / Post Link"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="YouTube Video / Shorts Link"
                    value={formData.youtube}
                    onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                    className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Twitter Tweet / Action Link"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                {isSubmitting ? (
                  <div className="px-5 py-2 bg-blue-600/60 text-white rounded-xl font-bold text-xs flex items-center space-x-2 cursor-not-allowed opacity-80 select-none">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isEditMode ? 'Updating Task...' : 'Saving Task...'}</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/10"
                  >
                    {isEditMode ? 'Update Task' : 'Save Task'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Upload Excel Modal */}
      {isUploadModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-hidden">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Upload Daily Tasks Excel</span>
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              {/* Sample Template Download Callout Banner */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 block">Need the exact Excel format?</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block">Download pre-formatted dummy template sheet with sample data</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Blank Template</span>
                </button>
              </div>

              {/* <p className="text-xs text-slate-500 leading-relaxed">
                Upload an Excel file containing required columns: <br/>
                <code className="text-[10px] bg-slate-100 dark:bg-white/5 px-1 py-0.5 rounded font-mono text-slate-700 dark:text-slate-300">
                  S.No, Date, Themes, Social Media Platforms, Department, Given By, Employee, Position, Location, Facebook, LinkedIn, Youtube, Twitter
                </code>
              </p> */}

              {/* Upload Zone */}
              <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="hidden"
                  id="excel-file-input"
                />
                <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-8 h-8 text-emerald-500 mb-2" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {uploadFile ? uploadFile.name : 'Click to select Excel file (.xlsx / .xls)'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">Maximum file size: 10 MB</span>
                </label>
              </div>

              {/* Upload Summary Report Result */}
              {uploadSummary && (
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl space-y-2 border border-slate-200 dark:border-white/10 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">Upload Result Summary:</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 font-semibold">
                    <div>Total Rows: <span className="text-blue-500 font-bold">{uploadSummary.totalRows}</span></div>
                    <div>Inserted: <span className="text-emerald-500 font-bold">{uploadSummary.inserted}</span></div>
                    <div>Duplicates Skipped: <span className="text-amber-500 font-bold">{uploadSummary.duplicate}</span></div>
                    <div>Failed: <span className="text-rose-500 font-bold">{uploadSummary.failed}</span></div>
                  </div>
                  {uploadSummary.errors && uploadSummary.errors.length > 0 && (
                    <div className="mt-2 text-[10px] text-rose-500 max-h-24 overflow-y-auto font-mono">
                      {uploadSummary.errors.map((err, i) => (
                        <div key={i}>Row {err.row}: {err.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-300"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={uploading || !uploadFile}
                  onClick={handleUploadSubmit}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/10 disabled:opacity-50 flex items-center space-x-2"
                >
                  {uploading ? <span>Processing...</span> : <span>Process Excel</span>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* View Task Details Modal */}
      {isViewModalOpen && viewingTask && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-hidden">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <Eye className="w-4 h-4 text-blue-500" />
                <span>Daily Task Details</span>
              </h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 scrollbar-thin">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Employee</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{viewingTask.employee}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingTask.date ? new Date(viewingTask.date).toLocaleDateString() : '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Page Name</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{viewingTask.page_name || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Department</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{viewingTask.department || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Manager Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingTask.manager_name || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Given By</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{viewingTask.given_by || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Theme</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{viewingTask.theme || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Platform</span>
                  <span className="font-bold text-blue-500">{viewingTask.social_media_platform || 'General'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Poster Name</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{viewingTask.poster_name || viewingTask.position || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Location</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{viewingTask.location || '-'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/5 space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform Action Details</span>
                <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                  <div><strong>Facebook:</strong> {viewingTask.facebook || '-'}</div>
                  <div><strong>Instagram:</strong> {viewingTask.instagram || '-'}</div>
                  <div><strong>LinkedIn:</strong> {viewingTask.linkedin || '-'}</div>
                  <div><strong>YouTube:</strong> {viewingTask.youtube || '-'}</div>
                  <div><strong>Twitter:</strong> {viewingTask.twitter || '-'}</div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Soft Delete Confirmation Modal */}
      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-hidden">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Soft Delete Daily Task?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This record will be marked as deleted. It will no longer appear in active daily task list and reports.
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
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/10"
              >
                Yes, Soft Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default DailyTaskManager;
