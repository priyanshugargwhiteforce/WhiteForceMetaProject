import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({
  value,
  onChange,
  options, // Array of { value, label } or simple strings/numbers
  className = '',
  dropdownClassName = '',
  prefix = '',
  disabled = false,
  showSearch = false,
  searchPlaceholder = 'Search...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Normalize options to objects { value, label }
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return opt;
    }
    return { value: opt, label: opt };
  });

  const selectedOption = normalizedOptions.find(opt => opt.value === value) || normalizedOptions[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search query when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const filteredOptions = showSearch
    ? normalizedOptions.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.value.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
    : normalizedOptions;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 font-bold focus:outline-none transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${className}`}
      >
        <span className="truncate">
          {prefix}{selectedOption ? selectedOption.label : ''}
        </span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'}`} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 z-50 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl p-1.5 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-150 min-w-full ${dropdownClassName}`}>
          {showSearch && (
            <div className="p-1 border-b border-slate-100 dark:border-white/5 mb-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-2 text-xs text-slate-400 dark:text-slate-500 text-center font-medium">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
