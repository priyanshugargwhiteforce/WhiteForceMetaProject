import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Activity,
  Eye,
  TrendingUp,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CustomSelect from './CustomSelect';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [adAccounts, setAdAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('adaccounts');

  // Configurations States
  const [metaConfigs, setMetaConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(localStorage.getItem('selectedMetaConfigId') || '');

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/meta/configs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const configs = data.configs || [];
        setMetaConfigs(configs);
        if (configs.length > 0 && !localStorage.getItem('selectedMetaConfigId')) {
          setSelectedConfigId(configs[0].id.toString());
          localStorage.setItem('selectedMetaConfigId', configs[0].id.toString());
        }
      }
    } catch (err) {
      console.error("Error fetching meta configs:", err);
    }
  };

  const fetchAdAccounts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      if (selectedConfigId) {
        headers['X-Meta-Config-Id'] = selectedConfigId;
      }

      const response = await fetch(`/api/meta/accounts`, { headers });
      const data = await response.json();
      if (data.adaccounts && data.adaccounts.data) {
        setAdAccounts(data.adaccounts.data);
      } else {
        setAdAccounts([]);
      }
    } catch (error) {
      console.error("Error fetching ad accounts:", error);
      setAdAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();

    const handleConfigChanged = (e) => {
      if (e.detail.type === 'meta') {
        fetchConfigs();
        fetchAdAccounts();
      }
    };
    window.addEventListener('config-changed', handleConfigChanged);
    return () => window.removeEventListener('config-changed', handleConfigChanged);
  }, []);

  useEffect(() => {
    fetchAdAccounts();
  }, [selectedConfigId]);

  const handleConfigChange = (e) => {
    const val = e.target.value;
    setSelectedConfigId(val);
    localStorage.setItem('selectedMetaConfigId', val);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount / 100);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 1:
        return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><div className="w-1 h-1 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></div>ACTIVE</span>;
      case 2:
        return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DISABLED</span>;
      case 3:
        return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">PENDING_REVIEW</span>;
      default:
        return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">UNKNOWN</span>;
    }
  };



  return (
    <div className="p-8">
      {activeTab === 'adaccounts' && (
        <div className="fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 transition-colors">Ad Accounts</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Managing <span className="text-blue-600 dark:text-blue-400 font-semibold">{adAccounts.length}</span> connected ad accounts across Meta platforms.</p>
            </div>
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              {/* Meta Account Connection Dropdown */}
              <div className="flex items-center space-x-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1 transition-colors">
                <Database className="w-4 h-4 text-blue-500" />
                <CustomSelect
                  value={selectedConfigId}
                  onChange={(val) => handleConfigChange({ target: { value: val } })}
                  options={[
                    { value: "", label: "Default Server Account" },
                    ...metaConfigs.map(cfg => ({ value: cfg.id, label: cfg.name }))
                  ]}
                  className="border-none bg-transparent py-1 text-xs px-1 min-w-[160px]"
                />
              </div>

              <button className="px-4 py-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold transition-all text-slate-700 dark:text-slate-200 shadow-sm">Export CSV</button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <SummaryCard
              label="Total Life Spend"
              value={formatCurrency(adAccounts.reduce((sum, acc) => sum + parseInt(acc.amount_spent || 0), 0))}
              icon={CreditCard}
              trend="+12.5%"
              color="blue"
            />
            <SummaryCard
              label="Active Accounts"
              value={adAccounts.filter(acc => acc.account_status === 1).length}
              icon={Activity}
              trend="Stable"
              color="emerald"
            />
            <SummaryCard
              label="Total Impressions"
              value={adAccounts.reduce((sum, acc) => sum + parseInt(acc.insights?.data?.[0]?.impressions || 0), 0).toLocaleString()}
              icon={Eye}
              trend="+5.2%"
              color="purple"
            />
            <SummaryCard
              label="Recent Spend"
              value={formatCurrency(adAccounts.reduce((sum, acc) => sum + (parseFloat(acc.insights?.data?.[0]?.spend || 0) * 100), 0))}
              icon={TrendingUp}
              trend="+8.1%"
              color="amber"
            />
          </div>

          {/* Accounts Table */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm dark:shadow-none transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 transition-colors">
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Account Name & ID</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Insights Overview</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Spend (Total)</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Impressions</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05] transition-colors">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-6"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-3/4 mb-2"></div><div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-1/2"></div></td>
                        <td className="px-6 py-6"><div className="h-6 bg-slate-200 dark:bg-white/5 rounded-full w-20 mx-auto"></div></td>
                        <td className="px-6 py-6"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-20 ml-auto"></div></td>
                        <td className="px-6 py-6"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-20 ml-auto"></div></td>
                        <td className="px-6 py-6"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-8 mx-auto"></div></td>
                      </tr>
                    ))
                  ) : adAccounts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-sm text-slate-500">
                        No ad accounts found for this configuration.
                      </td>
                    </tr>
                  ) : adAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group cursor-pointer" onClick={() => navigate(`/ad-account/${account.id}`)}>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[280px]">{account.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">ID: {account.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {getStatusBadge(account.account_status)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          <TrendingUp className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                          <span>Lifetime Activity</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-mono text-sm font-bold text-blue-700 dark:text-emerald-400 transition-colors">
                        {formatCurrency(account.amount_spent)}
                      </td>
                      <td className="px-6 py-5 text-right font-mono text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors">
                        {account.insights?.data?.[0]?.impressions ? parseInt(account.insights.data[0].impressions).toLocaleString() : '0'}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/ad-account/${account.id}`);
                            }}
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon, trend, color }) => {
  const colorMap = {
    blue: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/20',
    purple: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/20',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center border ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 ${trend.includes('+') ? 'text-emerald-500' : 'text-slate-400'}`}>
          {trend}
        </span>
      </div>
      <div>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-blue-400 transition-colors">{value}</h3>
      </div>
    </div>
  );
};

export default Dashboard;
