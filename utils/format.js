const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export const bn = (n) => String(n).replace(/[0-9]/g, d => BN_DIGITS[d]);

export const fmtTk = (n) => {
  const asNum = typeof n === 'number' ? n : Number(n);
  const grouped = asNum.toLocaleString('en-IN');
  return '৳ ' + bn(grouped);
};
