import { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Target,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Briefcase,
  RefreshCw,
  AlertCircle,
  Eye,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const LeadDataModal = ({ isOpen, onClose, formId }) => {
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeads = async () => {
      if (!formId || !isOpen) return;

      setLoading(true);
      setError(null);
      setFormData(null);
      try {
        const token = localStorage.getItem('token');
        const configId = localStorage.getItem('selectedMetaConfigId') || '';
        const headers = { 'Authorization': `Bearer ${token}` };
        if (configId) headers['X-Meta-Config-Id'] = configId;

        const response = await fetch(
          `/api/meta/leadforms/${formId}`, { headers }
        );
        const result = await response.json();
        if (result.error) throw new Error(result.error.message);
        setFormData(result.data);

        // console.log("Leads Data Fetched:", setFormData);
      } catch (err) {
        console.error("Lead Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [formId, isOpen]);

  console.log("Leads Data Fetched:", formData);

  const getFieldValue = (fieldData, fieldName) => {
    if (!fieldData || !Array.isArray(fieldData)) return 'N/A';

    // 1. Try exact match
    let field = fieldData.find(f => f.name === fieldName);

    // 2. Try variations (spaces vs underscores)
    if (!field) {
      const alternativeName = fieldName.includes('_')
        ? fieldName.replace(/_/g, ' ')
        : fieldName.replace(/ /g, '_');
      field = fieldData.find(f => f.name === alternativeName);
    }

    // 3. Normalized matching (lowercase, no spaces/underscores)
    if (!field) {
      const normalize = (s) => s?.toLowerCase().replace(/[_\s]/g, '');
      const normalizedTarget = normalize(fieldName);
      field = fieldData.find(f => normalize(f.name) === normalizedTarget);
    }

    // 4. Specific aliases for common fields
    if (!field) {
      if (fieldName === 'whatsapp_number' || fieldName === 'phone_number') {
        field = fieldData.find(f => f.name === 'phone_number' || f.name === 'whatsapp_number' || f.name === 'phone number');
      }
      if (fieldName === 'full_name' || fieldName === 'full name') {
        field = fieldData.find(f => f.name === 'full_name' || f.name === 'full name' || f.name === 'name');
      }
    }

    return (field && field.values && field.values.length > 0) ? field.values[0] : 'N/A';
  };

  const handleExportCSV = () => {
    if (!formData?.leads?.data || formData.leads.data.length === 0) {
      alert("No lead data to export.");
      return;
    }

    const headers = [
      "Submission ID",
      "Timestamp",
      "Full Name",
      "Email",
      "Phone Number",
      "Street Address",
      "City",
      "Job Title"
    ];

    const csvRows = formData.leads.data.map(lead => {
      const row = [
        lead.id,
        new Date(lead.created_time).toLocaleString().replace(/,/g, ''),
        `"${getFieldValue(lead.field_data, 'full_name').replace(/"/g, '""')}"`,
        `"${getFieldValue(lead.field_data, 'email').replace(/"/g, '""')}"`,
        `"${getFieldValue(lead.field_data, 'phone_number').replace(/"/g, '""')}"`,
        `"${getFieldValue(lead.field_data, 'street_address').replace(/"/g, '""')}"`,
        `"${getFieldValue(lead.field_data, 'city').replace(/"/g, '""')}"`,
        `"${getFieldValue(lead.field_data, 'job_title').replace(/"/g, '""')}"`
      ];
      return row.join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Leads_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 transition-colors">
      <div className="absolute inset-0 bg-[#020617]/40 dark:bg-[#020617]/95 backdrop-blur-xl" onClick={onClose}></div>
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-500/30 rounded-[40px] w-full max-w-[95%] lg:max-w-[1280px] h-[92vh] shadow-2xl relative z-10 overflow-hidden flex flex-col fade-in border-glow transition-colors">

        {/* Modal Header */}
        <div className="px-10 py-8 border-b border-white/5 bg-blue-600/5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.05),transparent)] pointer-events-none"></div>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/10">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-0.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{formData?.name || 'Form Lead Data'}</h3>
                {formData?.status === 'ACTIVE' && (
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">Active</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest flex items-center">
                <Briefcase className="w-3 h-3 mr-1.5 text-blue-400" />
                FORM ID: <span className="text-blue-600 dark:text-blue-400 ml-1">{formId}</span>
              </p>
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
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-700 dark:text-white transition-all flex items-center shadow-sm"
            >
              <Download className="w-3 h-3 mr-2" />
              EXPORT CSV
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 hover:text-red-500 dark:hover:text-white transition-all border border-transparent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6"></div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] animate-pulse">Retrieving Real-time Leads...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Lead Synchronization Failed</h2>
            <p className="text-slate-400 text-sm max-w-md mb-8">{error}</p>
            <button onClick={onClose} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10">Return to Creative</button>
          </div>
        ) : (
          <>
            {/* Form Stats Summary */}
            <div className="px-8 py-6 grid grid-cols-4 gap-6 bg-slate-50 dark:bg-white/[0.01] border-b border-slate-200 dark:border-white/5">
              <StatCard label="Total Leads" value={formData?.leads_count || 0} icon={User} color="blue" />
              <StatCard label="Form Locale" value={formData?.locale || 'N/A'} icon={RefreshCw} color="indigo" />
              <StatCard label="Created On" value={new Date(formData?.created_time).toLocaleDateString()} icon={Calendar} color="emerald" />
              <StatCard label="Sync Status" value="Healthy" icon={CheckCircle2} color="purple" />
            </div>

            {/* Leads Table Section */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-8 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  <Clock className="w-3 h-3 mr-2 text-blue-400" />
                  Recent Submissions
                </h4>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-[10px] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50 w-64 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-transparent">
                      <th className="pb-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2">Timestamp</th>
                      <th className="pb-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2">Full Name</th>
                      <th className="pb-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2">Contact Info</th>
                      <th className="pb-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2">Location</th>
                      <th className="pb-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2">Street Address</th>
                      <th className="pb-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2">Job Title</th>
                      <th className="pb-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                    {formData?.leads?.data?.map((lead) => (
                      <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-5 px-2">
                          <div className="text-[10px] text-slate-400 font-mono flex items-center">
                            <Clock className="w-3 h-3 mr-2 opacity-50" />
                            {new Date(lead.created_time).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-5 px-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10 shadow-inner">
                              <User className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {getFieldValue(lead.field_data, 'full_name')}
                            </span>
                          </div>
                        </td>
                        <td className="py-5 px-2 space-y-1.5">
                          <div className="flex items-center text-[10px] text-slate-600 dark:text-slate-300">
                            <div className="w-5 h-5 rounded-md bg-blue-500/10 flex items-center justify-center mr-2">
                              <Mail className="w-2.5 h-2.5 text-blue-400" />
                            </div>
                            {getFieldValue(lead.field_data, 'email')}
                          </div>
                          <div className="flex items-center text-[10px] text-emerald-400 font-bold">
                            <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center mr-2">
                              <Phone className="w-2.5 h-2.5 text-emerald-400" />
                            </div>
                            {getFieldValue(lead.field_data, 'whatsapp_number')}
                          </div>
                        </td>
                        <td className="py-5 px-2">
                          <div className="flex items-center text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                            <MapPin className="w-3.5 h-3.5 mr-2 text-indigo-400 opacity-70" />
                            {getFieldValue(lead.field_data, 'city')}
                          </div>
                        </td>
                        <td className="py-5 px-2 max-w-[180px]">
                          <p className="text-[10px] text-slate-500 leading-tight italic truncate hover:text-slate-400 transition-colors cursor-help" title={getFieldValue(lead.field_data, 'street_address')}>
                            {getFieldValue(lead.field_data, 'street_address')}
                          </p>
                        </td>
                        <td className="py-5 px-2">
                          <div className="flex items-center text-[10px] text-slate-600 dark:text-slate-300">
                            <Briefcase className="w-3.5 h-3.5 mr-2 text-blue-500 dark:text-blue-400 opacity-70" />
                            {getFieldValue(lead.field_data, 'job_title')}
                          </div>
                        </td>
                        <td className="py-5 px-2">
                          <div className="flex items-center justify-center space-x-2">
                            <button className="p-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-all border border-blue-500/10" title="View Details">
                              <Eye className="w-3 h-3" />
                            </button>
                            <button className="p-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-all border border-emerald-500/10" title="WhatsApp Lead">
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            <button className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all border border-white/5" title="Copy Lead ID">
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {(!formData?.leads?.data || formData.leads.data.length === 0) && (
                  <div className="py-20 text-center">
                    <Search className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                    <p className="text-sm text-slate-500 font-medium">No leads found for this form yet.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Modal Footer */}
        <div className="px-8 py-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01] flex justify-between items-center text-[10px] text-slate-500 transition-colors">
          <div className="flex items-center space-x-4">
            <span>Showing {formData?.leads?.data?.length || 0} recent leads</span>
            <span>•</span>
            <span className="text-blue-400 font-bold">White Force Management System</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold transition-all border border-slate-200 dark:border-white/10"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color }) => {
  const colors = {
    blue: 'from-blue-500/20 text-blue-400 border-blue-500/20',
    indigo: 'from-indigo-500/20 text-indigo-400 border-indigo-400/10',
    emerald: 'from-emerald-500/20 text-emerald-400 border-emerald-500/10',
    purple: 'from-purple-500/20 text-purple-400 border-purple-500/10',
  };

  return (
    <div className={`bg-slate-100 dark:bg-white/[0.02] border rounded-2xl p-4 flex items-center space-x-4 transition-colors ${colors[color]} border-slate-200 dark:border-opacity-10`}>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center border ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
      </div>
    </div>
  );
};

export default LeadDataModal;
