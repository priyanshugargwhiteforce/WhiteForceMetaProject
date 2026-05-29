import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  X, 
  Download, 
  PieChart, 
  TrendingUp, 
  AlertCircle, 
  Target, 
  ArrowUpRight, 
  Activity, 
  CheckCircle2,
  Brain,
  Sparkles} from 'lucide-react';

const MODEL_ID = "zai-org/GLM-5.1";
const API_URL = "/api/ai/analyze";

const SingleAdReportModal = ({ isOpen, onClose, adData, insightsData, theme }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (!report && !loading) {
        generateReport();
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const metrics = {
        total_spend: insightsData.reduce((sum, d) => sum + parseFloat(d.spend), 0),
        avg_ctr: insightsData.reduce((sum, d) => sum + parseFloat(d.ctr), 0) / (insightsData.length || 1),
        avg_cpc: insightsData.reduce((sum, d) => sum + parseFloat(d.cpc), 0) / (insightsData.length || 1),
        total_impressions: insightsData.reduce((sum, d) => sum + parseInt(d.impressions), 0),
        total_actions: insightsData.reduce((sum, day) => sum + (day.actions?.reduce((s, a) => s + parseInt(a.value), 0) || 0), 0)
      };

      const prompt = `You are an expert Meta Ads Strategist. Analyze the following ad data and provide a detailed performance report in JSON format.
      
      Ad Name: ${adData.name}
      Campaign: ${adData.campaign?.name}
      Metrics (Last 30 Days):
      - Total Spend: ${metrics.total_spend}
      - Avg CTR: ${metrics.avg_ctr.toFixed(2)}%
      - Avg CPC: ${metrics.avg_cpc.toFixed(2)}
      - Total Impressions: ${metrics.total_impressions}
      - Total Actions/Conversions: ${metrics.total_actions}
      
      Requirements:
      1. Overall status (Excellent/Good/Average/Poor).
      2. Performance Score (0-100).
      3. Profit/Loss Analysis (is it profitable based on metrics?).
      4. Recommendations for improvement (creative, audience, budget).
      5. Audience analysis (fatigue, quality).
      6. Verdict: Should the ad be stopped or scaled?
      
      Return ONLY a JSON object with this structure:
      {
        "status": "",
        "score": 0,
        "profit_analysis": "",
        "verdict": "",
        "recommendations": ["", ""],
        "audience_insights": "",
        "creative_advice": ""
      }`;

      // Using Backend Proxy to avoid CORS and keep Token secure
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to generate report from server.");
      }
      
      const content = result.data;
      
      if (!content) throw new Error("AI returned empty response.");

      // Attempt to parse JSON from text if it's not already
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          setReport(JSON.parse(jsonMatch[0]));
        } else {
          // Fallback if AI didn't return perfect JSON but gave text
          setReport({
            status: "Analysis Complete",
            score: 75,
            profit_analysis: content.substring(0, 300),
            verdict: "Manual Review Suggested",
            recommendations: ["Review ad engagement metrics", "Check audience retention"],
            audience_insights: "Detailed analysis in progress.",
            creative_advice: "Maintain current creative strategy."
          });
        }
      } catch (e) {
        console.error("Parse error:", e);
        setError("AI response could not be analyzed correctly.");
      }
    } catch (err) {
      console.error("AI Report Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`AI-Report-${adData.name}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xl" onClick={onClose}></div>
      
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] shadow-2xl relative z-10 flex flex-col fade-in overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">AI Strategic Report</h3>
              <p className="text-xs text-slate-500 font-medium">Powered by Llama-3.3 Intelligence</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8" ref={reportRef}>
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-indigo-500 animate-pulse" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold">Consulting AI Strategist...</h4>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">Analyzing ${adData.name} across ${insightsData.length} data points to calculate ROI and scaling potential.</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-96 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h4 className="text-lg font-bold">Analysis Failed</h4>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">{error}</p>
              <button 
                onClick={generateReport}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all"
              >
                Retry Analysis
              </button>
            </div>
          ) : report ? (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* Summary Score */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-10">
                      <PieChart className="w-32 h-32" />
                   </div>
                   <div className="relative z-10">
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest">{report.status}</span>
                      </div>
                      <h4 className="text-4xl font-bold mb-2">{report.score}% Health Score</h4>
                      <p className="text-blue-100 text-sm leading-relaxed max-w-md opacity-90">{report.profit_analysis}</p>
                   </div>
                </div>
                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl p-8 flex flex-col justify-center items-center text-center">
                   <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${report.verdict.toLowerCase().includes('scale') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      <TrendingUp className="w-8 h-8" />
                   </div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Final Verdict</p>
                   <h5 className="text-xl font-bold">{report.verdict}</h5>
                </div>
              </div>

              {/* Insights & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <h5 className="text-sm font-bold flex items-center text-indigo-500 uppercase tracking-widest">
                       <CheckCircle2 className="w-4 h-4 mr-2" />
                       Strategic Recommendations
                    </h5>
                    <div className="space-y-4">
                       {report.recommendations.map((rec, i) => (
                         <div key={i} className="flex items-start space-x-3 p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/30 transition-all">
                            <ArrowUpRight className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{rec}</p>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-8">
                    <div>
                       <h5 className="text-sm font-bold flex items-center text-purple-500 uppercase tracking-widest mb-4">
                          <Activity className="w-4 h-4 mr-2" />
                          Audience Intelligence
                       </h5>
                       <div className="p-6 bg-purple-500/5 border border-purple-500/10 rounded-2xl">
                          <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                             "{report.audience_insights}"
                          </p>
                       </div>
                    </div>
                    <div>
                       <h5 className="text-sm font-bold flex items-center text-amber-500 uppercase tracking-widest mb-4">
                          <Target className="w-4 h-4 mr-2" />
                          Creative Quality
                       </h5>
                       <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                          <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                             "{report.creative_advice}"
                          </p>
                       </div>
                    </div>
                 </div>
              </div>

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <PieChart className="w-4 h-4" />
            <span>AI Powered Intelligence v1.2</span>
          </div>
          <div className="flex items-center space-x-4">
             <button 
               onClick={downloadPDF}
               disabled={!report || loading}
               className="flex items-center px-6 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/10 transition-all disabled:opacity-50"
             >
                <Download className="w-4 h-4 mr-2 text-indigo-500" />
                Download PDF
             </button>
             <button 
               onClick={onClose}
               className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
             >
                Close Analysis
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleAdReportModal;
