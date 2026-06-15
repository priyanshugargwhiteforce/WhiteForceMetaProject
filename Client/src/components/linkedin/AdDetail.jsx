import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdBuilderContext from '../../context/AdBuilderContext';
import {
  ArrowLeft, Target, Calendar, User, Eye, ShieldAlert, CheckCircle2,
  Code, Info, ChevronRight, Layers, ExternalLink
} from 'lucide-react';

export default function AdDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAdDetail } = useContext(AdBuilderContext);

  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRawDraft, setShowRawDraft] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);

  useEffect(() => {
    const fetchAd = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdDetail(id);
        if (data) {
          setAd(data);
        } else {
          setError('Ad entity not found.');
        }
      } catch (err) {
        console.error('Fetch ad detail error:', err);
        setError('Failed to load ad details from backend API.');
      } finally {
        setLoading(false);
      }
    };
    fetchAd();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        <span className="text-xs text-slate-400 font-semibold">Loading ad details...</span>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Error Loading Ad Details</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{error || 'An unexpected error occurred.'}</p>
        <button
          onClick={() => navigate('/linkedin-ads')}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all"
        >
          Return to Library
        </button>
      </div>
    );
  }

  // Parse JSON payloads safely
  let draftPayload = {};
  try {
    draftPayload = typeof ad.draft_payload === 'string' ? JSON.parse(ad.draft_payload) : ad.draft_payload || {};
  } catch (e) {
    console.error('Failed to parse draft payload', e);
  }

  let previewPayload = {};
  try {
    previewPayload = typeof ad.preview_payload === 'string' ? JSON.parse(ad.preview_payload) : ad.preview_payload || {};
  } catch (e) {
    console.error('Failed to parse preview payload', e);
  }

  const isPublished = ad.status === 'PUBLISHED';
  const linkedinResponse = previewPayload.rawResponse || null;
  const publishError = ad.last_publish_error || previewPayload.error || null;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Back Header */}
      <div>
        <button
          onClick={() => navigate('/linkedin-ads')}
          className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-bold transition-all mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Library</span>
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center">
              <Target className="w-6 h-6 mr-2 text-blue-500" />
              {ad.ad_name || 'Unnamed Ad'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 select-all font-mono">
              Database ID: {ad.id}
            </p>
          </div>
          <div>
            <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isPublished
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/10'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              <span>{ad.status || 'DRAFT'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid Specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Specs Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-white/[0.01] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
              Ad Specifications
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Format</p>
                <p className="text-slate-800 dark:text-white">{ad.ad_format || 'SINGLE_IMAGE'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Created By (User ID)</p>
                <p className="text-slate-800 dark:text-white">{ad.created_by}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Ad Account URN</p>
                <p className="text-slate-800 dark:text-white select-all font-mono text-[11px]">
                  urn:li:sponsoredAccount:{ad.account_id}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Target Campaign URN</p>
                <p className="text-slate-800 dark:text-white select-all font-mono text-[11px]">
                  urn:li:sponsoredCampaign:{ad.campaign_id}
                </p>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <p className="text-[10px] text-slate-400 uppercase">Selected Creative URN / URN status</p>
                {previewPayload.simulatedUrn ? (
                  <p className="text-blue-500 font-bold">Simulated Publisher (Mode Active)</p>
                ) : draftPayload.creativeUrn ? (
                  <p className="font-mono text-[11px] select-all">{draftPayload.creativeUrn}</p>
                ) : (
                  <p className="text-amber-500 flex items-center space-x-1 mt-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Local Draft only (Lacks URN)</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Errors and API logs */}
          {publishError && (
            <div className="p-5 bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 rounded-[2rem] space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-extrabold text-red-700 dark:text-red-400">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span>Last Publish Error Log</span>
              </div>
              <p className="text-xs font-semibold pl-6">{publishError}</p>
            </div>
          )}
        </div>

        {/* Timeline Widget */}
        <div className="bg-white dark:bg-white/[0.01] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 space-y-6">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
            Status Timeline
          </h3>
          <div className="space-y-6 relative pl-4 border-l border-slate-200 dark:border-white/5">
            {/* Created Draft Point */}
            <div className="relative">
              <span className="absolute -left-[21px] top-0.5 w-3 h-3 bg-blue-500 rounded-full border border-white dark:border-slate-900 shadow"></span>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-white">Draft Created</p>
                <p className="text-[10px] text-slate-400">
                  {new Date(ad.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Last Updated Point */}
            <div className="relative">
              <span className="absolute -left-[21px] top-0.5 w-3 h-3 bg-indigo-500 rounded-full border border-white dark:border-slate-900 shadow"></span>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-white">Last Modified</p>
                <p className="text-[10px] text-slate-400">
                  {new Date(ad.updated_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Published Status Point */}
            <div className="relative">
              <span className={`absolute -left-[21px] top-0.5 w-3 h-3 rounded-full border border-white dark:border-slate-900 shadow ${
                isPublished ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}></span>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-white">
                  {isPublished ? 'Live Published' : 'Publication Status'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {isPublished ? 'Ad associated and published live.' : 'Awaiting live stream.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JSON Payloads Collapsible panel */}
      <div className="space-y-6">
        {/* Draft Payload JSON */}
        <div className="border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden bg-white dark:bg-white/[0.01]">
          <button
            onClick={() => setShowRawDraft(!showRawDraft)}
            className="w-full p-4 flex items-center justify-between font-bold text-xs hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-all"
          >
            <div className="flex items-center space-x-2">
              <Code className="w-4 h-4 text-blue-500" />
              <span>Raw Draft Payload JSON</span>
            </div>
            <span>{showRawDraft ? 'Collapse [-]' : 'Expand [+]'}</span>
          </button>
          {showRawDraft && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-white/5">
              <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto p-3 bg-white dark:bg-black/25 rounded-xl border border-slate-200/50 dark:border-white/5">
                {JSON.stringify(draftPayload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* LinkedIn Response Payload JSON */}
        <div className="border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden bg-white dark:bg-white/[0.01]">
          <button
            onClick={() => setShowRawResponse(!showRawResponse)}
            className="w-full p-4 flex items-center justify-between font-bold text-xs hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-all"
          >
            <div className="flex items-center space-x-2">
              <Code className="w-4 h-4 text-emerald-500" />
              <span>Raw LinkedIn Response / Publish Context JSON</span>
            </div>
            <span>{showRawResponse ? 'Collapse [-]' : 'Expand [+]'}</span>
          </button>
          {showRawResponse && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-white/5">
              <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto p-3 bg-white dark:bg-black/25 rounded-xl border border-slate-200/50 dark:border-white/5">
                {JSON.stringify(previewPayload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
