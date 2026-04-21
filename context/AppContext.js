import React, { createContext, useContext, useEffect, useState } from 'react';
import { load, save, clearAll, K } from '../utils/storage';

const AppCtx = createContext(null);

const DEFAULT_TWEAKS = { offline: false, trainingMode: false };

export function AppProvider({ children }) {
  const [applicantId, setApplicantIdState] = useState('nasrin');
  const [answers, setAnswersState] = useState({});
  const [tweaks, setTweaksState] = useState(DEFAULT_TWEAKS);
  const [showFreya, setShowFreya] = useState(false);
  const [currentQContext, setCurrentQContext] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [profilePhoto, setProfilePhotoState] = useState(null);
  const [decisions, setDecisionsState] = useState([]);

  useEffect(() => {
    (async () => {
      const [a, ans, tw, photo, decs] = await Promise.all([
        load(K.applicant, 'nasrin'),
        load(K.answers, {}),
        load(K.tweaks, DEFAULT_TWEAKS),
        load(K.profilePhoto, null),
        load(K.decisions, []),
      ]);
      setApplicantIdState(a);
      setAnswersState(ans || {});
      setTweaksState({ ...DEFAULT_TWEAKS, ...(tw || {}) });
      setProfilePhotoState(photo);
      setDecisionsState(decs || []);
      setHydrated(true);
    })();
  }, []);

  const setApplicant = (id) => { setApplicantIdState(id); save(K.applicant, id); };
  const setAnswers = (next) => {
    const value = typeof next === 'function' ? next(answers) : next;
    setAnswersState(value);
    save(K.answers, value);
  };
  const setTweaks = (patch) => {
    const value = { ...tweaks, ...patch };
    setTweaksState(value);
    save(K.tweaks, value);
  };
  const setProfilePhoto = (uri) => {
    setProfilePhotoState(uri);
    save(K.profilePhoto, uri);
  };

  const addDecision = (entry) => {
    setDecisionsState(prev => {
      const next = [entry, ...prev];
      save(K.decisions, next);
      return next;
    });
  };
  const openFreya = () => setShowFreya(true);
  const closeFreya = () => setShowFreya(false);

  const resetAll = async () => {
    await clearAll();
    setApplicantIdState('nasrin');
    setAnswersState({});
    setTweaksState(DEFAULT_TWEAKS);
  };

  const pendingSync = tweaks.offline && Object.keys(answers).length > 0
    ? Math.min(Object.keys(answers).length, 9)
    : 0;

  const value = {
    applicantId, setApplicant,
    answers, setAnswers,
    tweaks, setTweaks,
    showFreya, openFreya, closeFreya,
    currentQContext, setCurrentQContext,
    pendingSync, hydrated, resetAll,
    profilePhoto, setProfilePhoto,
    decisions, addDecision,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
