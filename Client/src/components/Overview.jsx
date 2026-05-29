import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Activity, 
  Eye, 
  TrendingUp,
  Globe,
  Camera,
  MessageCircle,
  ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Overview = () => {
  const navigate = useNavigate();
  
  const [adAccounts, setAdAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAggregateData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/meta/accounts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (data.adaccounts && data.adaccounts.data) {
          setAdAccounts(data.adaccounts.data);
        }
      } catch (error) {
        console.error("Error fetching overview data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAggregateData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount / 100); 
  };

  const totalSpend = adAccounts.reduce((sum, acc) => sum + parseInt(acc.amount_spent || 0), 0);
  const activeAccounts = adAccounts.filter(acc => acc.account_status === 1).length;
  const totalImpressions = adAccounts.reduce((sum, acc) => sum + parseInt(acc.insights?.data?.[0]?.impressions || 0), 0);

  const StatCard = ({ title, value, icon: Icon, color, trend }) => {
    const colorMap = {
      blue: 'from-blue-500 to-indigo-600 shadow-blue-500/20 text-blue-500',
      emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/20 text-emerald-500',
      purple: 'from-purple-500 to-pink-600 shadow-purple-500/20 text-purple-500',
      amber: 'from-amber-500 to-orange-600 shadow-amber-500/20 text-amber-500'
    };

    return (
      <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300">
        <div className={`absolute -right-6 -top-6 w-24 h-24 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br ${colorMap[color].split(' ')[0]} rounded-full blur-xl`}></div>
        
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorMap[color].split(' ').slice(0,2).join(' ')} flex items-center justify-center shadow-lg ${colorMap[color].split(' ')[2]}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {trend}
            </span>
          )}
        </div>
        
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-800 group-hover:to-slate-500 dark:group-hover:from-white dark:group-hover:to-slate-400 transition-all">
            {value}
          </h3>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Platform Overview</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">High-level executive summary of your Meta Ads ecosystem.</p>
        </div>
        <button 
          onClick={() => navigate('/insights')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center group"
        >
          View Deep Insights
          <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 h-40 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="fade-in space-y-8">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard 
              title="Total Ad Spend (Lifetime)" 
              value={formatCurrency(totalSpend)} 
              icon={CreditCard} 
              color="blue" 
              trend="+12.5%" 
            />
            <StatCard 
              title="Active Ad Accounts" 
              value={activeAccounts} 
              icon={Activity} 
              color="emerald" 
            />
            <StatCard 
              title="Total Impressions" 
              value={totalImpressions.toLocaleString('en-IN')} 
              icon={Eye} 
              color="purple" 
            />
            <StatCard 
              title="Avg ROAS (Stub)" 
              value="3.4x" 
              icon={TrendingUp} 
              color="amber" 
              trend="+0.2" 
            />
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Connected Channels</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Meta Ads</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active & Synced</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">LinkedIn Ads</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Synced</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Google & YouTube Ads</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">WhatsApp Manager</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Setup Required</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></div>
                </div>
              </div>
            </div>

            {/* Quick Actions / Tips */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-white/[0.02] dark:to-white/[0.01] border border-slate-800 dark:border-white/10 rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Weekly Tip</span>
                <h4 className="text-xl font-bold text-white mt-2 mb-4">Minimize Overlapping Audiences</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Having multiple active ad sets targeting similar custom audiences increases bidding costs and fatigues users quickly. Keep them distinct.</p>
              </div>
              <button 
                onClick={() => navigate('/ad-accounts')}
                className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-sm font-semibold transition-all border border-white/10"
              >
                Go to Ad Accounts
              </button>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 flex items-center justify-between relative overflow-hidden shadow-2xl shadow-blue-500/20">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="relative z-10 max-w-xl">
              <h3 className="text-2xl font-bold text-white mb-2">Ready to optimize your campaigns?</h3>
              <p className="text-blue-100 text-sm">Use our advanced AI Analyzer to generate strategic insights, cut wasted spend, and scale your best-performing ads instantly.</p>
            </div>
            <div className="relative z-10">
              <button onClick={() => navigate('/ad-analyzer')} className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:scale-105 transition-transform shadow-xl">
                Open Ad Analyzer
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Overview;
