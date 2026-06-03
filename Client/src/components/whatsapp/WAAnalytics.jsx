import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Cell 
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  RefreshCw,
  AlertCircle,
  Download,
  Calendar,
  Layers,
  Clock,
  Columns,
  Eye,
  Percent,
  Search,
  Filter,
  CheckCircle2,
  ListFilter,
  Info,
  Database,
  Coins
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import WALiveAnalytics from './WALiveAnalytics';
import WAPricingAnalytics from './WAPricingAnalytics';



const WAAnalytics = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('overview');
  
  const [whatsappConfigs, setWhatsappConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(localStorage.getItem('selectedWhatsAppConfigId') || '');

  
  // Dashboard & KPIs
  const [kpis, setKpis] = useState(null);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [kpisError, setKpisError] = useState(null);
  
  // Trends
  const [trends, setTrends] = useState([]);
  const [trendInterval, setTrendInterval] = useState('daily');
  const [trendStartDate, setTrendStartDate] = useState('');
  const [trendEndDate, setTrendEndDate] = useState('');
  const [trendsLoading, setTrendsLoading] = useState(false);

  // Campaigns Performance
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignTypeFilter, setCampaignTypeFilter] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('');
  const [campaignStartDate, setCampaignStartDate] = useState('');
  const [campaignEndDate, setCampaignEndDate] = useState('');

  // Templates Performance
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Schedules performance
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  // Queue Health (Admin only)
  const [queueHealth, setQueueHealth] = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);

  // Campaign Comparison Drawer
  const [compareIds, setCompareIds] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [showCompareDrawer, setShowCompareDrawer] = useState(false);
  const [compareError, setCompareError] = useState(null);

  const API_BASE = 'http://localhost:5000/api/whatsapp';

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    const configId = localStorage.getItem('selectedWhatsAppConfigId') || '';
    const headers = { Authorization: `Bearer ${token}` };
    if (configId) headers['X-WhatsApp-Config-Id'] = configId;
    return headers;
  };

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/whatsapp/configs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setWhatsappConfigs(response.data.configs || []);
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
  }, []);

  useEffect(() => {
    fetchExecutiveKPIs();
    fetchTrendsData();
    fetchQueueHealth();
  }, [selectedConfigId]);

  useEffect(() => {
    fetchTrendsData();
  }, [trendInterval, trendStartDate, trendEndDate, selectedConfigId]);

  useEffect(() => {
    if (activeTab === 'campaigns') {
      fetchCampaignsPerformance();
    } else if (activeTab === 'templates') {
      fetchTemplatesPerformance();
    } else if (activeTab === 'schedules') {
      fetchSchedulesPerformance();
    }
  }, [activeTab, selectedConfigId]);


  // 1. Fetch Executive KPIs
  const fetchExecutiveKPIs = async () => {
    try {
      setKpisLoading(true);
      setKpisError(null);
      const res = await axios.get(`${API_BASE}/analytics/executive`, { headers: getHeaders() });
      if (res.data.success) {
        setKpis(res.data);
      }
    } catch (err) {
      console.error('Error fetching KPIs:', err);
      setKpisError(err.response?.data?.message || err.message);
    } finally {
      setKpisLoading(false);
    }
  };

  // 2. Fetch Trends Data
  const fetchTrendsData = async () => {
    try {
      setTrendsLoading(true);
      const params = { interval: trendInterval };
      if (trendStartDate) params.startDate = trendStartDate;
      if (trendEndDate) params.endDate = trendEndDate;

      const res = await axios.get(`${API_BASE}/analytics/trends`, { 
        headers: getHeaders(),
        params
      });
      if (res.data.success) {
        // Convert UTC date keys to user timezone representation
        const formattedTrends = res.data.trends.map(t => {
          const dateObj = new Date(t.date);
          const formattedDate = dateObj.toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric',
            year: trendInterval === 'monthly' ? 'numeric' : undefined
          });
          return {
            ...t,
            date: formattedDate
          };
        });
        setTrends(formattedTrends);
      }
    } catch (err) {
      console.error('Error fetching trends:', err);
    } finally {
      setTrendsLoading(false);
    }
  };

  // 3. Fetch Campaigns Performance
  const fetchCampaignsPerformance = async () => {
    try {
      setCampaignsLoading(true);
      const params = {};
      if (campaignTypeFilter) params.campaignType = campaignTypeFilter;
      if (campaignStatusFilter) params.status = campaignStatusFilter;
      if (campaignStartDate) params.startDate = campaignStartDate;
      if (campaignEndDate) params.endDate = campaignEndDate;

      const res = await axios.get(`${API_BASE}/analytics/campaigns`, {
        headers: getHeaders(),
        params
      });
      if (res.data.success) {
        setCampaigns(res.data.campaigns);
      }
    } catch (err) {
      console.error('Error fetching campaigns performance:', err);
    } finally {
      setCampaignsLoading(false);
    }
  };

  // 4. Fetch Templates Performance
  const fetchTemplatesPerformance = async () => {
    try {
      setTemplatesLoading(true);
      const res = await axios.get(`${API_BASE}/analytics/templates`, { headers: getHeaders() });
      if (res.data.success) {
        setTemplates(res.data.templates);
      }
    } catch (err) {
      console.error('Error fetching template performance:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // 5. Fetch Schedules Performance
  const fetchSchedulesPerformance = async () => {
    try {
      setSchedulesLoading(true);
      const res = await axios.get(`${API_BASE}/analytics/schedules`, { headers: getHeaders() });
      if (res.data.success) {
        setSchedules(res.data.schedules);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setSchedulesLoading(false);
    }
  };

  // 6. Fetch Queue Health Telemetry
  const fetchQueueHealth = async () => {
    try {
      setQueueLoading(true);
      const res = await axios.get(`${API_BASE}/admin/queue-health`, { headers: getHeaders() });
      if (res.data.success) {
        setQueueHealth(res.data);
      }
    } catch (err) {
      console.log('Queue telemetry unavailable for non-admin:', err.message);
      setQueueHealth(null);
    } finally {
      setQueueLoading(false);
    }
  };

  // 7. Toggle Campaign for Comparison
  const handleToggleCompare = (campaignId) => {
    if (compareIds.includes(campaignId)) {
      setCompareIds(compareIds.filter(id => id !== campaignId));
    } else {
      if (compareIds.length >= 5) {
        alert('You can select a maximum of 5 campaigns to compare.');
        return;
      }
      setCompareIds([...compareIds, campaignId]);
    }
  };

  // 8. Fetch Campaign Comparison Details
  const fetchComparison = async () => {
    if (compareIds.length === 0) return;
    try {
      setCompareLoading(true);
      setCompareError(null);
      const res = await axios.get(`${API_BASE}/analytics/compare`, {
        headers: getHeaders(),
        params: { campaignIds: compareIds.join(',') }
      });
      if (res.data.success) {
        setComparisonData(res.data.comparison);
        setShowCompareDrawer(true);
      }
    } catch (err) {
      console.error('Error comparing campaigns:', err);
      setCompareError(err.response?.data?.message || err.message);
    } finally {
      setCompareLoading(false);
    }
  };

  // 9. Export Campaigns CSV
  const handleExportCampaigns = async () => {
    try {
      const params = {};
      if (campaignTypeFilter) params.campaignType = campaignTypeFilter;
      if (campaignStatusFilter) params.status = campaignStatusFilter;
      if (campaignStartDate) params.startDate = campaignStartDate;
      if (campaignEndDate) params.endDate = campaignEndDate;

      const response = await axios.get(`${API_BASE}/analytics/export/campaigns`, {
        headers: getHeaders(),
        responseType: 'blob',
        params
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `campaign_performance_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export campaigns error:', err);
      alert('Failed to export campaigns CSV');
    }
  };

  // 10. Export Templates CSV
  const handleExportTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE}/analytics/export/templates`, {
        headers: getHeaders(),
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template_performance_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export templates error:', err);
      alert('Failed to export templates CSV');
    }
  };

  // Filter campaigns locally by search string
  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(campaignSearch.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-transparent text-slate-800 dark:text-slate-100 min-h-screen font-sans transition-colors duration-300">
      
      {/* Header and Refresh Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Campaign Insights</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">Enterprise Analytics & Reporting Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Profile Select Dropdown */}
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs">
            <Database className="w-4 h-4 text-green-500" />
            <select
              value={selectedConfigId}
              onChange={handleConfigChange}
              className="bg-transparent font-bold focus:outline-none cursor-pointer text-slate-700 dark:text-slate-200"
            >
              <option value="" className="bg-white dark:bg-slate-900">Default Server Config</option>
              {whatsappConfigs.map(cfg => (
                <option key={cfg.id} value={cfg.id} className="bg-white dark:bg-slate-900">{cfg.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => {
              fetchExecutiveKPIs();
              fetchTrendsData();
              fetchQueueHealth();
              if (activeTab === 'campaigns') fetchCampaignsPerformance();
              if (activeTab === 'templates') fetchTemplatesPerformance();
              if (activeTab === 'schedules') fetchSchedulesPerformance();
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-all font-medium text-sm shadow-sm dark:shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Data</span>
          </button>
        </div>

      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-white/5 space-x-8">
        {[
          { id: 'overview', label: 'Overview & Trends', icon: Activity },
          { id: 'campaigns', label: 'Campaign Performance', icon: Layers },
          { id: 'templates', label: 'Template Analytics', icon: CheckCircle2 },
          { id: 'live-templates', label: 'All Template Analytics', icon: TrendingUp },
          { id: 'waba-pricing', label: 'WABA Pricing Analytics', icon: Coins },
          { id: 'schedules', label: 'Recurring Schedules', icon: Clock }
        ].map(tab => {


          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 pb-4 font-semibold text-sm transition-all border-b-2 outline-none ${
                isActive 
                  ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT VIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Executive KPI Cards Row */}
          {kpisLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-32 bg-slate-100 dark:bg-slate-900/40 animate-pulse border border-slate-200 dark:border-white/5 rounded-2xl"></div>
              ))}
            </div>
          ) : kpisError ? (
            <div className="p-6 bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{kpisError}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard 
                title="Total Campaigns" 
                value={kpis.totalCampaigns}
                subtext="Created configurations"
                icon={Layers} 
                color="indigo" 
              />
              <KPICard 
                title="Success (Delivery) Rate" 
                value={`${(kpis.successRate || 0).toFixed(1)}%`}
                subtext={`${kpis.totalDelivered} of ${kpis.totalSent} delivered`}
                icon={CheckCircle} 
                color="emerald" 
              />
              <KPICard 
                title="Read Rate" 
                value={`${(kpis.readRate || 0).toFixed(1)}%`}
                subtext={`${kpis.totalRead} messages opened`}
                icon={TrendingUp} 
                color="blue" 
              />
              <KPICard 
                title="Failure Rate" 
                value={`${(kpis.failureRate || 0).toFixed(1)}%`}
                subtext={`${kpis.totalFailed} messages undelivered`}
                icon={XCircle} 
                color="red" 
              />
            </div>
          )}

          {/* Visual Funnel and Queue Health Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Visual Funnel Panel */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md dark:shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Message Conversion Funnel</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">Tracking delivery stages and drop-offs</p>
              </div>

              {kpisLoading ? (
                <div className="h-56 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              ) : kpis ? (
                <div className="space-y-6 py-4">
                  {/* Step 1: Sent */}
                  <FunnelBar 
                    label="Sent Volume" 
                    value={kpis.totalSent} 
                    percentage={100} 
                    color="bg-indigo-500" 
                  />
                  {/* Step 2: Delivered */}
                  <FunnelBar 
                    label="Delivered (Success)" 
                    value={kpis.totalDelivered} 
                    percentage={kpis.totalSent > 0 ? (kpis.totalDelivered / kpis.totalSent) * 100 : 0} 
                    color="bg-emerald-500" 
                  />
                  {/* Step 3: Read */}
                  <FunnelBar 
                    label="Opened (Read)" 
                    value={kpis.totalRead} 
                    percentage={kpis.totalSent > 0 ? (kpis.totalRead / kpis.totalSent) * 100 : 0} 
                    color="bg-blue-500" 
                  />
                  {/* Step 4: Failed */}
                  <FunnelBar 
                    label="Failed / Rejected" 
                    value={kpis.totalFailed} 
                    percentage={kpis.totalSent + kpis.totalFailed > 0 ? (kpis.totalFailed / (kpis.totalSent + kpis.totalFailed)) * 100 : 0} 
                    color="bg-red-500" 
                  />
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-slate-500 italic text-sm">No data available</div>
              )}
            </div>

            {/* Queue Telemetry Card */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md dark:shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Queue Telemetry</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">Real-time background worker status</p>
              </div>

              {queueLoading ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              ) : queueHealth ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Redis Connection</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      queueHealth.redisConnected === 'ready' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {String(queueHealth.redisConnected).toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <QueueStateVal label="Active Jobs" count={queueHealth.counts?.active || 0} color="text-indigo-400" />
                    <QueueStateVal label="Waiting" count={queueHealth.counts?.waiting || 0} color="text-amber-400" />
                    <QueueStateVal label="Delayed" count={queueHealth.counts?.delayed || 0} color="text-blue-400" />
                    <QueueStateVal label="Failed Logs" count={queueHealth.counts?.failed || 0} color="text-red-400" />
                  </div>

                  <div className="bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-xl p-3 flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    <span>Worker utilizes exponential queue rate-limit backoffs.</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-6 text-center text-slate-500 h-52 flex flex-col items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-slate-400 dark:text-slate-650 mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-500">Infrastructure Telemetry Restricted</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-600 mt-1">Admin system role required to query health logs.</p>
                </div>
              )}
            </div>

          </div>

          {/* Time Series Analytics Section */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md dark:shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Time Series Analytics</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Volumetric send and status rates over time</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl p-1 text-xs">
                  {['daily', 'weekly', 'monthly'].map(i => (
                    <button
                      key={i}
                      onClick={() => setTrendInterval(i)}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        trendInterval === i 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {i.charAt(0).toUpperCase() + i.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                  <input
                    type="date"
                    value={trendStartDate}
                    onChange={(e) => setTrendStartDate(e.target.value)}
                    className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none w-28"
                  />
                  <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>
                  <input
                    type="date"
                    value={trendEndDate}
                    onChange={(e) => setTrendEndDate(e.target.value)}
                    className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none w-28"
                  />
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-80">
              {trendsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              ) : trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff05" : "#e2e8f0"} />
                    <XAxis dataKey="date" stroke={isDark ? "#64748b" : "#475569"} fontSize={11} fontWeight={500} />
                    <YAxis stroke={isDark ? "#64748b" : "#475569"} fontSize={11} fontWeight={500} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', 
                        borderRadius: '12px',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '12px'
                      }} 
                    />
                    <Area type="monotone" dataKey="sent_count" name="Sent" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSent)" />
                    <Area type="monotone" dataKey="delivered_count" name="Delivered" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDelivered)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-sm">
                  <AlertCircle className="w-8 h-8 text-slate-700 mb-2" />
                  <span>No volumetric campaign statistics found inside range boundaries.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-8">
          
          {/* Actions & Filters Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-5 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm dark:shadow-md">
            
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 pl-10 pr-4 py-2.5 rounded-xl text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              {/* Type Filter */}
              <div className="relative">
                <select
                  value={campaignTypeFilter}
                  onChange={(e) => setCampaignTypeFilter(e.target.value)}
                  className="appearance-none bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 pl-4 pr-10 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="">All Types</option>
                  <option value="broadcast">Broadcast</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="recurring">Recurring</option>
                </select>
                <ListFilter className="absolute right-3.5 top-3 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={campaignStatusFilter}
                  onChange={(e) => setCampaignStatusFilter(e.target.value)}
                  className="appearance-none bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 pl-4 pr-10 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="queued">Queued</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="paused">Paused</option>
                </select>
                <Filter className="absolute right-3.5 top-3 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>

              {/* Date Filters */}
              <div className="flex items-center space-x-2 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-xl text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={campaignStartDate}
                  onChange={(e) => setCampaignStartDate(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none w-24"
                />
                <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>
                <input
                  type="date"
                  value={campaignEndDate}
                  onChange={(e) => setCampaignEndDate(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none w-24"
                />
              </div>

              {/* Trigger local load */}
              <button 
                onClick={fetchCampaignsPerformance}
                className="p-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-xl transition-all border border-indigo-500/20"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-3">
              {/* Compare Button */}
              <button
                onClick={fetchComparison}
                disabled={compareIds.length < 2 || compareLoading}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-sm dark:shadow-md transition-all ${
                  compareIds.length >= 2 
                    ? 'bg-blue-600/25 hover:bg-blue-600/35 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold' 
                    : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/5 cursor-not-allowed'
                }`}
              >
                <Columns className="w-4 h-4" />
                <span>Compare ({compareIds.length})</span>
              </button>

              {/* CSV Export Button */}
              <button
                onClick={handleExportCampaigns}
                className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>

          </div>

          {/* Campaigns Performance Table */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm dark:shadow-xl overflow-hidden">
            {campaignsLoading ? (
              <div className="p-12 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
              </div>
            ) : filteredCampaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6 w-12 text-center">Select</th>
                      <th className="py-4 px-6">Campaign Info</th>
                      <th className="py-4 px-6">Type</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-center">Sent</th>
                      <th className="py-4 px-6 text-center">Delivered</th>
                      <th className="py-4 px-6 text-center">Opened</th>
                      <th className="py-4 px-6 text-center">Failed</th>
                      <th className="py-4 px-6 text-center">Delivery Rate</th>
                      <th className="py-4 px-6 text-center">Open Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-slate-300">
                    {filteredCampaigns.map(c => {
                      const isSelected = compareIds.includes(c.id);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-all">
                          <td className="py-4 px-6 text-center">
                            <input
                               type="checkbox"
                               checked={isSelected}
                               onChange={() => handleToggleCompare(c.id)}
                               className="w-4 h-4 rounded border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-semibold text-slate-800 dark:text-white mb-0.5 text-sm">{c.name}</p>
                            <span className="text-[10px] text-slate-500">ID: {c.id} • Created: {new Date(c.created_at).toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-6 uppercase font-medium tracking-wider text-[10px]">
                            {c.campaign_type}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status === 'completed' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : c.status === 'running'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                                : c.status === 'failed'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : c.status === 'paused'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-400 border border-white/5'
                            }`}>
                              {c.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center font-semibold text-slate-800 dark:text-white">{c.sent_count}</td>
                          <td className="py-4 px-6 text-center text-slate-400">{c.delivered_count}</td>
                          <td className="py-4 px-6 text-center text-slate-400">{c.read_count}</td>
                          <td className="py-4 px-6 text-center text-red-400">{c.failed_count}</td>
                          <td className="py-4 px-6 text-center font-bold text-emerald-400">
                            {c.delivery_rate.toFixed(1)}%
                          </td>
                          <td className="py-4 px-6 text-center font-bold text-indigo-400">
                            {c.read_rate.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 italic">
                No campaigns match search filters.
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-8">
          
          {/* Templates Performance Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-5 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm dark:shadow-md">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Templates Analytics</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Aggregate conversion stats grouped by Meta template structures</p>
            </div>
            
            <button
              onClick={handleExportTemplates}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold shadow-sm dark:shadow-md transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Templates CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Visual Breakdown Bar Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md dark:shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">Aggregate Template Volumes</h4>
              </div>

              <div className="h-72">
                {templatesLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                  </div>
                ) : templates.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={templates}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff05" : "#e2e8f0"} />
                      <XAxis dataKey="template_name" stroke={isDark ? "#94a3b8" : "#475569"} fontSize={10} />
                      <YAxis stroke={isDark ? "#94a3b8" : "#475569"} fontSize={10} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', 
                          borderRadius: '12px',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          fontSize: '11px'
                        }} 
                      />
                      <Bar dataKey="sent_count" name="Sent" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="read_count" name="Opened" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 italic text-xs">
                    No template send logs mapped to message entries.
                  </div>
                )}
              </div>
            </div>

            {/* Performer Rankings List */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md dark:shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Performer Rankings</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-500 mb-6">Top performing templates ranked by Read Rate %</p>
              </div>

              <div className="flex-1 space-y-4 max-h-[280px] overflow-y-auto pr-1">
                {templatesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(n => (
                      <div key={n} className="h-12 bg-white/5 animate-pulse rounded-xl"></div>
                    ))}
                  </div>
                ) : templates.length > 0 ? (
                  [...templates]
                    .sort((a, b) => b.read_rate - a.read_rate)
                    .map((t, idx) => (
                      <div key={t.template_name} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-2xl hover:border-indigo-500/20 transition-all">
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-[10px] ${
                            idx === 0 
                              ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30' 
                              : idx === 1 
                              ? 'bg-slate-300/20 text-slate-650 dark:text-slate-300 border border-slate-300/30'
                              : 'bg-orange-500/20 text-orange-500 dark:text-orange-400 border border-orange-500/30'
                          }`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-xs">{t.template_name}</p>
                            <span className="text-[9px] text-slate-500">{t.sent_count} deliveries</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-indigo-400 text-xs">{t.read_rate.toFixed(1)}%</p>
                          <span className="text-[9px] text-slate-500 font-medium">Read Rate</span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 italic text-xs">No records available.</div>
                )}
              </div>
            </div>

          </div>

          {/* Templates Performance Table */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm dark:shadow-xl overflow-hidden">
            {templatesLoading ? (
              <div className="p-12 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
              </div>
            ) : templates.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Template Name</th>
                      <th className="py-4 px-6 text-center">Sent Volume</th>
                      <th className="py-4 px-6 text-center">Delivered</th>
                      <th className="py-4 px-6 text-center">Opened</th>
                      <th className="py-4 px-6 text-center">Failed</th>
                      <th className="py-4 px-6 text-center">Delivery Success %</th>
                      <th className="py-4 px-6 text-center">Read Rate %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-slate-300">
                    {templates.map(t => (
                      <tr key={t.template_name} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-all">
                        <td className="py-4 px-6 font-semibold text-slate-800 dark:text-white">{t.template_name}</td>
                        <td className="py-4 px-6 text-center font-bold text-slate-800 dark:text-white">{t.sent_count}</td>
                        <td className="py-4 px-6 text-center text-slate-400">{t.delivered_count}</td>
                        <td className="py-4 px-6 text-center text-slate-400">{t.read_count}</td>
                        <td className="py-4 px-6 text-center text-red-400">{t.failed_count}</td>
                        <td className="py-4 px-6 text-center font-bold text-emerald-400">
                          {t.delivery_rate.toFixed(1)}%
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-indigo-400">
                          {t.read_rate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

        </div>
      )}

      {activeTab === 'live-templates' && (
        <WALiveAnalytics selectedConfigId={selectedConfigId} />
      )}

      {activeTab === 'waba-pricing' && (
        <WAPricingAnalytics selectedConfigId={selectedConfigId} />
      )}

      {activeTab === 'schedules' && (


        <div className="space-y-8">
          
          <div className="bg-white dark:bg-slate-900/40 p-5 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm dark:shadow-md">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Recurring Schedules Telemetry</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Aggregated execution history and metrics for repeating configurations</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm dark:shadow-xl overflow-hidden">
            {schedulesLoading ? (
              <div className="p-12 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
              </div>
            ) : schedules.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Parent Campaign Config</th>
                      <th className="py-4 px-6">Cron Expression</th>
                      <th className="py-4 px-6">Timezone</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-center">Run Count</th>
                      <th className="py-4 px-6 text-center">Total Sent</th>
                      <th className="py-4 px-6 text-center">Total Delivered</th>
                      <th className="py-4 px-6 text-center">Total Read</th>
                      <th className="py-4 px-6 text-center">Total Failed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-slate-300">
                    {schedules.map(s => (
                      <tr key={s.parent_campaign_id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-all">
                        <td className="py-4 px-6 font-semibold text-slate-800 dark:text-white">
                          <p>{s.name}</p>
                          <span className="text-[10px] text-slate-500">ID: {s.parent_campaign_id}</span>
                        </td>
                        <td className="py-4 px-6 font-mono text-[11px] text-indigo-600 dark:text-indigo-300">{s.cron_expression}</td>
                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400">{s.timezone}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'paused' 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {s.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-slate-800 dark:text-white">{s.execution_count} runs</td>
                        <td className="py-4 px-6 text-center font-semibold text-slate-700 dark:text-slate-300">{s.sent_count}</td>
                        <td className="py-4 px-6 text-center text-slate-500 dark:text-slate-400">{s.delivered_count}</td>
                        <td className="py-4 px-6 text-center text-slate-500 dark:text-slate-400">{s.read_count}</td>
                        <td className="py-4 px-6 text-center text-red-500 dark:text-red-400">{s.failed_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 italic">
                No active recurring scheduling jobs registered in BullMQ workers.
              </div>
            )}
          </div>

        </div>
      )}

      {/* COMPARISON DRAWER / MODAL PANEL */}
      {showCompareDrawer && comparisonData && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end transition-opacity duration-300">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0f172a] border-l border-slate-200 dark:border-white/10 h-full overflow-y-auto p-8 shadow-2xl space-y-8 animate-in slide-in-from-right duration-300">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Campaign Side-by-Side Comparison</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Comparing performance details of selected runs (Limit: 5)</p>
              </div>
              <button 
                onClick={() => setShowCompareDrawer(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 rounded-lg text-xs font-semibold transition-all"
              >
                Close Compare
              </button>
            </div>

            {compareError && (
              <div className="p-4 bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 rounded-xl text-red-500 dark:text-red-400 text-xs">
                {compareError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comparisonData.map(c => (
                <div key={c.id} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm dark:shadow-lg space-y-4 hover:border-indigo-500/20 transition-all flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 truncate">{c.name}</h4>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{c.campaign_type} • ID: {c.id}</span>
                  </div>

                  <div className="space-y-2 border-t border-b border-slate-200 dark:border-white/5 py-4 my-2">
                    <CompareMetric label="Sent Messages" value={c.sent_count} />
                    <CompareMetric label="Delivered" value={c.delivered_count} />
                    <CompareMetric label="Opened" value={c.read_count} />
                    <CompareMetric label="Failed" value={c.failed_count} color="text-red-500 dark:text-red-400" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <CompareRateCard label="Delivered" value={`${c.delivery_rate.toFixed(0)}%`} color="text-emerald-400" />
                    <CompareRateCard label="Opened" value={`${c.read_rate.toFixed(0)}%`} color="text-indigo-400" />
                    <CompareRateCard label="Failed" value={`${c.failure_rate.toFixed(0)}%`} color="text-red-400" />
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

const KPICard = ({ title, value, subtext, icon: Icon, color }) => {
  const colorMap = {
    indigo: 'from-indigo-500/10 to-indigo-500/5 text-indigo-400 border-indigo-500/10',
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/10',
    blue: 'from-blue-500/10 to-blue-500/5 text-blue-400 border-blue-500/10',
    red: 'from-red-500/10 to-red-500/5 text-red-400 border-red-500/10',
  };

  return (
    <div className={`bg-gradient-to-br border rounded-3xl p-6 shadow-md dark:shadow-xl flex items-center justify-between transition-all hover:scale-[1.01] ${colorMap[color]}`}>
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</p>
        <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</h4>
        {subtext && <p className="text-[10px] text-slate-500 font-medium">{subtext}</p>}
      </div>
      <div className="p-4 bg-slate-200/50 dark:bg-white/5 rounded-2xl text-slate-600 dark:text-slate-300">
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

const FunnelBar = ({ label, value, percentage, color }) => {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span>{label}</span>
        <span>{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-3 w-full bg-slate-100 dark:bg-slate-950/60 rounded-full overflow-hidden border border-slate-250 dark:border-white/5">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
};

const QueueStateVal = ({ label, count, color }) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-center">
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{count}</p>
    </div>
  );
};

const CompareMetric = ({ label, value, color = "text-slate-700 dark:text-slate-300" }) => {
  return (
    <div className="flex items-center justify-between text-xs font-medium">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
};

const CompareRateCard = ({ label, value, color }) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-950/40 p-2 border border-slate-200 dark:border-white/5 rounded-xl">
      <p className={`text-xs font-bold ${color}`}>{value}</p>
      <span className="text-[9px] text-slate-500 font-semibold">{label}</span>
    </div>
  );
};

export default WAAnalytics;
