import { useState, useEffect } from 'react';
import {
  CreditCard,
  Activity,
  Eye,
  TrendingUp,
  Globe,
  Camera,
  MessageCircle,
  ArrowUpRight,
  Users,
  CheckCircle,
  Clock,
  ListTodo,
  UserCheck,
  AlertCircle,
  Calendar,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Overview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === 'manager') {
    return <ManagerOverview user={user} navigate={navigate} />;
  }

  if (user?.role === 'user') {
    return <EmployeeOverview user={user} navigate={navigate} />;
  }

  // Fallback to Admin Overview
  return <AdminOverview navigate={navigate} />;
};

/* ==========================================
   ADMIN OVERVIEW (Original Meta Ads Overview)
   ========================================== */
const AdminOverview = ({ navigate }) => {
  const [adAccounts, setAdAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAggregateData = async () => {
      try {
        const token = localStorage.getItem('token');
        const configId = localStorage.getItem('selectedMetaConfigId') || '';
        const headers = { 'Authorization': `Bearer ${token}` };
        if (configId) headers['X-Meta-Config-Id'] = configId;

        const response = await fetch(`/api/meta/accounts`, {
          headers
        });
        const data = await response.json();
        if (data.adaccounts && data.adaccounts.data) {
          setAdAccounts(data.adaccounts.data);
        }
      } catch (error) {
        console.error("Error fetching overview data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAggregateData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount / 100);
  };

  const totalSpend = adAccounts.reduce((sum, acc) => sum + parseInt(acc.amount_spent || 0), 0);
  const activeAccounts = adAccounts.filter(acc => acc.account_status === 1).length;
  const totalImpressions = adAccounts.reduce((sum, acc) => sum + parseInt(acc.insights?.data?.[0]?.impressions || 0), 0);

  const StatCard = ({ title, value, icon: Icon, color, trend }) => {
    const colorMap = {
      blue: 'from-blue-500 to-indigo-600 shadow-blue-500/20 text-blue-500',
      emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/20 text-emerald-500',
      purple: 'from-purple-500 to-pink-600 shadow-purple-500/20 text-purple-500',
      amber: 'from-amber-500 to-orange-600 shadow-amber-500/20 text-amber-500'
    };

    return (
      <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300">
        <div className={`absolute -right-6 -top-6 w-24 h-24 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br ${colorMap[color].split(' ')[0]} rounded-full blur-xl`}></div>

        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorMap[color].split(' ').slice(0, 2).join(' ')} flex items-center justify-center shadow-lg ${colorMap[color].split(' ')[2]}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {trend}
            </span>
          )}
        </div>

        <div className="relative z-10">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-800 group-hover:to-slate-500 dark:group-hover:from-white dark:group-hover:to-slate-400 transition-all">
            {value}
          </h3>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Platform Overview</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">High-level executive summary of your Meta Ads ecosystem.</p>
        </div>
        <button
          onClick={() => navigate('/insights')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center group"
        >
          View Deep Insights
          <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 h-40 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="fade-in space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard
              title="Total Ad Spend (Lifetime)"
              value={formatCurrency(totalSpend)}
              icon={CreditCard}
              color="blue"
              trend="+12.5%"
            />
            <StatCard
              title="Active Ad Accounts"
              value={activeAccounts}
              icon={Activity}
              color="emerald"
            />
            <StatCard
              title="Total Impressions"
              value={totalImpressions.toLocaleString('en-IN')}
              icon={Eye}
              color="purple"
            />
            <StatCard
              title="Avg ROAS (Stub)"
              value="3.4x"
              icon={TrendingUp}
              color="amber"
              trend="+0.2"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Connected Channels</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Meta Ads</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active & Synced</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">LinkedIn Ads</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Synced</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Google & YouTube Ads</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">WhatsApp Manager</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Setup Required</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-white/[0.02] dark:to-white/[0.01] border border-slate-800 dark:border-white/10 rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Weekly Tip</span>
                <h4 className="text-xl font-bold text-white mt-2 mb-4">Minimize Overlapping Audiences</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Having multiple active ad sets targeting similar custom audiences increases bidding costs and fatigues users quickly. Keep them distinct.</p>
              </div>
              <button
                onClick={() => navigate('/ad-accounts')}
                className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-sm font-semibold transition-all border border-white/10"
              >
                Go to Ad Accounts
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 flex items-center justify-between relative overflow-hidden shadow-2xl shadow-blue-500/20">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="relative z-10 max-w-xl">
              <h3 className="text-2xl font-bold text-white mb-2">Ready to optimize your campaigns?</h3>
              <p className="text-blue-100 text-sm">Use our advanced AI Analyzer to generate strategic insights, cut wasted spend, and scale your best-performing ads instantly.</p>
            </div>
            <div className="relative z-10">
              <button onClick={() => navigate('/ad-analyzer')} className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:scale-105 transition-transform shadow-xl">
                Open Ad Analyzer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==========================================
   MANAGER OVERVIEW
   ========================================== */
const ManagerOverview = ({ user, navigate }) => {
  const [stats, setStats] = useState(null);
  const [team, setTeam] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [statsRes, teamRes, tasksRes] = await Promise.all([
          fetch('/api/users/dashboard/stats', { headers }),
          fetch('/api/users', { headers }),
          fetch('/api/tasks?my_tasks=true', { headers })
        ]);

        const statsData = await statsRes.json();
        const teamData = await teamRes.json();
        const tasksData = await tasksRes.json();

        if (statsData.success) setStats(statsData);
        if (teamData.success) setTeam(teamData.users || []);
        if (tasksData.success) setTasks(tasksData.tasks || []);
      } catch (error) {
        console.error("Error fetching manager overview details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchManagerData();
  }, []);

  // Filter out manager themselves from the team view list
  const employees = team.filter(member => member.id !== user.id);

  const StatCard = ({ title, value, subtitle, icon: Icon, color }) => {
    const colorMap = {
      blue: 'from-blue-500 to-indigo-600 shadow-blue-500/20 text-blue-500 bg-blue-500/10',
      emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/20 text-emerald-500 bg-emerald-500/10',
      amber: 'from-amber-500 to-orange-600 shadow-amber-500/20 text-amber-500 bg-amber-500/10',
      purple: 'from-purple-500 to-pink-600 shadow-purple-500/20 text-purple-500 bg-purple-500/10'
    };

    return (
      <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300">
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{value}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>}
        </div>
      </div>
    );
  };

  const getPriorityBadge = (prio) => {
    const p = String(prio).toLowerCase();
    if (p === 'critical') return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
    if (p === 'high') return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
    if (p === 'medium') return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    return 'bg-slate-500/10 text-slate-400 border border-slate-500/10';
  };

  const getStatusBadge = (status) => {
    const s = String(status).toLowerCase();
    if (s === 'completed') return 'bg-emerald-500/10 text-emerald-500';
    if (s === 'in_progress') return 'bg-blue-500/10 text-blue-500';
    if (s === 'on_hold') return 'bg-amber-500/10 text-amber-500';
    if (s === 'cancelled') return 'bg-red-500/10 text-red-500';
    return 'bg-slate-500/10 text-slate-400';
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Team & Progress Overview</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Dashboard summary of your team size, employee statuses, and work checklists.</p>
        </div>
        <button
          onClick={() => navigate('/tasks')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center group"
        >
          Manage All Tasks
          <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 h-40 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="fade-in space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Team Size"
              value={stats?.teamStats?.total || 0}
              subtitle={`Active: ${stats?.teamStats?.active || 0} | On Hold: ${stats?.teamStats?.hold || 0}`}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Team Tasks Summary"
              value={stats?.teamTasksStats?.total || 0}
              subtitle={`Pending: ${stats?.teamTasksStats?.pending || 0} | In Progress: ${stats?.teamTasksStats?.in_progress || 0} | Done: ${stats?.teamTasksStats?.completed || 0}`}
              icon={Activity}
              color="purple"
            />
            <StatCard
              title="My Personal Tasks"
              value={stats?.myTasksStats?.total || 0}
              subtitle={`Pending: ${(stats?.myTasksStats?.pending || 0) + (stats?.myTasksStats?.in_progress || 0)} | Completed: ${stats?.myTasksStats?.completed || 0}`}
              icon={ListTodo}
              color="emerald"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Team Directory (60% width) */}
            <div className="lg:col-span-2 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                  <UserCheck className="w-5 h-5 mr-2.5 text-blue-500" />
                  My Team Members
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-500/10 text-blue-500 rounded-full">
                  {employees.length} members
                </span>
              </div>

              {employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                  <Users className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No team members registered under you.</p>
                  <button onClick={() => navigate('/users')} className="mt-3 text-xs text-blue-500 hover:underline">Register an Employee</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <th className="pb-4">Member Info</th>
                        <th className="pb-4">System Role</th>
                        <th className="pb-4">Status</th>
                        <th className="pb-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {employees.map((member) => (
                        <tr key={member.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                          <td className="py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400">
                                {member.username.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{member.username}</h4>
                                <p className="text-[10.5px] font-semibold text-slate-500">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 capitalize">
                            {member.role === 'user' ? 'Employee' : member.role}
                          </td>
                          <td className="py-4">
                            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              member.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                              member.status === 'hold' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-rose-500/10 text-rose-500'
                            }`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => navigate('/users')}
                              className="px-3 py-1.5 text-xs font-bold text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                            >
                              Edit Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Manager's own tasks (40% width) */}
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                  <ListTodo className="w-5 h-5 mr-2.5 text-emerald-500" />
                  My Assigned Tasks
                </h3>
              </div>

              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
                  <CheckCircle className="w-12 h-12 mb-3 text-emerald-500/30" />
                  <p className="text-sm font-semibold">You have no tasks assigned directly to you.</p>
                  <p className="text-xs text-slate-500 mt-1">Excellent job keeping a clear plate!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {tasks.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className="p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl space-y-3 group hover:border-slate-200 dark:hover:border-white/10 transition-all cursor-pointer"
                      onClick={() => navigate('/tasks')}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors leading-tight mb-1">
                            {task.title}
                          </h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md capitalize ${getStatusBadge(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-white/5 text-[10px] text-slate-500 font-semibold">
                        <div className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          {task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN') : 'No due date'}
                        </div>
                        <div>
                          By: {task.assigner_name || 'System'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {tasks.length > 10 && (
                    <button
                      onClick={() => navigate('/tasks')}
                      className="w-full text-center py-2.5 text-xs text-blue-500 hover:text-blue-400 font-bold"
                    >
                      View all {tasks.length} tasks
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==========================================
   STANDARD EMPLOYEE OVERVIEW
   ========================================== */
const EmployeeOverview = ({ user, navigate }) => {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [statsRes, tasksRes] = await Promise.all([
          fetch('/api/users/dashboard/stats', { headers }),
          fetch('/api/tasks?my_tasks=true', { headers })
        ]);

        const statsData = await statsRes.json();
        const tasksData = await tasksRes.json();

        if (statsData.success) setStats(statsData);
        if (tasksData.success) setTasks(tasksData.tasks || []);
      } catch (error) {
        console.error("Error fetching employee dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color }) => {
    const colorMap = {
      blue: 'from-blue-500 to-indigo-600 shadow-blue-500/20 text-blue-500 bg-blue-500/10',
      emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/20 text-emerald-500 bg-emerald-500/10',
      amber: 'from-amber-500 to-orange-600 shadow-amber-500/20 text-amber-500 bg-amber-500/10',
      rose: 'from-rose-500 to-red-600 shadow-rose-500/20 text-rose-500 bg-rose-500/10'
    };

    return (
      <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300">
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h3>
        </div>
      </div>
    );
  };

  const getPriorityBadge = (prio) => {
    const p = String(prio).toLowerCase();
    if (p === 'critical') return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
    if (p === 'high') return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
    if (p === 'medium') return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    return 'bg-slate-500/10 text-slate-400 border border-slate-500/10';
  };

  const getStatusBadge = (status) => {
    const s = String(status).toLowerCase();
    if (s === 'completed') return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    if (s === 'in_progress') return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    if (s === 'on_hold') return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    if (s === 'cancelled') return 'bg-red-500/10 text-red-500 border border-red-500/20';
    return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  };

  const pendingCount = (stats?.myTasksStats?.pending || 0) + (stats?.myTasksStats?.in_progress || 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">My Task Board</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Personal workspace. Track and update status of your assigned projects.</p>
        </div>
        <button
          onClick={() => navigate('/tasks')}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center group"
        >
          View Full Task Table
          <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 h-40 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="fade-in space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Assigned"
              value={stats?.myTasksStats?.total || 0}
              icon={ListTodo}
              color="blue"
            />
            <StatCard
              title="Pending / In Progress"
              value={pendingCount}
              icon={Clock}
              color="amber"
            />
            <StatCard
              title="Completed tasks"
              value={stats?.myTasksStats?.completed || 0}
              icon={CheckCircle}
              color="emerald"
            />
            <StatCard
              title="On Hold / Cancelled"
              value={(stats?.myTasksStats?.on_hold || 0) + (stats?.myTasksStats?.cancelled || 0)}
              icon={AlertCircle}
              color="rose"
            />
          </div>

          {/* Detailed Task List */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <Activity className="w-5 h-5 mr-2.5 text-blue-500" />
              Active Checklists
            </h3>

            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                <CheckCircle className="w-16 h-16 mb-4 text-emerald-500/25" />
                <p className="text-base font-bold">You are all caught up!</p>
                <p className="text-xs text-slate-500 mt-1">No tasks are currently assigned to your account.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-5 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl hover:border-slate-200 dark:hover:border-white/10 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                    onClick={() => navigate('/tasks')}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                        <h4 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                          {task.title}
                        </h4>
                        <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-md capitalize tracking-wider ${getStatusBadge(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center text-[11px] text-slate-500 font-semibold space-x-4 pt-1">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-slate-500" />
                          Due: {task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN') : 'No due date'}
                        </span>
                        <span>Assigner: {task.assigner_name}</span>
                        {task.ad_platform && task.ad_platform !== 'general' && (
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[9px] uppercase font-bold">
                            Platform: {task.ad_platform}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end w-full md:w-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/tasks');
                        }}
                        className="px-4 py-2 bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition-all flex items-center"
                      >
                        Update Remarks
                        <ArrowUpRight className="w-4 h-4 ml-1.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
