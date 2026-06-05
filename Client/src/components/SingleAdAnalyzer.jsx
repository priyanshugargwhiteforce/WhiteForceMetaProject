import { useState, useEffect } from 'react';
import {
  Target,
  Users,
  ChevronRight,
  ChevronLeft,
  Search,
  Calendar,
  CreditCard,
  Eye,
  TrendingUp,
  BarChart3,
  AlertCircle,
  LayoutGrid,
  Filter,
  ArrowRight,
  Activity,
  DollarSign,
  Clock,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import SingleAdReportModal from './SingleAdReportModal';

const STEPS = {
  ACCOUNTS: 'accounts',
  ADS: 'ads',
  INSIGHTS: 'insights'
};

const SingleAdAnalyzer = () => {
  const { theme } = useTheme();
  const [step, setStep] = useState(STEPS.ACCOUNTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [adAccounts, setAdAccounts] = useState([]);
  const [ads, setAds] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedAd, setSelectedAd] = useState(null);
  const [insights, setInsights] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Fetch all Ad Accounts initially
  useEffect(() => {
    fetchAdAccounts();
  }, []);

  const fetchAdAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedMetaConfigId') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      if (configId) headers['X-Meta-Config-Id'] = configId;

      const response = await fetch(`/api/meta/accounts`, { headers });
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      if (result.adaccounts && result.adaccounts.data) {
        setAdAccounts(result.adaccounts.data);
      }
    } catch (err) {
      console.error("Error fetching ad accounts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAds = async (accountId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedMetaConfigId') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      if (configId) headers['X-Meta-Config-Id'] = configId;

      const response = await fetch(`/api/meta/accounts/${accountId}`, { headers });
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      setAds(result.data?.ads?.data || []);
      setStep(STEPS.ADS);
    } catch (err) {
      console.error("Error fetching ads:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdInsights = async (adId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedMetaConfigId') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      if (configId) headers['X-Meta-Config-Id'] = configId;

      const response = await fetch(`/api/meta/ads/${adId}/insights`, { headers });
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      setInsights(result.data || []);
      setStep(STEPS.INSIGHTS);
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const filteredAccounts = adAccounts.filter(acc =>
    acc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.account_id?.includes(searchTerm)
  );

  const filteredAds = ads.filter(ad =>
    ad.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBack = () => {
    if (step === STEPS.INSIGHTS) {
      setStep(STEPS.ADS);
      setSelectedAd(null);
    } else if (step === STEPS.ADS) {
      setStep(STEPS.ACCOUNTS);
      setSelectedAccount(null);
      setAds([]);
    }
    setSearchTerm("");
  };
  // console.log(selectedAd);

  return (
    <div className="p-8 space-y-8">
      {/* Title & Navigation Block */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div className="flex items-center space-x-4">
          {step !== STEPS.ACCOUNTS && (
            <button
              onClick={handleBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all group"
            >
              <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-blue-500 transition-colors" />
            </button>
          )}
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
              <span className={step === STEPS.ACCOUNTS ? "text-blue-600 dark:text-blue-400" : ""}>Accounts</span>
              {step !== STEPS.ACCOUNTS && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className={step === STEPS.ADS ? "text-blue-600 dark:text-blue-400" : ""}>Ads</span>
                </>
              )}
              {step === STEPS.INSIGHTS && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-blue-600 dark:text-blue-400">Analysis</span>
                </>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">
              {step === STEPS.ACCOUNTS && "Select Ad Account"}
              {step === STEPS.ADS && `Ads for ${selectedAccount?.name}`}
              {step === STEPS.INSIGHTS && "Performance Analytics"}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {step === STEPS.INSIGHTS && (
            <div className="hidden lg:flex items-center space-x-2 mr-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Ad</span>
                <span className="text-sm font-bold text-blue-500 truncate max-w-[200px]">{selectedAd?.name}</span>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-2"></div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campaign</span>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{selectedAd?.campaign?.name}</span>
              </div>
            </div>
          )}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder={step === STEPS.ACCOUNTS ? "Search accounts..." : "Search ads..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all min-w-[250px]"
            />
          </div>
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500">
            <Target className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
              </div>
            </div>
            <p className="mt-6 text-slate-500 dark:text-slate-400 font-medium animate-pulse tracking-wide">
              Retrieving Real-time Data...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">API Connection Error</h3>
            <p className="text-slate-500 max-w-md mb-8">{error}</p>
            <button
              onClick={() => step === STEPS.ACCOUNTS ? fetchAdAccounts() : handleBack()}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="fade-in">
            {step === STEPS.ACCOUNTS && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAccounts.map((account) => (
                  <div
                    key={account.id}
                    onClick={() => {
                      setSelectedAccount(account);
                      fetchAds(account.id);
                    }}
                    className="group bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/[0.02] transition-all duration-500 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.05] group-hover:scale-110 transition-all duration-700">
                      <Users className="w-24 h-24" />
                    </div>

                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 group-hover:scale-110 transition-transform duration-500">
                        <Users className="w-6 h-6 text-white" />
                      </div>

                      <h3 className="text-lg font-bold mb-1 group-hover:text-blue-500 transition-colors line-clamp-1">{account.name}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">{account.account_id}</p>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${account.account_status === 1 ? 'bg-emerald-500' : 'bg-red-500'} shadow-lg`}></div>
                          <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                            {account.account_status === 1 ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center text-blue-500 font-bold text-xs">
                          View Ads <ArrowRight className="w-3 h-3 ml-1.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === STEPS.ADS && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAds.map((ad) => (
                  <div
                    key={ad.id}
                    onClick={() => {
                      setSelectedAd(ad);
                      fetchAdInsights(ad.id);
                    }}
                    className="group bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all duration-500 flex flex-col"
                  >
                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${ad.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                          {ad.status}
                        </div>
                        <Target className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 leading-snug group-hover:text-blue-500 transition-colors">{ad.name}</h3>

                      <div className="space-y-2 mt-4">
                        <div className="flex items-center text-[10px] text-slate-500">
                          <LayoutGrid className="w-3 h-3 mr-2 text-slate-400" />
                          <span className="truncate">{ad.campaign?.name}</span>
                        </div>
                        <div className="flex items-center text-[10px] text-slate-500">
                          <Filter className="w-3 h-3 mr-2 text-slate-400" />
                          <span className="truncate">{ad.adset?.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between transition-colors">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {ad.id.slice(-6)}</span>
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500 shadow-lg shadow-blue-500/20">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === STEPS.INSIGHTS && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                {/* Ad Context Header */}
                <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-6 shadow-sm">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                      <Target className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-2xl font-bold tracking-tight">{selectedAd?.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedAd?.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                          {selectedAd?.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-slate-500">
                        <span className="flex items-center">
                          <LayoutGrid className="w-4 h-4 mr-1.5 text-slate-400" />
                          {selectedAd?.campaign?.name}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="flex items-center">
                          <Filter className="w-4 h-4 mr-1.5 text-slate-400" />
                          {selectedAd?.adset?.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-center px-4 py-2 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Created Date</span>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-bold">{new Date(selectedAd?.adset?.start_time).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center px-4 py-2 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Start Date</span>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-bold">{selectedAd?.adset?.start_time ? new Date(selectedAd.adset.start_time).toLocaleDateString() : 'Immediate'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center px-4 py-2 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">End Date</span>
                      <div className="flex items-center space-x-2">
                        <Activity className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs font-bold">{selectedAd?.adset?.end_time ? new Date(selectedAd.adset.end_time).toLocaleDateString() : 'Ongoing'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <SummaryCard
                    label="Total Spend"
                    value={formatCurrency(insights.reduce((sum, d) => sum + parseFloat(d.spend), 0))}
                    icon={CreditCard}
                    color="blue"
                  />
                  <SummaryCard
                    label="Impressions"
                    value={formatNumber(insights.reduce((sum, d) => sum + parseInt(d.impressions), 0))}
                    icon={Eye}
                    color="purple"
                  />
                  <SummaryCard
                    label="Avg. CTR"
                    value={`${(insights.reduce((sum, d) => sum + parseFloat(d.ctr), 0) / (insights.length || 1)).toFixed(2)}%`}
                    icon={TrendingUp}
                    color="emerald"
                  />
                  <SummaryCard
                    label="Avg. CPC"
                    value={formatCurrency(insights.reduce((sum, d) => sum + parseFloat(d.cpc), 0) / (insights.length || 1))}
                    icon={DollarSign}
                    color="amber"
                  />
                </div>

                {/* Performance Table */}
                <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm transition-colors">
                  <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/30 dark:bg-white/[0.01]">
                    <div>
                      <h3 className="font-bold text-xl flex items-center">
                        <BarChart3 className="w-6 h-6 mr-3 text-blue-500" />
                        Daily Performance Breakdown
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">Granular date-wise metrics analysis</p>
                    </div>
                    <div className="flex items-center space-x-3 bg-white dark:bg-white/5 p-2 rounded-2xl border border-slate-100 dark:border-white/10">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Last 30 Days</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Spend</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Impressions</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Leads</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">CTR</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">CPC</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Reach</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                        {insights.sort((a, b) => new Date(b.date_start) - new Date(a.date_start)).map((day, idx) => (
                          <tr key={idx} className="hover:bg-blue-500/[0.01] dark:hover:bg-blue-500/[0.02] transition-colors group">
                            <td className="px-8 py-5 whitespace-nowrap">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{day.date_start}</span>
                            </td>
                            <td className="px-8 py-5">
                              <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(day.spend)}</span>
                            </td>
                            <td className="px-8 py-5">
                              <span className="text-sm font-mono text-slate-500">{formatNumber(day.impressions)}</span>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                {day.actions?.find(a => a.action_type === 'lead')?.value || 0}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${parseFloat(day.ctr) > 2 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                {parseFloat(day.ctr).toFixed(2)}%
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className="text-sm font-mono font-bold">{formatCurrency(day.cpc)}</span>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className="text-sm text-slate-500">{formatNumber(day.reach)}</span>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-blue-500">{day.actions?.reduce((sum, a) => sum + parseInt(a.value), 0) || 0}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total Actions</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Visual Detail Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8">
                    <h3 className="text-lg font-bold mb-6 flex items-center">
                      <Activity className="w-5 h-5 mr-3 text-blue-500" />
                      Action Type Breakdown (Aggregate)
                    </h3>
                    <div className="space-y-4">
                      {/* Aggregate actions from all days */}
                      {(() => {
                        const aggregates = {};
                        insights.forEach(day => {
                          day.actions?.forEach(action => {
                            aggregates[action.action_type] = (aggregates[action.action_type] || 0) + parseInt(action.value);
                          });
                        });
                        const entries = Object.entries(aggregates);
                        if (entries.length === 0) return <p className="text-xs text-slate-500 italic">No action data recorded for this period.</p>;
                        return entries.map(([type, value], i) => (
                          <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-blue-500/30 transition-all group">
                            <div className="flex items-center space-x-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 capitalize">{type.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatNumber(value)}</span>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Ad Information Card */}
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <Target className="w-64 h-64" />
                      </div>
                      <div className="relative z-10">
                        <div className="px-4 py-1.5 bg-white/20 backdrop-blur-md border border-white/20 rounded-full inline-block mb-6">
                          <span className="text-[10px] font-bold uppercase tracking-widest">Ad Information</span>
                        </div>
                        <h3 className="text-3xl font-bold mb-4 leading-tight">{selectedAd?.name}</h3>
                        <p className="text-blue-100 text-sm mb-10 max-w-md leading-relaxed opacity-80">
                          Currently analyzing performance trends for the period of the last 30 days. Metrics are synchronized with Meta Graph API v22.0.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10">
                            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Status</p>
                            <p className="text-lg font-bold">{selectedAd?.status}</p>
                          </div>
                          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10">
                            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Currency</p>
                            <p className="text-lg font-bold">{selectedAccount?.currency}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => setIsReportModalOpen(true)}
                          className="mt-10 w-full py-4 bg-white text-blue-600 rounded-2xl font-bold text-sm shadow-2xl hover:bg-blue-50 transition-all flex items-center justify-center group/btn"
                        >
                          Generate AI Optimization Report <Sparkles className="w-4 h-4 ml-2 text-indigo-500 group-hover/btn:animate-pulse" />
                        </button>
                      </div>
                    </div>

                    {/* Targeting & Locations Card */}
                    <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center">
                          <Filter className="w-5 h-5 mr-3 text-indigo-500" />
                          Targeting & Locations
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">Live Sync</span>
                      </div>

                      <div className="space-y-6">
                        {(() => {
                          const geo = selectedAd?.adset?.targeting?.geo_locations;
                          if (!geo) return <p className="text-xs text-slate-500 italic">No specific targeting data available.</p>;

                          const locations = [];
                          if (geo.countries) locations.push(...geo.countries);
                          if (geo.regions) locations.push(...geo.regions.map(r => r.name));
                          if (geo.cities) locations.push(...geo.cities.map(c => c.name));
                          if (geo.zips) locations.push(...geo.zips.map(z => z.key));

                          if (locations.length === 0) return <p className="text-xs text-slate-500 italic">Global / Broad targeting.</p>;

                          return (
                            <>
                              <div className="flex flex-wrap gap-2">
                                {locations.slice(0, 15).map((loc, i) => (
                                  <span key={i} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl border border-indigo-500/10">
                                    {loc}
                                  </span>
                                ))}
                                {locations.length > 15 && (
                                  <span className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-500 text-xs font-bold rounded-xl">
                                    +{locations.length - 15} more
                                  </span>
                                )}
                              </div>

                              <div className="pt-6 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Countries</p>
                                  <p className="text-sm font-bold">{geo.countries?.length || 0} Countries</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Cities</p>
                                  <p className="text-sm font-bold">{geo.cities?.length || 0} Cities</p>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Report Modal */}
                <SingleAdReportModal
                  isOpen={isReportModalOpen}
                  onClose={() => setIsReportModalOpen(false)}
                  adData={selectedAd}
                  insightsData={insights}
                  theme={theme}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon, color }) => {
  const colorMap = {
    blue: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/20',
    purple: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden">
      <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br opacity-[0.03] blur-2xl rounded-full ${colorMap[color].split(' ')[0]}`}></div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center border ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 transition-colors">{label}</p>
        <h4 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</h4>
      </div>
    </div>
  );
};

export default SingleAdAnalyzer;
