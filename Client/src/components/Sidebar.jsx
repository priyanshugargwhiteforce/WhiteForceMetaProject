import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import {
  LayoutDashboard,
  Users,
  ChartBar,
  Settings,
  LogOut,
  Globe,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Target,
  Activity,
  MessageCircle,
  PieChart,
  FileText,
  Send,
  TrendingUp,
  Briefcase,
  Calendar,
  ClipboardList,
  MessageSquare,
  FolderOpen,
  Video,
  Play
} from 'lucide-react';
import logo from "../assets/white-forcelogo.png";

const MetaIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16.5 6a5.5 5.5 0 0 0-4.66 2.6l-.34.5-.34-.5A5.5 5.5 0 1 0 7.5 18c2.16 0 3.84-1.25 4.66-2.6l.34-.5.34.5c.82 1.35 2.5 2.6 4.66 2.6a5.5 5.5 0 1 0 0-11z" />
  </svg>
);

const GoogleIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20.8 14.25a8.7 8.7 0 1 1-.8-5.35l-3.3 2.65" />
    <path d="M12 12h9" />
  </svg>
);

const LinkedInIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="2" width="20" height="20" rx="4" />
    <line x1="8" y1="11" x2="8" y2="17" />
    <line x1="8" y1="7" x2="8" y2="7.01" />
    <path d="M12 11v6" />
    <path d="M12 11a3 3 0 0 1 6 0v6" />
  </svg>
);

const WhatsAppIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <path d="M9 10c.5 1.5 1.5 2.5 3 3" />
  </svg>
);

const Sidebar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const metaPaths = ['/ad-accounts', '/ad-analyzer', '/single-ad-analyzer', '/insights', '/all-leads', '/ad-owners'];
  const googlePaths = ['/google-dashboard', '/google-campaigns', '/google-performance', '/google-insights', '/youtube-ads', '/youtube-shorts'];
  const waPaths = ['/whatsapp-manager', '/wa-channels', '/wa-templates', '/wa-templates/new', '/send-message', '/wa-analytics', '/wa-contacts', '/wa-campaigns', '/wa-schedules', '/wa-chats', '/wa-external'];
  const settingsPaths = ['/users', '/settings/meta', '/settings/whatsapp'];
  const linkedInPaths = [
    '/linkedin-manager', '/linkedin-campaigns', '/linkedin-analytics', '/linkedin-leads',
    '/linkedin-management', '/linkedin-management/campaign/new', '/linkedin-assets',
    '/linkedin-creatives/new', '/linkedin-creatives', '/linkedin-ads', '/linkedin-ads/new'
  ];

  const [openMeta, setOpenMeta] = useState(metaPaths.includes(location.pathname) || location.pathname === '/');
  const [openGoogle, setOpenGoogle] = useState(googlePaths.includes(location.pathname) || location.pathname.startsWith('/youtube-ad') || location.pathname === '/youtube-shorts');
  const [openYoutube, setOpenYoutube] = useState(location.pathname.startsWith('/youtube-'));
  const [openWhatsApp, setOpenWhatsApp] = useState(waPaths.includes(location.pathname));
  const [openLinkedIn, setOpenLinkedIn] = useState(linkedInPaths.includes(location.pathname) || location.pathname.startsWith('/linkedin-'));
  const [openSettings, setOpenSettings] = useState(settingsPaths.includes(location.pathname));

  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/tasks/pending-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPendingCount(res.data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching pending tasks count:', err);
    }
  };

  useEffect(() => {
    const path = location.pathname;
    if (metaPaths.includes(path)) setOpenMeta(true);
    if (googlePaths.includes(path) || path.startsWith('/youtube-')) {
      setOpenGoogle(true);
      if (path.startsWith('/youtube-')) {
        setOpenYoutube(true);
      }
    }
    if (waPaths.includes(path)) setOpenWhatsApp(true);
    if (linkedInPaths.includes(path) || path.startsWith('/linkedin-')) setOpenLinkedIn(true);
    if (settingsPaths.includes(path)) setOpenSettings(true);
  }, [location.pathname]);

  useEffect(() => {
    fetchPendingCount();
  }, [location.pathname, user]);

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-72 border-r border-slate-200 dark:border-white/5 bg-[var(--bg-sidebar)] backdrop-blur-3xl hidden md:flex flex-col sticky top-0 h-screen transition-colors duration-300">
      <div className="p-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="flex items-center justify-center">
            <img src={logo} alt="Logo" className="w-15 h-10 object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none transition-colors">White Force</h1>
            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mt-1 transition-colors">Ad Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pt-4">
        <NavItem
          icon={LayoutDashboard}
          label="Overview"
          active={isActive('/')}
          onClick={() => navigate('/')}
        />
        <NavItem
          icon={ClipboardList}
          label="Tasks Manager"
          active={isActive('/tasks')}
          onClick={() => navigate('/tasks')}
          badge={pendingCount}
        />
        <NavItem
          icon={FolderOpen}
          label="Media Library"
          active={isActive('/media-library')}
          onClick={() => navigate('/media-library')}
        />
        {(user?.role === 'admin' || !!user?.meta_access) && (
          <NavDropdown
            icon={MetaIcon}
            label="Meta Ads"
            open={openMeta}
            onToggle={() => setOpenMeta(!openMeta)}
          >
            <NavItem
              icon={Users}
              label="All Ad Accounts"
              active={isActive('/ad-accounts')}
              onClick={() => navigate('/ad-accounts')}
              isSubItem={true}
            />
            <NavItem
              icon={BarChart3}
              label="Ad Analyzer"
              active={isActive('/ad-analyzer')}
              onClick={() => navigate('/ad-analyzer')}
              isSubItem={true}
            />
            <NavItem
              icon={Target}
              label="Single Ad Analyzer"
              active={isActive('/single-ad-analyzer')}
              onClick={() => navigate('/single-ad-analyzer')}
              isSubItem={true}
            />
            <NavItem
              icon={ChartBar}
              label="Insights & ROI"
              active={isActive('/insights')}
              onClick={() => navigate('/insights')}
              isSubItem={true}
            />
            <NavItem
              icon={FileText}
              label="All Leads"
              active={isActive('/all-leads')}
              onClick={() => navigate('/all-leads')}
              isSubItem={true}
            />
            <NavItem
              icon={Users}
              label="Ad Owner"
              active={isActive('/ad-owners')}
              onClick={() => navigate('/ad-owners')}
              isSubItem={true}
            />
          </NavDropdown>
        )}

        {(user?.role === 'admin' || !!user?.google_access) && (
          <NavDropdown
            icon={GoogleIcon}
            label="Google Ads"
            open={openGoogle}
            onToggle={() => setOpenGoogle(!openGoogle)}
          >
            <NavItem
              icon={Users}
              label="Accounts Overview"
              active={isActive('/google-dashboard')}
              onClick={() => navigate('/google-dashboard')}
              isSubItem={true}
            />
            <NavItem
              icon={Target}
              label="Campaigns"
              active={isActive('/google-campaigns')}
              onClick={() => navigate('/google-campaigns')}
              isSubItem={true}
            />
            <NavItem
              icon={Activity}
              label="Performance"
              active={isActive('/google-performance')}
              onClick={() => navigate('/google-performance')}
              isSubItem={true}
            />
            <NavItem
              icon={BarChart3}
              label="Insights"
              active={isActive('/google-insights')}
              onClick={() => navigate('/google-insights')}
              isSubItem={true}
            />
            <SubNavDropdown
              icon={Video}
              label="YouTube"
              open={openYoutube}
              onToggle={() => setOpenYoutube(!openYoutube)}
              active={location.pathname.startsWith('/youtube-')}
            >
              <NavItem
                icon={Video}
                label="YT Videos"
                active={isActive('/youtube-ads') || (location.pathname.startsWith('/youtube-ad') && !location.pathname.endsWith('/shorts') && location.pathname !== '/youtube-shorts')}
                onClick={() => navigate('/youtube-ads')}
                isSubItem={true}
              />
              <NavItem
                icon={Play}
                label="YT Shorts"
                active={isActive('/youtube-shorts') || location.pathname.endsWith('/shorts')}
                onClick={() => navigate('/youtube-shorts')}
                isSubItem={true}
              />
            </SubNavDropdown>
          </NavDropdown>
        )}

        {(user?.role === 'admin' || !!user?.whatsapp_access) && (
          <NavDropdown
            icon={WhatsAppIcon}
            label="WhatsApp Manager"
            open={openWhatsApp}
            onToggle={() => setOpenWhatsApp(!openWhatsApp)}
            colorScheme="whatsapp"
          >
            <NavItem
              icon={Globe}
              label="WA API Number Info"
              active={isActive('/whatsapp-manager')}
              onClick={() => navigate('/whatsapp-manager')}
              isSubItem={true}
              colorScheme="whatsapp"
            />
            <NavItem
              icon={TrendingUp}
              label="Channel Tracker"
              active={isActive('/wa-channels')}
              onClick={() => navigate('/wa-channels')}
              isSubItem={true}
              colorScheme="whatsapp"
            />
            <NavItem
              icon={FileText}
              label="WA Templates"
              active={isActive('/wa-templates')}
              onClick={() => navigate('/wa-templates')}
              isSubItem={true}
              colorScheme="whatsapp"
            />
            <NavItem
              icon={Target}
              label="Campaigns Manager"
              active={isActive('/wa-campaigns')}
              onClick={() => navigate('/wa-campaigns')}
              isSubItem={true}
              colorScheme="whatsapp"
            />
            <NavItem
              icon={Calendar}
              label="Schedules Dashboard"
              active={isActive('/wa-schedules')}
              onClick={() => navigate('/wa-schedules')}
              isSubItem={true}
              colorScheme="whatsapp"
            />
            <NavItem
              icon={Send}
              label="Send Message"
              active={isActive('/send-message')}
              onClick={() => navigate('/send-message')}
              isSubItem={true}
              colorScheme="whatsapp"
            />
            <NavItem
              icon={Users}
              label="Contacts Manager"
              active={isActive('/wa-contacts')}
              onClick={() => navigate('/wa-contacts')}
              isSubItem={true}
              colorScheme="whatsapp"
            />
            <NavItem
              icon={MessageSquare}
              label="Messages"
              active={isActive('/wa-chats')}
              onClick={() => navigate('/wa-chats')}
              isSubItem={true}
              colorScheme="whatsapp"
            />
            <NavItem
              icon={PieChart}
              label="Analytics"
              active={isActive('/wa-analytics')}
              onClick={() => navigate('/wa-analytics')}
              isSubItem={true}
              colorScheme="whatsapp"
            />
            <NavItem
              icon={Activity}
              label="External Tracker"
              active={isActive('/wa-external')}
              onClick={() => navigate('/wa-external')}
              isSubItem={true}
              colorScheme="whatsapp"
            />
          </NavDropdown>

        )}

        {(user?.role === 'admin' || !!user?.linkedin_access) && (
          <NavDropdown
            icon={LinkedInIcon}
            label="LinkedIn Ads"
            open={openLinkedIn}
            onToggle={() => setOpenLinkedIn(!openLinkedIn)}
          >
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 pt-2 pb-1">
              Reporting
            </div>
            <NavItem
              icon={Users}
              label="Dashboard"
              active={isActive('/linkedin-manager')}
              onClick={() => navigate('/linkedin-manager')}
              isSubItem={true}
            />
            <NavItem
              icon={Briefcase}
              label="Campaigns"
              active={isActive('/linkedin-campaigns')}
              onClick={() => navigate('/linkedin-campaigns')}
              isSubItem={true}
            />
            <NavItem
              icon={TrendingUp}
              label="Analytics"
              active={isActive('/linkedin-analytics')}
              onClick={() => navigate('/linkedin-analytics')}
              isSubItem={true}
            />
            <NavItem
              icon={FileText}
              label="Leads"
              active={isActive('/linkedin-leads')}
              onClick={() => navigate('/linkedin-leads')}
              isSubItem={true}
            />

            <div className="border-t border-slate-200 dark:border-white/5 my-1.5 mx-2"></div>

            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 pt-2 pb-1">
              Management
            </div>
            <NavItem
              icon={Briefcase}
              label="Campaign Management"
              active={isActive('/linkedin-management')}
              onClick={() => navigate('/linkedin-management')}
              isSubItem={true}
            />
            <NavItem
              icon={Target}
              label="Campaign Builder"
              active={isActive('/linkedin-management/campaign/new')}
              onClick={() => navigate('/linkedin-management/campaign/new')}
              isSubItem={true}
            />
            <NavItem
              icon={Briefcase}
              label="Asset Manager"
              active={isActive('/linkedin-assets')}
              onClick={() => navigate('/linkedin-assets')}
              isSubItem={true}
            />
            <NavItem
              icon={Target}
              label="Creative Builder"
              active={isActive('/linkedin-creatives/new')}
              onClick={() => navigate('/linkedin-creatives/new')}
              isSubItem={true}
            />
            <NavItem
              icon={FileText}
              label="Creative Library"
              active={isActive('/linkedin-creatives')}
              onClick={() => navigate('/linkedin-creatives')}
              isSubItem={true}
            />
            <NavItem
              icon={FileText}
              label="Ad Library"
              active={location.pathname === '/linkedin-ads' || (/^\/linkedin-ads\/[^/]+$/.test(location.pathname) && location.pathname !== '/linkedin-ads/new')}
              onClick={() => navigate('/linkedin-ads')}
              isSubItem={true}
            />
            <NavItem
              icon={Target}
              label="Create Ad"
              active={isActive('/linkedin-ads/new')}
              onClick={() => navigate('/linkedin-ads/new')}
              isSubItem={true}
            />
          </NavDropdown>
        )}


        {(user?.role === 'admin' || user?.role === 'manager') && (
          <>
            <div className="pt-6 pb-2 px-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System</p>
            </div>
            <NavDropdown
              icon={Settings}
              label="Settings"
              open={openSettings}
              onToggle={() => setOpenSettings(!openSettings)}
            >
              <NavItem
                icon={Users}
                label="User Management"
                active={isActive('/users')}
                onClick={() => navigate('/users')}
                isSubItem={true}
              />
              {user?.role === 'admin' && (
                <>
                  <NavItem
                    icon={Briefcase}
                    label="Setup Meta Accounts"
                    active={isActive('/settings/meta')}
                    onClick={() => navigate('/settings/meta')}
                    isSubItem={true}
                  />
                  <NavItem
                    icon={MessageCircle}
                    label="Setup WhatsApp"
                    active={isActive('/settings/whatsapp')}
                    onClick={() => navigate('/settings/whatsapp')}
                    isSubItem={true}
                    colorScheme="whatsapp"
                  />
                </>
              )}
            </NavDropdown>
          </>
        )}
      </nav>

      <div className="p-6 border-t border-slate-200 dark:border-white/5">
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl p-4 border border-indigo-500/10 mb-4">
          <p className="text-xs font-semibold text-indigo-300 mb-1">API Status</p>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-lg shadow-emerald-500/50"></div>
            <span className="text-[10px] text-slate-400">Connected to v24.0</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all duration-300 group"
        >
          <LogOut className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
};

const NavDropdown = ({ icon: Icon, label, open, onToggle, colorScheme = 'blue', children }) => (
  <div className="mb-1">
    <button
      onClick={onToggle}
      className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all duration-300 group ${open ? 'bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
        }`}
    >
      <div className="flex items-center">
        <Icon className={`w-5 h-5 mr-3 transition-colors ${open ? (colorScheme === 'whatsapp' ? 'text-emerald-500' : 'text-blue-500') : (colorScheme === 'whatsapp' ? 'group-hover:text-emerald-500' : 'group-hover:text-blue-500')}`} />
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? (colorScheme === 'whatsapp' ? 'rotate-180 text-emerald-500' : 'rotate-180 text-blue-500') : ''}`} />
    </button>
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[800px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
      <div className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-slate-100 dark:border-white/5 ml-6">
        {children}
      </div>
    </div>
  </div>
);

const SubNavDropdown = ({ icon: Icon, label, open, onToggle, active = false, children }) => (
  <div className="mb-1">
    <button
      onClick={onToggle}
      className={`flex items-center justify-between w-full px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all duration-300 group ${open || active ? 'text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 font-semibold' : ''
        }`}
    >
      <div className="flex items-center">
        <Icon className={`w-4 h-4 mr-3 transition-colors ${open || active ? 'text-blue-500' : 'group-hover:text-blue-500'}`} />
        <span className="font-semibold text-xs">{label}</span>
      </div>
      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? 'rotate-180 text-blue-500' : 'text-slate-400 group-hover:text-blue-500'}`} />
    </button>
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[300px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
      <div className="pl-3 pr-1 py-0.5 space-y-1 border-l border-slate-100 dark:border-white/5 ml-4">
        {children}
      </div>
    </div>
  </div>
);

const NavItem = ({ icon: Icon, label, active = false, onClick, isSubItem = false, badge = null, colorScheme = 'blue' }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full transition-all duration-300 group relative ${isSubItem ? 'px-3 py-2.5 rounded-xl' : 'px-4 py-3 rounded-2xl'
      } ${active
        ? (colorScheme === 'whatsapp'
          ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/10 text-emerald-600 dark:text-white border border-emerald-500/20'
          : 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-blue-600 dark:text-white border border-blue-500/20')
        : (colorScheme === 'whatsapp'
          ? 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-emerald-600 dark:hover:text-white border border-transparent'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white border border-transparent')
      }`}
  >
    {active && !isSubItem && <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full shadow-[0_0_12px_rgba(16,185,129,0.5)] ${colorScheme === 'whatsapp' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>}
    {active && isSubItem && <div className={`absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full shadow-[0_0_12px_rgba(16,185,129,0.5)] ${colorScheme === 'whatsapp' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>}
    <Icon className={`transition-colors ${isSubItem ? 'w-4 h-4 mr-3' : 'w-5 h-5 mr-3'} ${active ? (colorScheme === 'whatsapp' ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-400') : (colorScheme === 'whatsapp' ? 'group-hover:text-emerald-500 dark:group-hover:text-emerald-400' : 'group-hover:text-blue-500 dark:group-hover:text-blue-400')}`} />
    <span className={`font-semibold ${isSubItem ? 'text-xs' : 'text-sm'}`}>{label}</span>
    {badge !== null && badge > 0 && (
      <span className="ml-auto bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.4)] animate-pulse">
        {badge}
      </span>
    )}
    {active && !isSubItem && badge === null && <ChevronRight className={`w-4 h-4 ml-auto ${colorScheme === 'whatsapp' ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-400'}`} />}
  </button>
);

export default Sidebar;
