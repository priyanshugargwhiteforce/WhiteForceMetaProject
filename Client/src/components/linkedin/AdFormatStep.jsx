import React, { useContext } from 'react';
import AdBuilderContext from '../../context/AdBuilderContext';
import { Columns, Image, Video, Layers, AlertCircle } from 'lucide-react';

export default function AdFormatStep() {
  const { draft, setDraft, triggerSaveDraft } = useContext(AdBuilderContext);

  const formats = [
    {
      id: 'SINGLE_IMAGE',
      label: 'Single Image Ad',
      description: 'Create an ad with one image displaying directly in the member feed.',
      icon: Image,
      compatibleTypes: ['SINGLE_IMAGE']
    },
    {
      id: 'VIDEO',
      label: 'Video Ad',
      description: 'Deliver rich-media video content designed to drive engagement.',
      icon: Video,
      compatibleTypes: ['VIDEO']
    },
    {
      id: 'CAROUSEL',
      label: 'Carousel Ad',
      description: 'Tell a story with two or more scrollable cards in a single ad.',
      icon: Layers,
      compatibleTypes: ['CAROUSEL']
    }
  ];

  const handleSelectFormat = (formatId) => {
    setDraft(prev => {
      const updated = { ...prev, adFormat: formatId };
      localStorage.setItem('linkedinAdDraft', JSON.stringify(updated));
      return updated;
    });
    triggerSaveDraft({ ...draft, adFormat: formatId });
  };

  const selectedCreativeType = draft.creativeType;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center space-x-2 text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5">
        <Columns className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-bold">Select Ad Format</h3>
      </div>

      {selectedCreativeType ? (
        <div className="p-3 text-xs font-semibold text-blue-500 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Selected creative type: <strong>{selectedCreativeType}</strong>. Compatible formats are highlighted below.
          </span>
        </div>
      ) : (
        <div className="p-3 text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Warning: No creative has been selected. All formats are enabled, but selection may lock after choosing a creative.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {formats.map(fmt => {
          const IconComponent = fmt.icon;
          const isSelected = draft.adFormat === fmt.id;
          
          // If a creative is selected, we disable this format if the creative's type is not in compatibleTypes list
          const isDisabled = selectedCreativeType && !fmt.compatibleTypes.includes(selectedCreativeType);

          return (
            <button
              key={fmt.id}
              onClick={() => !isDisabled && handleSelectFormat(fmt.id)}
              disabled={isDisabled}
              className={`flex flex-col items-center justify-center p-6 border rounded-[2rem] text-center transition-all cursor-pointer select-none outline-none ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/[0.03] text-blue-600 dark:text-blue-400 font-extrabold shadow-md shadow-blue-500/5'
                  : isDisabled
                    ? 'border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.005] text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                    : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.01] hover:border-slate-300 dark:hover:border-white/10 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className={`p-4 rounded-full mb-4 ${
                isSelected
                  ? 'bg-blue-500/10 text-blue-500'
                  : isDisabled
                    ? 'bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-slate-600'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
              }`}>
                <IconComponent className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold mb-1">{fmt.label}</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                {fmt.description}
              </p>
              
              {isDisabled && (
                <span className="mt-3 text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 px-2 py-0.5 rounded">
                  Incompatible
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
