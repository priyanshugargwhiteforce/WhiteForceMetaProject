import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Menu, User, Settings, LogOut, ChevronDown, ShieldCheck, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logo from "../assets/white-forcelogo.png";

const Header = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [now, setNow] = useState(new Date());

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep the greeting/date in the header fresh without needing a page reload
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    setIsDropdownOpen(false);
    navigate(path);
  };

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.username || 'there').split(' ')[0];
  const formattedDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const roleBadgeStyles = user?.role === 'admin'
    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
    : user?.role === 'manager'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';

  return (
    <header className="wf-header wf-anim h-20 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between transition-colors duration-300">
      {/* Fonts + chrome polish, scoped to this header only */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @media screen {
          .wf-header,
          .wf-header button,
          .wf-header input {
            font-family: 'Poppins', sans-serif;
          }
        }
        @keyframes wfHeaderIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .wf-header.wf-anim {
          animation: wfHeaderIn 0.4s cubic-bezier(0.22, 0.61, 0.36, 1) both;
        }
        @keyframes wfDropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .wf-dropdown-anim {
          animation: wfDropdownIn 0.18s cubic-bezier(0.22, 0.61, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .wf-header.wf-anim,
          .wf-dropdown-anim {
            animation: none;
          }
        }
      `}</style>

      {/* Left side: Hamburger menu & Logo (visible only on mobile) */}
      <div className="flex items-center space-x-3 md:hidden">
        <button
          onClick={onMenuClick}
          className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Logo" className="w-8 h-6 object-cover" />
          <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">White Force</span>
        </div>
      </div>

      {/* Left side on desktop: a quick, friendly greeting instead of dead space */}
      <div className="hidden md:flex items-center max-w-[220px] lg:max-w-none">
        <div className="relative pl-4 min-w-0">
          <div className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600"></div>
          <h2 className="text-[17px] mb-1 font-bold dark:text-white tracking-tight headerTrack leading-none truncate">
            {greeting}, {firstName} <span className="inline-block">👋</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">{formattedDate}</p>
        </div>
      </div>

      {/* Right side: theme button and user info dropdown */}
      <div className="flex items-center space-x-3 sm:space-x-5">
        <button
          onClick={toggleTheme}
          className="relative w-11 h-11 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-white/5 border border-transparent hover:border-amber-200 dark:hover:border-indigo-500/20 hover:bg-amber-50 dark:hover:bg-indigo-500/10 transition-all duration-300 cursor-pointer overflow-hidden"
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <Sun className={`absolute w-5 h-5 text-amber-500 transition-all duration-500 ${theme === 'dark' ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} />
          <Moon className={`absolute w-5 h-5 text-indigo-400 dark:text-indigo-300 transition-all duration-500 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`} />
        </button>

        {/* User Profile Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center space-x-3 p-1.5 pr-3 rounded-2xl border transition-all duration-200 focus:outline-none cursor-pointer group ${
              isDropdownOpen
                ? 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10'
                : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/10'
            }`}
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-none mb-1 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                {user?.username || 'User'}
              </p>
              <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">
                {user?.role === 'admin' ? 'ADMINISTRATOR' : (user?.role === 'manager' ? 'MANAGER' : 'TEAM MEMBER')}
              </p>
            </div>

            {/* User Avatar Image or Gradient Icon */}
            <div className="relative">
              {user?.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={user.username}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/20 shadow-md group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
              </span>
            </div>

            <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Glassmorphism Dropdown Menu */}
          {isDropdownOpen && (
            <div className="wf-dropdown-anim absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">

              {/* Gradient accent strip */}
              <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

              {/* User Details Header Card */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-white dark:from-white/[0.04] dark:to-transparent border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center space-x-3">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt={user.username} className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-500/30 shadow-md" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-blue-500/25">
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {user?.username}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user?.email}
                    </p>
                    <div className="mt-1.5 flex items-center space-x-1.5">
                      <span className={`inline-flex items-center space-x-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${roleBadgeStyles}`}>
                        <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                        <span>{user?.role}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  <Briefcase className="w-3 h-3" />
                  <span>White Force Group</span>
                </div>
              </div>

              {/* Menu Links */}
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => handleNavigate('/profile')}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer group"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-200">
                    <User className="w-4 h-4" />
                  </span>
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => handleNavigate('/profile')}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer group"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-200">
                    <Settings className="w-4 h-4" />
                  </span>
                  <span>Account Settings</span>
                </button>
              </div>

              {/* Logout Footer */}
              <div className="p-1.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/40 dark:bg-white/[0.01]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer group"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-200">
                    <LogOut className="w-4 h-4" />
                  </span>
                  <span>Log Out</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;