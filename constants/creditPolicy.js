/**
 * Credit policy rules keyed by psychometric rating.
 * Edit here (or mirror in DB) to change loan amounts, tenures, or interest rates
 * without touching UI code.
 */
export const CREDIT_POLICY = {
  A: { loanFactor: 1.00, tenureMonths: 24, risk: 'Low',      interestRate: 0.18 },
  B: { loanFactor: 0.85, tenureMonths: 18, risk: 'Moderate', interestRate: 0.18 },
  C: { loanFactor: 0.60, tenureMonths: 12, risk: 'Elevated', interestRate: 0.20 },
  D: { loanFactor: 0.35, tenureMonths:  9, risk: 'High',     interestRate: 0.24 },
};

/**
 * Given a rating and requested loan amount, return recommended amounts + EMI.
 * @param {string} rating - 'A' | 'B' | 'C' | 'D'
 * @param {number} loanAsk - applicant's requested amount in BDT
 * @returns {{ recLoanAmt: number, tenure: number, emi: number, interestRate: number }}
 */
export function calcLoanRecommendation(rating, loanAsk) {
  const policy = CREDIT_POLICY[rating] ?? CREDIT_POLICY.D;
  const recLoanAmt = Math.round(loanAsk * policy.loanFactor);
  const totalRepayable = recLoanAmt * (1 + policy.interestRate);
  const emi = Math.round(totalRepayable / policy.tenureMonths);
  return {
    recLoanAmt,
    tenure: policy.tenureMonths,
    emi,
    interestRate: policy.interestRate,
  };
}
