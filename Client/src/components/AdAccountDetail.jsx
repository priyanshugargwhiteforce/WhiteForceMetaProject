import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CreditCard, 
  Activity, 
  TrendingUp, 
  Eye, 
  Calendar, 
  Wallet,
  Settings,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Clock,
  ExternalLink,
  Layers,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import CreativeDetailModal from './CreativeDetailModal';

const AdAccountDetail = () => {
  const { theme, toggleTheme } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAd, setSelectedAd] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCreativeId, setSelectedCreativeId] = useState(null);
  const [isCreativeModalOpen, setIsCreativeModalOpen] = useState(false);

  useEffect(() => {
    const fetchAccountDetails = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const configId = localStorage.getItem('selectedMetaConfigId') || '';
        const headers = { 'Authorization': `Bearer ${token}` };
        if (configId) headers['X-Meta-Config-Id'] = configId;

        const response = await fetch(
          `http://localhost:5000/api/meta/accounts/${id}`, { headers }
        );
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message);
        }
        
        setAccountData(data.data);
      } catch (err) {
        console.error("Error fetching account details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAccountDetails();
    }
  }, [id]);

  const handleOpenCreative = (creativeId) => {
    setSelectedCreativeId(creativeId);
    setIsCreativeModalOpen(true);
  };

  const formatCurrency = (amount, isSmallestUnit = true) => {
    const value = isSmallestUnit ? amount / 100 : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const getStatusBadge = (status) => {
    const s = typeof status === 'number' ? status : (status === 'ACTIVE' ? 1 : 2);
    switch (s) {
      case 1:
        return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><div className="w-1 h-1 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></div>ACTIVE</span>;
      case 2:
        return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DISABLED</span>;
      default:
        return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-[#020617] items-center justify-center transition-colors">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Fetching Real-time Meta Data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-[var(--bg-main)] items-center justify-center p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">API Error</h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-[var(--bg-input)] hover:bg-white/10 text-[var(--text-main)] rounded-xl transition-all">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Title & Back Block */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-xl bg-[var(--bg-input)] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white transition-all border border-slate-200 dark:border-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
              <span>Ad Accounts</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-blue-600 dark:text-blue-400">Account Details</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">ID: {accountData?.account_id}</h2>
          </div>
        </div>

        <div className="flex items-center space-x-4">
           <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-xs font-bold text-emerald-400 uppercase">Live Sync Active</span>
           </div>
        </div>
      </div>

      <div>
        <div className="fade-in">
            {/* Account Overview Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 transition-colors">Account Summary</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Real-time performance metrics and ad delivery status for account <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">{accountData?.account_id}</span></p>
              </div>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium transition-all flex items-center text-slate-700 dark:text-slate-200">
                  <Calendar className="w-4 h-4 mr-2" />
                  Lifetime
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <SummaryCard 
                label="Total Amount Spent" 
                value={formatCurrency(accountData?.amount_spent)}
                icon={CreditCard}
                color="blue"
                subtext="Cumulative Spend"
              />
              <SummaryCard 
                label="Current Balance" 
                value={formatCurrency(accountData?.balance)}
                icon={Wallet}
                color="purple"
                subtext="Available Credits"
              />
              <SummaryCard 
                label="Account Status" 
                value={accountData?.account_status === 1 ? "Active" : "Disabled"}
                icon={Activity}
                color="emerald"
                isStatus={true}
                statusId={accountData?.account_status}
              />
              <SummaryCard 
                label="Member Since" 
                value={new Date(accountData?.created_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                icon={Clock}
                color="amber"
                subtext="Onboarding Date"
              />
            </div>

            {/* Ads List Section */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center transition-colors">
                <Layers className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
                Ads Performance List
              </h3>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                Total Ads: <span className="text-white">{accountData?.ads?.data?.length || 0}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-premium transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ad Name & ID</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Campaign Details</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Impressions</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Spend</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                    {accountData?.ads?.data?.map((ad) => (
                      <tr key={ad.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[280px]">{ad.name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">ID: {ad.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-center">
                            {getStatusBadge(ad.status)}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            <TrendingUp className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                            <span className="truncate max-w-[150px]">Camp: {ad.campaign_id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right font-mono text-sm font-medium text-slate-600 dark:text-slate-300">
                          {ad.insights?.data?.[0]?.impressions ? parseInt(ad.insights.data[0].impressions).toLocaleString() : '0'}
                        </td>
                        <td className="px-6 py-5 text-right font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {ad.insights?.data?.[0]?.spend ? formatCurrency(ad.insights.data[0].spend, false) : '₹0'}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button 
                            onClick={() => {
                              setSelectedAd(ad);
                              setIsModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 rounded-lg text-[10px] font-bold transition-all flex items-center mx-auto"
                          >
                            <ExternalLink className="w-3 h-3 mr-1.5" />
                            Check Info
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Ad Details Modal */}
        {isModalOpen && selectedAd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-[var(--bg-sidebar)] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden fade-in transition-colors">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center transition-colors">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white transition-colors">Ad Detailed Information</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Full insight & configuration analysis</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                {/* Basic Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-200 dark:border-white/5 transition-colors">
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Ad Name</p>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate transition-colors">{selectedAd.name}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-200 dark:border-white/5 transition-colors">
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <div className="flex">{getStatusBadge(selectedAd.status)}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-200 dark:border-white/5 transition-colors">
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Ad ID</p>
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400 transition-colors">{selectedAd.id}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-200 dark:border-white/5 transition-colors">
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Active Time</p>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white transition-colors">{selectedAd.ad_active_time} sec</p>
                  </div>
                </div>

                {/* Configuration IDs */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                    <Settings className="w-3 h-3 mr-2" />
                    Configuration & Creative
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <InfoBox label="Campaign ID" value={selectedAd.campaign_id || selectedAd.campaign?.id} icon={TrendingUp} />
                    <InfoBox label="Adset ID" value={selectedAd.adset?.id} icon={Layers} />
                    <div className="relative group">
                      <InfoBox label="Creative ID" value={selectedAd.creative?.id} icon={Eye} highlight />
                      {selectedAd.creative?.id && (
                        <button 
                          onClick={() => handleOpenCreative(selectedAd.creative.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[7px] font-bold shadow-lg shadow-blue-500/20 transition-all z-20 flex items-center"
                        >
                          <RefreshCw className="w-2 h-2 mr-1" />
                          GET DATA
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Insights Analysis */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                    <Activity className="w-3 h-3 mr-2" />
                    Real-time Insights (Recent)
                  </h4>
                  {selectedAd.insights?.data?.[0] ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 bg-gradient-to-r from-blue-600/10 to-indigo-600/5 dark:to-transparent p-4 rounded-2xl border border-blue-200 dark:border-blue-500/20 flex items-center justify-between transition-colors">
                         <div>
                            <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Total Spend</p>
                            <p className="text-2xl font-bold text-blue-700 dark:text-white transition-colors">{formatCurrency(selectedAd.insights.data[0].spend, false)}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Impressions</p>
                            <p className="text-xl font-bold text-slate-700 dark:text-slate-200 transition-colors">{parseInt(selectedAd.insights.data[0].impressions).toLocaleString()}</p>
                         </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center space-x-3 transition-colors">
                        <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Start Date</p>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white transition-colors">{selectedAd.insights.data[0].date_start}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center space-x-3 transition-colors">
                        <Calendar className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Stop Date</p>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white transition-colors">{selectedAd.insights.data[0].date_stop}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 text-center">
                       <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                       <p className="text-xs text-slate-500">No active insight data available for this ad.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex justify-end transition-colors">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}

        <CreativeDetailModal 
          isOpen={isCreativeModalOpen}
          onClose={() => setIsCreativeModalOpen(false)}
          creativeId={selectedCreativeId}
        />
      </div>
  );
};


const InfoBox = ({ label, value, icon: Icon, highlight }) => (
  <div className={`p-3 rounded-2xl border transition-all ${highlight ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5'}`}>
    <div className="flex items-center space-x-2 mb-1.5">
      <Icon className={`w-3 h-3 ${highlight ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
      <p className={`text-[8px] font-bold uppercase tracking-widest ${highlight ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>{label}</p>
    </div>
    <p className={`text-[11px] font-mono truncate ${highlight ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-300'}`}>{value || 'N/A'}</p>
  </div>
);

const SummaryCard = ({ label, value, icon: Icon, color, subtext, isStatus, statusId }) => {
  const colorMap = {
    blue: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/20',
    purple: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/20',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/20',
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 1:
        return <span className="flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></div>ACTIVE</span>;
      default:
        return <span className="flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DISABLED</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-premium hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all group relative overflow-hidden">
      {/* Decorative Gradient Background */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br opacity-[0.03] blur-2xl rounded-full ${colorMap[color].split(' ')[0]}`}></div>
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center border ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-6 h-6" />
        </div>
        {isStatus ? (
          getStatusBadge(statusId)
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center transition-colors">
             <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">{value}</h3>
        {subtext && <p className="text-[10px] text-slate-700 dark:text-slate-500 font-medium">{subtext}</p>}
      </div>
    </div>
  );
};

export default AdAccountDetail;
