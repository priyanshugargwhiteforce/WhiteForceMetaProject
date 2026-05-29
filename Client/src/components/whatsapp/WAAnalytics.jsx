import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

const WAAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/whatsapp/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching template analytics:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const getKPIVal = (status) => {
    if (!data?.statusCounts) return 0;
    const row = data.statusCounts.find(s => s.status.toLowerCase() === status.toLowerCase());
    return row ? row.count : 0;
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']; // emerald, blue, amber, red

  // Prepare Pie Chart data (Status Distribution)
  const pieData = data?.statusCounts ? data.statusCounts.map(item => ({
    name: item.status.toUpperCase(),
    value: item.count
  })) : [];

  // Group timeline trend by date
  const timelineData = data?.timelineData ? data.timelineData.map(item => ({
    date: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    count: item.count,
    status: item.status
  })) : [];

  return (
    <div className="p-8 space-y-8 bg-[#0f172a] min-h-screen text-slate-100">
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">WhatsApp Analytics</h2>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Delivery Performance & Logs</p>
          </div>
        </div>

        <button 
          onClick={fetchAnalytics}
          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-400 font-medium">Loading Campaign Metrics...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-slate-400">{error}</p>
        </div>
      ) : (
        <div className="space-y-8 max-w-7xl mx-auto">
          
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard 
              title="Total Sent" 
              value={getKPIVal('sent')} 
              icon={MessageSquare} 
              color="indigo" 
            />
            <KPICard 
              title="Delivered" 
              value={getKPIVal('delivered')} 
              icon={CheckCircle} 
              color="emerald" 
            />
            <KPICard 
              title="Read" 
              value={getKPIVal('read')} 
              icon={TrendingUp} 
              color="blue" 
            />
            <KPICard 
              title="Failed" 
              value={getKPIVal('failed')} 
              icon={XCircle} 
              color="red" 
            />
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Delivery Trend */}
            <div className="lg:col-span-8 bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 shadow-xl">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Delivery Timeline Volume</h3>
              <div className="h-80">
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '12px' }} />
                      <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500 italic">No broadcast trend data yet</div>
                )}
              </div>
            </div>

            {/* Distribution Pie */}
            <div className="lg:col-span-4 bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 shadow-xl flex flex-col">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Status Shares</h3>
              <div className="h-60 flex-1 relative">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500 italic">No status share statistics</div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span>{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Template usage rates */}
            <div className="lg:col-span-12 bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 shadow-xl">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Template Broadcast Breakdown</h3>
              <div className="h-80">
                {data?.templatePerformance && data.templatePerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.templatePerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                      <XAxis dataKey="template_name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '12px' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500 italic">No templates analytics records present</div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ title, value, icon: Icon, color }) => {
  const colorMap = {
    indigo: 'from-indigo-500/10 to-indigo-500/5 text-indigo-400 border-indigo-500/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    blue: 'from-blue-500/10 to-blue-500/5 text-blue-400 border-blue-500/20',
    red: 'from-red-500/10 to-red-500/5 text-red-400 border-red-500/20',
  };

  return (
    <div className={`bg-gradient-to-br border rounded-[2rem] p-6 shadow-xl flex items-center justify-between ${colorMap[color]}`}>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
        <h4 className="text-3xl font-extrabold text-white">{value}</h4>
      </div>
      <div className="p-4 bg-white/5 rounded-2xl">
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

export default WAAnalytics;
