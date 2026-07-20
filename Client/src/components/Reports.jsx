import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  RefreshCw, 
  Download, 
  Search, 
  PieChart, 
  Target, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar
} from 'recharts';
import * as XLSX from 'xlsx';

const MetaIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16.5 6a5.5 5.5 0 0 0-4.66 2.6l-.34.5-.34-.5A5.5 5.5 0 1 0 7.5 18c2.16 0 3.84-1.25 4.66-2.6l.34-.5.34.5c.82 1.35 2.5 2.6 4.66 2.6a5.5 5.5 0 1 0 0-11z" />
  </svg>
);

const GoogleIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20.8 14.25a8.7 8.7 0 1 1-.8-5.35l-3.3 2.65" />
    <path d="M12 12h9" />
  </svg>
);

const LinkedInIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="4" />
    <line x1="8" y1="11" x2="8" y2="17" />
    <line x1="8" y1="7" x2="8" y2="7.01" />
    <path d="M12 11v6" />
    <path d="M12 11a3 3 0 0 1 6 0v6" />
  </svg>
);

const WhatsAppIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <path d="M9 10c.5 1.5 1.5 2.5 3 3" />
  </svg>
);

const Reports = () => {
  const [range, setRange] = useState('month');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [reportData, setReportData] = useState({
    meta: [],
    linkedin: [],
    google: [],
    whatsapp: []
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Exchange Rates
  const EXCHANGE_RATES = {
    USD: 83.0,
    EUR: 90.0,
    INR: 1.0
  };

  // Converted helper to INR
  const convertToINR = (amount, currency = 'INR') => {
    const rate = EXCHANGE_RATES[currency.toUpperCase()] || 1.0;
    return parseFloat((amount * rate).toFixed(2));
  };

  // Fetch report data
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = { range };
      if (range === 'custom') {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const response = await axios.get('/api/reports/spend', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch spend report data.');
    } finally {
      setLoading(false);
    }
  };

  // Run live sync across platforms
  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem('token');
      const body = { range };
      if (range === 'custom') {
        body.startDate = startDate;
        body.endDate = endDate;
      }
      const response = await axios.post('/api/reports/spend/sync', body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSuccessMsg('Sync completed successfully!');
        fetchReport();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Sync failed on one or more platforms.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchReport();
  }, [range, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Aggregate platforms summaries
  const getSummary = (rows) => {
    return rows.reduce(
      (acc, curr) => {
        acc.spend += curr.spend || 0;
        acc.impressions += curr.impressions || 0;
        acc.clicks += curr.clicks || 0;
        acc.volume += curr.volume || 0;
        acc.currencies[curr.currency || 'INR'] = (acc.currencies[curr.currency || 'INR'] || 0) + (curr.spend || 0);
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, volume: 0, currencies: {} }
    );
  };

  const metaSum = getSummary(reportData.meta);
  const linkedinSum = getSummary(reportData.linkedin);
  const googleSum = getSummary(reportData.google);
  const whatsappSum = getSummary(reportData.whatsapp);

  // Aggregated Converted spends
  const convertSumToINR = (sumObj) => {
    return Object.entries(sumObj.currencies).reduce((total, [currency, amt]) => {
      return total + convertToINR(amt, currency);
    }, 0);
  };

  const metaINR = convertSumToINR(metaSum);
  const linkedinINR = convertSumToINR(linkedinSum);
  const googleINR = convertSumToINR(googleSum);
  const whatsappINR = convertSumToINR(whatsappSum);
  const grandTotalINR = metaINR + linkedinINR + googleINR + whatsappINR;

  // Flatten daily rows for the table and trend chart
  const getFlatData = () => {
    const list = [];
    const pushRows = (rows, platformName) => {
      rows.forEach(r => {
        list.push({
          date: r.date,
          platform: platformName,
          accountName: r.account_name || 'N/A',
          spend: r.spend,
          currency: r.currency || 'INR',
          spendINR: convertToINR(r.spend, r.currency || 'INR'),
          impressions: r.impressions || 0,
          clicks: r.clicks || 0,
          volume: r.volume || 0
        });
      });
    };
    pushRows(reportData.meta, 'Meta');
    pushRows(reportData.linkedin, 'LinkedIn');
    pushRows(reportData.google, 'Google');
    pushRows(reportData.whatsapp, 'WhatsApp');
    return list.sort((a, b) => b.date.localeCompare(a.date));
  };

  const tableData = getFlatData();

  // Format dataset for Recharts area graph
  const getChartData = () => {
    const datesMap = {};
    const addChartRow = (rows, field) => {
      rows.forEach(r => {
        if (!datesMap[r.date]) {
          datesMap[r.date] = { date: r.date, Meta: 0, LinkedIn: 0, Google: 0, WhatsApp: 0 };
        }
        datesMap[r.date][field] += convertToINR(r.spend, r.currency || 'INR');
      });
    };
    addChartRow(reportData.meta, 'Meta');
    addChartRow(reportData.linkedin, 'LinkedIn');
    addChartRow(reportData.google, 'Google');
    addChartRow(reportData.whatsapp, 'WhatsApp');
    
    return Object.values(datesMap).sort((a, b) => a.date.localeCompare(b.date));
  };

  const chartData = getChartData();

  // Excel exporter
  const handleExportExcel = () => {
    if (tableData.length === 0) return;

    const rangeLabels = {
      today: 'TODAY',
      week: 'WEEKLY',
      month: 'MONTHLY',
      custom: 'CUSTOM DATE RANGE'
    };

    // Build array of arrays for the excel rows
    const excelRows = [
      ['WHITE FORCE ALL SOCIAL MEDIA ACCOUNT SPEND REPORT'],
      ['Report Type', rangeLabels[range] || range.toUpperCase()],
      ['Date Range', `${startDate} to ${endDate}`],
      [],
      ['SPEND REPORT SUMMARY'],
      ['Platform', 'Total Spend (INR)', 'Original Currencies Breakdown'],
      ['Meta Ads', metaINR, Object.entries(metaSum.currencies).map(([curr, val]) => `${val} ${curr}`).join(', ') || '0 INR'],
      ['Google Ads', googleINR, Object.entries(googleSum.currencies).map(([curr, val]) => `${val} ${curr}`).join(', ') || '0 INR'],
      ['LinkedIn Ads', linkedinINR, Object.entries(linkedinSum.currencies).map(([curr, val]) => `${val} ${curr}`).join(', ') || '0 INR'],
      ['WhatsApp WABA', whatsappINR, Object.entries(whatsappSum.currencies).map(([curr, val]) => `${val} ${curr}`).join(', ') || '0 INR'],
      ['GRAND TOTAL', grandTotalINR, ''],
      [],
      ['DETAILED SPEND HISTORY'],
      ['Date', 'Platform', 'Account/ID Name', 'Original Spend', 'Currency', 'Spend (INR)', 'Impressions', 'Clicks', 'WhatsApp Volume']
    ];

    // Append the detailed data rows
    tableData.forEach(r => {
      excelRows.push([
        r.date,
        r.platform,
        r.accountName,
        r.spend,
        r.currency,
        r.spendINR,
        r.impressions || '-',
        r.clicks || '-',
        r.volume || '-'
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Spend Report");
    XLSX.writeFile(workbook, `Aggregated_Platform_Spend_${range}_${startDate}_to_${endDate}.xlsx`);
  };

  // Filter table data
  const filteredTableData = tableData.filter(
    item =>
      item.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.date.includes(searchQuery)
  );

  // Get local date strings for Today and Yesterday
  const getLocalDateString = (d) => {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(new Date());
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayObj);

  const todayYesterdayData = filteredTableData.filter(item => item.date === todayStr || item.date === yesterdayStr);
  const olderData = filteredTableData.filter(item => item.date !== todayStr && item.date !== yesterdayStr);

  const totalPages = Math.max(1, 1 + Math.ceil(olderData.length / PAGE_SIZE));

  let displayedTableData = [];
  if (currentPage === 1) {
    displayedTableData = todayYesterdayData;
  } else {
    const startIndex = (currentPage - 2) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    displayedTableData = olderData.slice(startIndex, endIndex);
  }

  return (
    <div className="p-6 md:p-10 space-y-8 bg-slate-50 dark:bg-[#0f172a] min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-white/5 pb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent flex items-center">
            <PieChart className="w-8 h-8 mr-3 text-blue-600" /> Spent & ROI Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Aggregated multi-platform spend data for advertising campaigns and WhatsApp costs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Live Data'}
          </button>
          
          <button
            onClick={handleExportExcel}
            disabled={tableData.length === 0}
            className="flex items-center justify-center px-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" /> Export to Excel
          </button>
        </div>
      </div>

      {/* Error / Success Notifications */}
      {error && (
        <div className="flex items-center p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-2xl animate-fade-in">
          <AlertCircle className="w-4 h-4 mr-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold rounded-2xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 mr-3 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter range selector bar */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
          {['today', 'week', 'month', 'custom'].map(t => (
            <button
              key={t}
              onClick={() => setRange(t)}
              className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                range === t
                  ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
              />
            </div>
            <span className="text-slate-400 text-xs text-center font-bold">to</span>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        )}
      </div>

      {/* Aggregated Total */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 border border-blue-500/10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[180px]">
        <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 opacity-10">
          <PieChart className="w-64 h-64" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-100">Aggregated Total Spend (All Platforms)</span>
          <h2 className="text-5xl font-black mt-2 tracking-tight">
            {grandTotalINR.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          </h2>
        </div>
        <div className="flex items-center space-x-2 mt-4 text-[10px] text-blue-100 font-bold bg-white/10 px-3.5 py-1.5 rounded-xl w-fit backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-yellow-300 mr-1 animate-pulse" />
          <span>Aggregated with live DB logs & exchange conversion</span>
        </div>
      </div>

      {/* Platform Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Meta Ads Card */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <MetaIcon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Meta Ads</span>
            </div>
            <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2.5 py-0.5 rounded-full font-bold">Meta</span>
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">
              {metaINR.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-400 font-bold">
              <div>
                <p>IMPRESSIONS</p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{metaSum.impressions.toLocaleString()}</p>
              </div>
              <div>
                <p>CLICKS</p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{metaSum.clicks.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Google Ads Card */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <GoogleIcon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Google Ads</span>
            </div>
            <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2.5 py-0.5 rounded-full font-bold">Google</span>
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">
              {googleINR.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-400 font-bold">
              <div>
                <p>IMPRESSIONS</p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{googleSum.impressions.toLocaleString()}</p>
              </div>
              <div>
                <p>CLICKS</p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{googleSum.clicks.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* LinkedIn Ads Card */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <LinkedInIcon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">LinkedIn Ads</span>
            </div>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-2.5 py-0.5 rounded-full font-bold">LinkedIn</span>
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">
              {linkedinINR.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-400 font-bold">
              <div>
                <p>IMPRESSIONS</p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{linkedinSum.impressions.toLocaleString()}</p>
              </div>
              <div>
                <p>CLICKS</p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{linkedinSum.clicks.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Card */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <WhatsAppIcon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">WhatsApp WABA</span>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full font-bold">WhatsApp</span>
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">
              {whatsappINR.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </h4>
            <div className="grid grid-cols-1 mt-4 text-[10px] text-slate-400 font-bold">
              <div>
                <p>CONVERSATIONS VOLUME</p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{whatsappSum.volume.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Visual Recharts Charts */}
      {chartData.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Daily Spend Trend Chart */}
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Daily Spend Trend (INR)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGoogle" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLinkedIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWhatsApp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: 'var(--text-muted)' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                  <Legend iconType="circle" style={{ fontSize: '10px' }} />
                  <Area type="monotone" dataKey="Meta" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMeta)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Google" stroke="#f59e0b" fillOpacity={1} fill="url(#colorGoogle)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="LinkedIn" stroke="#6366f1" fillOpacity={1} fill="url(#colorLinkedIn)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="WhatsApp" stroke="#10b981" fillOpacity={1} fill="url(#colorWhatsApp)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Share of Spend Chart */}
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Share of Spend (INR)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Meta', Spend: metaINR },
                  { name: 'Google', Spend: googleINR },
                  { name: 'LinkedIn', Spend: linkedinINR },
                  { name: 'WhatsApp', Spend: whatsappINR }
                ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '10px' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="Spend" radius={[12, 12, 0, 0]}>
                    {
                      [
                        { fill: '#3b82f6' },
                        { fill: '#f59e0b' },
                        { fill: '#6366f1' },
                        { fill: '#10b981' }
                      ].map((item, index) => (
                        <rect key={`bar-rect-${index}`} fill={item.fill} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 p-12 rounded-3xl text-center flex flex-col items-center justify-center space-y-3">
          <PieChart className="w-10 h-10 text-slate-400" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No spend records synced for this period.</p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs text-blue-500 font-bold underline hover:text-blue-600 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync platform data now'}
          </button>
        </div>
      )}

      {/* Daily Breakdown Grid Table */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Detailed Spend History</h3>
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by date, platform, account name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-white/5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Name / ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Original spend</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Spend (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {displayedTableData.length > 0 ? (
                displayedTableData.map((item, index) => (
                  <tr key={`row-${index}`} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">{item.date}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-100">
                      <span className={`inline-flex items-center px-2 py-1.5 rounded-lg text-[10px] font-bold border ${
                        item.platform === 'Meta' ? 'bg-blue-500/10 border-blue-500/10 text-blue-500' :
                        item.platform === 'Google' ? 'bg-amber-500/10 border-amber-500/10 text-amber-500' :
                        item.platform === 'LinkedIn' ? 'bg-indigo-500/10 border-indigo-500/10 text-indigo-500' :
                        'bg-emerald-500/10 border-emerald-500/10 text-emerald-500'
                      }`}>
                        {item.platform === 'Meta' && <MetaIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
                        {item.platform === 'Google' && <GoogleIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
                        {item.platform === 'LinkedIn' && <LinkedInIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
                        {item.platform === 'WhatsApp' && <WhatsAppIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
                        {item.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.accountName}</td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 text-right">
                      {item.spend.toFixed(2)} <span className="text-[10px] text-slate-400 font-sans font-bold">{item.currency}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 text-right">
                      ₹{item.spendINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-white/5 pt-4">
            <div className="text-xs font-semibold text-slate-500">
              {currentPage === 1 ? (
                <span>Showing Today &amp; Yesterday records ({todayYesterdayData.length} total)</span>
              ) : (
                <span>
                  Showing older records { (currentPage - 2) * PAGE_SIZE + 1 } - { Math.min((currentPage - 1) * PAGE_SIZE, olderData.length) } of { olderData.length } total
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 transition-all cursor-pointer"
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPage === p
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Reports;
