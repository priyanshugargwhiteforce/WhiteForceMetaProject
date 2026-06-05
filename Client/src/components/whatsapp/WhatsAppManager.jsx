import { useState, useEffect } from 'react';
import {
  MessageCircle,
  Phone,
  ShieldCheck,
  Activity,
  Settings,
  Globe,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Hash,
  Layers,
  Database
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const WhatsAppManager = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configurations States
  const [whatsappConfigs, setWhatsappConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(localStorage.getItem('selectedWhatsAppConfigId') || '');

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/whatsapp/configs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        const configs = response.data.configs || [];
        setWhatsappConfigs(configs);
        if (configs.length > 0 && !localStorage.getItem('selectedWhatsAppConfigId')) {
          setSelectedConfigId(configs[0].id.toString());
          localStorage.setItem('selectedWhatsAppConfigId', configs[0].id.toString());
        }
      }
    } catch (err) {
      console.error("Error fetching whatsapp configs:", err);
    }
  };

  const handleConfigChange = (e) => {
    const val = e.target.value;
    setSelectedConfigId(val);
    localStorage.setItem('selectedWhatsAppConfigId', val);
  };

  useEffect(() => {
    fetchConfigs();

    const handleConfigChanged = (e) => {
      if (e.detail.type === 'whatsapp') {
        fetchConfigs();
        fetchWhatsAppDetails();
      }
    };
    window.addEventListener('config-changed', handleConfigChanged);
    return () => window.removeEventListener('config-changed', handleConfigChanged);
  }, []);

  useEffect(() => {
    fetchWhatsAppDetails();
  }, [selectedConfigId]);

  const fetchWhatsAppDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const configId = localStorage.getItem('selectedWhatsAppConfigId') || '';
      const headers = {};
      if (configId) {
        headers['X-WhatsApp-Config-Id'] = configId;
      }

      const response = await axios.get('http://localhost:5000/api/whatsapp/details', { headers });
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching WhatsApp details:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status, type = 'success' }) => {
    const colors = {
      success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      danger: 'bg-red-500/10 text-red-500 border-red-500/20',
      info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[type]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-8">
      {/* Title & Refresh Block */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-green-500/10 rounded-2xl text-green-500">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">WhatsApp Manager</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Account & Number Settings</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* WhatsApp Account Connection Dropdown */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2 transition-colors">
            <Database className="w-4 h-4 text-green-500" />
            <select
              value={selectedConfigId}
              onChange={handleConfigChange}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer text-slate-700 dark:text-slate-200"
            >
              <option value="" className="bg-white dark:bg-slate-900">Default Server Config</option>
              {whatsappConfigs.map(cfg => (
                <option key={cfg.id} value={cfg.id} className="bg-white dark:bg-slate-900">{cfg.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchWhatsAppDetails}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 hover:text-green-500 transition-all"
          >
            <Activity className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="w-16 h-16 border-4 border-green-500/10 border-t-green-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium animate-pulse">Syncing WhatsApp Cloud Data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Sync Error</h3>
            <p className="text-slate-500 max-w-md mb-8">{error}</p>
            <button
              onClick={fetchWhatsAppDetails}
              className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-green-600/20"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Phone Number Card */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center">
                <Phone className="w-4 h-4 mr-2 text-green-500" />
                Phone Number Details
              </h3>

              <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm p-8 group hover:border-green-500/30 transition-all duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                      <ShieldCheck className="w-7 h-7 text-green-500" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold">{data?.phoneNumber?.verified_name}</h4>
                      <p className="text-sm text-slate-500 font-mono">{data?.phoneNumber?.display_phone_number}</p>
                    </div>
                  </div>
                  <StatusBadge status={data?.phoneNumber?.quality_rating} type={data?.phoneNumber?.quality_rating === 'GREEN' ? 'success' : 'warning'} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailItem icon={Hash} label="Phone ID" value={data?.phoneNumber?.id} />
                  <DetailItem icon={CheckCircle2} label="Verification" value={data?.phoneNumber?.code_verification_status} />
                  <DetailItem icon={Layers} label="Platform" value={data?.phoneNumber?.platform_type} />
                  <DetailItem icon={Activity} label="Throughput" value={data?.phoneNumber?.throughput?.level || 'Standard'} />
                  <DetailItem icon={ShieldCheck} label="Name Status" value={data?.phoneNumber?.name_status || 'NONE'} className="sm:col-span-2" />
                </div>
              </div>
            </div>

            {/* WABA Card */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center">
                <Globe className="w-4 h-4 mr-2 text-blue-500" />
                Business Account (WABA)
              </h3>

              <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm p-8 group hover:border-blue-500/30 transition-all duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                      <Settings className="w-7 h-7 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold">{data?.waba?.name}</h4>
                      <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">ID: {data?.waba?.id}</p>
                    </div>
                  </div>
                  <StatusBadge status={data?.waba?.account_review_status} type={data?.waba?.account_review_status === 'APPROVED' ? 'success' : 'warning'} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailItem icon={CreditCard} label="Currency" value={data?.waba?.currency} />
                  <DetailItem icon={Clock} label="Timezone" value={data?.waba?.timezone_id} />
                  <DetailItem icon={ShieldCheck} label="Verification" value={data?.waba?.business_verification_status} />
                  <DetailItem icon={MessageCircle} label="Namespace" value={data?.waba?.message_template_namespace?.split('_')[0] + '...'} />
                </div>
              </div>
            </div>

            {/* JSON Raw Data Preview */}
            <div className="lg:col-span-2 mt-4">
              <div className="bg-slate-900 rounded-[2.5rem] p-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Activity className="w-48 h-48 text-white" />
                </div>
                <h3 className="text-white text-lg font-bold mb-6 flex items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-3 animate-pulse"></div>
                  Raw API Synchronized Data
                </h3>
                <div className="bg-black/40 rounded-2xl p-6 font-mono text-xs text-blue-300 overflow-x-auto max-h-[300px]">
                  <pre>{JSON.stringify(data, null, 2)}</pre>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

const DetailItem = ({ icon: Icon, label, value, className = '' }) => (
  <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center space-x-3 group/item hover:bg-white dark:hover:bg-white/10 transition-all ${className}`}>
    <div className="w-10 h-10 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center shadow-sm group-hover/item:scale-110 transition-transform">
      <Icon className="w-5 h-5 text-slate-400 group-hover/item:text-blue-500 transition-colors" />
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-bold truncate max-w-[200px]">{value || 'N/A'}</p>
    </div>
  </div>
);

export default WhatsAppManager;
