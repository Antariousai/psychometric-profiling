import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { load, save, clearAll, K } from '../utils/storage';
import { DIMENSIONS as DEFAULT_DIMENSIONS } from '../data/dimensions';
import { PERSONAS, BLANK_APPLICANT, coerceApplicantProfile } from '../data/personas';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchPsychometricDimensions, fetchApplicantProfileBySlug } from '../services/psympSupabase';

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
  const [assessmentSessionId, setAssessmentSessionIdState] = useState(null);
  const [assessmentApplicantUuid, setAssessmentApplicantUuidState] = useState(null);
  const [assessmentQuestions, setAssessmentQuestionsState] = useState(null);
  const [dimensions, setDimensionsState] = useState(DEFAULT_DIMENSIONS);
  const [remoteApplicant, setRemoteApplicant] = useState(null);
  const [applicantDraft, setApplicantDraft] = useState(null);
  const applicantIdRef = useRef(applicantId);

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

  useEffect(() => {
    if (applicantIdRef.current !== applicantId) {
      applicantIdRef.current = applicantId;
      setApplicantDraft(null);
    }
  }, [applicantId]);

  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      if (!isSupabaseConfigured) return;
      try {
        const d = await fetchPsychometricDimensions();
        if (Array.isArray(d) && d.length > 0) setDimensionsState(d);
      } catch (e) {
        console.warn('[App] dimensions fetch', e?.message || e);
      }
    })();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isSupabaseConfigured) {
      setRemoteApplicant(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = await fetchApplicantProfileBySlug(applicantId);
        if (cancelled) return;
        if (row?.profile && typeof row.profile === 'object') {
          setRemoteApplicant({ slug: row.slug ?? applicantId, profile: row.profile });
        } else {
          setRemoteApplicant(null);
        }
      } catch (e) {
        if (!cancelled) setRemoteApplicant(null);
      }
    })();
    return () => { cancelled = true; };
  }, [hydrated, applicantId]);

  const rawApplicant = useMemo(() => {
    const bundled = PERSONAS[applicantId]
      ? { ...PERSONAS[applicantId] }
      : { ...BLANK_APPLICANT, id: applicantId };
    let base = { ...bundled };
    if (remoteApplicant?.slug === applicantId && remoteApplicant.profile) {
      base = { ...base, ...remoteApplicant.profile };
    }
    if (applicantDraft && typeof applicantDraft === 'object') {
      base = { ...base, ...applicantDraft };
    }
    return base;
  }, [applicantId, remoteApplicant, applicantDraft]);

  const applicant = useMemo(
    () => coerceApplicantProfile(rawApplicant),
    [rawApplicant],
  );

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
    setAssessmentSessionIdState(null);
    setAssessmentApplicantUuidState(null);
    setAssessmentQuestionsState(null);
    setRemoteApplicant(null);
    setApplicantDraft(null);
  };

  const pendingSync = tweaks.offline && Object.keys(answers).length > 0
    ? Math.min(Object.keys(answers).length, 9)
    : 0;

  const value = {
    applicantId, applicant, setApplicant,
    applicantDraft, setApplicantDraft,
    answers, setAnswers,
    tweaks, setTweaks,
    showFreya, openFreya, closeFreya,
    currentQContext, setCurrentQContext,
    pendingSync, hydrated, resetAll,
    profilePhoto, setProfilePhoto,
    decisions, addDecision,
    assessmentSessionId,
    setAssessmentSessionId: setAssessmentSessionIdState,
    assessmentApplicantUuid,
    setAssessmentApplicantUuid: setAssessmentApplicantUuidState,
    assessmentQuestions,
    setAssessmentQuestions: setAssessmentQuestionsState,
    dimensions,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
