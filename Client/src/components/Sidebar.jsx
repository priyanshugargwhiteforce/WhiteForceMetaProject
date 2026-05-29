import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  Briefcase
} from 'lucide-react';
import logo from "../assets/white-forcelogo.png";
const Sidebar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const metaPaths = ['/ad-accounts', '/ad-analyzer', '/single-ad-analyzer', '/insights', '/all-leads'];
  const googlePaths = ['/google-dashboard', '/google-campaigns', '/google-performance', '/google-insights', '/youtube-ads'];
  const waPaths = ['/whatsapp-manager', '/wa-channels', '/wa-templates', '/wa-templates/new', '/send-message', '/wa-analytics'];
  const linkedInPaths = ['/linkedin-manager', '/linkedin-campaigns', '/linkedin-analytics', '/linkedin-leads'];

  const [openMeta, setOpenMeta] = useState(metaPaths.includes(location.pathname) || location.pathname === '/');
  const [openGoogle, setOpenGoogle] = useState(googlePaths.includes(location.pathname));
  const [openWhatsApp, setOpenWhatsApp] = useState(waPaths.includes(location.pathname));
  const [openLinkedIn, setOpenLinkedIn] = useState(linkedInPaths.includes(location.pathname));

  useEffect(() => {
    const path = location.pathname;
    if (metaPaths.includes(path)) setOpenMeta(true);
    if (googlePaths.includes(path)) setOpenGoogle(true);
    if (waPaths.includes(path)) setOpenWhatsApp(true);
    if (linkedInPaths.includes(path)) setOpenLinkedIn(true);
  }, [location.pathname]);

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
            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mt-1 transition-colors">META Management</p>
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
        {(user?.role === 'admin' || !!user?.meta_access) && (
          <NavDropdown
            icon={Globe}
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
          </NavDropdown>
        )}

        {(user?.role === 'admin' || !!user?.google_access) && (
          <NavDropdown
            icon={Globe}
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
            <NavItem
              icon={Target}
              label="YouTube Ads"
              active={isActive('/youtube-ads')}
              onClick={() => navigate('/youtube-ads')}
              isSubItem={true}
            />
          </NavDropdown>
        )}

        {(user?.role === 'admin' || !!user?.whatsapp_access) && (
          <NavDropdown
            icon={MessageCircle}
            label="WhatsApp Manager"
            open={openWhatsApp}
            onToggle={() => setOpenWhatsApp(!openWhatsApp)}
          >
            <NavItem
              icon={Globe}
              label="WA API Number Info"
              active={isActive('/whatsapp-manager')}
              onClick={() => navigate('/whatsapp-manager')}
              isSubItem={true}
            />
            <NavItem
              icon={TrendingUp}
              label="Channel Tracker"
              active={isActive('/wa-channels')}
              onClick={() => navigate('/wa-channels')}
              isSubItem={true}
            />
            <NavItem
              icon={FileText}
              label="WA Templates"
              active={isActive('/wa-templates')}
              onClick={() => navigate('/wa-templates')}
              isSubItem={true}
            />
            <NavItem
              icon={Send}
              label="Send Message"
              active={isActive('/send-message')}
              onClick={() => navigate('/send-message')}
              isSubItem={true}
            />
            <NavItem
              icon={PieChart}
              label="Analytics"
              active={isActive('/wa-analytics')}
              onClick={() => navigate('/wa-analytics')}
              isSubItem={true}
            />
          </NavDropdown>
        )}

        {(user?.role === 'admin' || !!user?.linkedin_access) && (
          <NavDropdown
            icon={Globe}
            label="LinkedIn Ads"
            open={openLinkedIn}
            onToggle={() => setOpenLinkedIn(!openLinkedIn)}
          >
            <NavItem
              icon={Users}
              label="LinkedIn Manager"
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
              label="Insights & ROI"
              active={isActive('/linkedin-analytics')}
              onClick={() => navigate('/linkedin-analytics')}
              isSubItem={true}
            />
            <NavItem
              icon={FileText}
              label="Leads Data"
              active={isActive('/linkedin-leads')}
              onClick={() => navigate('/linkedin-leads')}
              isSubItem={true}
            />
          </NavDropdown>
        )}


        <div className="pt-6 pb-2 px-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System</p>
        </div>
        {user?.role === 'admin' && (
          <NavItem
            icon={Users}
            label="User Management"
            active={isActive('/users')}
            onClick={() => navigate('/users')}
          />
        )}
        <NavItem icon={Settings} label="Settings" />
      </nav>

      <div className="p-6 border-t border-slate-200 dark:border-white/5">
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl p-4 border border-indigo-500/10 mb-4">
          <p className="text-xs font-semibold text-indigo-300 mb-1">API Status</p>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-lg shadow-emerald-500/50"></div>
            <span className="text-[10px] text-slate-400">Connected to v19.0</span>
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

const NavDropdown = ({ icon: Icon, label, open, onToggle, children }) => (
  <div className="mb-1">
    <button
      onClick={onToggle}
      className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all duration-300 group ${open ? 'bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
        }`}
    >
      <div className="flex items-center">
        <Icon className={`w-5 h-5 mr-3 transition-colors ${open ? 'text-blue-500' : 'group-hover:text-blue-500'}`} />
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180 text-blue-500' : ''}`} />
    </button>
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
      <div className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-slate-100 dark:border-white/5 ml-6">
        {children}
      </div>
    </div>
  </div>
);

const NavItem = ({ icon: Icon, label, active = false, onClick, isSubItem = false }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full transition-all duration-300 group relative ${isSubItem ? 'px-3 py-2.5 rounded-xl' : 'px-4 py-3 rounded-2xl'
      } ${active
        ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-blue-600 dark:text-white border border-blue-500/20'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white border border-transparent'
      }`}
  >
    {active && !isSubItem && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.5)]"></div>}
    {active && isSubItem && <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.5)]"></div>}
    <Icon className={`transition-colors ${isSubItem ? 'w-4 h-4 mr-3' : 'w-5 h-5 mr-3'} ${active ? 'text-blue-500 dark:text-blue-400' : 'group-hover:text-blue-500 dark:group-hover:text-blue-400'}`} />
    <span className={`font-semibold ${isSubItem ? 'text-xs' : 'text-sm'}`}>{label}</span>
    {active && !isSubItem && <ChevronRight className="w-4 h-4 ml-auto text-blue-500 dark:text-blue-400" />}
  </button>
);

export default Sidebar;
