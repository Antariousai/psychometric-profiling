/**
 * Dimension weights must sum to 1.0.
 * financial + resilience are highest-weighted for microfinance default-risk.
 * Change weights here (or override from DB) — scoring picks them up automatically.
 */
export const DIMENSIONS = [
  { id: 'entrepreneurial', bn: 'উদ্যোগী মানসিকতা', en: 'Entrepreneurial Spirit', color: '#2EC4B6', icon: '◆', weight: 0.14 },
  { id: 'risk',            bn: 'ঝুঁকি নেওয়ার ক্ষমতা', en: 'Risk Appetite',         color: '#B5874F', icon: '◈', weight: 0.12 },
  { id: 'financial',       bn: 'আর্থিক শৃঙ্খলা',      en: 'Financial Discipline',  color: '#16A34A', icon: '◉', weight: 0.22 },
  { id: 'social',          bn: 'সামাজিক পুঁজি',       en: 'Social Capital',        color: '#7B2D8B', icon: '◎', weight: 0.10 },
  { id: 'business',        bn: 'ব্যবসায়িক জ্ঞান',    en: 'Business Knowledge',    color: '#0284C7', icon: '◍', weight: 0.16 },
  { id: 'resilience',      bn: 'সহনশীলতা',            en: 'Resilience',            color: '#D97706', icon: '◐', weight: 0.18 },
  { id: 'motivation',      bn: 'অনুপ্রেরণা',          en: 'Motivation',            color: '#E04F4F', icon: '◑', weight: 0.08 },
];
