import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdBuilderContext from '../../context/AdBuilderContext';
import { ClipboardCheck, CheckCircle2, AlertTriangle, ShieldAlert, Save, Send } from 'lucide-react';

export default function AdReviewStep() {
  const { draft, publishAd, triggerSaveDraft, isSaving } = useContext(AdBuilderContext);
  const navigate = useNavigate();
  
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(null);
  const [publishError, setPublishError] = useState(null);
  
  // Client validation checks
  const warnings = [];
  if (!draft.adName) warnings.push('Ad Name is missing.');
  if (!draft.accountId) warnings.push('Ad Account has not been selected.');
  if (!draft.campaignId) warnings.push('Target Campaign has not been selected.');
  if (!draft.creativeId) warnings.push('Ad Creative has not been selected.');
  if (!draft.adFormat) warnings.push('Ad Format has not been selected.');
  if (draft.creativeId && !draft.creativeUrn) {
    warnings.push('The selected Creative is a local draft and lacks a creative_urn. Publishing live will fail.');
  }

  const handleManualSave = async () => {
    await triggerSaveDraft(draft);
    alert('Draft saved successfully!');
  };

  const handlePublish = async () => {
    if (!draft.draftId) {
      setPublishError({
        message: 'Please save the draft before publishing.'
      });
      return;
    }
    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);
    try {
      const response = await publishAd({ draftId: draft.draftId });
      if (response.success) {
        setPublishSuccess(response);
        localStorage.removeItem('linkedinAdDraft'); // clear draft on success
      } else {
        setPublishError(response);
      }
    } catch (err) {
      console.error('Publish error:', err);
      setPublishError({
        code: 'NETWORK_ERROR',
        message: 'A network error occurred while publishing.'
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex items-center space-x-2 text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5">
        <ClipboardCheck className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-bold">Review & Publish</h3>
      </div>

      {/* Summary Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Configuration Details</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1">
              <span className="text-slate-500">Ad Name:</span>
              <span className="font-semibold text-slate-800 dark:text-white">{draft.adName || 'Not Set'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1">
              <span className="text-slate-500">Ad Account ID:</span>
              <span className="font-semibold text-slate-800 dark:text-white">{draft.accountId || 'Not Set'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1">
              <span className="text-slate-500">Campaign ID:</span>
              <span className="font-semibold text-slate-800 dark:text-white">{draft.campaignId || 'Not Set'}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500">Ad Format:</span>
              <span className="font-semibold text-slate-800 dark:text-white">{draft.adFormat || 'Not Set'}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Associated Creative</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1">
              <span className="text-slate-500">Creative ID:</span>
              <span className="font-semibold text-slate-800 dark:text-white">{draft.creativeId || 'Not Set'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1">
              <span className="text-slate-500">Headline:</span>
              <span className="font-semibold text-slate-800 dark:text-white truncate max-w-[180px]">{draft.creativeHeadline || 'Not Set'}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500">Creative URN:</span>
              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                {draft.creativeUrn || 'No URN (Local Draft)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings & Alerts */}
      {warnings.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Validation Warnings ({warnings.length})</span>
          </div>
          <ul className="list-disc pl-5 text-[11px] font-medium space-y-1">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Backend Unconfirmed Block Warning */}
      {publishError && publishError.code === 'LINKEDIN_AD_PUBLISH_ENDPOINT_UNCONFIRMED' && (
        <div className="p-5 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-[2rem] space-y-3 shadow-md shadow-red-500/5 animate-in fade-in duration-300">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5 text-red-500" />
            <div className="space-y-1.5">
              <h4 className="text-sm font-extrabold uppercase tracking-wide">Publish Stream Blocked</h4>
              <p className="text-xs leading-relaxed font-semibold">
                {publishError.message}
              </p>
              <div className="text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400/90 py-1 px-3.5 rounded-xl border border-red-500/10 w-fit select-all">
                Code: {publishError.code}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generic Publish Error */}
      {publishError && publishError.code !== 'LINKEDIN_AD_PUBLISH_ENDPOINT_UNCONFIRMED' && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl space-y-1.5">
          <p className="text-xs font-extrabold flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
            <span>Publish Failed ({publishError.code || 'ERROR'})</span>
          </p>
          <p className="text-xs font-semibold">{publishError.message || 'An error occurred during publishing.'}</p>
        </div>
      )}

      {/* Publish Success */}
      {publishSuccess && (
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-[2rem] space-y-2">
          <div className="flex items-center space-x-2 text-sm font-extrabold">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>Ad Published Successfully!</span>
          </div>
          <div className="text-xs space-y-1 font-semibold">
            {publishSuccess.simulated && (
              <p className="text-blue-500 font-bold bg-blue-500/10 border border-blue-500/15 py-1 px-2.5 rounded-lg w-fit text-[10px]">
                Simulated Success (Live API bypassed)
              </p>
            )}
            <p>
              URN: <span className="font-mono font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded text-[11px] select-all">{publishSuccess.adUrn}</span>
            </p>
          </div>
          <button
            onClick={() => navigate('/linkedin-ads')}
            className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 underline"
          >
            Go to Library
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 border-t border-slate-100 dark:border-white/5 pt-4">
        <button
          onClick={handleManualSave}
          disabled={isSaving || publishing}
          className="flex items-center space-x-1 px-4 py-2 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all disabled:opacity-40"
        >
          <Save className="w-4 h-4 mr-1" />
          <span>Save Draft</span>
        </button>

        <button
          onClick={handlePublish}
          disabled={publishing || warnings.length > 0 || !draft.draftId}
          className="flex items-center space-x-1.5 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4 mr-1" />
          <span>{publishing ? 'Publishing...' : 'Publish to LinkedIn'}</span>
        </button>
      </div>
    </div>
  );
}
