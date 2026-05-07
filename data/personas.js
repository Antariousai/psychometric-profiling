/** Empty template for a newly generated applicant slug (`u…` from intake). */
export const BLANK_APPLICANT = {
  id: '',
  name: '',
  nameEn: '',
  age: '',
  gender: 'F',
  village: '',
  villageEn: '',
  occupation: '',
  occupationEn: '',
  loanAsk: '',
  loanPurpose: '',
  loanPurposeEn: '',
  savings: '',
  dependents: '',
  nid: '',
  phone: '',
  avatar: '+',
  tint: '#2EC4B6',
};

export function applicantDisplayFallback(slug) {
  return {
    id: slug,
    name: '—',
    nameEn: String(slug),
    village: '',
    loanAsk: 0,
    avatar: '?',
    tint: '#94A3B8',
  };
}

/** Coerce string-y intake values for scoring / loan math. */
export function coerceApplicantProfile(p) {
  if (!p || typeof p !== 'object') return p;
  const n = (v) => {
    if (v === '' || v == null) return 0;
    const x = Number(String(v).replace(/,/g, ''));
    return Number.isFinite(x) ? x : 0;
  };
  return {
    ...p,
    age: n(p.age),
    loanAsk: n(p.loanAsk),
    savings: n(p.savings),
    dependents: n(p.dependents),
  };
}

export const PERSONAS = {
  nasrin: {
    id: 'nasrin', name: 'নাসরিন বেগম', nameEn: 'Nasrin Begum', age: 34, gender: 'F',
    village: 'কমলগঞ্জ, সিলেট', villageEn: 'Kamalganj, Sylhet',
    occupation: 'টেইলারিং (কাপড় সেলাই)', occupationEn: 'Tailoring',
    loanAsk: 15000, loanPurpose: 'ব্যবসা সম্প্রসারণ', loanPurposeEn: 'Business expansion',
    savings: 2400, dependents: 3, nid: '1993xxxxxxx412', phone: '+8801712-443219',
    avatar: 'ন', tint: '#C2694F',
  },
  rafiq: {
    id: 'rafiq', name: 'রফিক উদ্দিন', nameEn: 'Rafiq Uddin', age: 42, gender: 'M',
    village: 'ভরুয়াখালী, কক্সবাজার', villageEn: "Bharuakhali, Cox's Bazar",
    occupation: 'ছোট কৃষি + দিনমজুর', occupationEn: 'Subsistence farm + labour',
    loanAsk: 12000, loanPurpose: 'পশুপালন (ছাগল)', loanPurposeEn: 'Livestock (goats)',
    savings: 600, dependents: 5, nid: '1983xxxxxxx877', phone: '+8801865-117302',
    avatar: 'র', tint: '#5E8C41',
  },
  shima: {
    id: 'shima', name: 'শিমা আক্তার', nameEn: 'Shima Akhter', age: 28, gender: 'F',
    village: 'রংপুর সদর', villageEn: 'Rangpur Sadar',
    occupation: 'মুদি দোকান', occupationEn: 'Grocery shop',
    loanAsk: 25000, loanPurpose: 'নতুন দোকান শুরু', loanPurposeEn: 'Start new branch',
    savings: 8000, dependents: 2, nid: '1999xxxxxxx054', phone: '+8801977-556120',
    avatar: 'শি', tint: '#B5874F',
  },
};

export const PERSONA_BIAS = { nasrin: 0.78, rafiq: 0.48, shima: 0.88 };
