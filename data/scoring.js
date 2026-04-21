// Per-question explanation when answered suspiciously fast
const TOO_FAST_NOTES = {
  q1: {
    bn: 'প্রতিযোগী এলে কী করবেন — এটা ব্যবহারিক সিদ্ধান্ত যা ভেবে নেওয়া দরকার। এত দ্রুত উত্তর মানে হয়তো বাস্তবে এই পরিস্থিতির মুখোমুখি হননি।',
    en: 'A real business judgment that needs thought — fast answer suggests they may never have faced this situation.',
  },
  q3: {
    bn: '৩ বছরে কতটি আয়ের উৎস সামলেছেন — মনে করে গোনার বিষয়। দ্রুত উত্তর মানে সংখ্যাটি আন্দাজে বলেছেন, বাস্তব নাও হতে পারে।',
    en: 'Counting real income sources takes a moment of recall. Fast answer likely means the number was guessed, not remembered.',
  },
  q4: {
    bn: 'নিশ্চিত আয় বনাম ব্যবসা বৃদ্ধি — কঠিন পছন্দ, সাধারণত একটু দ্বিধা থাকে। তাৎক্ষণিক উত্তর হয়তো প্রশ্নটি ঠিকমতো বোঝেননি।',
    en: 'This trade-off normally causes hesitation. Instant answer suggests the question was not fully processed.',
  },
  q5: {
    bn: '৫০,০০০ টাকার বিনিয়োগ সিদ্ধান্ত — স্বাভাবিকভাবেই একটু সতর্ক থাকা দরকার। দ্রুত উত্তর আর্থিক বিচারক্ষমতা নিয়ে প্রশ্ন তোলে।',
    en: 'A 50,000 tk investment decision warrants careful thought. Quick response raises questions about financial judgment.',
  },
  q7: {
    bn: 'ঋণের টাকা কতটা ঝুঁকিতে দেবেন — গুরুত্বপূর্ণ সিদ্ধান্ত। এত দ্রুত উত্তর মানে ঝুঁকির বিষয়টি গুরুত্বের সাথে নেননি।',
    en: 'How much of a loan to risk is a serious decision — fast answer suggests the stakes were not considered.',
  },
  q8: {
    bn: 'এটি একটি গাণিতিক হিসাবের প্রশ্ন — মাথায় করলে সময় লাগে। এত দ্রুত উত্তর মানে হিসাব না করে আন্দাজে বলেছেন। সাক্ষাৎকারে হিসাবটি মুখে করিয়ে দেখুন।',
    en: 'A profit-margin calculation takes mental effort. Fast answer almost certainly means it was guessed — ask them to calculate aloud during the interview.',
  },
  q10: {
    bn: 'গত ৬ মাসের কিস্তি ইতিহাস মনে করতে একটু সময় লাগার কথা। দ্রুত "কখনো না" বলা মানে হয়তো সত্যিকারের ইতিহাস লুকানো হচ্ছে।',
    en: 'Recalling 6 months of payment history takes a moment. Instant "never" may mean real history is being suppressed.',
  },
  q11: {
    bn: 'জরুরি ৫,০০০ টাকার উৎস — নিজের আর্থিক অবস্থা মাথায় রেখে ভাবার বিষয়। দ্রুত উত্তর বাস্তব পরিকল্পনার পরিবর্তে "ভালো উত্তর" দেওয়ার ইঙ্গিত।',
    en: 'Emergency planning requires thinking about actual finances — fast answer suggests a socially acceptable response, not a real plan.',
  },
  q13: {
    bn: 'কোন কোন সংগঠনে আছেন — স্বাভাবিকভাবে মনে করতে হয়। দ্রুত উত্তর মানে দাবিকৃত সদস্যতা সত্যিকারের নাও হতে পারে।',
    en: 'Recalling group memberships requires a moment. Fast answer suggests the claimed memberships may not be real.',
  },
  q14: {
    bn: 'পরিচিত গ্রাহকের অনুপাত অনুমান করতে সময় লাগে। দ্রুত "বেশিরভাগ" বা "সবাই" বলা দীর্ঘমেয়াদী সম্পর্কের দাবি প্রশ্নবিদ্ধ করে।',
    en: 'Estimating customer relationships takes thought — fast "most" or "all" may be inflated.',
  },
  q15: {
    bn: 'দৈনিক লাভ × ৩০ দিন — মাথায় করতে সময় লাগে। এত দ্রুত উত্তর মানে হিসাব না করে আন্দাজে বলেছেন। সাক্ষাৎকারে মুখে করিয়ে দেখুন।',
    en: 'Multiplying daily profit by 30 days takes mental effort — fast answer almost certainly means the math was not done. Ask them to calculate aloud.',
  },
  q16: {
    bn: 'দাম কীভাবে ঠিক করেন — ব্যবসায়িক প্রক্রিয়া বলার প্রশ্ন। দ্রুত উত্তর হয়তো বাস্তব পদ্ধতি নয়, শুনতে ভালো লাগে এমন উত্তর।',
    en: 'Explaining a pricing process requires reflection — quick answer may describe what sounds good, not what they actually do.',
  },
  q17: {
    bn: 'বিক্রির তথ্য কীভাবে রাখেন — নিজের অভ্যাস বলার প্রশ্ন। দ্রুত উত্তর মানে হয়তো আসলে কোনো পদ্ধতিগত ট্র্যাকিং নেই।',
    en: 'Explaining a sales-tracking habit requires genuine recall — fast answer may mean no real system exists.',
  },
  q18: {
    bn: 'পুঁজি আর মুনাফার পার্থক্য বুঝে বলতে হয়, অনুমান করা যায় না। দ্রুত সঠিক উত্তর মানে হয় সত্যিই জানেন, অথবা সৌভাগ্যক্রমে সঠিক — সাক্ষাৎকারে নিশ্চিত করুন।',
    en: 'Understanding capital vs profit requires real comprehension. Fast correct answer means genuine knowledge or a lucky guess — probe to confirm.',
  },
  q19: {
    bn: 'গত ২ বছরের সবচেয়ে বড় ধাক্কা মনে করতে সময় লাগার কথা। দ্রুত "কোনো ধাক্কা হয়নি" বলা সন্দেহজনক — জীবনের কঠিন সময় লুকানো হচ্ছে কিনা যাচাই করুন।',
    en: 'Recalling the biggest setback in 2 years requires reflection. Instant "no setback" is suspicious — verify if real difficulties are being concealed.',
  },
  q20: {
    bn: 'কত দিনে ঘুরে দাঁড়িয়েছেন — নির্দিষ্ট অভিজ্ঞতা মনে করার বিষয়। দ্রুত উত্তর মানে অনুমান করছেন, আসলে মনে নেই।',
    en: 'Recovery time requires recalling a specific experience — fast answer suggests estimation, not genuine recall.',
  },
  q22: {
    bn: 'ঋণের প্রথম লক্ষ্য — ঋণ নিতে আসা মানুষের এটা জেনে আসার কথা। দ্রুত উত্তর হয়তো আসল পরিকল্পনা নয়, সঠিক শোনায় এমন কথা।',
    en: 'A loan applicant should know their first goal. Fast answer may be what sounds responsible, not an actual plan.',
  },
  q23: {
    bn: '৫ বছরের পরিকল্পনা নিয়ে যাদের চিন্তা আছে তারা একটু ভাবে। দ্রুত উত্তর মানে হয়তো দীর্ঘমেয়াদী কোনো আসল পরিকল্পনা নেই।',
    en: 'People with real plans pause to think before answering this. Fast answer suggests the stated goal is not a genuine aspiration.',
  },
  q25: {
    bn: 'সাপ্তাহে কত ঘণ্টা কাজ করেন — মনে করে হিসাব করার বিষয়। দ্রুত "৪০-৬০ ঘণ্টা" বলা মানে হয়তো বাস্তব কাজের ধরন ভিন্ন।',
    en: 'Calculating weekly work hours takes a moment. Quick high-hour claim may not reflect actual work patterns.',
  },
};

// Per-question explanation when max-scale selected too fast (social desirability)
const SOCIAL_NOTES = {
  q2: {
    bn: '"নতুন জিনিস সবার আগে চেষ্টা করি" — এটা উদ্যোক্তাসুলভ শোনায়, তাই দ্রুত সর্বোচ্চ সম্মতি দেওয়া সহজ। সত্যিকারের একটা উদাহরণ জিজ্ঞেস করে যাচাই করুন।',
    en: '"Always first to try new things" sounds entrepreneurial — easy to select instantly. Ask for a concrete real example to verify.',
  },
  q9: {
    bn: '"প্রতি মাসে সঞ্চয় করি" — সামাজিকভাবে প্রত্যাশিত উত্তর, যে কেউ দায়িত্বশীল দেখাতে এটা বলবেন। কিস্তির ইতিহাস (প্রশ্ন ১০) দিয়ে এই দাবি মিলিয়ে দেখুন।',
    en: '"I save monthly" is the most responsible-sounding answer. Cross-check against installment payment history (Q10).',
  },
  q21: {
    bn: '"কঠিন সময়েও হাল ছাড়ি না" — সবার কাছে "সঠিক" উত্তর, তাই না ভেবেই বলা হয়। একটু বিরতি না নিয়ে সর্বোচ্চ সম্মতি মানে গভীরভাবে ভাবেননি।',
    en: '"Never give up" is universally the expected answer — maximum agreement without pause means it was not reflected upon.',
  },
  q24: {
    bn: '"পরিবারের জন্য কঠোর পরিশ্রম করতে রাজি" — সবচেয়ে ভালো শোনায়, তাই স্বয়ংক্রিয়ভাবে বলা হয়। সাপ্তাহিক কাজের ঘণ্টা (প্রশ্ন ২৫) দিয়ে এই দাবি যাচাই করুন।',
    en: '"Willing to work hard for family" is the most desirable answer. Cross-verify with actual weekly hours worked (Q25).',
  },
};

// Explanation for each specific inconsistency pair
const INCONSISTENCY_NOTES = {
  'q6-q4': {
    bn: 'ঝুঁকি নিতে সবসময় রাজি বলছেন (প্র৬), কিন্তু নিশ্চিত মাসিক আয়কে ব্যবসা বাড়ানোর চেয়ে বেশি গুরুত্বপূর্ণ মনে করেন (প্র৪) — প্রকৃত ঝুঁকিগ্রহণকারী সাধারণত প্রবৃদ্ধিকে প্রাধান্য দেন।',
    en: 'Claims willingness to take risks (Q6) but prefers stable income over business growth (Q4) — genuine risk-takers typically prioritize growth.',
  },
  'q10-q9': {
    bn: 'প্রতি মাসে সঞ্চয় করেন বলেছেন (প্র৯), কিন্তু গত ৬ মাসে কিস্তি দেরি করেছেন (প্র১০) — নিয়মিত সঞ্চয়কারীর পক্ষে কিস্তি মিস করা অস্বাভাবিক।',
    en: 'Claims to save monthly (Q9) but missed installments recently (Q10) — someone saving regularly should not be missing payments.',
  },
  'q14-q12': {
    bn: 'বিপদে ৩+ জন সাহায্য করবে বলে নিশ্চিত (প্র১২), কিন্তু বেশিরভাগ গ্রাহককেই চেনেন না ৩ মাসের বেশি (প্র১৪) — দাবিকৃত সামাজিক নেটওয়ার্কের সাথে মেলে না।',
    en: 'Certain that 3+ people will help in trouble (Q12), but few long-term customer relationships (Q14) — the claimed social network seems overstated.',
  },
  'q20-q19': {
    bn: 'দ্রুত ঘুরে দাঁড়ানোর দাবি করলেন (প্র২০), কিন্তু আগের প্রশ্নে বড় কোনো ধাক্কাই হয়নি বলেছেন (প্র১৯) — দুটো উত্তরের মধ্যে মৌলিক বৈপরীত্য আছে।',
    en: 'Claims fast recovery (Q20), but said there was no major setback (Q19) — the two answers fundamentally contradict each other.',
  },
  'q25-q24': {
    bn: 'পরিবারের জন্য সম্পূর্ণ একমত কঠোর পরিশ্রম করতে (প্র২৪), কিন্তু সাপ্তাহিক কাজের ঘণ্টা কম বলেছেন (প্র২৫) — কথা আর বাস্তব আচরণে মিল নেই।',
    en: 'Strongly agrees to work hard for family (Q24) but reports low weekly work hours (Q25) — stated attitude does not match reported behaviour.',
  },
};

function getLabel(q, val) {
  if (q.type === 'scale') {
    const step = q.scale.steps?.[val - 1] || String(val);
    return { bn: step, en: step };
  }
  const opt = q.options?.[val];
  return opt ? { bn: opt.bn, en: opt.en } : { bn: String(val), en: String(val) };
}

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
        const secs = (a.ms / 1000).toFixed(1);
        const expSecs = Math.round(q.expectedMs / 1000);
        const label = getLabel(q, a.value);
        const note = SOCIAL_NOTES[q.id];
        flags.push({
          q: q.id, type: 'social-desirability',
          bn: 'অনেক দ্রুত "সর্বোচ্চ" উত্তর', en: 'Max-score answered too fast',
          answerGiven: label,
          explanation: note
            ? note
            : {
                bn: `সর্বোচ্চ সম্মতির উত্তর ("${label.bn}") মাত্র ${secs} সেকেন্ডে দেওয়া হয়েছে — সাধারণত এই ধরনের প্রশ্নে ${expSecs}+ সেকেন্ড লাগে। এটি সামাজিক কাম্যতা পক্ষপাত নির্দেশ করতে পারে।`,
                en: `Maximum answer ("${label.en}") selected in only ${secs}s — typical response time is ${expSecs}+ seconds. This may indicate social desirability bias.`,
              },
        });
      }
    } else {
      const opt = q.options[a.value];
      score = opt ? opt.score : 0;
      max = 5;
      if (q.expectedMs && a.ms < q.expectedMs * 0.25) {
        const secs = (a.ms / 1000).toFixed(1);
        const expSecs = Math.round(q.expectedMs / 1000);
        const label = getLabel(q, a.value);
        const note = TOO_FAST_NOTES[q.id];
        flags.push({
          q: q.id, type: 'too-fast',
          bn: 'কঠিন প্রশ্নে অস্বাভাবিক দ্রুত উত্তর', en: 'Hard question answered suspiciously fast',
          answerGiven: label,
          explanation: note
            ? note
            : {
                bn: `এই প্রশ্নের উত্তর "${label.bn}" মাত্র ${secs} সেকেন্ডে দেওয়া হয়েছে — সাধারণত এই ধরনের প্রশ্নে ${expSecs}+ সেকেন্ড লাগে। উত্তরটি সাক্ষাৎকারে আরও যাচাই করা প্রয়োজন।`,
                en: `Answer "${label.en}" given in only ${secs}s — typical response time is ${expSecs}+ seconds. Verify this answer during the interview.`,
              },
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
      const l1 = getLabel(q, a1.value);
      const l2 = getLabel(q2, a2.value);
      const pairKey = `${q.id}-${q.consistencyPair}`;
      const note = INCONSISTENCY_NOTES[pairKey];
      flags.push({
        q: q.id, pair: q.consistencyPair, type: 'inconsistent',
        bn: `প্রশ্ন ${q.id.slice(1)} ও ${q.consistencyPair.slice(1)}-এর উত্তর মিলছে না`,
        en: `Answers to Q${q.id.slice(1)} and Q${q.consistencyPair.slice(1)} don't match`,
        answerGiven: { bn: `প্র${q.id.slice(1)}: "${l1.bn}"`, en: `Q${q.id.slice(1)}: "${l1.en}"` },
        expected: { bn: `প্র${q.consistencyPair.slice(1)}: "${l2.bn}"`, en: `Q${q.consistencyPair.slice(1)}: "${l2.en}"` },
        explanation: note
          ? note
          : {
              bn: `প্রশ্ন ${q.id.slice(1)}-এ "${l1.bn}" বলেছেন, কিন্তু প্রশ্ন ${q.consistencyPair.slice(1)}-এ "${l2.bn}" — এই দুটো উত্তর একসাথে মেলে না। সাক্ষাৎকারে সরাসরি জিজ্ঞেস করুন।`,
              en: `Q${q.id.slice(1)} answer "${l1.en}" contradicts Q${q.consistencyPair.slice(1)} answer "${l2.en}". Probe directly during the interview.`,
            },
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
