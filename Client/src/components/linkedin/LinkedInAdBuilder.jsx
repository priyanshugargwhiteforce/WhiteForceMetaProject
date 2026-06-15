import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdBuilderContext from '../../context/AdBuilderContext';
import AdCampaignStep from './AdCampaignStep';
import AdCreativeStep from './AdCreativeStep';
import AdFormatStep from './AdFormatStep';
import AdPreviewStep from './AdPreviewStep';
import AdReviewStep from './AdReviewStep';
import { ArrowLeft, Target, ChevronRight } from 'lucide-react';

const steps = [
  { component: AdCampaignStep, label: 'Campaign' },
  { component: AdCreativeStep, label: 'Creative' },
  { component: AdFormatStep, label: 'Format' },
  { component: AdPreviewStep, label: 'Preview' },
  { component: AdReviewStep, label: 'Review' },
];

export default function LinkedInAdBuilder() {
  const { draft, setDraft, lastSaved, isSaving } = useContext(AdBuilderContext);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const CurrentComponent = steps[currentStep].component;

  const next = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const back = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <button
            onClick={() => navigate('/linkedin-ads')}
            className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-bold transition-all mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Ad Library</span>
          </button>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center">
            <Target className="w-6 h-6 mr-2 text-blue-500" />
            LinkedIn Ad Builder
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create structured, production-ready LinkedIn ads step-by-step.
          </p>
        </div>

        {/* Save Status Banner */}
        <div className="flex flex-col items-end justify-center text-right select-none">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            {isSaving && (
              <span className="flex items-center space-x-1 text-blue-500 animate-pulse">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Autosaving...</span>
              </span>
            )}
            {lastSaved && !isSaving && (
              <span className="text-[10px] text-slate-400">
                Last saved at {lastSaved}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="grid grid-cols-5 gap-2 pb-2">
        {steps.map((s, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = currentStep > idx;

          return (
            <button
              key={s.label}
              onClick={() => setCurrentStep(idx)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-500 bg-blue-500/5 text-blue-500 dark:text-blue-400 font-extrabold'
                  : isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-slate-200 dark:border-white/5 bg-transparent text-slate-400 dark:text-slate-500 font-medium'
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Wizard Step Panels */}
      <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
        <CurrentComponent />
        
        {/* Navigation Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-between">
          {currentStep > 0 ? (
            <button
              onClick={back}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all"
            >
              Back
            </button>
          ) : (
            <div></div>
          )}
          {currentStep < steps.length - 1 && (
            <button
              onClick={next}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
