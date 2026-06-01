import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  TrendingUp,
  Activity,
  CreditCard,
  Eye,
  MousePointer2,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Filter,
  Download,
  Search,
  AlertCircle,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PieChart,
  Target,
  Users,
  CheckCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const AdAnalyzer = () => {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const reportRef = useRef(null);

  // Syncing states
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(null);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    const fetchAdAccounts = async () => {
      try {
        const token = localStorage.getItem('token');
        const configId = localStorage.getItem('selectedMetaConfigId') || '';
        const headers = { 'Authorization': `Bearer ${token}` };
        if (configId) headers['X-Meta-Config-Id'] = configId;

        const response = await fetch(`http://localhost:5000/api/meta/accounts`, { headers });
        const result = await response.json();
        if (result.adaccounts && result.adaccounts.data) {
          setAdAccounts(result.adaccounts.data);
          // Set default selected account if none selected
          if (!selectedAccountId && result.adaccounts.data.length > 0) {
            setSelectedAccountId(result.adaccounts.data[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching ad accounts:", err);
      }
    };

    fetchAdAccounts();
  }, []);

  const fetchInsights = async (accountId) => {
    if (!accountId) return;

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const configId = localStorage.getItem('selectedMetaConfigId') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      if (configId) headers['X-Meta-Config-Id'] = configId;

      const response = await fetch(
        `http://localhost:5000/api/meta/insights/${accountId}?preset=lifetime`, { headers }
      );
      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message);
      }

      setData(result.data || []);
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId) {
      fetchInsights(selectedAccountId);
    }
  }, [selectedAccountId]);

  const handleSyncRealtimeData = async () => {
    if (!selectedAccountId) return;
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const accountId = selectedAccountId;
      const configId = localStorage.getItem('selectedMetaConfigId') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      if (configId) headers['X-Meta-Config-Id'] = configId;

      // 1. Force sync connected ad accounts
      const accListRes = await fetch(`http://localhost:5000/api/meta/accounts?force=true`, { headers });
      const accListResult = await accListRes.json();
      if (!accListResult.success) throw new Error(accListResult.message || "Failed to sync accounts list");

      // 2. Force sync selected account details and campaign ads list
      const detailsRes = await fetch(`http://localhost:5000/api/meta/accounts/${accountId}?force=true`, { headers });
      const detailsResult = await detailsRes.json();
      if (!detailsResult.success) throw new Error(detailsResult.message || "Failed to sync account details");

      const ads = detailsResult.data?.ads?.data || [];
      const adIds = ads.map(a => a.id);

      // 3. Force sync selected account daily insights trend
      const insRes = await fetch(`http://localhost:5000/api/meta/insights/${accountId}?preset=lifetime&force=true`, { headers });
      const insResult = await insRes.json();
      if (!insResult.success) throw new Error(insResult.message || "Failed to sync account insights");

      // 4. Force sync leads for all ads belonging to this account in parallel
      if (adIds.length > 0) {
        await Promise.all(adIds.map(async (adId) => {
          try {
            await fetch('http://localhost:5000/api/meta/leads/sync', {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ adId })
            });
          } catch (err) {
            console.warn(`Leads sync skipped for Ad ID: ${adId}`, err);
          }
        }));
      }

      // Reload fresh insights
      await fetchInsights(accountId);

      setSyncSuccess(`Real-time sync finished! Saved connected accounts, active ads, daily insights, and live lead database records.`);
      setTimeout(() => setSyncSuccess(null), 8000);
    } catch (err) {
      console.error("Real-time Sync Error:", err);
      setSyncError(err.message || "A network error occurred during Meta synchronization.");
    } finally {
      setSyncing(false);
    }
  };

  const generateAIReport = async () => {
    if (!data.length) return;

    setIsGeneratingReport(true);
    setIsReportModalOpen(true);
    try {
      const prompt = `You are an expert META Ads analyst AI.

Your task is to analyze META Ads Insights API JSON data and return a complete performance analysis in STRICT JSON format only.

Analyze:
* Campaign performance
* Trend changes
* Audience fatigue
* Creative quality
* CTR quality
* CPC quality
* CPM quality
* Lead cost quality
* Scaling possibility
* Ad fatigue detection
* Best performing days
* Worst performing days
* Overall recommendation

Rules:
* Response MUST be valid JSON only
* No markdown
* No explanation outside JSON
* Numbers should be rounded to 2 decimals
* Use simple readable text
* Detect trends automatically
* Compare early vs later performance
* Mention if performance degraded over time
* Mention if creative fatigue happened
* Mention if scaling is recommended
* Mention if campaign should stop or refresh creatives

Important Metric Rules:
* CTR > 4% = Excellent
* CTR 2%-4% = Good
* CTR < 2% = Weak
* CPC < 1 = Excellent
* CPC 1-2 = Good
* CPC > 2 = Expensive
* CPM < 40 = Good
* CPM 40-60 = Average
* CPM > 60 = Expensive audience
* Lead Cost low = Better
* Increasing CPC + decreasing CTR = Ad fatigue

Expected Output Format:
{
  "summary": {
    "overall_status": "",
    "performance_score": 0,
    "campaign_health": "",
    "trend": "",
    "final_verdict": ""
  },
  "metrics_analysis": {
    "ctr": { "average": 0, "status": "", "analysis": "" },
    "cpc": { "average": 0, "status": "", "analysis": "" },
    "cpm": { "average": 0, "status": "", "analysis": "" },
    "lead_cost": { "average": 0, "status": "", "analysis": "" }
  },
  "performance_phases": [
    { "phase": "Starting Phase", "date_range": "", "status": "", "analysis": "" },
    { "phase": "Middle Phase", "date_range": "", "status": "", "analysis": "" },
    { "phase": "Ending Phase", "date_range": "", "status": "", "analysis": "" }
  ],
  "best_days": [ { "date": "", "reason": "", "ctr": 0, "cpc": 0 } ],
  "worst_days": [ { "date": "", "reason": "", "ctr": 0, "cpc": 0 } ],
  "issues_detected": [ "", "" ],
  "recommendations": [ "", "" ],
  "fatigue_analysis": { "fatigue_detected": true, "reason": "", "creative_refresh_needed": true },
  "scaling_analysis": { "scaling_recommended": false, "reason": "" }
}

Now analyze this META Ads Insights data:
${JSON.stringify(data)}`;

      const token = localStorage.getItem('token');
      const response = await fetch("http://localhost:5000/api/ai/analyze", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error("GROQ API Error:", result);
        throw new Error(result.message || "Failed to generate report from GROQ");
      }

      if (result.data) {
        const reportContent = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        setAiReport(reportContent);
      } else {
        throw new Error("Invalid response format from AI");
      }
    } catch (err) {
      console.error("Error generating AI report:", err);
      setError(err.message || "Failed to generate AI report. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Helper to convert oklch/oklab to rgb using canvas
          const convertColor = (colorStr) => {
            if (!colorStr || (!colorStr.includes('oklch') && !colorStr.includes('oklab'))) return colorStr;
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 1;
              canvas.height = 1;
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = colorStr;
              ctx.fillRect(0, 0, 1, 1);
              const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
              return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
            } catch (e) {
              return theme === 'dark' ? '#ffffff' : '#000000';
            }
          };

          // 1. Fix all style tags in the cloned document to prevent html2canvas parser from crashing
          const styleTags = clonedDoc.getElementsByTagName("style");
          // Match modern color functions including nested ones like color-mix
          const colorRegex = /(oklch|oklab|color-mix|lab|lch|hwb)\s*\((?:[^()]+|\([^()]*\))*\)/g;

          for (let i = 0; i < styleTags.length; i++) {
            try {
              const css = styleTags[i].innerHTML;
              if (css.match(/(oklch|oklab|color-mix|lab|lch|hwb)/)) {
                styleTags[i].innerHTML = css.replace(colorRegex, (match) => {
                  return convertColor(match);
                });
              }
            } catch (e) { console.error("Style tag fix failed", e); }
          }

          // 2. Sync computed styles from original elements to clones
          const originalElements = element.getElementsByTagName("*");
          const clonedElements = clonedDoc.getElementsByTagName("*");

          for (let i = 0; i < originalElements.length; i++) {
            const orig = originalElements[i];
            const clone = clonedElements[i];
            if (!clone) continue;

            const styles = window.getComputedStyle(orig);

            // Fix all possible color properties
            const colorProps = ['backgroundColor', 'color', 'borderColor', 'outlineColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'fill', 'stroke'];
            colorProps.forEach(prop => {
              const val = styles[prop];
              if (val && val.match(/(oklch|oklab|color-mix|lab|lch|hwb)/)) {
                clone.style[prop] = convertColor(val);
              }
            });

            // Handle complex cases like gradients, shadows
            const complexProps = ['backgroundImage', 'boxShadow', 'textShadow', 'filter'];
            complexProps.forEach(prop => {
              const val = styles[prop];
              if (val && val.match(/(oklch|oklab|color-mix|lab|lch|hwb)/)) {
                clone.style[prop] = val.replace(colorRegex, (match) => {
                  return convertColor(match);
                });
              }
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Ad-Optimization-Report-${new Date().toLocaleDateString()}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err, err.message);
      alert("Failed to download PDF. Please try again. Message: " + err.message);
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

  const getActionValue = (actions, type) => {
    const action = actions?.find(a => a.action_type === type);
    return action ? parseFloat(action.value).toFixed(2) : '0.00';
  };

  if (error && !isReportModalOpen) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Analysis Failed</h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all">Retry Analysis</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Title & Controls Block */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
            <span>Analytics</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-blue-600 dark:text-blue-400">Ad Analyzer</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Performance Breakdown</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sync Button */}
          <button
            disabled={syncing || !selectedAccountId}
            onClick={handleSyncRealtimeData}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/10 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Realtime Data'}</span>
          </button>

          <div className="flex items-center space-x-3 bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-2 transition-all">
            <Users className="w-4 h-4 text-blue-500" />
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-transparent text-sm font-bold focus:outline-none cursor-pointer text-[var(--text-main)] min-w-[200px]"
            >
              {adAccounts.map(account => (
                <option key={account.id} value={account.id} className="bg-[var(--bg-sidebar)] text-[var(--text-main)]">
                  {account.name} ({account.account_id})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-blue-400 uppercase">Daily Increments</span>
          </div>
          {/* <button className="p-2.5 bg-[var(--bg-input)] border border-slate-200 dark:border-white/5 rounded-xl text-slate-500 hover:text-blue-500 transition-all">
            <Download className="w-4 h-4" />
          </button> */}
        </div>
      </div>

      <div>
        {/* Sync Status Banners */}
        {(syncSuccess || syncError) && (
          <div className="mb-6 space-y-3">
            {syncSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{syncSuccess}</span>
                </div>
                <button onClick={() => setSyncSuccess(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
              </div>
            )}
            {syncError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-300">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{syncError}</span>
                </div>
                <button onClick={() => setSyncError(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
              </div>
            )}
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Running Deep Meta Analysis...</p>
          </div>
        ) : (
          <div className="fade-in space-y-8">
            {/* Summary Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard
                label="Total Spend"
                value={formatCurrency(data.reduce((sum, d) => sum + parseFloat(d.spend), 0))}
                icon={CreditCard}
                color="blue"
                trend="+14.2%"
              />
              <MetricCard
                label="Total Impressions"
                value={formatNumber(data.reduce((sum, d) => sum + parseInt(d.impressions), 0))}
                icon={Eye}
                color="purple"
                trend="+5.8%"
              />
              <MetricCard
                label="Total Clicks"
                value={formatNumber(data.reduce((sum, d) => sum + parseInt(d.clicks), 0))}
                icon={MousePointer2}
                color="emerald"
                trend="+12.1%"
              />
              <MetricCard
                label="Avg. CTR"
                value={`${(data.reduce((sum, d) => sum + parseFloat(d.ctr), 0) / data.length).toFixed(2)}%`}
                icon={TrendingUp}
                color="amber"
                trend="+0.4%"
              />
            </div>

            {/* Main Data Table */}
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm transition-colors">
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                  Daily Performance Logs
                </h3>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Filter dates..." className="ml-2 pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs focus:outline-none focus:border-blue-500/50" />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Spend</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Impressions</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">CTR</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">CPC</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">CPM</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Leads</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">CPL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {(() => {
                      const sortedData = [...data].sort((a, b) => new Date(b.date_start) - new Date(a.date_start));
                      const indexOfLastItem = currentPage * itemsPerPage;
                      const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                      const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);

                      return currentItems.map((day, idx) => {
                        const leads = getActionValue(day.cost_per_action_type, 'lead');

                        return (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                  <Calendar className="w-4 h-4 text-blue-500" />
                                </div>
                                <span className="text-sm font-bold">{day.date_start}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(day.spend)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-mono text-slate-600 dark:text-slate-300">{formatNumber(day.impressions)}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-500/5 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/10">
                                {parseFloat(day.ctr).toFixed(2)}%
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-mono text-slate-500">{parseFloat(day.cpc).toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-mono text-slate-500">{parseFloat(day.cpm).toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-bold text-indigo-500">{leads > 0 ? (parseFloat(day.spend) / parseFloat(leads)).toFixed(0) : 0}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-mono font-bold text-blue-600">₹{leads}</span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/30 dark:bg-white/[0.01]">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Showing <span className="text-blue-500">{Math.min(data.length, (currentPage - 1) * itemsPerPage + 1)}</span> to <span className="text-blue-500">{Math.min(data.length, currentPage * itemsPerPage)}</span> of {data.length} results
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.ceil(data.length / itemsPerPage) }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === Math.ceil(data.length / itemsPerPage) || Math.abs(page - currentPage) <= 1)
                    .map((page, i, arr) => (
                      <React.Fragment key={page}>
                        {i > 0 && page - arr[i - 1] > 1 && <span className="text-slate-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === page ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 text-slate-500'}`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(data.length / itemsPerPage), prev + 1))}
                    disabled={currentPage === Math.ceil(data.length / itemsPerPage)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Action Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 transition-colors">
                <h3 className="font-bold text-lg mb-6 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-indigo-500" />
                  Conversion Actions (Latest Day)
                </h3>
                <div className="space-y-4">
                  {data[0]?.cost_per_action_type?.map((action, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-blue-500/30 transition-all group">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 capitalize">{action.action_type.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">₹{parseFloat(action.value).toFixed(2)}</span>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Cost / Action</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <PieChart className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-2">Performance Insights</h3>
                  <p className="text-blue-100 text-sm mb-8 max-w-xs">Let our AI analyze your data and provide deep strategic recommendations.</p>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                      <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Status</p>
                      <p className="text-xl font-bold">AI Ready</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                      <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Processing</p>
                      <p className="text-xl font-bold">Fast Lane</p>
                    </div>
                  </div>

                  <button
                    onClick={generateAIReport}
                    disabled={isGeneratingReport || !data.length}
                    className="mt-8 w-full py-3 bg-white text-blue-600 rounded-xl font-bold text-sm shadow-xl hover:bg-blue-50 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingReport ? (
                      <><RefreshCw className="w-4 h-4 ml-2 animate-spin mr-2" /> Generating...</>
                    ) : (
                      <>Generate AI Optimization Report <ArrowUpRight className="w-4 h-4 ml-2" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => !isGeneratingReport && setIsReportModalOpen(false)}></div>
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] shadow-2xl relative z-10 overflow-hidden flex flex-col fade-in transition-colors">
            <div ref={reportRef} className="flex-1 overflow-y-auto flex flex-col bg-white dark:bg-[#0f172a]">
              {/* Modal Header - We include this in ref to capture in PDF */}
              <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <PieChart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">AI Optimization Intelligence</h3>
                    <p className="text-xs text-slate-500 font-medium">Deep meta-analysis and strategic scaling recommendations</p>
                  </div>
                </div>
                {/* Close button inside capture area for alignment, but we hide it in PDF if we could. 
                    Actually, it's better to keep it simple. */}
              </div>

              {/* Modal Content */}
              <div className="p-8 space-y-8 flex-1">
                {isGeneratingReport ? (
                  <div className="h-96 flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PieChart className="w-8 h-8 text-blue-500 animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">Analyzing Patterns...</h4>
                      <p className="text-sm text-slate-500 max-w-xs">Comparing historical trends and calculating efficiency scores across all metrics.</p>
                    </div>
                  </div>
                ) : aiReport ? (
                  <div className="space-y-10">
                    {/* Summary Header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 bg-gradient-to-br from-blue-600/10 to-indigo-600/5 rounded-3xl p-6 border border-blue-500/20">
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-3 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">{aiReport.summary.overall_status}</span>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Health Score</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{aiReport.summary.performance_score}/100</p>
                          </div>
                        </div>
                        <h4 className="text-lg font-bold mb-2">Verdict: {aiReport.summary.campaign_health}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{aiReport.summary.final_verdict}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/[0.02] rounded-3xl p-6 border border-slate-200 dark:border-white/5 flex flex-col justify-center text-center">
                        <TrendingUp className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Trend</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{aiReport.summary.trend}</p>
                      </div>
                    </div>

                    {/* Metrics Deep Dive */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(aiReport.metrics_analysis).map(([key, value]) => (
                        <div key={key} className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl p-4">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{key}</p>
                          <p className="text-xl font-bold mb-1">{value.average}{key === 'ctr' ? '%' : ''}</p>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${value.status.toLowerCase().includes('excellent') || value.status.toLowerCase().includes('good') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                            {value.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Recommendations & Issues */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold flex items-center text-blue-600 dark:text-blue-400">
                          <Target className="w-4 h-4 mr-2" />
                          Strategic Recommendations
                        </h4>
                        {aiReport.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start space-x-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                            <ArrowUpRight className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{rec}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold flex items-center text-red-500">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Issues Detected
                        </h4>
                        {aiReport.issues_detected.map((issue, i) => (
                          <div key={i} className="flex items-start space-x-3 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{issue}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fatigue & Scaling */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={`p-6 rounded-3xl border ${aiReport.fatigue_analysis.fatigue_detected ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${aiReport.fatigue_analysis.fatigue_detected ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
                            <Activity className="w-5 h-5" />
                          </div>
                          <h5 className="font-bold">Creative Fatigue</h5>
                        </div>
                        <p className="text-sm font-medium mb-4">{aiReport.fatigue_analysis.reason}</p>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${aiReport.fatigue_analysis.creative_refresh_needed ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                          <span className="text-[10px] font-bold uppercase tracking-widest">{aiReport.fatigue_analysis.creative_refresh_needed ? 'Refresh Highly Recommended' : 'Creatives are Healthy'}</span>
                        </div>
                      </div>
                      <div className={`p-6 rounded-3xl border ${aiReport.scaling_analysis.scaling_recommended ? 'bg-blue-500/5 border-blue-500/20' : 'bg-slate-500/5 border-slate-500/20'}`}>
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${aiReport.scaling_analysis.scaling_recommended ? 'bg-blue-500 text-white' : 'bg-slate-500 text-white'}`}>
                            <TrendingUp className="w-5 h-5" />
                          </div>
                          <h5 className="font-bold">Scaling Potential</h5>
                        </div>
                        <p className="text-sm font-medium mb-4">{aiReport.scaling_analysis.reason}</p>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${aiReport.scaling_analysis.scaling_recommended ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                          <span className="text-[10px] font-bold uppercase tracking-widest">{aiReport.scaling_analysis.scaling_recommended ? 'Scaling Ready' : 'Scaling Not Advised'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-6 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex justify-between items-center transition-colors">
                <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <PieChart className="w-4 h-4 mr-2" />
                  Powered by Groq Intelligence
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={downloadPDF}
                    disabled={!aiReport || isGeneratingReport}
                    className="px-6 py-3 bg-[var(--bg-input)] border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 mr-2 text-blue-500" />
                    Download PDF Report
                  </button>
                  <button
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
                  >
                    Close Report
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* External Close Button to keep it out of capture ref */}
          <button
            onClick={() => setIsReportModalOpen(false)}
            className="absolute top-8 right-8 p-3 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-white hover:bg-white/20 transition-all z-[110]"
          >
            <ChevronRight className="w-6 h-6 rotate-90" />
          </button>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, color, trend }) => {
  const colorMap = {
    blue: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/20',
    purple: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl p-6 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all group relative overflow-hidden">
      <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br opacity-[0.03] blur-2xl rounded-full ${colorMap[color].split(' ')[0]}`}></div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center border ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex items-center space-x-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
          <ArrowUpRight className="w-3 h-3" />
          <span>{trend}</span>
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">{value}</h3>
      </div>
    </div>
  );
};

export default AdAnalyzer;
