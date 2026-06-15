import React, { useContext, useState } from 'react';
import AdBuilderContext from '../../context/AdBuilderContext';
import { Eye, Monitor, Smartphone, ThumbsUp, MessageSquare, Repeat, Send, Globe, ExternalLink } from 'lucide-react';

export default function AdPreviewStep() {
  const { draft } = useContext(AdBuilderContext);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' or 'sponsored'
  const [device, setDevice] = useState('desktop'); // 'desktop' or 'mobile'

  const headline = draft.creativeHeadline || 'Your Creative Headline';
  const description = draft.creativeDescription || 'This is where your primary ad caption and description will appear. Connect with your audience on LinkedIn.';
  const destinationUrl = draft.destinationUrl || 'https://example.com';
  const format = draft.adFormat || 'SINGLE_IMAGE';

  // Get domain name for mock CTA display
  let domain = 'example.com';
  try {
    const urlObj = new URL(destinationUrl);
    domain = urlObj.hostname;
  } catch (e) {}

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center space-x-2 text-slate-800 dark:text-white">
          <Eye className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold">Interactive Ad Preview</h3>
        </div>
        {/* Device Controls */}
        <div className="flex space-x-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          <button
            onClick={() => setDevice('desktop')}
            className={`p-2 rounded-lg transition-all ${device === 'desktop' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500'}`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`p-2 rounded-lg transition-all ${device === 'mobile' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500'}`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-100 dark:border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('feed')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'feed'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          LinkedIn Feed View
        </button>
        <button
          onClick={() => setActiveTab('sponsored')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'sponsored'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Sponsored Preview Only
        </button>
      </div>

      {/* Preview Container */}
      <div className="flex justify-center p-6 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem]">
        <div
          className={`bg-white dark:bg-[#1d2226] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-slate-800 dark:text-[#e1e9ee] shadow-lg transition-all ${
            device === 'mobile' ? 'max-w-[360px] w-full' : 'max-w-[550px] w-full'
          }`}
        >
          {/* Header section (LinkedIn Post Style) */}
          <div className="p-4 flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white text-base select-none shrink-0 shadow-inner">
              IN
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <span className="font-extrabold text-sm hover:underline cursor-pointer truncate">
                  {draft.accountId ? `Ad Account ${draft.accountId}` : 'LinkedIn Sponsor'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">1,234,567 followers</p>
              <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                <span>Promoted</span>
                <span>•</span>
                <Globe className="w-3 h-3 inline-block" />
              </div>
            </div>
          </div>

          {/* Ad Primary Caption Text */}
          <div className="px-4 pb-3 text-xs leading-relaxed break-words">
            {description}
          </div>

          {/* Ad Creative Mock Representation */}
          <div className="relative border-t border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center overflow-hidden min-h-[220px]">
            {format === 'SINGLE_IMAGE' && (
              <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-white text-center space-y-2 relative select-none">
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]"></div>
                <div className="relative z-10 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-2 py-0.5 rounded">Mock Image Asset</span>
                  <h5 className="font-black text-sm">{headline}</h5>
                </div>
              </div>
            )}

            {format === 'VIDEO' && (
              <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center bg-gradient-to-tr from-slate-800 to-slate-900 text-white text-center p-6 space-y-4 relative select-none">
                <div className="w-14 h-14 bg-black/40 border border-white/20 rounded-full flex items-center justify-center hover:scale-105 transition-all cursor-pointer">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-white ml-1"></div>
                </div>
                <div className="text-[10px] text-slate-400 absolute bottom-3 left-4 flex items-center space-x-2">
                  <span>0:30</span>
                  <span className="w-24 h-1 bg-white/20 rounded-full overflow-hidden">
                    <span className="block w-4 h-full bg-blue-500"></span>
                  </span>
                </div>
                <span className="text-[9px] uppercase font-bold tracking-wider bg-white/10 px-2 py-0.5 rounded absolute top-3 right-4">
                  Video Preview
                </span>
              </div>
            )}

            {format === 'CAROUSEL' && (
              <div className="w-full py-4 px-4 overflow-x-auto flex space-x-3 select-none">
                {[1, 2].map(i => (
                  <div key={i} className="min-w-[180px] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#1d2226] shrink-0 shadow-sm">
                    <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black">
                      Card {i}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-[10px] font-bold truncate">{headline} - Card {i}</p>
                      <p className="text-[9px] text-slate-400 truncate">{domain}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA Headline Banner (LinkedIn CTA style) */}
          <div className="p-3 bg-slate-50 dark:bg-[#1d2226] flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div className="min-w-0 pr-3">
              <span className="text-[10px] uppercase text-slate-400 font-semibold truncate block">
                {domain}
              </span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-white truncate block">
                {headline}
              </span>
            </div>
            <button className="px-4 py-1.5 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500/10 rounded-full font-bold text-xs shrink-0 transition-all flex items-center space-x-1">
              <span>Learn More</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* LinkedIn Feed Interactions */}
          {activeTab === 'feed' && (
            <div className="px-4 py-2 bg-white dark:bg-[#1d2226] flex justify-between text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button className="flex items-center space-x-1.5 py-1 px-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all font-semibold">
                <ThumbsUp className="w-4 h-4" />
                <span className="hidden sm:inline">Like</span>
              </button>
              <button className="flex items-center space-x-1.5 py-1 px-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all font-semibold">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Comment</span>
              </button>
              <button className="flex items-center space-x-1.5 py-1 px-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all font-semibold">
                <Repeat className="w-4 h-4" />
                <span className="hidden sm:inline">Repost</span>
              </button>
              <button className="flex items-center space-x-1.5 py-1 px-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all font-semibold">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
