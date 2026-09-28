/** Feature flags for PROTTOY path (Expo public). */

export function isProttoyBankEnabled() {
  return String(process.env.EXPO_PUBLIC_PROTTOY_BANK || '').toLowerCase() === 'true';
}

export function allowClientResultSnapshot() {
  return String(process.env.EXPO_PUBLIC_ALLOW_CLIENT_RESULT_SNAPSHOT || '').toLowerCase() === 'true';
}

export const PROTTOY_CATEGORIES = [
  { code: 'JAG', bn: 'জাগরণ', en: 'Jagoron' },
  { code: 'AGR', bn: 'আগ্রসর', en: 'Agrosor' },
  { code: 'SUF', bn: 'সুফলন', en: 'Sufolon' },
  { code: 'BUN', bn: 'বুনিয়াদ', en: 'Buniad' },
];

export const MANAGER_ROLES = new Set([
  'BRANCH_MANAGER',
  'CREDIT_COMMITTEE',
  'PO_ADMIN',
  'PKSF_GOVERNANCE',
  'PSYCHOMETRICIAN',
  'SYS_ADMIN',
  'AUDITOR',
]);

export function normalizeStaffRole(role) {
  if (!role) return 'FIELD_OFFICER';
  const r = String(role).trim().toUpperCase().replace(/\s+/g, '_');
  if (r === 'LOAN_OFFICER' || r === 'LOANOFFICER') return 'FIELD_OFFICER';
  return r;
}

export function isManagerRole(role) {
  return MANAGER_ROLES.has(normalizeStaffRole(role));
}

export const ANTARIOUS_ROLES = new Set(['PSYCHOMETRICIAN', 'SYS_ADMIN']);

export function isAntariousRole(role) {
  return ANTARIOUS_ROLES.has(normalizeStaffRole(role));
}
