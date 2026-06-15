import React, { createContext, useState, useEffect } from 'react';
import { getAdDetail, listAds, saveDraft, publishAd, pauseAd, resumeAd } from '../services/adBuilder.service';

const AdBuilderContext = createContext();

export const AdBuilderProvider = ({ children }) => {
  const [draft, setDraft] = useState(() => {
    const saved = localStorage.getItem('linkedinAdDraft');
    return saved ? JSON.parse(saved) : {};
  });
  const [ads, setAds] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lastSaved, setLastSaved] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Expose triggerSaveDraft to manually save (e.g. on blur)
  const triggerSaveDraft = async (currentDraft) => {
    if (!currentDraft || !Object.keys(currentDraft).length) return;
    setIsSaving(true);
    try {
      const result = await saveDraft(currentDraft);
      if (result && result.success && result.draftId) {
        setDraft(prev => {
          if (prev.draftId !== result.draftId) {
            const updated = { ...prev, draftId: result.draftId };
            localStorage.setItem('linkedinAdDraft', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
        setLastSaved(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Draft save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Autosave draft (debounced to 20 seconds)
  useEffect(() => {
    if (!Object.keys(draft).length) return;
    const handler = setTimeout(() => {
      triggerSaveDraft(draft);
    }, 20000);
    return () => clearTimeout(handler);
  }, [draft]);

  const loadMoreAds = async (targetPage) => {
    const activePage = targetPage !== undefined ? targetPage : page;
    try {
      const newAds = await listAds(activePage, 20);
      setAds(prev => (activePage === 1 ? newAds : [...prev, ...newAds]));
      setPage(activePage + 1);
      if (newAds.length < 20) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (err) {
      console.error('Failed to list ads:', err);
    }
  };

  const refreshAds = async () => {
    setHasMore(true);
    await loadMoreAds(1);
  };

  const contextValue = {
    draft,
    setDraft,
    ads,
    loadMoreAds,
    hasMore,
    refreshAds,
    getAdDetail,
    publishAd,
    lastSaved,
    isSaving,
    triggerSaveDraft,
    pauseAd,
    resumeAd,
  };

  return (
    <AdBuilderContext.Provider value={contextValue}>
      {children}
    </AdBuilderContext.Provider>
  );
};

export default AdBuilderContext;
