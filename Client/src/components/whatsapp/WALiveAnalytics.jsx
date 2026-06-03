import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Activity,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Info,
  Send,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';

const WALiveAnalytics = ({ selectedConfigId }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [dateRange, setDateRange] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Helper to compute range dates in YYYY-MM-DD
  const getRangeDates = (range) => {
    const end = new Date();
    const start = new Date();
    switch (range) {
      case '7days':
        start.setUTCDate(end.getUTCDate() - 7);
        break;
      case '30days':
        start.setUTCDate(end.getUTCDate() - 30);
        break;
      case '90days':
        start.setUTCDate(end.getUTCDate() - 90);
        break;
      case '365days':
        start.setUTCDate(end.getUTCDate() - 365);
        break;
      default:
        break;
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    if (selectedConfigId) headers['X-WhatsApp-Config-Id'] = selectedConfigId;
    return headers;
  };

  const fetchLiveAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      let startDate, endDate;
      if (dateRange === 'custom') {
        if (!customStartDate || !customEndDate) {
          setError('Please select both start and end dates.');
          setLoading(false);
          return;
        }
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        const dates = getRangeDates(dateRange);
        startDate = dates.startDate;
        endDate = dates.endDate;
      }

      console.log(`Fetching live WABA analytics for range: ${startDate} to ${endDate}`);
      const res = await axios.get('http://localhost:5000/api/whatsapp/analytics/live', {
        headers: getHeaders(),
        params: { startDate, endDate }
      });

      if (res.data.success) {
        setAnalyticsData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching live WABA analytics:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch live analytics from Meta API.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when config ID or selected date range changes
  useEffect(() => {
    fetchLiveAnalytics();
  }, [selectedConfigId, dateRange]);

  // Handle custom date submission
  const handleCustomSubmit = (e) => {
    e.preventDefault();
    fetchLiveAnalytics();
  };

  // Format data points for charts and tables
  const dataPoints = analyticsData?.analytics?.data_points || [];

  const formattedDataPoints = dataPoints.map(dp => {
    const dateObj = new Date(dp.start * 1000);
    const formattedDate = dateObj.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    const sent = dp.sent || 0;
    const delivered = dp.delivered || 0;
    const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;

    return {
      ...dp,
      date: formattedDate,
      sent,
      delivered,
      deliveryRate
    };
  });

  // Chronological order for Recharts
  const chartData = [...formattedDataPoints].sort((a, b) => a.start - b.start);
  // Reverse chronological order (newest first) for Table
  const tableData = [...formattedDataPoints].sort((a, b) => b.start - a.start);

  // Compute KPI totals
  const totalSent = dataPoints.reduce((acc, curr) => acc + (curr.sent || 0), 0);
  const totalDelivered = dataPoints.reduce((acc, curr) => acc + (curr.delivered || 0), 0);
  const aggregateDeliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Date Range Selector Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-5 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm dark:shadow-md">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Live Account Analytics</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Real-time daily message sent & delivered metrics directly from Meta Graph API</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Range Options */}
          <div className="flex bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl p-1 text-xs">
            {[
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: '90days', label: '90 Days' },
              { id: '365days', label: '1 Year' },
              { id: 'custom', label: 'Custom' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${dateRange === r.id
                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'


                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <button
            onClick={fetchLiveAnalytics}
            disabled={loading}
            className="p-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all border border-indigo-500/20 disabled:opacity-50"


            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Form (shown only when custom dateRange is selected) */}
      {dateRange === 'custom' && (
        <form onSubmit={handleCustomSubmit} className="bg-slate-50 dark:bg-slate-900/30 p-5 border border-slate-200 dark:border-white/5 rounded-2xl flex flex-wrap items-end gap-4 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Start Date</label>
            <div className="flex items-center space-x-2 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                required
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none w-28"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">End Date</label>
            <div className="flex items-center space-x-2 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                required
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none w-28"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
          >
            Apply Range
          </button>
        </form>
      )}

      {/* KPI Cards Row */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-32 bg-slate-100 dark:bg-slate-900/40 animate-pulse border border-slate-200 dark:border-white/5 rounded-2xl"></div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-600 dark:text-red-400">

          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Meta API Error</p>
            <p className="text-xs opacity-90 mt-0.5">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LiveKPICard
            title="Total Messages Sent"
            value={totalSent.toLocaleString()}
            subtext="Delivered & Pending across WABA"
            icon={Send}
            color="indigo"
          />
          <LiveKPICard
            title="Total Messages Delivered"
            value={totalDelivered.toLocaleString()}
            subtext="Successfully reached device"
            icon={CheckCircle2}
            color="emerald"
          />
          <LiveKPICard
            title="WABA Delivery Rate"
            value={`${aggregateDeliveryRate.toFixed(1)}%`}
            subtext="Aggregate account delivery success"
            icon={TrendingUp}
            color="blue"
          />
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Recharts Area Chart */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md dark:shadow-xl">
            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">Live Message Trends</h4>
            <div className="h-80">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSentLive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDeliveredLive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                    <Legend />
                    <Area type="monotone" dataKey="sent" name="Sent" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSentLive)" />
                    <Area type="monotone" dataKey="delivered" name="Delivered" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDeliveredLive)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 italic text-sm">

                  <Info className="w-8 h-8 text-slate-400 mb-2" />
                  <span>No message activity recorded during the selected period.</span>
                </div>
              )}
            </div>
          </div>

          {/* Daily Records Detail Table */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm dark:shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Daily Message Logs Summary</h4>
              <p className="text-xs text-slate-500 mt-1">Detailed daily volume breakdown returned directly by Meta's audit node</p>
            </div>

            {tableData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">

                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6 text-center">Messages Sent</th>
                      <th className="py-4 px-6 text-center">Messages Delivered</th>
                      <th className="py-4 px-6 text-center">Delivery Success Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-slate-350">

                    {tableData.map((dp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-all">
                        <td className="py-4 px-6 font-semibold text-slate-800 dark:text-white">
                          {new Date(dp.start * 1000).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-4 px-6 text-center font-semibold text-slate-800 dark:text-white">{dp.sent.toLocaleString()}</td>
                        <td className="py-4 px-6 text-center text-slate-500 dark:text-slate-400">{dp.delivered.toLocaleString()}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${dp.deliveryRate >= 90
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : dp.deliveryRate >= 75
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : dp.deliveryRate > 0
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                            {dp.deliveryRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 italic">
                No daily logs available.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const LiveKPICard = ({ title, value, subtext, icon: Icon, color }) => {
  const colorMap = {
    indigo: 'from-indigo-500/10 to-indigo-500/5 text-indigo-400 border-indigo-500/10',
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/10',
    blue: 'from-blue-500/10 to-blue-500/5 text-blue-400 border-blue-500/10',
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

export default WALiveAnalytics;
