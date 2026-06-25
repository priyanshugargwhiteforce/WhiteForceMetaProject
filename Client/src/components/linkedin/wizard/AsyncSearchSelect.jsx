import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, AlertCircle } from 'lucide-react';

const AsyncSearchSelect = ({
  type,
  selectedValues = [],
  onChange,
  placeholder = 'Search targeting...',
  label = ''
}) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const containerRef = useRef(null);
  const debounceTimer = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search logic
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (val.trim().length < 2) {
      setOptions([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsOpen(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/linkedin/targeting/search?type=${type}&q=${encodeURIComponent(val.trim())}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Search API query failed');
        }

        const data = await response.json();
        setOptions(data);
      } catch (err) {
        console.error(`[Targeting Search] Error searching for ${type}:`, err);
        setError('Failed to load search results.');
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  // Add item on selection
  const handleSelectOption = (option) => {
    const isAlreadySelected = selectedValues.some(item => {
      const existingUrn = typeof item === 'string' ? item : item.urn;
      return existingUrn === option.urn;
    });

    if (!isAlreadySelected) {
      const nextValues = [...selectedValues, option];
      onChange(nextValues);
    }
    
    // Clear search states
    setQuery('');
    setOptions([]);
    setIsOpen(false);
  };

  // Remove item on click cross
  const handleRemoveItem = (indexToRemove) => {
    const nextValues = selectedValues.filter((_, idx) => idx !== indexToRemove);
    onChange(nextValues);
  };

  return (
    <div ref={containerRef} className="space-y-2 relative w-full">
      {label && (
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          {label}
        </label>
      )}
      
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
        />
        {loading && (
          <Loader2 className="absolute right-3 w-4 h-4 text-blue-500 animate-spin" />
        )}
      </div>

      {/* Dropdown Options Popup */}
      {isOpen && (
        <div className="absolute z-50 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl max-h-60 overflow-y-auto mt-1 animate-in fade-in duration-100">
          {loading ? (
            <div className="p-4 text-center text-xs font-semibold text-slate-400 flex items-center justify-center space-x-2">
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-xs font-bold text-red-500 flex items-center justify-center space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : options.length === 0 ? (
            <div className="p-4 text-center text-xs font-semibold text-slate-400 italic">
              No matching targeting entities found
            </div>
          ) : (
            <ul className="py-1.5">
              {options.map((opt) => {
                const isSelected = selectedValues.some(item => {
                  const existingUrn = typeof item === 'string' ? item : item.urn;
                  return existingUrn === opt.urn;
                });

                return (
                  <li key={opt.urn}>
                    <button
                      type="button"
                      disabled={isSelected}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center justify-between ${
                        isSelected 
                          ? 'bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-default' 
                          : 'hover:bg-blue-500 hover:text-white text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{opt.name}</span>
                      {isSelected && (
                        <span className="text-[9px] bg-slate-200/50 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">Selected</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Selected Value Chips */}
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedValues.map((item, idx) => {
          const displayName = typeof item === 'string' ? item : item.name;
          const isLegacyUrn = typeof item === 'string';

          return (
            <span
              key={idx}
              className={`flex items-center space-x-1.5 px-3 py-1 text-xs rounded-full font-bold transition-all ${
                isLegacyUrn
                  ? 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-mono text-[10px]'
                  : 'bg-blue-500/10 dark:bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
              }`}
            >
              <span className="truncate max-w-[200px]" title={displayName}>
                {displayName}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Remove selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          );
        })}
        {selectedValues.length === 0 && (
          <span className="text-[10px] text-slate-400 italic">
            No items selected.
          </span>
        )}
      </div>
    </div>
  );
};

export default AsyncSearchSelect;
