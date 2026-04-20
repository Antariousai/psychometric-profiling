// screens2.jsx — Assessment (the big one) + Scoring loop + Result screen

const { useState: uS2, useEffect: uE2, useRef: uR2, useMemo: uM2 } = React;

// ───────── ASSESSMENT ─────────
function AssessmentScreen({ ctx }) {
  const questions = window.QUESTIONS;
  const [idx, setIdx] = uS2(0);
  const [answers, setAnswers] = uS2(() => ctx.answers || {});
  const startAt = uR2(Date.now());
  const ctxSetAnswers = ctx.setAnswers;
  const firstRender = uR2(true);

  uE2(()=>{ startAt.current = Date.now(); }, [idx]);
  uE2(()=>{
    if (firstRender.current) { firstRender.current = false; return; }
    ctxSetAnswers(answers);
  }, [answers]);

  // Publish current question to window so shell FAB can read it (avoids setState loop)
  const q = questions[idx];
  const dim = DIMENSIONS.find(d => d.id === q.dim);
  window.__ANT_currentQ = q;
  window.__ANT_currentDim = dim;
  const progress = (idx+1) / questions.length;
  const answered = answers[q.id];

  const answer = (value) => {
    const ms = Date.now() - startAt.current;
    const next = { ...answers, [q.id]: { value, ms } };
    setAnswers(next);
    setTimeout(()=>{
      if (idx < questions.length - 1) setIdx(idx+1);
      else ctx.go('scoring');
    }, 260);
  };

  return (
    <div style={{background:T.cream, minHeight:'100%', display:'flex', flexDirection:'column'}}>
      <BrandHeader
        title={{bn:`প্রশ্ন ${bn(idx+1)} / ${bn(questions.length)}`, en:`Question ${idx+1} of ${questions.length}`}}
        subtitle={`${dim.en.toUpperCase()} · ${dim.icon}`}
        onBack={()=> idx>0 ? setIdx(idx-1) : ctx.go('intake')}
        right={<Chip color={dim.color}>{dim.icon}</Chip>}/>

      {/* Progress bar with dim segments */}
      <div style={{padding:'10px 16px 0', background:'#fff'}}>
        <div style={{height:5, background:T.cream2, borderRadius:3, overflow:'hidden', display:'flex'}}>
          {questions.map((qq,i)=>{
            const d = DIMENSIONS.find(dd=>dd.id===qq.dim);
            return (
              <div key={i} style={{
                flex:1, marginRight: i<questions.length-1?1:0,
                background: i<=idx ? d.color : 'transparent',
                opacity: i===idx ? 1 : (i<idx?0.85:0),
                transition:'opacity 0.3s, background 0.3s',
              }}/>
            );
          })}
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 2px 12px', gap:12}}>
          <span style={{fontFamily:T.fBn, fontSize:11, color:dim.color, fontWeight:700, lineHeight:1.5, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{dim.bn}</span>
          <span style={{fontFamily:T.fMono, fontSize:10, color:T.ink3, fontWeight:700, flexShrink:0}}>{bn(Math.round(progress*100))}%</span>
        </div>
      </div>

      {/* Question body */}
      <div style={{flex:1, padding:'20px 16px 100px', background:T.cream}}>
        {/* dimension pill */}
        <div style={{display:'inline-flex', alignItems:'center', gap:8,
          padding:'6px 12px', borderRadius:20, background:`${dim.color}18`, border:`1px solid ${dim.color}40`, marginBottom:14}}>
          <span style={{fontSize:12, color:dim.color}}>{dim.icon}</span>
          <span style={{fontFamily:T.fBn, fontSize:11, fontWeight:700, color:dim.color}}>{dim.bn}</span>
          <span style={{fontFamily:T.fMono, fontSize:9, color:dim.color, opacity:0.7, letterSpacing:0.5}}>{dim.en.toUpperCase()}</span>
        </div>

        {/* question text */}
        <div style={{marginBottom:22}}>
          <div style={{fontFamily:T.fBn, fontSize:19, fontWeight:700, color:T.navy, lineHeight:1.45, marginBottom:8}}>{q.bn}</div>
          <div style={{fontFamily:T.fBody, fontStyle:'italic', fontSize:12.5, color:T.ink3, lineHeight:1.55}}>{q.en}</div>
        </div>

        {/* speaker affordance */}
        <div style={{display:'flex', gap:8, marginBottom:18}}>
          <button style={{
            padding:'8px 14px', border:`1px solid ${T.border2}`, borderRadius:20, background:'#fff',
            fontFamily:T.fBn, fontSize:11, color:T.ink2, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', gap:6,
          }}>🔊 প্রশ্ন শুনুন</button>
          <Chip color={T.ink4} size={9}>{q.type.toUpperCase()}</Chip>
          {q.socialDesirability && <Chip color={T.violet} size={9}>CHECK ⚑</Chip>}
          {q.consistencyPair && <Chip color={T.violet} size={9}>PAIR ⟷</Chip>}
        </div>

        {/* Response UI */}
        {q.type === 'scale' ? <ScaleInput q={q} answered={answered} onAnswer={answer}/> :
         <OptionList q={q} answered={answered} onAnswer={answer}/>}
      </div>

      {/* (Freya FAB is rendered at the app-shell level so it anchors to the phone frame) */}

      {/* Bottom skip (for demo) */}
      <div style={{position:'sticky', bottom:0, padding:'10px 16px', background:'#fff', borderTop:`1px solid ${T.border}`,
        display:'flex', gap:8}}>
        <button onClick={()=>{ if(idx<questions.length-1)setIdx(idx+1); else ctx.go('scoring'); }} style={{
          flex:1, padding:11, borderRadius:10, border:`1px solid ${T.border2}`, background:'#fff',
          fontFamily:T.fBn, fontSize:12, color:T.ink3, fontWeight:700, cursor:'pointer'}}>
          এড়িয়ে যান / Skip
        </button>
        <button onClick={()=>{
          // auto-fill demo: random answers for all
          const all = {};
          const personas = { nasrin: 0.78, rafiq: 0.48, shima: 0.88 };
          const bias = personas[ctx.applicantId] || 0.7;
          questions.forEach((qq,i)=>{
            let val;
            if (qq.type === 'scale') val = Math.round(qq.scale.min + bias*(qq.scale.max-qq.scale.min) + (Math.random()-0.5));
            else {
              // pick option weighted by bias
              const sorted = qq.options.map((o,j)=>({o,j})).sort((a,b)=>b.o.score-a.o.score);
              const pick = Math.min(sorted.length-1, Math.floor((1-bias)*sorted.length + Math.random()*1.5));
              val = sorted[pick].j;
            }
            // add some fast answers to trigger flags on rafiq
            const msBase = qq.expectedMs || 4000;
            const msMult = ctx.applicantId==='rafiq' ? 0.2 + Math.random()*0.6 : 0.6 + Math.random()*0.8;
            all[qq.id] = { value: val, ms: Math.round(msBase * msMult) };
          });
          setAnswers(all);
          ctx.setAnswers(all);
          ctx.go('scoring');
        }} style={{
          flex:2, padding:11, borderRadius:10, border:'none', background:T.gold, color:'#fff',
          fontFamily:T.fBn, fontSize:12, fontWeight:700, cursor:'pointer'}}>
          ⚡ ডেমো: সব উত্তর পূরণ করুন / Auto-fill demo
        </button>
      </div>
    </div>
  );
}

function OptionList({ q, answered, onAnswer }) {
  return (
    <div style={{display:'flex', flexDirection:'column', gap:10}}>
      {q.options.map((opt, i) => {
        const sel = answered?.value === i;
        return (
          <button key={i} onClick={()=>onAnswer(i)} style={{
            width:'100%', padding:'14px 16px', textAlign:'left',
            background: sel ? T.tealBg : '#fff',
            border: sel ? `2px solid ${T.teal}` : `1.5px solid ${T.border}`,
            borderRadius:14, cursor:'pointer',
            boxShadow: sel ? `0 4px 14px ${T.teal}30` : '0 1px 2px rgba(0,0,0,0.03)',
            display:'flex', gap:13, alignItems:'center', transition:'all 0.15s',
          }}>
            <div style={{
              width:30, height:30, borderRadius:8,
              background: sel ? T.teal : T.cream2,
              color: sel ? '#fff' : T.ink3,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:T.fMono, fontSize:13, fontWeight:700, flexShrink:0,
            }}>{sel ? '✓' : String.fromCharCode(65+i)}</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontFamily:T.fBn, fontSize:14, color:T.ink, fontWeight:sel?700:600, lineHeight:1.55, wordBreak:'break-word'}}>{opt.bn}</div>
              <div style={{fontFamily:T.fBody, fontSize:10, color:T.ink3, fontStyle:'italic', marginTop:6, lineHeight:1.4}}>{opt.en}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ScaleInput({ q, answered, onAnswer }) {
  const [hover, setHover] = uS2(null);
  const current = answered?.value ?? null;
  const max = q.scale.max, min = q.scale.min;
  const labels = [q.scale.minBn, '', '', '', q.scale.maxBn];
  return (
    <div>
      <div style={{
        background:'#fff', border:`1.5px solid ${T.border}`, borderRadius:14, padding:'18px 16px 14px',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:14}}>
          <div><div style={{fontFamily:T.fBn, fontSize:11, color:T.ink3, fontWeight:700}}>{q.scale.minBn}</div>
            <div style={{fontFamily:T.fMono, fontSize:9, color:T.ink4, marginTop:2}}>{q.scale.minEn}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontFamily:T.fBn, fontSize:11, color:T.ink3, fontWeight:700}}>{q.scale.maxBn}</div>
            <div style={{fontFamily:T.fMono, fontSize:9, color:T.ink4, marginTop:2}}>{q.scale.maxEn}</div></div>
        </div>
        <div style={{display:'flex', gap:6}}>
          {Array.from({length: max-min+1}).map((_,i) => {
            const val = min + i;
            const on = current===val || hover===val;
            const frac = i / (max-min);
            const c = `hsl(${170 - frac*50}, ${50 + frac*20}%, ${55 - frac*10}%)`;
            return (
              <button key={val} onClick={()=>onAnswer(val)} onMouseEnter={()=>setHover(val)} onMouseLeave={()=>setHover(null)} style={{
                flex:1, aspectRatio:'1', borderRadius:14, border:'none',
                background: on ? c : `${c}20`,
                color: on ? '#fff' : c,
                fontFamily:T.fHead, fontSize:24, fontWeight:900, cursor:'pointer',
                boxShadow: on ? `0 4px 14px ${c}60, inset 0 0 0 2px rgba(255,255,255,0.3)` : 'none',
                transform: on ? 'translateY(-2px)' : 'none', transition:'all 0.15s',
              }}>{bn(val)}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FreyaHint({ q, dim, onClose }) {
  const hints = {
    scenario: 'এটি একটি বাস্তব পরিস্থিতির প্রশ্ন। আবেদনকারীকে প্রশ্ন পড়ে শোনান, ভাবার সময় দিন।',
    scale:    'আবেদনকারীকে বলুন: "১ মানে একমত নই, ৫ মানে সম্পূর্ণ একমত।" জোর করবেন না।',
    math:     'ধীরে ধীরে পড়ুন। প্রয়োজনে কাগজ-কলম দিতে পারেন — কিন্তু সাহায্য করবেন না।',
    forced:   'দুটি বিকল্পের মধ্যে একটি বেছে নিতে হবে। "দুটোই" এর উত্তর দেওয়া যাবে না।',
  };
  return (
    <div style={{
      position:'absolute', bottom:140, right:16, left:16,
      background:'#fff', borderRadius:16, boxShadow:T.shadowLg,
      border:`1px solid ${T.border}`, padding:14, zIndex:10,
      animation:'freyaHint 0.3s ease',
    }}>
      <div style={{display:'flex', alignItems:'flex-start', gap:10}}>
        <FreyaOrb size={34} pulse={false}/>
        <div style={{flex:1}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
            <div style={{fontFamily:T.fMono, fontSize:8.5, color:T.teal2, letterSpacing:1.5, fontWeight:700}}>FREYA · সহায়ক</div>
            <button onClick={onClose} style={{border:'none',background:'transparent', fontSize:16, color:T.ink3, cursor:'pointer'}}>×</button>
          </div>
          <div style={{fontFamily:T.fBn, fontSize:12, color:T.ink2, lineHeight:1.7}}>
            {hints[q.type] || 'কোথাও আটকে গেলে আমাকে ডাকুন, সাহায্য করি।'}
          </div>
          {(q.socialDesirability || q.consistencyPair) && (
            <div style={{marginTop:8, padding:'8px 10px', background:`${T.violet}12`, borderRadius:8, fontFamily:T.fBn, fontSize:11, color:T.violet, lineHeight:1.6}}>
              ⚑ এই প্রশ্নটা যাচাইয়ের জন্য রাখা — আবেদনকারীর মুখের ভাব, হাত-নাড়া খেয়াল রাখুন।
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────── SCORING (Freya live analysis) ─────────
function ScoringScreen({ ctx }) {
  const [step, setStep] = uS2(0);
  const messages = [
    { bn:'উত্তরগুলো পড়ে দেখছি…', en:'Analyzing responses…', icon:'◐' },
    { bn:'দুই জায়গার কথা মিলছে কি না দেখছি…', en:'Checking consistency pairs…', icon:'⟷' },
    { bn:'কোন প্রশ্নে কত সময় নিলেন, দেখছি…', en:'Validating response times…', icon:'⏱' },
    { bn:'আগের কেসগুলোর সাথে মিলিয়ে দেখছি…', en:'Cross-referencing portfolio history…', icon:'◫' },
    { bn:'ঋণের একটা সুপারিশ তৈরি করছি…', en:'Generating loan recommendation…', icon:'⟐' },
  ];
  uE2(()=>{
    if (step >= messages.length) {
      setTimeout(()=>ctx.go('result'), 500);
      return;
    }
    const t = setTimeout(()=>setStep(s=>s+1), 750);
    return ()=>clearTimeout(t);
  }, [step]);

  return (
    <div style={{background:T.navy, minHeight:'100%', color:'#fff', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:'24px', position:'relative', overflow:'hidden'}}>
      <div style={{position:'absolute', inset:0, background:`radial-gradient(circle at 50% 30%, ${T.teal}22, transparent 60%)`}}/>
      <div style={{position:'relative', zIndex:2, textAlign:'center'}}>
        <FreyaOrb size={100} style={{margin:'0 auto 28px'}}/>
        <div style={{fontFamily:T.fMono, fontSize:9.5, color:T.teal, letterSpacing:2.5, fontWeight:700, marginBottom:10}}>FREYA · PSYCHOMETRIC AGENT</div>
        <div style={{fontFamily:T.fBn, fontSize:22, fontWeight:800, color:'#fff', marginBottom:30, lineHeight:1.35}}>
          {PERSONAS[ctx.applicantId]?.name}-এর<br/>প্রোফাইল একটু দেখে নিচ্ছি…
        </div>
        <div style={{width:260, margin:'0 auto'}}>
          {messages.map((m,i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12, padding:'10px 14px', marginBottom:6,
              background: i<step ? 'rgba(46,196,182,0.12)' : i===step ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
              border:`1px solid ${i<step ? T.teal : i===step ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
              borderRadius:10, opacity: i<=step ? 1 : 0.3, transition:'all 0.3s',
            }}>
              <span style={{fontSize:14, color: i<step ? T.teal : i===step ? '#fff' : 'rgba(255,255,255,0.3)'}}>
                {i<step ? '✓' : m.icon}
              </span>
              <div style={{textAlign:'left', flex:1}}>
                <div style={{fontFamily:T.fBn, fontSize:11.5, color:'#fff', fontWeight:600}}>{m.bn}</div>
                <div style={{fontFamily:T.fMono, fontSize:8.5, color:'rgba(255,255,255,0.4)', marginTop:1}}>{m.en}</div>
              </div>
              {i===step && <span style={{display:'inline-block', width:4, height:4, borderRadius:'50%', background:T.teal, animation:'blink 1s infinite'}}/>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────── RESULT ─────────
function ResultScreen({ ctx }) {
  const applicant = PERSONAS[ctx.applicantId] || PERSONAS.nasrin;
  const result = uM2(() => {
    if (Object.keys(ctx.answers).length === 0) {
      // synthesize a reasonable fake result if no answers (e.g., direct nav)
      const preset = { nasrin:{overall:742, rating:'B', flags:1}, rafiq:{overall:487, rating:'D', flags:3}, shima:{overall:821, rating:'A', flags:0} };
      const p = preset[ctx.applicantId] || preset.nasrin;
      return {
        overall: p.overall, rating: p.rating, risk: p.rating==='A'?'Low':p.rating==='B'?'Moderate':p.rating==='C'?'Elevated':'High',
        tenure: p.rating==='A'?24:p.rating==='B'?18:p.rating==='C'?12:9,
        flags: p.flags ? Array.from({length:p.flags}).map((_,i)=>({
          q:['q5','q10','q19'][i], type:['inconsistent','too-fast','social-desirability'][i],
          bn:['প্রশ্ন ৯ ও ১০-এর উত্তর মিলছে না','প্রশ্ন ১৯-এ অস্বাভাবিক দ্রুত উত্তর','প্রশ্ন ২১-এ "সর্বোচ্চ" উত্তর দ্রুত'][i],
          en:["Q9 & Q10 answers don't align","Q19 answered too fast","Q21 max-score answered too fast"][i],
        })) : [],
        dimScores: DIMENSIONS.map((d,i) => ({ ...d, pct: p.rating==='A'? [85,72,88,78,82,75,90][i] : p.rating==='B'? [78,65,70,72,68,60,82][i] : [45,38,42,58,40,52,48][i] })),
      };
    }
    return computeScore(ctx.answers, QUESTIONS, DIMENSIONS);
  }, [ctx.applicantId, ctx.answers]);

  const scoreColor = result.rating==='A'?T.green:result.rating==='B'?T.teal:result.rating==='C'?T.amber:T.coral;
  const recLoanAmt = result.rating==='A' ? applicant.loanAsk : result.rating==='B' ? Math.round(applicant.loanAsk*0.85) : result.rating==='C' ? Math.round(applicant.loanAsk*0.6) : Math.round(applicant.loanAsk*0.35);
  const emi = Math.round((recLoanAmt * 1.18) / result.tenure);

  const [tab, setTab] = uS2('summary');

  return (
    <div style={{background:T.cream, minHeight:'100%'}}>
      <BrandHeader title={{bn:'মূল্যায়ন ফলাফল', en:'Assessment Result'}} onBack={()=>ctx.go('dashboard')}
        right={<Chip color={T.teal}>✓ সম্পন্ন</Chip>}/>

      {/* Hero card */}
      <div style={{
        background:`linear-gradient(160deg, ${T.navy} 0%, ${T.navy2} 100%)`,
        padding:'22px 20px 20px', color:'#fff', position:'relative', overflow:'hidden',
      }}>
        <div style={{position:'absolute', top:-80, right:-80, width:260, height:260, borderRadius:'50%',
          background:`radial-gradient(circle, ${scoreColor}33, transparent 70%)`}}/>
        <div style={{display:'flex', alignItems:'center', gap:13, marginBottom:20, position:'relative'}}>
          <div style={{width:48, height:48, borderRadius:12, background:applicant.tint,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:T.fHead, fontSize:22, fontWeight:900, color:'#fff'}}>{applicant.avatar}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:T.fBn, fontSize:16, fontWeight:700}}>{applicant.name}</div>
            <div style={{fontFamily:T.fBody, fontSize:10.5, color:'rgba(255,255,255,0.5)'}}>{applicant.nameEn} · {applicant.occupationEn}</div>
          </div>
          <div style={{padding:'5px 12px', background:`${scoreColor}22`, border:`1px solid ${scoreColor}`, borderRadius:20,
            fontFamily:T.fMono, fontSize:11, color:scoreColor, fontWeight:700}}>{result.risk.toUpperCase()}</div>
        </div>
        <div style={{display:'flex', alignItems:'flex-end', gap:16, position:'relative'}}>
          <div>
            <div style={{fontFamily:T.fMono, fontSize:9, color:T.teal, letterSpacing:2, fontWeight:700, marginBottom:4}}>CREDIT SCORE · 0–1000</div>
            <div style={{display:'flex', alignItems:'baseline', gap:8}}>
              <span style={{fontFamily:T.fHead, fontSize:72, fontWeight:900, color:scoreColor, lineHeight:0.9}}>{bn(result.overall)}</span>
              <span style={{fontFamily:T.fHead, fontSize:28, fontWeight:900, color:'#fff'}}>/ {result.rating}</span>
            </div>
          </div>
        </div>
        {/* thin 0-1000 bar */}
        <div style={{marginTop:14, height:5, background:'rgba(255,255,255,0.1)', borderRadius:3, overflow:'hidden', position:'relative'}}>
          <div style={{width:`${result.overall/10}%`, height:'100%', background:scoreColor, borderRadius:3}}/>
          {[250,500,750].map(m=>(
            <div key={m} style={{position:'absolute', left:`${m/10}%`, top:0, width:1, height:5, background:'rgba(255,255,255,0.3)'}}/>
          ))}
        </div>
        <div style={{display:'flex', justifyContent:'space-between', marginTop:5, fontFamily:T.fMono, fontSize:8, color:'rgba(255,255,255,0.4)'}}>
          <span>D · HIGH RISK</span><span>C</span><span>B</span><span>A · LOW RISK</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex', gap:4, padding:'10px 12px 2px', background:'#fff', borderBottom:`1px solid ${T.border}`}}>
        {[
          {id:'summary', bn:'সারাংশ', en:'Summary'},
          {id:'dims',    bn:'মাত্রা',  en:'Dimensions'},
          {id:'flags',   bn:'পতাকা',   en:'Flags', n: result.flags.length},
          {id:'loan',    bn:'ঋণ',     en:'Loan'},
        ].map(tt=>(
          <button key={tt.id} onClick={()=>setTab(tt.id)} style={{
            flex:1, padding:'10px 4px', border:'none', background:'transparent', cursor:'pointer',
            borderBottom: tab===tt.id ? `2.5px solid ${T.teal}` : '2.5px solid transparent',
            fontFamily:T.fBn, fontSize:12, fontWeight:700, color: tab===tt.id ? T.navy : T.ink3,
            display:'flex', flexDirection:'column', alignItems:'center', gap:1,
          }}>
            <span>{tt.bn} {tt.n>0 && <span style={{fontFamily:T.fMono, fontSize:9, color:T.coral, marginLeft:3}}>{bn(tt.n)}</span>}</span>
            <span style={{fontFamily:T.fBody, fontSize:9, color:T.ink4, letterSpacing:0.3}}>{tt.en}</span>
          </button>
        ))}
      </div>

      <div style={{padding:'16px', background:T.cream}}>
        {tab==='summary' && <SummaryTab result={result} applicant={applicant} recLoanAmt={recLoanAmt} emi={emi}/>}
        {tab==='dims' && <DimsTab result={result}/>}
        {tab==='flags' && <FlagsTab result={result}/>}
        {tab==='loan' && <LoanTab result={result} applicant={applicant} recLoanAmt={recLoanAmt} emi={emi}/>}
      </div>

      <div style={{padding:'0 16px 16px', display:'flex', gap:10}}>
        <button onClick={()=>ctx.go('dashboard')} style={{
          flex:1, padding:13, borderRadius:12, border:`1.5px solid ${T.border2}`, background:'#fff',
          fontFamily:T.fBn, fontSize:13, color:T.ink2, fontWeight:700, cursor:'pointer',
        }}>পরে দেখব</button>
        <button style={{
          flex:2, padding:13, borderRadius:12, border:'none', background:T.teal, color:'#fff',
          fontFamily:T.fBn, fontSize:13, fontWeight:700, cursor:'pointer',
          boxShadow:`0 4px 14px ${T.teal}50`,
        }}>✓ অনুমোদন করে পাঠান</button>
      </div>
    </div>
  );
}

function SummaryTab({ result, applicant, recLoanAmt, emi }) {
  const interviewPrompts = [
    { bn:`${applicant.nameEn.split(' ')[0]} ভাই/আপাকে জিজ্ঞেস করুন: "গত ৬ মাসে কোনো কিস্তি কেন দেরি হয়েছিল?"`, en:'Probe payment discipline history' },
    { bn:'তার দোকানে সবচেয়ে বেশি বিক্রি হয় এমন ৩টা জিনিস কী কী — জিজ্ঞেস করে দেখুন', en:'Verify stated market knowledge' },
    { bn:'আশেপাশে অন্য কোন দোকান আছে, কেমন চলে — জানতে চান', en:'Test business awareness claims' },
  ];
  return (
    <div>
      {/* Freya speaks */}
      <div style={{background:T.navy, borderRadius:14, padding:14, color:'#fff', marginBottom:12}}>
        <div style={{display:'flex', gap:10, alignItems:'flex-start'}}>
          <FreyaOrb size={36} pulse={false}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:T.fMono, fontSize:8.5, color:T.teal, letterSpacing:1.5, fontWeight:700, marginBottom:3}}>FREYA · পরামর্শ</div>
            <div style={{fontFamily:T.fBn, fontSize:12.5, color:'rgba(255,255,255,0.9)', lineHeight:1.7}}>
              {result.rating==='A' && `${applicant.name}-এর প্রোফাইল দারুণ। টাকা সামলানো আর ব্যবসা বোঝা — দুটোতেই ভালো। ${fmtTk(recLoanAmt)} টাকা পুরোটাই দেওয়া যায়, আমার মত তাই।`}
              {result.rating==='B' && `${applicant.name}-এর সামগ্রিক অবস্থা ভালোই। কয়েক জায়গায় উত্তর পুরো মিলেনি — বসে একটু কথা বলে যাচাই করে নিলে ভালো হয়।`}
              {result.rating==='C' && `${applicant.name}-এর প্রোফাইলে কিছু দুর্বল জায়গা আছে। প্রথমে ছোট অঙ্কে শুরু করুন — ভালো চললে পরে বাড়ানো যাবে।`}
              {result.rating==='D' && `${applicant.name}-এর ক্ষেত্রে এখনই ঋণ দেওয়া ঠিক হবে না। একটু ব্যবসায়িক প্রশিক্ষণ নেওয়ার পরে আবার দেখা যেতে পারে।`}
            </div>
          </div>
        </div>
      </div>

      {/* Quick metrics */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12}}>
        <MetricTile label={{bn:'সুপারিশকৃত ঋণ', en:'Recommended'}} val={fmtTk(recLoanAmt)} sub={`${bn(result.tenure)} মাসে`} color={T.teal}/>
        <MetricTile label={{bn:'মাসিক কিস্তি', en:'Monthly EMI'}} val={fmtTk(emi)} sub={`${bn(result.tenure)} মাস`} color={T.gold}/>
        <MetricTile label={{bn:'ঝুঁকি স্তর', en:'Risk tier'}} val={result.risk} sub={`Rating ${result.rating}`} color={result.rating==='A'?T.green:result.rating==='B'?T.teal:result.rating==='C'?T.amber:T.coral}/>
        <MetricTile label={{bn:'পতাকা', en:'Flags raised'}} val={bn(result.flags.length)} sub={result.flags.length===0?'পরিষ্কার':'পর্যালোচনা'} color={result.flags.length===0?T.green:T.coral}/>
      </div>

      {/* Interview prompts */}
      <div style={{background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:14, marginBottom:12}}>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
          <span style={{fontSize:16}}>💬</span>
          <BilingualLabel bn="বসে একটু কথা বলুন এগুলো নিয়ে" en="Ask during interview" sizeBn={13} sizeEn={10} weight={700}/>
        </div>
        {interviewPrompts.map((p,i)=>(
          <div key={i} style={{display:'flex', gap:10, padding:'10px 0', borderTop:i>0?`1px solid ${T.border}`:'none'}}>
            <div style={{width:22, height:22, borderRadius:6, background:T.goldBg, color:T.gold,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:T.fMono, fontSize:10, fontWeight:700, flexShrink:0}}>{bn(i+1)}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:T.fBn, fontSize:12.5, color:T.ink, lineHeight:1.5, fontWeight:600}}>{p.bn}</div>
              <div style={{fontFamily:T.fBody, fontSize:10, color:T.ink3, fontStyle:'italic', marginTop:2}}>{p.en}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Portfolio comparison */}
      <div style={{background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:14}}>
        <BilingualLabel bn="অনুরূপ আবেদনকারীদের সাথে তুলনা" en="Similar historical borrowers" sizeBn={13} sizeEn={10} weight={700} style={{marginBottom:12}}/>
        <div style={{fontFamily:T.fBn, fontSize:11, color:T.ink3, marginBottom:10, lineHeight:1.65}}>
          গত ১২ মাসে আপনার PO-তে এই রকম প্রোফাইলের <span style={{color:T.navy, fontWeight:700}}>{bn(34)} জন</span> এসেছিলেন — তাদের গল্পটা দেখে নিন।
        </div>
        <div style={{display:'flex', gap:10}}>
          {[
            {label:{bn:'সময়মতো পরিশোধ',en:'On-time repayment'}, val:result.rating==='A'?'৯২%':result.rating==='B'?'৮১%':result.rating==='C'?'৬৮%':'৪২%', color:T.green},
            {label:{bn:'পুনঃঋণ হার',en:'Re-borrow rate'}, val:result.rating==='A'?'৮৪%':result.rating==='B'?'৬৭%':result.rating==='C'?'৫১%':'২৮%', color:T.teal},
            {label:{bn:'ডিফল্ট',en:'Default rate'}, val:result.rating==='A'?'৩%':result.rating==='B'?'৯%':result.rating==='C'?'১৮%':'৩৪%', color:T.coral},
          ].map((m,i)=>(
            <div key={i} style={{flex:1, textAlign:'center', padding:'8px 6px', background:T.cream2, borderRadius:10}}>
              <div style={{fontFamily:T.fHead, fontSize:20, fontWeight:900, color:m.color}}>{m.val}</div>
              <div style={{fontFamily:T.fBn, fontSize:9.5, color:T.ink2, fontWeight:600, marginTop:2, lineHeight:1.3}}>{m.label.bn}</div>
              <div style={{fontFamily:T.fMono, fontSize:7.5, color:T.ink4, marginTop:1}}>{m.label.en}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, val, sub, color }) {
  return (
    <div style={{background:'#fff', border:`1px solid ${T.border}`, borderLeft:`3px solid ${color}`, borderRadius:12, padding:'11px 13px'}}>
      <div style={{fontFamily:T.fBn, fontSize:10, color:T.ink3, fontWeight:600, marginBottom:3}}>{label.bn}</div>
      <div style={{fontFamily:T.fHead, fontSize:18, fontWeight:900, color, lineHeight:1.1}}>{val}</div>
      <div style={{fontFamily:T.fMono, fontSize:8.5, color:T.ink4, marginTop:3, letterSpacing:0.2}}>{sub}</div>
    </div>
  );
}

function DimsTab({ result }) {
  // Radar-ish chart via SVG
  const size = 280;
  const cx = size/2, cy = size/2, r = 100;
  const n = result.dimScores.length;
  const points = result.dimScores.map((d,i)=>{
    const angle = -Math.PI/2 + (i / n) * Math.PI * 2;
    const rr = r * (d.pct/100);
    return { x: cx + Math.cos(angle)*rr, y: cy + Math.sin(angle)*rr, d, angle };
  });
  const polygon = points.map(p=>`${p.x},${p.y}`).join(' ');
  return (
    <div>
      <div style={{background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:14, marginBottom:12}}>
        <BilingualLabel bn="৭ মাত্রার স্কোর" en="7-dimension radar" sizeBn={13} sizeEn={10} weight={700} style={{marginBottom:6}}/>
        <svg width={size} height={size} style={{display:'block', margin:'0 auto'}}>
          {/* concentric guides */}
          {[0.25,0.5,0.75,1].map(f=>(
            <circle key={f} cx={cx} cy={cy} r={r*f} fill="none" stroke={T.border} strokeDasharray={f===1?'none':'2,3'}/>
          ))}
          {/* axes + labels */}
          {result.dimScores.map((d,i)=>{
            const angle = -Math.PI/2 + (i/n)*Math.PI*2;
            const lx = cx + Math.cos(angle)*(r+22), ly = cy + Math.sin(angle)*(r+22);
            const lx2 = cx + Math.cos(angle)*r, ly2 = cy + Math.sin(angle)*r;
            return (
              <g key={d.id}>
                <line x1={cx} y1={cy} x2={lx2} y2={ly2} stroke={T.border} strokeWidth={1}/>
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                  fontFamily={T.fBn} fontSize={10} fontWeight={700} fill={d.color}>
                  {d.bn.split(' ')[0]}
                </text>
              </g>
            );
          })}
          {/* filled polygon */}
          <polygon points={polygon} fill={`${T.teal}33`} stroke={T.teal} strokeWidth={2}/>
          {points.map((p,i)=>(
            <circle key={i} cx={p.x} cy={p.y} r={4} fill={p.d.color} stroke="#fff" strokeWidth={2}/>
          ))}
        </svg>
      </div>
      {/* List */}
      <div style={{background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:'10px 14px'}}>
        {result.dimScores.map((d,i)=>(
          <div key={d.id} style={{padding:'10px 0', borderTop:i>0?`1px solid ${T.border}`:'none'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5}}>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <span style={{fontSize:14, color:d.color}}>{d.icon}</span>
                <div>
                  <div style={{fontFamily:T.fBn, fontSize:12.5, fontWeight:700, color:T.ink}}>{d.bn}</div>
                  <div style={{fontFamily:T.fMono, fontSize:8.5, color:T.ink4, letterSpacing:0.3}}>{d.en.toUpperCase()}</div>
                </div>
              </div>
              <div style={{fontFamily:T.fHead, fontSize:22, fontWeight:900, color:d.color}}>{bn(d.pct)}<span style={{fontSize:12, opacity:0.7}}>%</span></div>
            </div>
            <div style={{height:4, background:T.cream2, borderRadius:2, overflow:'hidden'}}>
              <div style={{width:`${d.pct}%`, height:'100%', background:d.color, transition:'width 0.8s'}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlagsTab({ result }) {
  if (result.flags.length === 0) {
    return (
      <div style={{background:'#fff', border:`1px solid ${T.green}40`, borderRadius:14, padding:24, textAlign:'center'}}>
        <div style={{fontSize:42, marginBottom:10}}>✓</div>
        <BilingualLabel bn="কোনো পতাকা নেই" en="No flags raised" sizeBn={15} sizeEn={11} weight={800} align="center" color={T.green}/>
        <div style={{fontFamily:T.fBn, fontSize:12, color:T.ink3, marginTop:8, lineHeight:1.55}}>
          আবেদনকারীর উত্তরে কোনো অসামঞ্জস্য, সামাজিক-কাম্যতা, বা সময়গত সন্দেহ পাওয়া যায়নি।
        </div>
      </div>
    );
  }
  const typeColor = { 'inconsistent':T.violet, 'too-fast':T.amber, 'social-desirability':T.coral };
  const typeLabel = {
    'inconsistent': { bn:'অসামঞ্জস্যপূর্ণ উত্তর', en:'Inconsistent pair' },
    'too-fast': { bn:'অস্বাভাবিক দ্রুত উত্তর', en:'Answered too fast' },
    'social-desirability': { bn:'সামাজিক-কাম্যতা প্রবণতা', en:'Social desirability bias' },
  };
  return (
    <div>
      <div style={{background:`${T.coral}10`, border:`1px solid ${T.coral}40`, borderLeft:`3px solid ${T.coral}`,
        borderRadius:12, padding:'12px 14px', marginBottom:12}}>
        <div style={{fontFamily:T.fBn, fontSize:12.5, color:T.ink, fontWeight:700, marginBottom:4}}>⚑ {bn(result.flags.length)}টি সতর্কতা পতাকা উঠেছে</div>
        <div style={{fontFamily:T.fBn, fontSize:11, color:T.ink2, lineHeight:1.55}}>
          এগুলো প্রত্যাখ্যানের কারণ নয় — সাক্ষাৎকারে অতিরিক্ত যাচাই প্রয়োজন।
        </div>
      </div>
      {result.flags.map((f,i)=>{
        const c = typeColor[f.type] || T.amber;
        const tl = typeLabel[f.type] || {bn:f.type, en:f.type};
        return (
          <div key={i} style={{background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, padding:13, marginBottom:10}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
              <Chip color={c} size={9}>{tl.en.toUpperCase()}</Chip>
              <span style={{fontFamily:T.fMono, fontSize:9, color:T.ink4, fontWeight:700}}>Q{f.q?.slice(1) || '?'}</span>
            </div>
            <div style={{fontFamily:T.fBn, fontSize:12.5, color:T.ink, fontWeight:600, lineHeight:1.55, marginBottom:3}}>{f.bn}</div>
            <div style={{fontFamily:T.fBody, fontSize:10.5, color:T.ink3, fontStyle:'italic'}}>{f.en}</div>
          </div>
        );
      })}
    </div>
  );
}

function LoanTab({ result, applicant, recLoanAmt, emi }) {
  return (
    <div>
      <div style={{background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:16, marginBottom:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14}}>
          <BilingualLabel bn="ঋণ সুপারিশ" en="Loan recommendation" sizeBn={13} sizeEn={10} weight={700}/>
          <Chip color={T.teal} size={9}>FREYA CALCULATED</Chip>
        </div>
        <div style={{display:'flex', gap:14, padding:'14px 16px', background:T.navy, borderRadius:12, color:'#fff', marginBottom:12}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:T.fMono, fontSize:8.5, color:T.teal, letterSpacing:1.5, fontWeight:700}}>REQUESTED</div>
            <div style={{fontFamily:T.fHead, fontSize:20, fontWeight:900, color:'rgba(255,255,255,0.55)', marginTop:4}}>{fmtTk(applicant.loanAsk)}</div>
          </div>
          <div style={{width:1, background:'rgba(255,255,255,0.1)'}}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:T.fMono, fontSize:8.5, color:T.teal, letterSpacing:1.5, fontWeight:700}}>RECOMMENDED</div>
            <div style={{fontFamily:T.fHead, fontSize:24, fontWeight:900, color:T.teal, marginTop:4}}>{fmtTk(recLoanAmt)}</div>
          </div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          {[
            {bn:'মেয়াদ', en:'Tenure', val:`${bn(result.tenure)} মাস`, c:T.gold},
            {bn:'মাসিক কিস্তি', en:'EMI', val:fmtTk(emi), c:T.teal},
            {bn:'সার্ভিস চার্জ', en:'Service charge', val:'১২%', c:T.ink2},
            {bn:'কিস্তি ফ্রিকোয়েন্সি', en:'Frequency', val:'সাপ্তাহিক', c:T.ink2},
          ].map((x,i)=>(
            <div key={i} style={{padding:'10px 12px', background:T.cream2, borderRadius:10}}>
              <div style={{fontFamily:T.fBn, fontSize:10.5, color:T.ink3, fontWeight:600}}>{x.bn}</div>
              <div style={{fontFamily:T.fBn, fontSize:14, color:x.c, fontWeight:800, marginTop:3}}>{x.val}</div>
              <div style={{fontFamily:T.fMono, fontSize:8.5, color:T.ink4, letterSpacing:0.3, marginTop:1}}>{x.en}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reasoning */}
      <div style={{background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:14}}>
        <BilingualLabel bn="কেন এই অঙ্কটা?" en="Why this amount?" sizeBn={13} sizeEn={10} weight={700} style={{marginBottom:10}}/>
        <div style={{fontFamily:T.fBn, fontSize:12, color:T.ink2, lineHeight:1.8}}>
          {[
            result.rating==='A' ? `• মোট স্কোর ${bn(result.overall)} — সেরা ১৫%-এর মধ্যে আছেন`
              : result.rating==='B' ? `• মোট স্কোর ${bn(result.overall)} — ভালো জায়গায় আছে`
              : `• মোট স্কোর ${bn(result.overall)} — তাই একটু সাবধানে শুরু করি`,
            `• ${bn(result.flags.length)}টা জায়গায় সন্দেহ ছিল, সেগুলোও ধরেছি`,
            `• আগে এরকম প্রোফাইলের লোকজন কেমন কিস্তি দিয়েছে, সেটাও দেখলাম`,
            `• সঞ্চয় ${fmtTk(applicant.savings)} — মাসের কিস্তি টেনে নিতে অসুবিধা হবে না`,
          ].map((t,i)=><div key={i} style={{marginBottom:4}}>{t}</div>)}
        </div>
      </div>
    </div>
  );
}

window.AssessmentScreen = AssessmentScreen;
window.ScoringScreen = ScoringScreen;
window.ResultScreen = ResultScreen;
window.FreyaHint = FreyaHint;
