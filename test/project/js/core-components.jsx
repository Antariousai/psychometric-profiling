// core-components.jsx — Design tokens, atom components, Login, OTP screens

const { useState, useEffect, useRef } = React;

const T = {
  navy:   '#0F1829', navy2:  '#162038',
  teal:   '#2EC4B6', teal2:  '#1A9D91', tealBg: 'rgba(46,196,182,0.10)',
  gold:   '#B5874F', gold2:  '#D4A855', goldBg: 'rgba(181,135,79,0.10)',
  cream:  '#F7F6F2', cream2: '#F0EDE4',
  border: '#E2DED6', border2:'#D0CBC0',
  ink:    '#1A1A2E', ink2:   '#374151', ink3:   '#6B7280', ink4:   '#9CA3AF',
  green:  '#16A34A', amber:  '#D97706', coral:  '#E04F4F',
  violet: '#7B2D8B', terracotta:'#C2694F', leaf:'#5E8C41',
  shadow: '0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04)',
  shadowLg:'0 4px 20px rgba(0,0,0,0.1),0 12px 40px rgba(0,0,0,0.06)',
  fHead:  "'Playfair Display', Georgia, serif",
  fBody:  "'Inter', 'Noto Sans Bengali', sans-serif",
  fBn:    "'Noto Sans Bengali', 'Hind Siliguri', sans-serif",
  fMono:  "'JetBrains Mono', monospace",
};

const PERSONAS = {
  nasrin: { id:'nasrin', name:'নাসরিন বেগম', nameEn:'Nasrin Begum', age:34, gender:'F',
    village:'কমলগঞ্জ, সিলেট', villageEn:'Kamalganj, Sylhet',
    occupation:'টেইলারিং (কাপড় সেলাই)', occupationEn:'Tailoring',
    loanAsk:15000, loanPurpose:'ব্যবসা সম্প্রসারণ', loanPurposeEn:'Business expansion',
    savings:2400, dependents:3, nid:'1993xxxxxxx412', phone:'+8801712-443219',
    avatar:'ন', tint:'#C2694F' },
  rafiq: { id:'rafiq', name:'রফিক উদ্দিন', nameEn:'Rafiq Uddin', age:42, gender:'M',
    village:'ভরুয়াখালী, কক্সবাজার', villageEn:"Bharuakhali, Cox's Bazar",
    occupation:'ছোট কৃষি + দিনমজুর', occupationEn:'Subsistence farm + labour',
    loanAsk:12000, loanPurpose:'পশুপালন (ছাগল)', loanPurposeEn:'Livestock (goats)',
    savings:600, dependents:5, nid:'1983xxxxxxx877', phone:'+8801865-117302',
    avatar:'র', tint:'#5E8C41' },
  shima: { id:'shima', name:'শিমা আক্তার', nameEn:'Shima Akhter', age:28, gender:'F',
    village:'রংপুর সদর', villageEn:'Rangpur Sadar',
    occupation:'মুদি দোকান', occupationEn:'Grocery shop',
    loanAsk:25000, loanPurpose:'নতুন দোকান শুরু', loanPurposeEn:'Start new branch',
    savings:8000, dependents:2, nid:'1999xxxxxxx054', phone:'+8801977-556120',
    avatar:'শি', tint:'#B5874F' },
};

const bn = (n) => String(n).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const fmtTk = (n) => '৳ ' + bn(n.toLocaleString('en-IN'));

function computeScore(answers, questions, dimensions) {
  const byDim = {};
  dimensions.forEach(d => byDim[d.id] = { total:0, max:0, flags:[], raw:[] });
  const flags = [];
  questions.forEach(q => {
    const a = answers[q.id];
    if (!a) return;
    const dim = byDim[q.dim];
    let score, max;
    if (q.type === 'scale') {
      score = (a.value - q.scale.min) / (q.scale.max - q.scale.min) * 5; max = 5;
      if (q.socialDesirability && a.value === q.scale.max && a.ms < (q.expectedMs * 0.5))
        flags.push({ q:q.id, type:'social-desirability', bn:'অনেক দ্রুত "সর্বোচ্চ" উত্তর', en:'Max-score answered too fast' });
    } else {
      const opt = q.options[a.value]; score = opt ? opt.score : 0; max = 5;
      if (q.expectedMs && a.ms < (q.expectedMs * 0.25))
        flags.push({ q:q.id, type:'too-fast', bn:'কঠিন প্রশ্নে অস্বাভাবিক দ্রুত উত্তর', en:'Hard question answered suspiciously fast' });
    }
    dim.total += score; dim.max += max; dim.raw.push({q:q.id, score, a:a.value});
  });
  questions.forEach(q => {
    if (!q.consistencyPair) return;
    const a1 = answers[q.id], a2 = answers[q.consistencyPair];
    if (!a1 || !a2) return;
    const q2 = questions.find(x => x.id === q.consistencyPair);
    const v1 = q.type==='scale' ? a1.value/q.scale.max : (q.options[a1.value]?.score||0)/5;
    const v2 = q2.type==='scale' ? a2.value/q2.scale.max : (q2.options[a2.value]?.score||0)/5;
    if (Math.abs(v1-v2) > 0.55)
      flags.push({ q:q.id, pair:q.consistencyPair, type:'inconsistent',
        bn:`প্রশ্ন ${q.id.slice(1)} ও ${q.consistencyPair.slice(1)}-এর উত্তর মিলছে না`,
        en:`Answers to Q${q.id.slice(1)} and Q${q.consistencyPair.slice(1)} don't match` });
  });
  const dimScores = dimensions.map(d => ({
    ...d, pct: byDim[d.id].max ? Math.round((byDim[d.id].total/byDim[d.id].max)*100) : 0,
    raw: byDim[d.id].total, max: byDim[d.id].max,
  }));
  const totalPct = dimScores.reduce((s,d)=>s+d.pct,0) / dimScores.length;
  const flagPenalty = Math.min(flags.length * 15, 120);
  const overall = Math.max(0, Math.round(totalPct * 10 - flagPenalty));
  let rating, tenure, risk;
  if (overall >= 780) { rating='A'; tenure=24; risk='Low'; }
  else if (overall >= 650) { rating='B'; tenure=18; risk='Moderate'; }
  else if (overall >= 500) { rating='C'; tenure=12; risk='Elevated'; }
  else { rating='D'; tenure=9; risk='High'; }
  return { overall, rating, tenure, risk, flags, dimScores, totalPct };
}

// ── Atoms ────────────────────────────────────────────────────
function BilingualLabel({ bn: bnTxt, en, sizeBn=15, sizeEn=11, color=T.ink, enColor=T.ink3, align='left', weight=600, style }) {
  return (
    <div style={{textAlign:align, ...style}}>
      <div style={{fontFamily:T.fBn, fontSize:sizeBn, fontWeight:weight, color, lineHeight:1.6}}>{bnTxt}</div>
      {en && <div style={{fontFamily:T.fBody, fontSize:sizeEn, fontWeight:500, color:enColor, letterSpacing:0.2, marginTop:3, lineHeight:1.35}}>{en}</div>}
    </div>
  );
}

function Chip({children, color=T.teal, bg, size=10, style}) {
  return <span style={{
    display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20,
    background: bg || `${color}18`, color,
    fontFamily:T.fMono, fontSize:size, fontWeight:700, letterSpacing:0.5, ...style,
  }}>{children}</span>;
}

function BrandHeader({ title, subtitle, onBack, right, accent=T.teal, dark=false }) {
  return (
    <div style={{
      padding:'14px 16px 12px', display:'flex', alignItems:'center', gap:12,
      borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.08)' : T.border}`,
      background: dark ? T.navy : '#fff',
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          width:36, height:36, borderRadius:12, border:'none',
          background: dark ? 'rgba(255,255,255,0.08)' : T.cream2, color: dark?'#fff':T.ink,
          fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
        }}>‹</button>
      )}
      <div style={{flex:1, minWidth:0}}>
        <BilingualLabel bn={title.bn} en={title.en} sizeBn={17} sizeEn={10} weight={700}
          color={dark?'#fff':T.navy} enColor={dark?'rgba(255,255,255,0.45)':T.ink3}/>
        {subtitle && <div style={{fontFamily:T.fMono, fontSize:9, color:accent, letterSpacing:1.5, marginTop:3, fontWeight:700}}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function FreyaOrb({ size=44, pulse=true, style }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      backgroundImage:'url(assets/freya-coin.png)',
      backgroundSize:'115% 115%', backgroundPosition:'center', backgroundRepeat:'no-repeat',
      boxShadow: pulse ? `0 0 0 ${size*0.14}px rgba(46,196,182,0.12), 0 0 0 ${size*0.26}px rgba(46,196,182,0.05), 0 4px 14px rgba(46,196,182,0.35)` : '0 2px 10px rgba(46,196,182,0.4)',
      animation: pulse ? 'freyaPulse 3.5s ease infinite' : 'none',
      flexShrink:0, ...style,
    }}/>
  );
}

function AntariousLogo({ variant='dark', height=22, style }) {
  const src = variant==='white' ? 'assets/antarious-white.png' : 'assets/antarious-dark.png';
  return <img src={src} alt="Antarious AI" style={{height, width:'auto', display:'block', ...style}}/>;
}

function PrimaryBtn({label, onClick, disabled, small, icon, variant='teal'}) {
  const bg = disabled ? T.border : (variant==='navy'?T.navy:variant==='gold'?T.gold:T.teal);
  return (
    <button onClick={disabled?null:onClick} style={{
      width:'100%', padding:small?'12px':'15px', borderRadius:14, border:'none',
      background:bg, color:'#fff', cursor:disabled?'not-allowed':'pointer',
      fontFamily:T.fBn, fontSize:small?14:16, fontWeight:700,
      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
      boxShadow: disabled?'none':`0 4px 14px ${bg}50`, transition:'transform 0.15s',
    }}
    onMouseDown={e=>!disabled&&(e.currentTarget.style.transform='scale(0.98)')}
    onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>
      <span style={{fontFamily:T.fBn, fontSize:small?14:15, fontWeight:700}}>{label.bn}</span>
      {label.en && <span style={{fontFamily:T.fBody, fontSize:small?10:11, fontWeight:500, opacity:0.72, letterSpacing:0.3}}>/ {label.en}</span>}
      {icon && <span style={{marginLeft:4, fontSize:14}}>{icon}</span>}
    </button>
  );
}

function Field({label, value, onChange, prefix, type='text', placeholder}) {
  return (
    <div style={{marginBottom:16}}>
      <BilingualLabel bn={label.bn} en={label.en} sizeBn={13} sizeEn={10} weight={600} style={{marginBottom:7}}/>
      <div style={{
        display:'flex', alignItems:'center', background:'#fff',
        border:`1.5px solid ${T.border}`, borderRadius:12, overflow:'hidden',
        boxShadow:'0 1px 2px rgba(0,0,0,0.03)',
      }}>
        {prefix && <span style={{padding:'12px 0 12px 12px', fontFamily:T.fMono, fontSize:12, color:T.ink3, fontWeight:600, flexShrink:0}}>{prefix}</span>}
        <input value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder}
          style={{flex:1, width:'100%', padding:'12px', border:'none', outline:'none',
            fontFamily:T.fBn, fontSize:14, color:T.ink, fontWeight:600, background:'transparent'}}/>
      </div>
    </div>
  );
}

// ── Login Screen ─────────────────────────────────────────────
function LoginScreen({ ctx }) {
  const [phone, setPhone] = useState('01712-443219');
  const [pin, setPin] = useState('');
  return (
    <div style={{background:T.navy, color:'#fff', minHeight:'100%', display:'flex', flexDirection:'column'}}>
      <div style={{
        flex:'0 0 auto', padding:'32px 24px 28px',
        background:`radial-gradient(circle at 80% 10%, rgba(46,196,182,0.18) 0%, transparent 55%), ${T.navy}`,
        borderBottom:'1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:22}}>
          <AntariousLogo variant="white" height={28}/>
          <span style={{fontFamily:T.fMono, fontSize:8, color:T.teal, letterSpacing:2, fontWeight:700, padding:'3px 8px', borderRadius:10, background:'rgba(46,196,182,0.12)', border:'1px solid rgba(46,196,182,0.2)'}}>× PKSF</span>
        </div>
        <BilingualLabel bn="সাইকোমেট্রিক প্রোফাইলিং" en="Psychometric Profiling · PO Officer Login"
          sizeBn={26} sizeEn={11} color="#fff" enColor="rgba(255,255,255,0.5)" weight={800} style={{marginBottom:6}}/>
        <div style={{fontFamily:T.fBn, fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.7, marginTop:10}}>
          আপনার মোবাইল নম্বর আর পিন দিয়ে ঢুকে পড়ুন ভাই। একদম সহজ।
        </div>
      </div>
      <div style={{flex:1, padding:'28px 24px', background:T.cream, color:T.ink, borderRadius:'24px 24px 0 0', marginTop:-12, position:'relative', zIndex:2}}>
        <Field label={{bn:'মোবাইল নম্বর', en:'Mobile number'}} value={phone} onChange={setPhone} prefix="+88"/>
        <Field label={{bn:'৪-সংখ্যার পিন', en:'4-digit PIN'}} value={pin} onChange={v=>setPin(v.slice(0,4))} type="password" placeholder="••••"/>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6, marginBottom:20}}>
          <label style={{display:'flex', alignItems:'center', gap:6, fontFamily:T.fBn, fontSize:12, color:T.ink2}}>
            <input type="checkbox" defaultChecked style={{accentColor:T.teal}}/> এই ফোনটা মনে রাখবে
          </label>
          <span style={{fontFamily:T.fBn, fontSize:12, color:T.teal2, fontWeight:700, cursor:'pointer'}}>পিন ভুলে গেছেন?</span>
        </div>
        <PrimaryBtn onClick={()=>ctx.go('otp')} label={{bn:'ওটিপি পাঠান', en:'Send OTP'}}/>
        <div style={{marginTop:16, padding:'12px 14px', background:'#fff', border:`1px dashed ${T.border2}`, borderRadius:12,
          fontFamily:T.fBn, fontSize:12, color:T.ink3, lineHeight:1.65, textAlign:'center'}}>
          🔒 <span style={{color:T.ink2}}>PKSF-সুরক্ষিত।</span> আপনার তথ্য শুধু আপনার PO-তেই থাকবে।
        </div>
      </div>
    </div>
  );
}

// ── OTP Screen ────────────────────────────────────────────────
function OtpScreen({ ctx }) {
  const [otp, setOtp] = useState(['','','','','','']);
  const refs = useRef([]);
  const [timer, setTimer] = useState(42);
  useEffect(()=>{ const t=setInterval(()=>setTimer(s=>s>0?s-1:0),1000); return ()=>clearInterval(t); },[]);
  useEffect(()=>{ refs.current[0]?.focus(); },[]);
  const complete = otp.every(d=>d.length===1);
  const set = (i,v) => {
    v = v.replace(/\D/g,'').slice(0,1);
    const n = [...otp]; n[i]=v; setOtp(n);
    if (v && i<5) refs.current[i+1]?.focus();
  };
  return (
    <div style={{background:T.cream, minHeight:'100%', display:'flex', flexDirection:'column'}}>
      <BrandHeader title={{bn:'ওটিপি যাচাই', en:'OTP Verification'}} onBack={()=>ctx.go('login')}/>
      <div style={{flex:1, padding:'24px 20px'}}>
        <BilingualLabel bn="নিরাপত্তা কোডটা লিখুন" en="Enter security code" sizeBn={22} sizeEn={12} weight={800} style={{marginBottom:8}}/>
        <div style={{fontFamily:T.fBn, fontSize:13, color:T.ink3, lineHeight:1.65, marginBottom:24}}>
          +৮৮০১৭১২-৪৪৩২১৯ নম্বরে যে ৬-সংখ্যার কোডটা পাঠানো হয়েছে, সেটা এখানে বসান।
        </div>
        <div style={{display:'flex', gap:8, justifyContent:'space-between', marginBottom:24}}>
          {otp.map((d,i)=>(
            <input key={i} ref={el=>refs.current[i]=el} value={d} onChange={e=>set(i,e.target.value)}
              maxLength={1} inputMode="numeric"
              style={{
                width:'14%', height:56, textAlign:'center', fontFamily:T.fMono, fontSize:22, fontWeight:700,
                border:`1.5px solid ${d?T.teal:T.border}`, borderRadius:12, outline:'none',
                background:'#fff', color:T.ink,
                boxShadow: d?`0 0 0 3px ${T.tealBg}`:'none',
              }}/>
          ))}
        </div>
        <div style={{textAlign:'center', fontFamily:T.fBn, fontSize:12, color:T.ink3, marginBottom:20}}>
          {timer>0 ? <>পুনরায় পাঠান <span style={{fontFamily:T.fMono,color:T.teal2,fontWeight:700}}>{bn(timer)}s</span></> :
            <span style={{color:T.teal2,fontWeight:700,cursor:'pointer'}}>কোড পুনরায় পাঠান</span>}
        </div>
        <PrimaryBtn label={{bn:'যাচাই করুন', en:'Verify & Enter'}} onClick={()=>ctx.go('dashboard')} disabled={!complete}/>
        <button onClick={()=>ctx.go('dashboard')} style={{
          width:'100%', marginTop:12, padding:10, border:'none', background:'transparent',
          fontFamily:T.fBn, fontSize:12, color:T.ink3, cursor:'pointer', textDecoration:'underline',
        }}>demo: skip verification →</button>
      </div>
    </div>
  );
}

Object.assign(window, {
  T, PERSONAS, bn, fmtTk, computeScore,
  BilingualLabel, Chip, BrandHeader, FreyaOrb, AntariousLogo, PrimaryBtn, Field,
  LoginScreen, OtpScreen,
});
