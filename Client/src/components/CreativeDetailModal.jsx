import React, { useState, useEffect } from 'react';
import { 
  X, 
  Eye, 
  ExternalLink, 
  Calendar, 
  Activity, 
  Settings, 
  AlertCircle,
  Globe,
  Camera,
  FileText,
  List,
  Target,
  Sun,
  Moon,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

import { useAuth } from '../context/AuthContext';
import LeadDataModal from './LeadDataModal';

const CreativeDetailModal = ({ isOpen, onClose, creativeId }) => {
  const { theme, toggleTheme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!creativeId || !isOpen) return;
      
      setLoading(true);
      setError(null);
      setData(null); // Reset data to avoid showing old creative info
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `http://localhost:5000/api/meta/creatives/${creativeId}`, {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          }
        );
        const result = await response.json();
        if (result.error) throw new Error(result.error.message);
        setData(result.data);
      } catch (err) {
        console.error("Creative Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [creativeId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 transition-colors">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-[var(--bg-sidebar)] border border-slate-200 dark:border-blue-500/20 rounded-3xl w-full max-w-xl shadow-2xl relative z-10 overflow-hidden fade-in border-glow transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-blue-500/5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Eye className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white transition-colors">Creative Assets & Spec</h3>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium transition-colors">Visuals, Copy & Call to Action</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 hover:text-blue-600 dark:hover:text-white transition-all border border-transparent"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 hover:text-red-500 dark:hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center">
             <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Fetching Creative Data...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
             <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
             <p className="text-sm text-white font-bold mb-2">Failed to Load Creative</p>
             <p className="text-xs text-slate-500 mb-6">{error}</p>
             <button onClick={onClose} className="px-6 py-2 bg-white/10 rounded-xl text-xs font-bold text-white">Close</button>
          </div>
        ) : data && (
          <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            {/* Preview Image/Video */}
            {(data.image_url || data.thumbnail_url) && (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                <img 
                  src={data.image_url || data.thumbnail_url} 
                  alt="Creative Preview" 
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[8px] font-bold text-white uppercase tracking-tighter border border-white/10">
                  Visual Preview
                </div>
              </div>
            )}

            {/* Text Content & Assets */}
            <div className="space-y-4">
              {/* Primary Info */}
              <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 transition-colors">Headline / Title</p>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight transition-colors">{data.title || data.name}</h4>
              </div>

              {/* Lead Gen Form Section */}
              {(data.call_to_action?.value?.lead_gen_form_id || data.object_story_spec?.link_data?.call_to_action?.value?.lead_gen_form_id) && (
                <div className="bg-blue-600/10 border border-blue-500/30 p-4 rounded-2xl relative overflow-hidden group/lead">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full -mr-12 -mt-12"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Target className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Lead Generation Form</p>
                      </div>
                      <p className="text-xs font-mono text-slate-900 dark:text-white tracking-wider">ID: {data.call_to_action?.value?.lead_gen_form_id || data.object_story_spec?.link_data?.call_to_action?.value?.lead_gen_form_id}</p>
                    </div>
                    <button 
                      onClick={() => {
                        const formId = data.call_to_action?.value?.lead_gen_form_id || data.object_story_spec?.link_data?.call_to_action?.value?.lead_gen_form_id;
                        setSelectedFormId(formId);
                        setIsLeadModalOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center"
                    >
                      <RefreshCw className="w-3 h-3 mr-2 group-hover/lead:rotate-180 transition-transform duration-700" />
                      GET LEAD DATA
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Asset Feed Spec */}
              {data.asset_feed_spec && (
                <div className="space-y-3">
                   <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center px-1">
                     <List className="w-3 h-3 mr-2 text-indigo-400" />
                     Dynamic Asset Variants
                   </h4>
                   
                   <div className="grid grid-cols-1 gap-3">
                     {data.asset_feed_spec.titles && (
                       <AssetList label="Alternative Titles" items={data.asset_feed_spec.titles} color="indigo" />
                     )}
                     {data.asset_feed_spec.bodies && (
                       <AssetList label="Ad Copy Variants" items={data.asset_feed_spec.bodies} color="blue" />
                     )}
                     {data.asset_feed_spec.descriptions && (
                       <AssetList label="Description Variants" items={data.asset_feed_spec.descriptions} color="emerald" />
                     )}
                   </div>
                </div>
              )}
            </div>

            {/* Technical Specs & Platforms */}
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-3">
                 <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-200 dark:border-white/5 transition-colors">
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center">
                     <Globe className="w-2 h-2 mr-1.5 text-blue-600 dark:text-blue-400" /> Page ID
                   </p>
                   <p className="text-[11px] font-mono text-slate-700 dark:text-slate-300 transition-colors">{data.object_story_spec?.page_id || 'N/A'}</p>
                 </div>
                 <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-200 dark:border-white/5 transition-colors">
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center">
                     <Camera className="w-2 h-2 mr-1.5 text-pink-600 dark:text-pink-400" /> Insta User ID
                   </p>
                   <p className="text-[11px] font-mono text-slate-700 dark:text-slate-300 transition-colors">{data.object_story_spec?.instagram_user_id || 'N/A'}</p>
                 </div>
               </div>

               <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-200 dark:border-white/5 transition-colors">
                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">URL Tags / Landing Link</p>
                 <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400 break-all leading-relaxed transition-colors">{data.url_tags || 'None'}</p>
               </div>

               {/* Object Story Spec Snippet */}
               {data.object_story_spec && (
                 <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Object Story Spec</p>
                    <div className="text-[10px] font-mono text-slate-500 overflow-hidden h-12 opacity-50">
                      {JSON.stringify(data.object_story_spec)}
                    </div>
                    <button className="mt-2 text-[8px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300">View Raw Spec</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/5 flex justify-end transition-colors">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            Close Creative
          </button>
        </div>

      </div>

      {/* Lead Data Modal (Deeper Drill-down - Moved outside for better z-index handling) */}
      <LeadDataModal 
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        formId={selectedFormId}
      />
    </div>
  );
};

const AssetList = ({ label, items, color }) => {
  const { theme } = useTheme();
  
  const colors = {
    indigo: {
      light: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      dark: 'text-indigo-400 bg-indigo-400/5 border-indigo-400/10'
    },
    blue: {
      light: 'text-blue-700 bg-blue-50 border-blue-200',
      dark: 'text-blue-400 bg-blue-400/5 border-blue-400/10'
    },
    emerald: {
      light: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      dark: 'text-emerald-400 bg-emerald-400/5 border-emerald-400/10'
    }
  };

  const activeColors = theme === 'dark' ? colors[color].dark : colors[color].light;

  return (
    <div className={`p-3 rounded-2xl border transition-colors ${activeColors}`}>
      <p className="text-[8px] font-bold uppercase tracking-widest mb-2 opacity-80">{label} ({items.length})</p>
      <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
        {items.map((item, i) => (
          <div key={i} className="flex items-start space-x-2">
            <div className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 ${theme === 'dark' ? 'bg-current opacity-50' : 'bg-current opacity-70'}`}></div>
            <p className="text-[10px] leading-relaxed font-medium">{item.text || item}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreativeDetailModal;
