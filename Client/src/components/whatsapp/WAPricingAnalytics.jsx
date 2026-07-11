import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
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
  AlertCircle,
  Calendar,
  Info,
  RefreshCw,
  Coins,
  Globe,
  ListFilter
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';

const WAPricingAnalytics = ({ selectedConfigId }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Range and Date states
  const [dateRange, setDateRange] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Loading & Data states
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [pricingData, setPricingData] = useState([]);

  // Dynamic currency state
  const [currency, setCurrency] = useState('INR');

  // Compute dates in YYYY-MM-DD
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

  // Fetch local WABA pricing from DB
  const fetchPricingFromDb = async () => {
    try {
      setLoading(true);
      setError(null);

      let startDate, endDate;
      if (dateRange === 'custom') {
        if (!customStartDate || !customEndDate) {
          setError('Please select start and end dates.');
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

      const res = await axios.get('/api/whatsapp/analytics/pricing', {
        headers: getHeaders(),
        params: { startDate, endDate }
      });

      if (res.data.success) {
        setPricingData(res.data.pricing || []);
      }
    } catch (err) {
      console.error('Error fetching pricing from DB:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load pricing data.');
    } finally {
      setLoading(false);
    }
  };

  // Sync pricing from Meta API and write to DB
  const handleSyncMetaPricing = async () => {
    try {
      setSyncing(true);
      setError(null);

      let startDate, endDate;
      if (dateRange === 'custom') {
        if (!customStartDate || !customEndDate) {
          setError('Please select start and end dates.');
          setSyncing(false);
          return;
        }
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        const dates = getRangeDates(dateRange);
        startDate = dates.startDate;
        endDate = dates.endDate;
      }

      console.log(`Triggering Meta pricing sync for ${startDate} to ${endDate}...`);
      const res = await axios.post('/api/whatsapp/analytics/pricing/sync', null, {
        headers: getHeaders(),
        params: { startDate, endDate }
      });

      if (res.data.success) {
        setPricingData(res.data.pricing || []);
        alert(`Successfully synchronized ${res.data.result?.count || 0} pricing records from Meta API!`);
      }
    } catch (err) {
      console.error('Error syncing pricing from Meta:', err);
      setError(err.response?.data?.message || err.message || 'Failed to sync live pricing metrics.');
    } finally {
      setSyncing(false);
    }
  };

  // Fetch currency code dynamically from active WhatsApp details
  const fetchWabaCurrency = async () => {
    try {
      const res = await axios.get('/api/whatsapp/details', {
        headers: getHeaders()
      });
      if (res.data.success && res.data.data?.waba?.currency) {
        setCurrency(res.data.data.waba.currency);
      }
    } catch (err) {
      setCurrency('INR');
    }
  };

  // Re-fetch when config ID or date range changes
  useEffect(() => {
    fetchPricingFromDb();
    fetchWabaCurrency();
  }, [selectedConfigId, dateRange]);

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    fetchPricingFromDb();
  };

  // Format currency symbol
  const getCurrencySymbol = (code) => {
    switch (code) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return code + ' ';
    }
  };

  const currencySymbol = getCurrencySymbol(currency);

  // --- Aggregate Metrics Calculations ---
  const totalVolume = pricingData.reduce((acc, curr) => acc + (curr.volume || 0), 0);
  const totalCost = pricingData.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0);
  const avgCostPerMsg = totalVolume > 0 ? totalCost / totalVolume : 0;

  // 1. Spend & Volume Grouped by Category
  const categorySummary = pricingData.reduce((acc, curr) => {
    const cat = curr.pricing_category || 'UNKNOWN';
    if (!acc[cat]) acc[cat] = { cost: 0, volume: 0 };
    acc[cat].cost += parseFloat(curr.cost) || 0;
    acc[cat].volume += curr.volume || 0;
    return acc;
  }, {});

  const categories = Object.keys(categorySummary).map(cat => ({
    name: cat,
    cost: categorySummary[cat].cost,
    volume: categorySummary[cat].volume,
    percentageOfCost: totalCost > 0 ? (categorySummary[cat].cost / totalCost) * 100 : 0
  })).sort((a, b) => b.cost - a.cost);

  // 2. Spend & Volume Grouped by Country
  const countrySummary = pricingData.reduce((acc, curr) => {
    const cCode = curr.country || 'GLOBAL';
    if (!acc[cCode]) acc[cCode] = { cost: 0, volume: 0 };
    acc[cCode].cost += parseFloat(curr.cost) || 0;
    acc[cCode].volume += curr.volume || 0;
    return acc;
  }, {});

  const countries = Object.keys(countrySummary).map(cCode => ({
    code: cCode,
    cost: countrySummary[cCode].cost,
    volume: countrySummary[cCode].volume
  })).sort((a, b) => b.cost - a.cost);

  // 3. Daily chart mapping (grouping daily costs per category)
  const dailyChartGroups = pricingData.reduce((acc, curr) => {
    const dateKey = new Date(curr.start_time * 1000).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    if (!acc[dateKey]) acc[dateKey] = { date: dateKey, MARKETING: 0, UTILITY: 0, AUTHENTICATION: 0, SERVICE: 0, total: 0 };

    const cat = curr.pricing_category;
    const costVal = parseFloat(curr.cost) || 0;

    if (acc[dateKey].hasOwnProperty(cat)) {
      acc[dateKey][cat] = parseFloat((acc[dateKey][cat] + costVal).toFixed(3));
    } else {
      acc[dateKey][cat] = costVal;
    }
    acc[dateKey].total = parseFloat((acc[dateKey].total + costVal).toFixed(3));
    return acc;
  }, {});

  // Sort chart data chronologically
  const chartData = Object.values(dailyChartGroups).reverse();

  return (
    <div className="space-y-6">
      {/* Filters and Actions Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm dark:shadow-md">
        <div className="flex flex-col items-start leading-none">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Pricing & Cost Analytics</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-1">Synced conversation cost audit breakdown grouped by country and pricing category</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Date Select */}
          <div className="flex bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl p-1 text-xs">
            {[
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: '90days', label: '90 Days' },
              { id: 'custom', label: 'Custom' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${dateRange === r.id
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSyncMetaPricing}
            disabled={syncing}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all border border-emerald-500/20 font-semibold text-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync Live Pricing</span>
          </button>
        </div>
      </div>

      {/* Custom Date Picker Form */}
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
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10"
          >
            Apply Range
          </button>
        </form>
      )}

      {/* KPI Cards Row */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-28 bg-slate-100 dark:bg-slate-900/40 animate-pulse border border-slate-200 dark:border-white/5 rounded-2xl"></div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Sync Failure</p>
            <p className="text-xs opacity-90 mt-0.5">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PricingKPICard
            title="Synced Total Spend"
            value={`${currencySymbol}${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtext="Meta billing database cache"
            icon={Coins}
            color="amber"
          />
          <PricingKPICard
            title="Synced Messages"
            value={totalVolume.toLocaleString()}
            subtext="Delivered template notifications"
            icon={TrendingUp}
            color="emerald"
          />
          <PricingKPICard
            title="Avg. Sync Cost / Msg"
            value={`${currencySymbol}${avgCostPerMsg.toFixed(2)}`}
            subtext="Calculated from audit data"
            icon={Activity}
            color="blue"
          />
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Charts and Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Daily Cost Breakdown Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md dark:shadow-xl">
              <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">Cost Trends by Category</h4>
              <div className="h-80">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff05" : "#e2e8f0"} />
                      <XAxis dataKey="date" stroke={isDark ? "#94a3b8" : "#475569"} fontSize={10} />
                      <YAxis stroke={isDark ? "#94a3b8" : "#475569"} fontSize={10} unit={currencySymbol} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                          borderRadius: '12px',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          fontSize: '11px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="MARKETING" name="Marketing" fill="#6366f1" stackId="a" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="UTILITY" name="Utility" fill="#10b981" stackId="a" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="AUTHENTICATION" name="Auth" fill="#06b6d4" stackId="a" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="SERVICE" name="Service" fill="#f59e0b" stackId="a" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 italic text-xs">
                    No synced pricing logs available. Click 'Sync Live Pricing' to load.
                  </div>
                )}
              </div>
            </div>

            {/* Spend Category Breakdown Card */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md dark:shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Category Breakdown</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-6">Spend allocation and message volumes per category</p>
              </div>

              {categories.length > 0 ? (
                <div className="space-y-5 flex-1 justify-center flex flex-col">
                  {categories.map(cat => {
                    const colors = {
                      MARKETING: 'bg-indigo-500 dark:bg-indigo-400',
                      UTILITY: 'bg-emerald-500 dark:bg-emerald-400',
                      AUTHENTICATION: 'bg-cyan-550 dark:bg-cyan-400',
                      SERVICE: 'bg-amber-500 dark:bg-amber-400'
                    };
                    return (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span>{cat.name}</span>
                          <span className="font-bold text-slate-800 dark:text-white">
                            {currencySymbol}{cat.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          <span>{cat.volume.toLocaleString()} messages</span>
                          <span>{cat.percentageOfCost.toFixed(0)}% of total</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-950/60 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                          <div className={`h-full ${colors[cat.name] || 'bg-slate-500'} rounded-full transition-all duration-500`} style={{ width: `${cat.percentageOfCost}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 italic text-xs h-56">
                  No breakdown details available.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Country wise Spend List */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md dark:shadow-xl space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                  <Globe className="w-4 h-4 text-emerald-500 mr-2" />
                  Top Countries by Spend
                </h4>
                <p className="text-[11px] text-slate-500">Destination distribution analysis</p>
              </div>

              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {countries.length > 0 ? (
                  countries.map(c => (
                    <div key={c.code} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-xs">Country: {c.code}</p>
                        <span className="text-[10px] text-slate-500">{c.volume.toLocaleString()} messages delivered</span>
                      </div>
                      <p className="font-bold text-emerald-500 dark:text-emerald-400 text-xs">
                        {currencySymbol}{c.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500 italic text-xs py-10">No records available.</div>
                )}
              </div>
            </div>

            {/* Detailed Synced Table */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm dark:shadow-xl overflow-hidden flex flex-col justify-between">
              <div className="p-6 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Database Synced Pricing Audit</h4>
                <p className="text-xs text-slate-500 mt-1">Audit log of conversation costs stored locally</p>
              </div>

              {pricingData.length > 0 ? (
                <div className="overflow-x-auto flex-1 max-h-[300px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-6">Date</th>
                        <th className="py-3 px-6">Category</th>
                        <th className="py-3 px-6">Country</th>
                        <th className="py-3 px-6 text-center">Volume</th>
                        <th className="py-3 px-6 text-right">Cost</th>
                        <th className="py-3 px-6 text-right">Price/Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-slate-400">
                      {pricingData.map((dp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-all">
                          <td className="py-3 px-6 font-medium">
                            {new Date(dp.start_time * 1000).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="py-3 px-6 font-semibold uppercase tracking-wider text-[10px] text-slate-650 dark:text-slate-300">
                            {dp.pricing_category}
                          </td>
                          <td className="py-3 px-6 font-bold">{dp.country}</td>
                          <td className="py-3 px-6 text-center">{dp.volume.toLocaleString()}</td>
                          <td className="py-3 px-6 text-right font-bold text-emerald-500 dark:text-emerald-400">
                            {currencySymbol}{parseFloat(dp.cost).toFixed(2)}
                          </td>
                          <td className="py-3 px-6 text-right font-bold text-emerald-500 dark:text-emerald-400">
                            {currencySymbol}{parseFloat(dp.cost / dp.volume).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 italic flex-1 flex items-center justify-center">
                  No daily records synced in local database yet.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const PricingKPICard = ({ title, value, subtext, icon: Icon, color }) => {
  const colorMap = {
    indigo: 'from-emerald-500/10 to-emerald-500/5 text-emerald-500 dark:text-emerald-400 border-emerald-500/10',
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-500 dark:text-emerald-400 border-emerald-500/10',
    blue: 'from-emerald-500/10 to-emerald-500/5 text-emerald-500 dark:text-emerald-400 border-emerald-500/10',
    amber: 'from-amber-500/10 to-amber-500/5 text-amber-500 dark:text-amber-400 border-amber-500/10',
  };

  return (
    <div className={`bg-gradient-to-br border rounded-3xl p-5 shadow-sm dark:shadow-md flex items-center justify-between transition-all hover:scale-[1.01] ${colorMap[color]}`}>
      <div className="space-y-1">
        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</p>
        <h4 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</h4>
        {subtext && <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-none">{subtext}</p>}
      </div>
      <div className="p-3 bg-white/20 dark:bg-white/5 rounded-2xl">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};

export default WAPricingAnalytics;
