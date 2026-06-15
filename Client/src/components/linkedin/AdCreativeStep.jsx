import React, { useContext, useState, useEffect } from 'react';
import AdBuilderContext from '../../context/AdBuilderContext';
import { Layers, AlertCircle, CheckCircle, Search, Info } from 'lucide-react';

export default function AdCreativeStep() {
  const { draft, setDraft, triggerSaveDraft } = useContext(AdBuilderContext);
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!draft.accountId) {
      setCreatives([]);
      return;
    }
    const fetchCreatives = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/linkedin/creatives?accountId=${draft.accountId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          setCreatives(data.data);
        } else {
          setCreatives([]);
        }
      } catch (err) {
        console.error('Fetch creatives error:', err);
        setError('Network error fetching creatives.');
      } finally {
        setLoading(false);
      }
    };
    fetchCreatives();
  }, [draft.accountId]);

  const handleSelectCreative = (creative) => {
    setDraft(prev => {
      const updated = {
        ...prev,
        creativeId: creative.id,
        // Carry forward some helpful details for preview/validation
        creativeUrn: creative.creative_urn,
        creativeHeadline: creative.headline,
        creativeDescription: creative.description,
        creativeType: creative.creative_type,
        destinationUrl: creative.destination_url,
      };
      localStorage.setItem('linkedinAdDraft', JSON.stringify(updated));
      return updated;
    });
    // Trigger autosave
    triggerSaveDraft({
      ...draft,
      creativeId: creative.id,
      creativeUrn: creative.creative_urn,
      creativeHeadline: creative.headline,
      creativeDescription: creative.description,
      creativeType: creative.creative_type,
      destinationUrl: creative.destination_url,
    });
  };

  const filteredCreatives = creatives.filter(c => {
    const text = `${c.headline || ''} ${c.description || ''} ${c.creative_type || ''}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  if (!draft.accountId) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Ad Account Required</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Please select an ad account in the first step to see creatives.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center space-x-2 text-slate-800 dark:text-white">
          <Layers className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold">Select Ad Creative</h3>
        </div>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search creatives..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(n => (
            <div key={n} className="h-40 bg-slate-100 dark:bg-white/5 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredCreatives.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Info className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Creatives Found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Create a creative first in the Creative Builder.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCreatives.map(c => {
            const isSelected = String(draft.creativeId) === String(c.id);
            const isLocalDraft = !c.creative_urn;

            return (
              <div
                key={c.id}
                onClick={() => handleSelectCreative(c)}
                className={`group relative border rounded-[2rem] p-5 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/[0.03] shadow-md shadow-blue-500/5'
                    : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 bg-white dark:bg-white/[0.01]'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                      {c.creative_type || 'SINGLE_IMAGE'}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="p-1 bg-blue-500 text-white rounded-full">
                      <CheckCircle className="w-3.5 h-3.5 fill-current" />
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                    {c.headline || 'Untitled Creative'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {c.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">URN Status:</span>
                    {isLocalDraft ? (
                      <span className="text-amber-500 font-bold flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Local Draft Only</span>
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px] font-mono">
                        {c.creative_urn}
                      </span>
                    )}
                  </div>
                </div>

                {isLocalDraft && isSelected && (
                  <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-semibold flex items-start space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Warning: This is a local draft with no URN. You cannot publish live ads with local creatives.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
