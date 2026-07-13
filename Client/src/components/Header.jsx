import React from 'react';
import { Sun, Moon, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logo from "../assets/white-forcelogo.png";

const Header = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="h-20 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#0f172a] backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between transition-colors duration-300">
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

      {/* Right side: theme button and user info */}
      <div className="flex items-center space-x-4 sm:space-x-6">
        <button 
          onClick={toggleTheme} 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        <div className="flex items-center space-x-3 cursor-pointer group">
          <div className="text-right">
            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-none mb-1 group-hover:text-blue-400 transition-colors">
              {user?.username || 'Priyanshu'}
            </p>
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium tracking-wide uppercase">
              {user?.role === 'admin' ? 'ADMINISTRATOR' : (user?.role || 'USER')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            {user?.username?.[0]?.toUpperCase() || 'P'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
