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
  const [pages, setPages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(localStorage.getItem('selectedMetaConfigId') || '');

  // Fetch configs once on mount
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const res = await fetch('/api/meta/configs', { headers });
        const data = await res.json();
        if (data.success && data.configs) {
          setConfigs(data.configs);
          if (!selectedConfigId && data.configs.length > 0) {
            const firstId = String(data.configs[0].id);
            setSelectedConfigId(firstId);
            localStorage.setItem('selectedMetaConfigId', firstId);
          }
        }
      } catch (err) {
        console.error("Failed to load meta configurations:", err);
      }
    };
    fetchConfigs();
  }, []);

  // Fetch dashboard stats and pages whenever selectedConfigId changes
  useEffect(() => {
    const fetchAdminOverviewData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        if (selectedConfigId) headers['X-Meta-Config-Id'] = selectedConfigId;

        // Fetch pages and dashboard stats in parallel
        const [pagesRes, statsRes] = await Promise.all([
          fetch('/api/meta/fb-pages', { headers }),
          fetch('/api/users/dashboard/stats', { headers })
        ]);

        const pagesData = await pagesRes.json();
        const statsData = await statsRes.json();

        if (pagesData.success) {
          setPages(pagesData.data || []);
        } else {
          console.error("Failed to fetch Facebook Pages:", pagesData.message);
          setPages([]);
        }

        if (statsData.success) {
          setStats(statsData);
        } else {
          console.error("Failed to fetch dashboard stats:", statsData.message);
        }
      } catch (err) {
        console.error("Error fetching admin overview data:", err);
        setError("Error loading live dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminOverviewData();
  }, [selectedConfigId]);

  const StatCard = ({ title, value, icon: Icon, color }) => {
    const gradientClass = {
      blue: 'from-blue-500 to-indigo-600',
      emerald: 'from-emerald-500 to-teal-600',
      amber: 'from-amber-500 to-orange-600',
      rose: 'from-rose-500 to-red-600',
      purple: 'from-purple-500 to-indigo-600'
    };

    return (
      <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 flex items-center space-x-3.5 shadow-sm">
        <div className={`absolute -right-6 -top-6 w-20 h-20 opacity-[0.02] group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br ${gradientClass[color]} rounded-full blur-xl`}></div>

        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass[color]} flex items-center justify-center flex-shrink-0 shadow-md shadow-slate-200 dark:shadow-none`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 transition-all leading-none">
            {value}
          </h3>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* Header section */}
      <div className="flex items-center justify-between mb-6">
        <div className='flex flex-col items-start'>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">Platform Admin Overview</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs">System-wide user & task statistics and live Facebook Pages intelligence.</p>
        </div>
        <div className="flex items-center space-x-3">
          {configs.length > 0 && (
            <div className="flex items-center space-x-2">
              <label htmlFor="metaConfigSelect" className="text-xs font-bold text-slate-500 dark:text-slate-400">Meta Account:</label>
              <select
                id="metaConfigSelect"
                value={selectedConfigId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedConfigId(val);
                  localStorage.setItem('selectedMetaConfigId', val);
                }}
                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {configs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* <button
            onClick={() => navigate('/settings/meta')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center group"
          >
            Manage Meta Configs
            <ArrowUpRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button> */}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500/25 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">
            Loading live dashboard metrics...
          </p>
        </div>
      ) : (
        <div className="fade-in space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Users"
              value={stats?.totalUsers || 0}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Total Tasks"
              value={stats?.tasksStats?.total || 0}
              icon={ListTodo}
              color="purple"
            />
            <StatCard
              title="Pending Tasks"
              value={stats?.tasksStats?.pending || 0}
              icon={Clock}
              color="amber"
            />
            <StatCard
              title="In Progress Tasks"
              value={stats?.tasksStats?.in_progress || 0}
              icon={Activity}
              color="blue"
            />
            <StatCard
              title="Completed Tasks"
              value={stats?.tasksStats?.completed || 0}
              icon={CheckCircle}
              color="emerald"
            />
          </div>

          {/* Detailed Task Distribution Bar */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Task Status Distribution</h4>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Total Tasks: {stats?.tasksStats?.total || 0} | On Hold: {stats?.tasksStats?.on_hold || 0} | Cancelled: {stats?.tasksStats?.cancelled || 0}
              </span>
            </div>
            {stats?.tasksStats?.total > 0 ? (
              <div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${((stats?.tasksStats?.completed || 0) / stats.tasksStats.total) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Completed: ${stats?.tasksStats?.completed}`}
                  ></div>
                  <div
                    style={{ width: `${((stats?.tasksStats?.in_progress || 0) / stats.tasksStats.total) * 100}%` }}
                    className="bg-blue-500 h-full"
                    title={`In Progress: ${stats?.tasksStats?.in_progress}`}
                  ></div>
                  <div
                    style={{ width: `${((stats?.tasksStats?.pending || 0) / stats.tasksStats.total) * 100}%` }}
                    className="bg-amber-500 h-full"
                    title={`Pending: ${stats?.tasksStats?.pending}`}
                  ></div>
                  <div
                    style={{ width: `${((stats?.tasksStats?.on_hold || 0) / stats.tasksStats.total) * 100}%` }}
                    className="bg-purple-500 h-full"
                    title={`On Hold: ${stats?.tasksStats?.on_hold}`}
                  ></div>
                  <div
                    style={{ width: `${((stats?.tasksStats?.cancelled || 0) / stats.tasksStats.total) * 100}%` }}
                    className="bg-rose-500 h-full"
                    title={`Cancelled: ${stats?.tasksStats?.cancelled}`}
                  ></div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[11px]">
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>Completed ({stats?.tasksStats?.completed || 0})</span>
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>In Progress ({stats?.tasksStats?.in_progress || 0})</span>
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>Pending ({stats?.tasksStats?.pending || 0})</span>
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5"></span>On Hold ({stats?.tasksStats?.on_hold || 0})</span>
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span>Cancelled ({stats?.tasksStats?.cancelled || 0})</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">No tasks created in the system yet.</p>
            )}
          </div>

          {/* Facebook Pages grid */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <Globe className="w-5 h-5 mr-2 text-blue-500" />
                Connected Facebook Pages
              </h3>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-blue-500/10 text-blue-500 rounded-full">
                {pages.length} Connected
              </span>
            </div>

            {pages.length === 0 ? (
              <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
                <Globe className="w-12 h-12 text-slate-300 dark:text-white/20 mb-3 animate-pulse" />
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">No Connected Facebook Pages Found</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mb-4">
                  Verify that your current Meta account configuration is configured with access to pages under the Meta Settings.
                </p>
                <button
                  onClick={() => navigate('/settings/meta')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                >
                  Configure Meta Accounts
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md dark:hover:shadow-white/[0.01] transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top row: Profile & External Link */}
                      <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          {page.picture?.data?.url ? (
                            <img
                              src={page.picture.data.url}
                              alt={page.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-white/10 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center text-slate-400 font-bold text-sm flex-shrink-0">
                              {page.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors leading-tight truncate max-w-[140px]" title={page.name}>
                              {page.name}
                            </h4>
                            <span className="inline-block mt-0.5 text-[9px] font-extrabold px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded capitalize">
                              {page.category}
                            </span>
                          </div>
                        </div>
                        {page.link && (
                          <a
                            href={page.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all flex-shrink-0"
                            title="Visit Facebook Page"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      {/* FB Stats Row */}
                      <div className="flex justify-between items-center my-2.5 px-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Likes: <strong className="text-slate-900 dark:text-white font-bold">{page.fan_count?.toLocaleString('en-IN') || 0}</strong></span>
                        <span>Followers: <strong className="text-slate-900 dark:text-white font-bold">{page.followers_count?.toLocaleString('en-IN') || 0}</strong></span>
                      </div>

                      {/* Instagram Linked Section */}
                      {page.instagram_business_account?.id ? (
                        <div className="p-2.5 bg-gradient-to-tr from-purple-500/5 via-pink-500/5 to-orange-500/5 border border-pink-500/10 rounded-xl space-y-1.5 mt-2">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="font-bold text-pink-500 flex items-center">
                              <Camera className="w-3.5 h-3.5 mr-1" />
                              Instagram
                            </span>
                            {page.instagram_business_account.username && (
                              <a
                                href={`https://instagram.com/${page.instagram_business_account.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-purple-600 dark:text-purple-400 hover:underline"
                              >
                                @{page.instagram_business_account.username}
                              </a>
                            )}
                          </div>

                          {/* Instagram Profile info if live detailed query succeeded */}
                          {page.instagram_business_account.username && (
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex items-center space-x-2">
                                {page.instagram_business_account.profile_picture_url ? (
                                  <img
                                    src={page.instagram_business_account.profile_picture_url}
                                    alt={page.instagram_business_account.username}
                                    className="w-6 h-6 rounded-full object-cover border border-pink-500/20 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 font-bold text-[8px] flex-shrink-0">
                                    IG
                                  </div>
                                )}
                                {page.instagram_business_account.biography && (
                                  <p className="text-[9px] text-slate-500 dark:text-slate-400 italic line-clamp-1 truncate leading-tight">
                                    {page.instagram_business_account.biography}
                                  </p>
                                )}
                              </div>

                              {/* Insta stats */}
                              <div className="grid grid-cols-3 gap-1 text-center py-1 bg-white/50 dark:bg-black/20 rounded-lg text-[9px] border border-slate-100 dark:border-white/5 font-medium">
                                <div>
                                  <span className="block text-[7.5px] text-slate-400 uppercase">Followers</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {page.instagram_business_account.followers_count?.toLocaleString('en-IN') || 0}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[7.5px] text-slate-400 uppercase">Following</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {page.instagram_business_account.follows_count?.toLocaleString('en-IN') || 0}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[7.5px] text-slate-400 uppercase">Posts</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {page.instagram_business_account.media_count?.toLocaleString('en-IN') || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {!page.instagram_business_account.username && (
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                              <span>Linked ID:</span>
                              <span className="font-mono font-semibold">{page.instagram_business_account.id}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-2.5 pl-0.5">
                          No connected Instagram account
                        </div>
                      )}
                    </div>

                    {/* Footer row */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-mono">ID: {page.id}</span>
                      <button
                        onClick={() => navigate('/ad-accounts')}
                        className="text-blue-500 hover:text-blue-400 font-bold transition-all hover:underline"
                      >
                        Campaigns &rarr;
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
