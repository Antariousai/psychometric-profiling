export function computeScore(answers, questions, dimensions) {
  const byDim = {};
  dimensions.forEach(d => { byDim[d.id] = { total: 0, max: 0, flags: [], raw: [] }; });
  const flags = [];

  questions.forEach(q => {
    const a = answers[q.id];
    if (!a) return;
    const dim = byDim[q.dim];
    let score, max;
    if (q.type === 'scale') {
      score = ((a.value - q.scale.min) / (q.scale.max - q.scale.min)) * 5;
      max = 5;
      if (q.socialDesirability && a.value === q.scale.max && a.ms < q.expectedMs * 0.5) {
        flags.push({
          q: q.id, type: 'social-desirability',
          bn: 'অনেক দ্রুত "সর্বোচ্চ" উত্তর', en: 'Max-score answered too fast',
        });
      }
    } else {
      const opt = q.options[a.value];
      score = opt ? opt.score : 0;
      max = 5;
      if (q.expectedMs && a.ms < q.expectedMs * 0.25) {
        flags.push({
          q: q.id, type: 'too-fast',
          bn: 'কঠিন প্রশ্নে অস্বাভাবিক দ্রুত উত্তর', en: 'Hard question answered suspiciously fast',
        });
      }
    }
    dim.total += score;
    dim.max += max;
    dim.raw.push({ q: q.id, score, a: a.value });
  });

  questions.forEach(q => {
    if (!q.consistencyPair) return;
    const a1 = answers[q.id];
    const a2 = answers[q.consistencyPair];
    if (!a1 || !a2) return;
    const q2 = questions.find(x => x.id === q.consistencyPair);
    const v1 = q.type === 'scale'
      ? a1.value / q.scale.max
      : (q.options[a1.value]?.score || 0) / 5;
    const v2 = q2.type === 'scale'
      ? a2.value / q2.scale.max
      : (q2.options[a2.value]?.score || 0) / 5;
    if (Math.abs(v1 - v2) > 0.55) {
      flags.push({
        q: q.id, pair: q.consistencyPair, type: 'inconsistent',
        bn: `প্রশ্ন ${q.id.slice(1)} ও ${q.consistencyPair.slice(1)}-এর উত্তর মিলছে না`,
        en: `Answers to Q${q.id.slice(1)} and Q${q.consistencyPair.slice(1)} don't match`,
      });
    }
  });

  const dimScores = dimensions.map(d => ({
    ...d,
    pct: byDim[d.id].max ? Math.round((byDim[d.id].total / byDim[d.id].max) * 100) : 0,
    raw: byDim[d.id].total,
    max: byDim[d.id].max,
  }));

  const totalPct = dimScores.reduce((s, d) => s + d.pct, 0) / dimScores.length;
  const flagPenalty = Math.min(flags.length * 15, 120);
  const overall = Math.max(0, Math.round(totalPct * 10 - flagPenalty));

  let rating, tenure, risk;
  if (overall >= 780) { rating = 'A'; tenure = 24; risk = 'Low'; }
  else if (overall >= 650) { rating = 'B'; tenure = 18; risk = 'Moderate'; }
  else if (overall >= 500) { rating = 'C'; tenure = 12; risk = 'Elevated'; }
  else { rating = 'D'; tenure = 9; risk = 'High'; }

  return { overall, rating, tenure, risk, flags, dimScores, totalPct };
}
