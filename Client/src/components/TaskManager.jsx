import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ClipboardList,
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
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  X
} from 'lucide-react';
import axios from 'axios';

const TaskManager = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const token = localStorage.getItem('token');

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adsLoading, setAdsLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [filterPlatform, setFilterPlatform] = useState('All');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    ad_platform: 'general',
    ad_id: '',
    ad_name: '',
    priority: 'medium',
    due_date: ''
  });

  useEffect(() => {
    fetchTasks();
    fetchAssignees();
  }, []);

  useEffect(() => {
    if (formData.ad_platform && formData.ad_platform !== 'general') {
      fetchAdsForPlatform(formData.ad_platform);
    } else {
      setAds([]);
      setFormData(prev => ({ ...prev, ad_id: '', ad_name: '' }));
    }
  }, [formData.ad_platform]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setTasks(res.data.tasks || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignees = async () => {
    try {
      const res = await axios.get('/api/tasks/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAssignees(res.data.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdsForPlatform = async (platform) => {
    setAdsLoading(true);
    try {
      const res = await axios.get(`/api/tasks/ads`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { platform }
      });
      if (res.data.success) {
        setAds(res.data.ads || []);
      }
    } catch (err) {
      console.error(err);
      setAds([]);
    } finally {
      setAdsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'ad_id') {
      const selectedAd = ads.find(ad => ad.id === value);
      setFormData(prev => ({
        ...prev,
        ad_id: value,
        ad_name: selectedAd ? selectedAd.name : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/tasks', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setIsCreateModalOpen(false);
        fetchTasks();
        resetForm();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create task.');
    }
  };

  const handleEditClick = (task) => {
    setCurrentTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to,
      ad_platform: task.ad_platform || 'general',
      ad_id: task.ad_id || '',
      ad_name: task.ad_name || '',
      priority: task.priority || 'medium',
      due_date: task.due_date ? task.due_date.split('T')[0] : ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`/api/tasks/${currentTask.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setIsEditModalOpen(false);
        fetchTasks();
        resetForm();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update task.');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await axios.put(`/api/tasks/${taskId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update task status.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const res = await axios.delete(`/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          fetchTasks();
        }
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Failed to delete task.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      assigned_to: '',
      ad_platform: 'general',
      ad_id: '',
      ad_name: '',
      priority: 'medium',
      due_date: ''
    });
    setCurrentTask(null);
  };

  const canCreateTask = user?.role === 'admin' || user?.role === 'manager';

  // Derived filtered tasks list
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
      const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
      const matchesAssignee = filterAssignee === 'All' || t.assigned_to === parseInt(filterAssignee);
      const matchesPlatform = filterPlatform === 'All' || t.ad_platform === filterPlatform;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesPlatform;
    });
  }, [tasks, searchQuery, filterStatus, filterPriority, filterAssignee, filterPlatform]);

  // Aggregate Metrics Calculations
  const stats = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    tasks.forEach(t => {
      if (t.status === 'pending') pending++;
      else if (t.status === 'in_progress') inProgress++;
      else if (t.status === 'completed') completed++;

      if (t.status !== 'completed' && t.due_date && t.due_date.split('T')[0] < todayStr) {
        overdue++;
      }
    });

    return { total: tasks.length, pending, inProgress, completed, overdue };
  }, [tasks]);

  const getPriorityBadgeColor = (prio) => {
    switch (prio) {
      case 'critical': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
    }
  };

  const getStatusBadgeColor = (stat) => {
    switch (stat) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'in_progress': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'cancelled': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/10';
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'meta': return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600/10 text-blue-500 border border-blue-500/20 uppercase">Meta</span>;
      case 'google': return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-600/10 text-amber-500 border border-amber-500/20 uppercase">Google</span>;
      case 'linkedin': return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-600/10 text-pink-500 border border-pink-500/20 uppercase">LinkedIn</span>;
      case 'whatsapp': return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 uppercase">WhatsApp</span>;
      default: return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 uppercase">General</span>;
    }
  };

  const isOverdue = (task) => {
    if (task.status === 'completed') return false;
    if (!task.due_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Title & Actions Block */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-5 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm dark:shadow-md">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Task Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Assign, track, and execute tasks mapped to Meta, Google, LinkedIn, or WhatsApp campaigns</p>
        </div>

        {canCreateTask && (
          <button
            onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/10 transition-all font-semibold text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPIItemCard title="Total Tasks" value={stats.total} color="blue" icon={ClipboardList} />
        <KPIItemCard title="Pending" value={stats.pending} color="slate" icon={Clock} />
        <KPIItemCard title="In Progress" value={stats.inProgress} color="indigo" icon={Clock} />
        <KPIItemCard title="Completed" value={stats.completed} color="emerald" icon={CheckCircle} />
        <KPIItemCard title="Overdue" value={stats.overdue} color="rose" icon={AlertTriangle} badge={stats.overdue > 0} />
      </div>

      {/* Filters Area */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col lg:flex-row gap-3 items-center shadow-sm">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap w-full lg:w-auto gap-3 flex-1 lg:justify-end">
          {/* Status filter */}
          <div className="relative min-w-[120px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none text-slate-850 dark:text-slate-350 pr-8"
            >
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>

          {/* Priority filter */}
          <div className="relative min-w-[120px]">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none text-slate-850 dark:text-slate-350 pr-8"
            >
              <option value="All">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>

          {/* Platform filter */}
          <div className="relative min-w-[120px]">
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none text-slate-850 dark:text-slate-350 pr-8"
            >
              <option value="All">All Platforms</option>
              <option value="general">General</option>
              <option value="meta">Meta Ads</option>
              <option value="google">Google Ads</option>
              <option value="linkedin">LinkedIn Ads</option>
              <option value="whatsapp">WhatsApp Campaigns</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>

          {/* Assignee filter (Admin/Manager only) */}
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <div className="relative min-w-[140px]">
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none text-slate-850 dark:text-slate-350 pr-8"
              >
                <option value="All">All Assignees</option>
                {assignees.map(u => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
            </div>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-xs text-slate-500 font-semibold animate-pulse">Loading tasks list...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="w-10 h-10 text-slate-300 dark:text-white/10 mb-2" />
            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1">No Tasks Discovered</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              No tasks matched your current search filters or there are no tasks assigned yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                  <th className="px-6 py-3.5">Task Details</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Assigned To</th>
                  <th className="px-6 py-3.5">Created By</th>
                  <th className="px-6 py-3.5">Due Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {filteredTasks.map((task) => {
                  const taskOverdue = isOverdue(task);
                  const isCreator = task.assigned_by === user?.id;
                  const isAssignee = task.assigned_to === user?.id;
                  const isAdmin = user?.role === 'admin';
                  const isManagerOfAssignee = user?.role === 'manager' && task.assignee_manager_id === user?.id;

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/[0.01] dark:hover:bg-white/[0.01] transition-colors group">
                      {/* Details & Ad linkages */}
                      <td className="px-6 py-3.5">
                        <div className="space-y-1 max-w-[280px]">
                          <span className={`font-bold block text-slate-800 dark:text-slate-200 text-sm ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="text-slate-500 block leading-normal truncate max-w-[280px]" title={task.description}>
                              {task.description}
                            </span>
                          )}
                          <div className="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
                            {getPlatformIcon(task.ad_platform)}
                            {task.ad_name && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 max-w-[150px] truncate" title={task.ad_name}>
                                {task.ad_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${getPriorityBadgeColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>

                      {/* Status select dropdown */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {isAssignee || isAdmin || isCreator || isManager ? (
                          <div className="relative inline-block">
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              className={`pl-2 pr-6 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border cursor-pointer appearance-none focus:outline-none ${getStatusBadgeColor(task.status)}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                          </div>
                        ) : (
                          <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${getStatusBadgeColor(task.status)}`}>
                            {task.status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>

                      {/* Assignee */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-[10px]">
                            {task.assignee_name ? task.assignee_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {task.assignee_name} {isAssignee && <span className="text-[9px] text-blue-500 font-bold">(You)</span>}
                          </span>
                        </div>
                      </td>

                      {/* Assigner */}
                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 font-medium">
                        {task.assigner_name} {isCreator && <span className="text-[9px] text-blue-500 font-bold">(You)</span>}
                      </td>

                      {/* Due Date */}
                      <td className="px-6 py-3.5 whitespace-nowrap font-semibold">
                        {task.due_date ? (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 opacity-60" />
                            <span className={taskOverdue ? 'text-rose-500 font-bold animate-pulse' : 'text-slate-600 dark:text-slate-350'}>
                              {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            {taskOverdue && <AlertCircle className="w-3 h-3 text-rose-500" />}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No Limit</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {(isAdmin || isCreator || isManagerOfAssignee) && (
                            <>
                              <button
                                onClick={() => handleEditClick(task)}
                                className="p-1.5 text-blue-505 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                                title="Edit Task"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1.5 text-red-505 hover:bg-red-500/10 text-red-500 dark:text-red-400 rounded-lg transition-colors"
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
      </div>

      {/* Create / Edit Modal Screen */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20">
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEditModalOpen ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  <ClipboardList className="w-4.5 h-4.5" />
                </div>
                <span>{isEditModalOpen ? 'Edit Task details' : 'Assign New Task'}</span>
              </h2>
              <button
                onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); resetForm(); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={isEditModalOpen ? handleUpdateTask : handleCreateTask}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Title */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task Title</label>
                  <input
                    type="text"
                    required
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="E.g., Optimize budget allocations"
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter detailed action instructions..."
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Assignee */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</label>
                    <div className="relative">
                      <select
                        required
                        name="assigned_to"
                        value={formData.assigned_to}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-slate-800 dark:text-slate-200 appearance-none pr-8"
                      >
                        <option value="">Select Employee...</option>
                        {assignees.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.username} ({u.role.toUpperCase()})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</label>
                    <div className="relative">
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-slate-800 dark:text-slate-200 appearance-none pr-8"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Due Date */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Ad Platform Selector */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Link Platform</label>
                    <div className="relative">
                      <select
                        name="ad_platform"
                        value={formData.ad_platform}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-slate-800 dark:text-slate-200 appearance-none pr-8"
                      >
                        <option value="general">None / General</option>
                        <option value="meta">Meta Ads</option>
                        <option value="google">Google Ads</option>
                        <option value="linkedin">LinkedIn Ads</option>
                        <option value="whatsapp">WhatsApp Campaigns</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Linked Campaign/Ad Selector */}
                {formData.ad_platform && formData.ad_platform !== 'general' && (
                  <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Link Campaign / Ad Asset</label>
                    <div className="relative">
                      <select
                        name="ad_id"
                        value={formData.ad_id}
                        onChange={handleInputChange}
                        disabled={adsLoading}
                        className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-slate-800 dark:text-slate-200 appearance-none pr-8 disabled:opacity-50"
                      >
                        <option value="">{adsLoading ? 'Fetching active ads...' : 'Select active ad/campaign...'}</option>
                        {ads.map(ad => (
                          <option key={ad.id} value={ad.id}>
                            {ad.name} {ad.owner_name ? `(${ad.owner_name})` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 dark:border-white/5 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950/20">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); resetForm(); }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-550 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white transition-all text-xs font-semibold shadow-md ${isEditModalOpen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {isEditModalOpen ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const KPIItemCard = ({ title, value, color, icon: Icon, badge }) => {
  const colors = {
    blue: 'from-blue-500/10 to-blue-500/5 text-blue-500 dark:text-blue-400 border-blue-500/10',
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-500 dark:text-emerald-400 border-emerald-500/10',
    indigo: 'from-indigo-500/10 to-indigo-500/5 text-indigo-500 dark:text-indigo-400 border-indigo-500/10',
    slate: 'from-slate-500/10 to-slate-500/5 text-slate-500 dark:text-slate-400 border-slate-500/10',
    rose: 'from-rose-500/10 to-rose-500/5 text-rose-500 dark:text-rose-400 border-rose-500/10'
  };

  return (
    <div className={`bg-gradient-to-br border rounded-2xl p-4 shadow-sm dark:shadow-md flex items-center justify-between transition-all hover:scale-[1.01] ${colors[color] || colors.slate}`}>
      <div className="space-y-1">
        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">{title}</p>
        <h4 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
          <span>{value}</span>
          {badge && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
          )}
        </h4>
      </div>
      <div className="p-2.5 bg-white/20 dark:bg-white/5 rounded-xl shrink-0">
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
};

export default TaskManager;
