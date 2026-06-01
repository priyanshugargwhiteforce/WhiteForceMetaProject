import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Globe,
  Tag,
  Eye,
  Plus,
  Copy,
  Trash2
} from 'lucide-react';
import axios from 'axios';

const WATemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedWhatsAppConfigId') || '';
      const headers = { Authorization: `Bearer ${token}` };
      if (configId) headers['X-WhatsApp-Config-Id'] = configId;

      const response = await axios.get('http://localhost:5000/api/whatsapp/templates', {
        headers
      });
      if (response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (name) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}" from Meta and local DB?`)) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedWhatsAppConfigId') || '';
      const headers = { Authorization: `Bearer ${token}` };
      if (configId) headers['X-WhatsApp-Config-Id'] = configId;

      const response = await axios.delete(`http://localhost:5000/api/whatsapp/templates/${name}`, {
        headers
      });
      if (response.data.success) {
        fetchTemplates();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  const handleCloneTemplate = (template) => {
    navigate('/wa-templates/new', { state: { cloneTemplate: template } });
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'PENDING': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'REJECTED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 dark:bg-[#0f172a] min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Title & Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">WhatsApp Templates</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">Manage Message Templates</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 pr-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64 transition-all text-slate-800 dark:text-white"
              />
           </div>
           
           <button 
             onClick={() => navigate('/wa-templates/new')}
             className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center shadow-lg shadow-blue-600/10 transition-all"
           >
             <Plus className="w-4 h-4 mr-1.5" /> Create Template
           </button>

           <button 
             onClick={fetchTemplates}
             className="p-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
           >
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[50vh]">
            <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-400 font-medium animate-pulse tracking-wide">Syncing Library Templates...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[50vh]">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-slate-400">{error}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm animate-in fade-in duration-700">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Template Name</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Language</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-blue-500/[0.01] dark:hover:bg-blue-500/[0.02] transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Tag className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="text-sm font-bold truncate max-w-[250px] text-slate-800 dark:text-slate-100">{template.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-600 dark:text-slate-300">
                        {template.category}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="inline-flex items-center space-x-2">
                         <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                         <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">{template.language}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold border ${getStatusStyle(template.status)}`}>
                        {template.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right space-x-2">
                       <button 
                         onClick={() => handleCloneTemplate(template)}
                         title="Clone Template"
                         className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all inline-flex text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                       >
                          <Copy className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => handleDeleteTemplate(template.name)}
                         title="Delete Template"
                         className="p-2 hover:bg-red-500/10 rounded-lg transition-all inline-flex text-red-500 dark:text-red-400"
                       >
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))}
                {filteredTemplates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                      No templates match the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WATemplates;

