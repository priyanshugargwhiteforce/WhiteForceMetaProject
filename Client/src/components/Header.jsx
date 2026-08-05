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

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    setIsDropdownOpen(false);
    navigate(path);
  };

  return (
    <header className="h-20 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between transition-colors duration-300">
      {/* Left side: Hamburger menu & Logo (visible only on mobile) */}
      <div className="flex items-center space-x-3 md:hidden">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-slate-500 transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Logo" className="w-8 h-6 object-cover" />
          <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">White Force</span>
        </div>
      </div>

      {/* Spacer to push right-side content when left-side content is hidden on desktop */}
      <div className="hidden md:block" />

      {/* Right side: theme button and user info dropdown */}
      <div className="flex items-center space-x-4 sm:space-x-6">
        <button 
          onClick={toggleTheme} 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        {/* User Profile Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-3 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200 focus:outline-none cursor-pointer group"
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
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
            </div>

            <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Glassmorphism Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* User Details Header Card */}
              <div className="p-4 bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center space-x-3">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt={user.username} className="w-11 h-11 rounded-xl object-cover ring-2 ring-blue-500/30" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-md">
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
                    <div className="mt-1 flex items-center space-x-1">
                      <span className={`inline-flex items-center space-x-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        user?.role === 'admin' 
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' 
                          : user?.role === 'manager'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      }`}>
                        <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                        <span>{user?.role}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Links */}
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => handleNavigate('/profile')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-blue-500" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => handleNavigate('/profile')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-indigo-500" />
                  <span>Account Settings</span>
                </button>
              </div>

              {/* Logout Footer */}
              <div className="p-1.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/40 dark:bg-white/[0.01]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
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

