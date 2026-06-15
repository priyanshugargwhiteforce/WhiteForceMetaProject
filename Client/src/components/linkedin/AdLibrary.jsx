import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdBuilderContext from '../../context/AdBuilderContext';
import {
  Target, Plus, Play, Pause, Eye, AlertCircle, RefreshCw, Clipboard,
  Layers, CheckCircle, Clock, Info, ShieldAlert, AlertTriangle
} from 'lucide-react';

export default function AdLibrary() {
  const {
    ads,
    loadMoreAds,
    hasMore,
    refreshAds,
    pauseAd,
    resumeAd
  } = useContext(AdBuilderContext);

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshAds();
      setLoading(false);
      setInitialLoaded(true);
    };
    init();
  }, []);

  const handleLoadMore = async () => {
    setLoading(true);
    await loadMoreAds();
    setLoading(false);
  };

  const handleAction = async (adId, action) => {
    setActionError(null);
    try {
      let res;
      if (action === 'pause') {
        res = await pauseAd(adId);
      } else {
        res = await resumeAd(adId);
      }
      if (!res.success) {
        setActionError({
          title: `Action Not Supported`,
          code: res.code || 'ACTION_NOT_SUPPORTED',
          message: res.message || `${action === 'pause' ? 'Pause' : 'Resume'} action is not supported for this entity.`
        });
      }
    } catch (err) {
      console.error(err);
      setActionError({
        title: 'Action Error',
        code: 'REQUEST_FAILED',
        message: `Failed to execute ${action} request.`
      });
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center">
            <Target className="w-6 h-6 mr-2 text-blue-500" />
            LinkedIn Ads Library
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your LinkedIn ad drafts, published updates, and creative associations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={async () => {
              setLoading(true);
              await refreshAds();
              setLoading(false);
            }}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl transition-all disabled:opacity-40"
            title="Refresh Library"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/linkedin-ads/new')}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Create Ad</span>
          </button>
        </div>
      </div>

      {/* Action Error Alerts (for Unsupported Actions like Pause/Resume) */}
      {actionError && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl space-y-1.5 animate-in fade-in duration-300 relative">
          <button
            onClick={() => setActionError(null)}
            className="absolute right-4 top-4 text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
          <div className="flex items-center space-x-2 text-xs font-extrabold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{actionError.title}</span>
          </div>
          <p className="text-xs font-semibold pl-6">{actionError.message}</p>
          <div className="pl-6 text-[9px] font-mono text-slate-400">
            Error Code: {actionError.code}
          </div>
        </div>
      )}

      {/* Main Table / Grid Layout */}
      {loading && !initialLoaded ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-xs text-slate-400 font-semibold">Loading library ads...</span>
        </div>
      ) : ads.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 space-y-4">
          <Clipboard className="w-12 h-12 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">No LinkedIn Ads Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Get started by creating your first ad builder draft configuration.
            </p>
          </div>
          <button
            onClick={() => navigate('/linkedin-ads/new')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all"
          >
            Create Your First Ad
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/[0.01] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.005]">
                  <th className="p-4 pl-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Ad Name</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Account / Campaign</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Format</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Publish Status</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Created At</th>
                  <th className="p-4 pr-6 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {ads.map(ad => {
                  const isPublished = ad.status === 'PUBLISHED';
                  return (
                    <tr key={ad.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.005] transition-all">
                      {/* Name */}
                      <td className="p-4 pl-6 text-xs font-bold text-slate-800 dark:text-white">
                        {ad.ad_name || 'Unnamed Ad'}
                      </td>
                      {/* Campaign / Account Context */}
                      <td className="p-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col space-y-0.5">
                          <span>Campaign: {ad.campaign_id || 'N/A'}</span>
                          <span className="text-[10px] text-slate-400">Account: {ad.account_id || 'N/A'}</span>
                        </div>
                      </td>
                      {/* Format */}
                      <td className="p-4 text-xs">
                        <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded">
                          {ad.ad_format || 'SINGLE_IMAGE'}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="p-4 text-xs">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isPublished
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/10'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          <span>{ad.status || 'DRAFT'}</span>
                        </span>
                      </td>
                      {/* Created At */}
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        {new Date(ad.created_at).toLocaleDateString()}
                      </td>
                      {/* Actions */}
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/linkedin-ads/${ad.id}`)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 hover:bg-blue-500/5 rounded-lg transition-all"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleAction(ad.id, 'pause')}
                            className="p-1.5 text-slate-400 hover:text-amber-500 dark:text-slate-500 dark:hover:text-amber-400 hover:bg-amber-500/5 rounded-lg transition-all"
                            title="Pause Ad"
                          >
                            <Pause className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleAction(ad.id, 'resume')}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 dark:text-slate-500 dark:hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all"
                            title="Resume Ad"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Load More */}
          {hasMore && (
            <div className="p-6 border-t border-slate-100 dark:border-white/5 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="flex items-center space-x-1.5 px-5 py-2 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all disabled:opacity-40"
              >
                {loading ? (
                  <span className="w-3.5 h-3.5 border-2 border-t-transparent border-slate-700 dark:border-slate-300 rounded-full animate-spin"></span>
                ) : (
                  <span>Load More Ads</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
