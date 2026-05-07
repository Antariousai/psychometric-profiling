/**
 * One-off generator: reference/pmp-questionnaire.html → data/questions.js
 * Run: node tools/generate-pmp-questions.cjs
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../reference/pmp-questionnaire.html');
const outPath = path.join(__dirname, '../data/questions.js');

const html = fs.readFileSync(htmlPath, 'utf8');

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/✓/g, '')
    .trim();
}

function extractQTexts(chunk) {
  const texts = [];
  const re = /<div class="q-text"[^>]*>([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(chunk))) {
    const t = stripTags(m[1]);
    if (t && !t.startsWith('প্রথমে মাসিক পুঁজি') && !t.startsWith('মাসিক মোট বিক্রি')) {
      texts.push(t);
    }
  }
  return texts;
}

function extractNote(chunk) {
  const m = chunk.match(/<div class="q-note"[^>]*>([\s\S]*?)<\/div>/);
  return m ? stripTags(m[1]) : '';
}

function extractLikert(chunk) {
  const steps = [];
  const re =
    /<input type="radio" name="[^"]+" value="(\d+)"[^>]*><label class="likert-btn"[^>]*>([^<]+)<\/label>/g;
  let m;
  while ((m = re.exec(chunk))) {
    steps.push({ v: +m[1], bn: m[2].trim() });
  }
  steps.sort((a, b) => a.v - b.v);
  return steps.map((s) => s.bn);
}

function extractRadioOptions(chunk) {
  const opts = [];
  const re =
    /<label class="opt-label"><input type="radio"[^>]*>([\s\S]*?)<\/label>/g;
  let m;
  while ((m = re.exec(chunk))) {
    const bn = stripTags(m[1]);
    if (bn) opts.push(bn);
  }
  return opts;
}

function extractCheckboxOptions(chunk) {
  const opts = [];
  const re =
    /<label class="opt-label"><input type="checkbox"[^>]*>([\s\S]*?)<\/label>/g;
  let m;
  while ((m = re.exec(chunk))) {
    const bn = stripTags(m[1]);
    if (bn) opts.push(bn);
  }
  return opts;
}

function hasCheckbox(chunk) {
  return /<label class="opt-label"><input type="checkbox"/i.test(chunk);
}

function hasLikert(chunk) {
  return /<div class="likert-wrap">/.test(chunk);
}

function cardinalEn(n) {
  const w = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];
  return w[n - 1] || `Q${n}`;
}

/** Map qc id → dimension id */
const dimByQc = (qc) => {
  const n = +qc;
  if (n >= 1 && n <= 7) return 'business';
  if (n >= 8 && n <= 12) return 'financial';
  if (n >= 13 && n <= 15) return 'risk';
  if (n >= 16 && n <= 18) return 'social';
  if (n >= 20 && n <= 23) return 'resilience';
  if (n >= 24 && n <= 28) return 'motivation';
  if (n >= 29 && n <= 31) return 'financial';
  if (n === 19) return 'financial';
  if (n >= 32 && n <= 37) return 'financial';
  if (n === 38) return 'motivation';
  if (n === 39) return 'motivation'; // honesty (last)
  if (n === 40) return 'financial';
  return 'business';
};

/** Monotonic scores for options (length n): worst 1 … best ~5 */
function scoreOptions(n, preferLastIndices = []) {
  const scores = [];
  for (let i = 0; i < n; i++) {
    if (n === 1) {
      scores.push(3);
      continue;
    }
    const linear = 1 + Math.round((i / (n - 1)) * 4);
    scores.push(linear);
  }
  if (preferLastIndices.length) {
    preferLastIndices.forEach((idx) => {
      if (idx >= 0 && idx < n) scores[idx] = 5;
    });
  }
  return scores;
}

/** Heuristic: demote “don't know”, “none”, scam-accept, fleeing */
function adjustScenarioScores(bnOptions, baseScores) {
  const lower = bnOptions.map((b) => b.toLowerCase());
  return baseScores.map((s, i) => {
    const t = lower[i] || '';
    if (/জানি না|হিসাব করতে পারছি না|একই জিনিস|কোনো উপায় নেই|লুকিয়ে|পালিয়ে|সাথে সাথে বিনিয়োগ|কোনো বীমা নেই|কোনো সংগঠনে নেই|কোনো সঞ্চয় নেই|কোনো বিকল্প আয় নেই|কেউ আসবে না/i.test(t))
      return Math.min(s, 2);
    if (/বীমা কী তা জানি না|এখনো চিন্তা করিনি|এখনো নির্দিষ্ট করিনি|ভাবি না/i.test(t)) return Math.min(s, 2);
    return s;
  });
}

function mathCorrectIndex(opts) {
  for (let i = 0; i < opts.length; i++) {
    if (/১৫,০০০|২৫%|মূলধন হলো ব্যবসার শুরুর টাকা, মুনাফা হলো বিক্রির পর বাড়তি আয়/i.test(opts[i]))
      return i;
  }
  return -1;
}

const cardIds = [];
const reCard = /<div class="q-card" id="qc-(\d+)">/g;
let mm;
while ((mm = reCard.exec(html))) {
  cardIds.push(mm[1]);
}

const chunks = {};
cardIds.forEach((id) => {
  const start = html.indexOf(`<div class="q-card" id="qc-${id}">`);
  if (start === -1) return;
  const rest = html.slice(start + 1);
  const next = rest.search(/<div class="q-card" id="qc-\d+">/);
  let end = next === -1 ? html.length : start + 1 + next;
  const mainEnd = html.indexOf('</main>', start);
  if (mainEnd !== -1 && end > mainEnd) end = mainEnd;
  chunks[id] = html.slice(start, end);
});

const flow = [
  ...['1', '2', '3', '4', '5', '6', '7'],
  ...['8', '9', '10', '11'],
  '12_split',
  ...['13', '14', '15'],
  ...['16', '17', '18'],
  ...['20', '21', '22', '23'],
  ...['24', '25', '26', '27', '28'],
  ...['29', '30', '31'],
  '19',
  ...['32', '33', '34', '35', '36', '37', '38', '40', '39'],
];

const questions = [];
let seq = 0;

for (const ref of flow) {
  if (ref === '12_split') {
    const ch = chunks['12'];
    const capLabels = [];
    const reCap =
      /<label class="opt-label"><input type="radio" name="q12_capital"[^>]*>([\s\S]*?)<\/label>/g;
    let m;
    while ((m = reCap.exec(ch))) {
      capLabels.push(stripTags(m[1]));
    }
    const revLabels = [];
    const reRev =
      /<label class="opt-label"><input type="radio" name="q12_revenue"[^>]*>([\s\S]*?)<\/label>/g;
    while ((m = reRev.exec(ch))) {
      revLabels.push(stripTags(m[1]));
    }
    seq += 1;
    const id = `q${seq}`;
    const sCap = adjustScenarioScores(capLabels, scoreOptions(capLabels.length));
    questions.push({
      id,
      dim: 'financial',
      type: 'scenario',
      bn: `প্রতি মাসে কত টাকা পুঁজি খাটিয়ে ব্যবসা করেন? (নিচে একটি বেছে নিন)`,
      en: 'Monthly capital you deploy in business (select one band).',
      options: capLabels.map((bn, i) => ({ bn, en: cardinalEn(i + 1), score: sCap[i] })),
      expectedMs: 5000,
    });
    seq += 1;
    const id2 = `q${seq}`;
    const sRev = adjustScenarioScores(revLabels, scoreOptions(revLabels.length));
    questions.push({
      id: id2,
      dim: 'financial',
      type: 'scenario',
      bn: `মাসিক মোট বিক্রি/টার্নওভার কত? (নিচে একটি বেছে নিন)`,
      en: 'Approximate monthly turnover (select one band).',
      options: revLabels.map((bn, i) => ({ bn, en: cardinalEn(i + 1), score: sRev[i] })),
      expectedMs: 5000,
    });
    continue;
  }

  const qc = ref;
  const chunk = chunks[qc];
  if (!chunk) continue;

  seq += 1;
  const id = `q${seq}`;
  const dim = dimByQc(qc);
  const note = extractNote(chunk);
  const qtexts = extractQTexts(chunk);
  let bn = qtexts[0] || `প্রশ্ন ${seq}`;
  if (note && (qc === '5' || qc === '6')) {
    bn = `${note} ${bn}`;
  }

  const en =
    qc === '1'
      ? 'A competitor opens nearby. What is your first response?'
      : qc === '5'
        ? 'Daily sales 2,000 tk, cost 1,500 tk — monthly profit (30 days)?'
        : qc === '6'
          ? 'Buy 120 tk, sell 150 tk — profit %?'
          : qtexts[1]
            ? `${stripTags(qtexts[0]).slice(0, 80)}…`
            : 'Assessment item (see Bangla).';

  if (hasLikert(chunk)) {
    const steps = extractLikert(chunk);
    if (steps.length >= 2) {
      const social =
        /সঞ্চয় করি|সেবা দিতে|পরিশ্রম|হাল ছাড়ি না/i.test(bn);
      questions.push({
        id,
        dim,
        type: 'scale',
        bn,
        en: en.length > 120 ? 'Likert agreement scale (see Bangla).' : en,
        scale: {
          min: 1,
          max: steps.length,
          minBn: steps[0],
          maxBn: steps[steps.length - 1],
          minEn: 'Low',
          maxEn: 'High',
          steps: [...steps],
        },
        ...(social ? { socialDesirability: true } : {}),
        expectedMs: 4000,
      });
    }
    continue;
  }

  let opts = hasCheckbox(chunk)
    ? extractCheckboxOptions(chunk)
    : extractRadioOptions(chunk);

  if (!opts.length) continue;

  const type =
    qc === '5' || qc === '6' || /হিসাবের প্রশ্ন/.test(note) ? 'math' : 'scenario';

  let scores = scoreOptions(opts.length);
  if (qc === '19') {
    scores = opts.map((t) => {
      if (/সবসময় সময়মতো|৬\/৬/i.test(t)) return 5;
      if (/৫ বার/i.test(t)) return 4;
      if (/৩ — ৪ বার/i.test(t)) return 3;
      if (/১ — ২ বার/i.test(t)) return 2;
      if (/এখন পর্যন্ত কোনো ঋণ নেইনি/i.test(t)) return 3;
      return 1;
    });
  } else if (type === 'math') {
    const ci = mathCorrectIndex(opts);
    if (ci >= 0) {
      scores = scores.map((_, i) => (i === ci ? 5 : i === opts.length - 1 ? 1 : 2));
    }
  } else if (hasCheckbox(chunk)) {
    bn = `${bn} (নিচ থেকে একটি বেছে নিন যা সবচেয়ে বেশি প্রযোজ্য।)`;
    scores = adjustScenarioScores(opts, scoreOptions(opts.length));
  } else {
    if (qc === '7') {
      scores = opts.map((_, i) => (i === 1 ? 5 : 1));
    }
    else if (qc === '13')
      scores = adjustScenarioScores(
        opts,
        scoreOptions(opts.length).map((s, i) => {
          const t = opts[i];
          if (/সন্দেহ|বিনিয়োগ করব না|সরাসরি না|আগে ভালো করে খোঁজ|পরিবারের সাথে|বিশ্বস্ত|সামান্য পরিমাণ/i.test(t))
            return 5;
          if (/সাথে সাথে বিনিয়োগ/i.test(t)) return 1;
          return s;
        }),
      );
    else scores = adjustScenarioScores(opts, scores);
  }

  const q = {
    id,
    dim,
    type,
    bn,
    en: type === 'math' ? 'Numerical reasoning (see Bangla).' : en,
    options: opts.map((b, i) => ({ bn: b, en: `Option ${i + 1}`, score: scores[i] })),
    expectedMs: type === 'math' ? 12000 : 5500,
  };

  if (qc === '19') {
    q.consistencyPair = 'q10';
  }
  if (qc === '26') {
    q.consistencyPair = 'q25';
  }
  if (qc === '22') {
    q.consistencyPair = `q${seq - 1}`;
  }

  questions.push(q);
}

function quote(s) {
  return JSON.stringify(s);
}

function emitQuestion(q) {
  const props = [
    `id: ${quote(q.id)}`,
    `dim: ${quote(q.dim)}`,
    `type: ${quote(q.type)}`,
    `bn: ${quote(q.bn)}`,
    `en: ${quote(q.en)}`,
  ];
  if (q.scale) {
    props.push(
      `scale: {\n      min: ${q.scale.min},\n      max: ${q.scale.max},\n      minBn: ${quote(
        q.scale.minBn,
      )},\n      maxBn: ${quote(q.scale.maxBn)},\n      minEn: ${quote(
        q.scale.minEn,
      )},\n      maxEn: ${quote(q.scale.maxEn)},\n      steps: [${q.scale.steps
        .map(quote)
        .join(', ')}],\n    }`,
    );
  }
  if (q.options) {
    const o = q.options
      .map((opt) => `      { bn: ${quote(opt.bn)}, en: ${quote(opt.en)}, score: ${opt.score} }`)
      .join(',\n');
    props.push(`options: [\n${o}\n    ]`);
  }
  if (q.socialDesirability) props.push('socialDesirability: true');
  if (q.consistencyPair) props.push(`consistencyPair: ${quote(q.consistencyPair)}`);
  if (q.expectedMs) props.push(`expectedMs: ${q.expectedMs}`);
  return `  {\n    ${props.join(',\n    ')}\n  }`;
}

const body = `/* Auto-generated from reference/pmp-questionnaire.html — node tools/generate-pmp-questions.cjs */
export const QUESTIONS = [
${questions.map((q) => emitQuestion(q)).join(',\n')}
];
`;

fs.writeFileSync(outPath, body);
console.log('Wrote', questions.length, 'questions to', outPath);
