// screens-a.jsx — Dashboard, Intake, History, Analytics, BottomNav

const { useState: uSa, useEffect: uEa } = React;
const { T, PERSONAS, bn, fmtTk, BilingualLabel, Chip, BrandHeader, FreyaOrb, PrimaryBtn, Field } = window;

function BottomNav({ ctx, active }) {
  const items = [
    { id:'dashboard', bn:'হোম', en:'Home', icon:'⌂' },
    { id:'history', bn:'ইতিহাস', en:'History', icon:'◷' },
    { id:'intake', bn:'নতুন', en:'New', icon:'＋', primary:true },
    { id:'analytics', bn:'বিশ্লেষণ', en:'Analytics', icon:'◫' },
    { id:'profile', bn:'আমি', en:'Profile', icon:'◉' },
  ];
  return (
    <div style={{
      background:'#fff', borderTop:`1px solid ${T.border}`, padding:'8px 10px 10px',
      display:'flex', justifyContent:'space-around', alignItems:'flex-end', gap:4,
    }}>
      {items.map(it => {
        const on = active === it.id;
        if (it.primary) return (
          <button key={it.id} onClick={()=>ctx.go(it.id)} style={{
            width:52, height:52, borderRadius:16, background:T.teal, color:'#fff', border:'none',
            fontSize:26, cursor:'pointer', boxShadow:`0 6px 18px ${T.teal}60`, marginTop:-18,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{it.icon}</button>
        );
        return (
          <button key={it.id} onClick={()=>ctx.go(it.id)} style={{
            flex:1, padding:'6px 4px', border:'none', background:'transparent', cursor:'pointer',
            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
          }}>
            <span style={{fontSize:18, color:on?T.teal2:T.ink4}}>{it.icon}</span>
            <span style={{fontFamily:T.fBn, fontSize:10, fontWeight:700, color:on?T.teal2:T.ink3}}>{it.bn}</span>
          </button>
        );
      })}
    </div>
  );
}

function ApplicantRow({ row, onClick }) {
  const p = PERSONAS[row.id];
  const color = row.status==='completed'
    ? (row.rating==='A'?T.green:row.rating==='B'?T.teal:row.rating==='C'?T.amber:T.coral)
    : T.gold;
  return (
    <div onClick={onClick} style={{
      background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:'13px 14px',
      marginBottom:10, display:'flex', alignItems:'center', gap:13, cursor:'pointer', boxShadow:T.shadow,
      transition:'transform 0.12s',
    }}
    onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
    onMouseLeave={e=>e.currentTarget.style.transform='none'}>
      <div style={{width:44, height:44, borderRadius:12, background:p.tint, color:'#fff',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:T.fBn, fontSize:16, fontWeight:900, flexShrink:0}}>{p.avatar}</div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:2}}>
          <span style={{fontFamily:T.fBn, fontSize:14, fontWeight:700, color:T.ink}}>{p.name}</span>
          {row.status==='completed' && <Chip color={color} size={8.5}>{row.rating}</Chip>}
          {row.status==='in-progress' && <Chip color={T.gold} size={8.5}>চলমান</Chip>}
        </div>
        <div style={{fontFamily:T.fBn, fontSize:11, color:T.ink3, marginBottom:3}}>{p.village} · {fmtTk(p.loanAsk)}</div>
        <div style={{fontFamily:T.fMono, fontSize:9, color:T.ink4, letterSpacing:0.3}}>{row.whenEn}</div>
      </div>
      <div style={{textAlign:'right'}}>
        {row.status==='completed' ? (
          <>
            <div style={{fontFamily:T.fHead, fontSize:22, fontWeight:900, color, lineHeight:1}}>{row.score}</div>
            <div style={{fontFamily:T.fMono, fontSize:8.5, color:T.ink4, marginTop:2}}>/ 1000</div>
            {row.flags>0 && <Chip color={T.coral} size={8} style={{marginTop:5}}>⚑ {row.flags}</Chip>}
          </>
        ) : (
          <>
            <div style={{fontFamily:T.fMono, fontSize:12, color:T.gold, fontWeight:700}}>{row.step}/{row.total}</div>
            <div style={{width:50, height:4, background:T.border, borderRadius:2, marginTop:4, overflow:'hidden'}}>
              <div style={{width:`${row.step/row.total*100}%`, height:'100%', background:T.gold}}/>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DashboardScreen({ ctx }) {
  const stats = [
    { bn:'আজ যতজনকে দেখলাম', en:"Today's assessments", val:'৭', accent:T.teal },
    { bn:'এখনো বাকি আছে', en:'Pending review', val:'৩', accent:T.gold },
    { bn:'সন্দেহের ঘর', en:'Risk flags', val:'২', accent:T.coral },
  ];
  const applicants = [
    { id:'nasrin', status:'completed', score:742, rating:'B', flags:1, when:'আজ · ২:১৪ PM', whenEn:'Today · 2:14 PM' },
    { id:'rafiq', status:'in-progress', step:14, total:25, when:'আজ · ১১:২০ AM', whenEn:'Today · 11:20 AM' },
    { id:'shima', status:'completed', score:821, rating:'A', flags:0, when:'কাল · ৩:৪৫ PM', whenEn:'Yesterday · 3:45 PM' },
  ];
  return (
    <div style={{background:T.cream, minHeight:'100%', display:'flex', flexDirection:'column'}}>
      <div style={{
        background:`linear-gradient(160deg, ${T.navy} 0%, ${T.navy2} 70%)`,
        color:'#fff', padding:'22px 20px 68px', position:'relative', overflow:'hidden',
      }}>
        <div style={{position:'absolute', top:-60, right:-60, width:220, height:220, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(46,196,182,0.22), transparent 70%)'}}/>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, position:'relative'}}>
          <div>
            <div style={{fontFamily:T.fMono, fontSize:9, color:T.teal, letterSpacing:2, fontWeight:700, marginBottom:6}}>PKSF · BURO-BANGLADESH PO</div>
            <div style={{fontFamily:T.fBn, fontSize:22, fontWeight:800, color:'#fff', lineHeight:1.3}}>আসসালামু আলাইকুম, কামরুল ভাই</div>
            <div style={{fontFamily:T.fBody, fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:5}}>Kamrul Hossain · Loan Officer · ID 21047</div>
          </div>
          <div style={{width:40, height:40, borderRadius:'50%', background:T.teal, color:T.navy,
            display:'flex', alignItems:'center', justifyContent:'center', fontFamily:T.fBn, fontSize:17, fontWeight:900}}>ক</div>
        </div>
        <div style={{display:'flex', gap:10, position:'relative'}}>
          {stats.map((s,i)=>(
            <div key={i} style={{flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:12, padding:'11px 12px', backdropFilter:'blur(10px)'}}>
              <div style={{fontFamily:T.fHead, fontSize:26, fontWeight:900, color:s.accent, lineHeight:1}}>{s.val}</div>
              <div style={{fontFamily:T.fBn, fontSize:10.5, color:'rgba(255,255,255,0.7)', marginTop:5, lineHeight:1.3}}>{s.bn}</div>
              <div style={{fontFamily:T.fBody, fontSize:8.5, color:'rgba(255,255,255,0.35)', marginTop:1}}>{s.en}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{margin:'-48px 16px 16px', background:'#fff', borderRadius:18, padding:16,
        boxShadow:T.shadowLg, border:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:14, position:'relative', zIndex:2}}>
        <div style={{width:52, height:52, borderRadius:14, background:T.tealBg,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, color:T.teal2}}>＋</div>
        <div style={{flex:1}}>
          <BilingualLabel bn="নতুন আবেদনকারী" en="New applicant" sizeBn={16} sizeEn={11} weight={800}/>
          <div style={{fontFamily:T.fBn, fontSize:11, color:T.ink3, marginTop:4}}>চলুন, একজনকে নিয়ে বসি</div>
        </div>
        <button onClick={()=>ctx.go('intake')} style={{
          padding:'10px 14px', borderRadius:10, border:'none', background:T.teal, color:'#fff',
          fontFamily:T.fBn, fontSize:13, fontWeight:700, cursor:'pointer',
        }}>শুরু →</button>
      </div>

      <div style={{flex:1, padding:'4px 16px 4px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'12px 4px 10px'}}>
          <BilingualLabel bn="সাম্প্রতিক আবেদনকারী" en="Recent applicants" sizeBn={14} sizeEn={10} weight={700}/>
          <span onClick={()=>ctx.go('history')} style={{fontFamily:T.fBn, fontSize:11, color:T.teal2, fontWeight:700, cursor:'pointer'}}>সবগুলো দেখুন →</span>
        </div>
        {applicants.map(a => <ApplicantRow key={a.id+a.whenEn} row={a} onClick={()=>{
          ctx.setApplicant(a.id);
          ctx.go(a.status==='completed' ? 'result' : 'assessment');
        }}/>)}
      </div>
      <BottomNav ctx={ctx} active="dashboard"/>
    </div>
  );
}

function IntakeScreen({ ctx }) {
  const [persona, setPersona] = uSa(ctx.applicantId || 'nasrin');
  const active = PERSONAS[persona];
  uEa(()=>{ ctx.setApplicant(persona); }, [persona]);
  return (
    <div style={{background:T.cream, minHeight:'100%'}}>
      <BrandHeader title={{bn:'নতুন আবেদনকারী', en:'New Applicant Intake'}} onBack={()=>ctx.go('dashboard')}
        subtitle="STEP 1 OF 3 · BASIC INFO" right={<Chip color={T.teal}>১/৩</Chip>}/>
      <div style={{padding:'14px 16px 4px'}}>
        <div style={{fontFamily:T.fMono, fontSize:9, letterSpacing:1.5, color:T.ink4, fontWeight:700, marginBottom:8}}>DEMO: CHOOSE APPLICANT</div>
        <div style={{display:'flex', gap:8, marginBottom:16}}>
          {Object.values(PERSONAS).map(pp => (
            <button key={pp.id} onClick={()=>setPersona(pp.id)} style={{
              flex:1, padding:'9px 8px', border:`1.5px solid ${persona===pp.id?pp.tint:T.border}`,
              background: persona===pp.id ? `${pp.tint}15` : '#fff', borderRadius:12, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6, fontFamily:T.fBn, fontSize:11, fontWeight:700, color:T.ink,
              boxShadow: persona===pp.id?`0 0 0 3px ${pp.tint}20`:'none',
            }}>
              <span style={{width:22, height:22, borderRadius:'50%', background:pp.tint, color:'#fff',
                display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800}}>{pp.avatar}</span>
              {pp.nameEn.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
      <div style={{padding:'4px 16px 80px'}}>
        <div style={{background:'#fff', border:`1px solid ${T.border}`, borderRadius:16, padding:12, marginBottom:12}}>
          <BilingualLabel bn="ছবি ও NID" en="Photo & National ID" sizeBn={13} sizeEn={10} weight={700} style={{marginBottom:12}}/>
          <div style={{display:'flex', gap:8}}>
            <div style={{flex:1, aspectRatio:'3/4', background:`linear-gradient(135deg, ${active.tint}30, ${active.tint}10)`,
              border:`1.5px dashed ${active.tint}80`, borderRadius:12,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, padding:8}}>
              <div style={{width:48, height:48, borderRadius:'50%', background:active.tint, color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center', fontFamily:T.fBn, fontSize:22, fontWeight:900}}>{active.avatar}</div>
              <div style={{fontFamily:T.fMono, fontSize:8, color:T.ink3, letterSpacing:0.8}}>APPLICANT PHOTO</div>
            </div>
            <div style={{flex:1, aspectRatio:'3/4', background:'#fff', border:`1.5px dashed ${T.border2}`, borderRadius:12,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5, padding:8, textAlign:'center'}}>
              <div style={{fontSize:26}}>🪪</div>
              <div style={{fontFamily:T.fBn, fontSize:10.5, color:T.ink2, fontWeight:700}}>NID তুলুন</div>
              <div style={{fontFamily:T.fMono, fontSize:7.5, color:T.ink4, letterSpacing:0.4}}>AUTO-OCR · BANGLA</div>
              <div style={{fontFamily:T.fMono, fontSize:8, color:T.green, fontWeight:700, marginTop:2, wordBreak:'break-all', lineHeight:1.2}}>✓ {active.nid}</div>
            </div>
          </div>
        </div>
        <Field label={{bn:'পূর্ণ নাম', en:'Full name'}} value={active.name} onChange={()=>{}}/>
        <div style={{display:'flex', gap:8}}>
          <div style={{flex:1}}><Field label={{bn:'বয়স', en:'Age'}} value={String(active.age)} onChange={()=>{}}/></div>
          <div style={{flex:1}}><Field label={{bn:'লিঙ্গ', en:'Gender'}} value={active.gender==='F'?'মহিলা':'পুরুষ'} onChange={()=>{}}/></div>
        </div>
        <Field label={{bn:'গ্রাম / এলাকা', en:'Village / area'}} value={active.village} onChange={()=>{}}/>
        <Field label={{bn:'পেশা', en:'Occupation'}} value={active.occupation} onChange={()=>{}}/>
        <div style={{display:'flex', gap:8}}>
          <div style={{flex:1}}><Field label={{bn:'ঋণ চাওয়া', en:'Loan ask'}} value={`${bn(active.loanAsk)} ৳`} onChange={()=>{}}/></div>
          <div style={{flex:1}}><Field label={{bn:'সঞ্চয়', en:'Savings'}} value={`${bn(active.savings)} ৳`} onChange={()=>{}}/></div>
        </div>
        <Field label={{bn:'ঋণের উদ্দেশ্য', en:'Loan purpose'}} value={active.loanPurpose} onChange={()=>{}}/>
        <div style={{background:T.tealBg, border:`1px solid ${T.teal}40`, borderLeft:`3px solid ${T.teal}`,
          borderRadius:10, padding:'12px 14px', margin:'12px 0 16px', display:'flex', gap:10}}>
          <FreyaOrb size={32} pulse={false}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:T.fBn, fontSize:12, fontWeight:700, color:T.navy, marginBottom:4}}>Freya বলছে:</div>
            <div style={{fontFamily:T.fBn, fontSize:12, color:T.ink2, lineHeight:1.65}}>
              তথ্যগুলো ভালোই লাগছে। এখন ২৫টা প্রশ্ন ধরে ধরে করব — ১২ থেকে ১৫ মিনিট লাগবে, তাড়া নেই।
            </div>
          </div>
        </div>
        <PrimaryBtn label={{bn:'চলো প্রশ্ন শুরু করি', en:'Start assessment'}} icon="→" onClick={()=>ctx.go('assessment')}/>
      </div>
    </div>
  );
}

function HistoryScreen({ ctx }) {
  const records = [
    { id:'nasrin', score:742, rating:'B', flags:1, dateEn:'25 Apr 2026', outcome:'approved' },
    { id:'shima',  score:821, rating:'A', flags:0, dateEn:'24 Apr 2026', outcome:'approved' },
    { id:'rafiq',  score:487, rating:'D', flags:3, dateEn:'22 Apr 2026', outcome:'declined' },
    { id:'nasrin', score:710, rating:'B', flags:0, dateEn:'18 Apr 2026', outcome:'approved' },
    { id:'shima',  score:625, rating:'C', flags:2, dateEn:'15 Apr 2026', outcome:'review' },
  ];
  const [filter, setFilter] = uSa('all');
  const filters = [
    {id:'all', bn:'সব', n:records.length},
    {id:'approved', bn:'অনুমোদিত', n:3},
    {id:'review', bn:'পুনর্বিবেচনা', n:1},
    {id:'declined', bn:'প্রত্যাখ্যাত', n:1},
  ];
  return (
    <div style={{background:T.cream, minHeight:'100%', display:'flex', flexDirection:'column'}}>
      <BrandHeader title={{bn:'আবেদন ইতিহাস', en:'Assessment History'}} onBack={()=>ctx.go('dashboard')}
        right={<Chip color={T.teal}>{bn(records.length)}</Chip>}/>
      <div style={{padding:'14px 16px 8px'}}>
        <div style={{display:'flex', gap:6, overflowX:'auto', paddingBottom:4}}>
          {filters.map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{
              padding:'7px 13px', borderRadius:20, cursor:'pointer', whiteSpace:'nowrap',
              background: filter===f.id?T.navy:'#fff', color: filter===f.id?'#fff':T.ink2,
              fontFamily:T.fBn, fontSize:11, fontWeight:700,
              border: filter===f.id?'none':`1px solid ${T.border}`,
            }}>{f.bn} <span style={{fontFamily:T.fMono, fontSize:9, opacity:0.6, marginLeft:4}}>{bn(f.n)}</span></button>
          ))}
        </div>
      </div>
      <div style={{flex:1, padding:'0 16px 20px'}}>
        {records.filter(r=>filter==='all'||r.outcome===filter).map((r,i)=>{
          const p = PERSONAS[r.id];
          const color = r.rating==='A'?T.green:r.rating==='B'?T.teal:r.rating==='C'?T.amber:T.coral;
          return (
            <div key={i} onClick={()=>{ctx.setApplicant(r.id); ctx.go('result');}} style={{
              background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:14,
              marginBottom:10, display:'flex', alignItems:'center', gap:13, cursor:'pointer', boxShadow:T.shadow,
            }}>
              <div style={{width:44, height:44, borderRadius:12, background:p.tint, color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:T.fBn, fontSize:16, fontWeight:900, flexShrink:0}}>{p.avatar}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:T.fBn, fontSize:13, fontWeight:700, color:T.ink, marginBottom:3}}>{p.name}</div>
                <div style={{fontFamily:T.fMono, fontSize:9.5, color:T.ink4, letterSpacing:0.3, marginBottom:4}}>{r.dateEn}</div>
                <div style={{display:'flex', gap:5}}>
                  {r.outcome==='approved' && <Chip color={T.green} size={8.5}>✓ অনুমোদিত</Chip>}
                  {r.outcome==='declined' && <Chip color={T.coral} size={8.5}>✗ প্রত্যাখ্যাত</Chip>}
                  {r.outcome==='review' && <Chip color={T.amber} size={8.5}>⋯ পুনর্বিবেচনা</Chip>}
                  {r.flags>0 && <Chip color={T.coral} size={8.5}>⚑{bn(r.flags)}</Chip>}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:T.fHead, fontSize:22, fontWeight:900, color, lineHeight:1}}>{bn(r.score)}</div>
                <Chip color={color} size={8} style={{marginTop:4}}>{r.rating}</Chip>
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav ctx={ctx} active="history"/>
    </div>
  );
}

function AnalyticsScreen({ ctx }) {
  const DIMENSIONS = window.DIMENSIONS;
  const dimAvg = DIMENSIONS.map((d,i)=>({...d, pct:[72,58,64,70,51,67,78][i]}));
  const weekly = [45,58,62,71,68,82,91];
  return (
    <div style={{background:T.cream, minHeight:'100%', display:'flex', flexDirection:'column'}}>
      <BrandHeader title={{bn:'বিশ্লেষণ ড্যাশবোর্ড', en:'Branch Manager Analytics'}}
        onBack={()=>ctx.go('dashboard')} subtitle="PO-LEVEL · LAST 30 DAYS"
        right={<Chip color={T.gold}>BM</Chip>}/>
      <div style={{flex:1, padding:'14px 16px 16px'}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12}}>
          {[
            {bn:'মোট মূল্যায়ন', en:'Assessments', val:'১৪৭', delta:'+২২%', color:T.teal},
            {bn:'গড় স্কোর', en:'Avg score', val:'৬৮৪', delta:'+১৮', color:T.gold},
            {bn:'অনুমোদন হার', en:'Approval rate', val:'৭১%', delta:'+৪%', color:T.green},
            {bn:'মিথ্যা পতাকা', en:'Lie-flags', val:'১৯', delta:'১৩%', color:T.coral},
          ].map((k,i)=>(
            <div key={i} style={{background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:'14px 14px'}}>
              <div style={{fontFamily:T.fBn, fontSize:10.5, color:T.ink3, fontWeight:600, marginBottom:4}}>{k.bn}</div>
              <div style={{display:'flex', alignItems:'baseline', gap:6}}>
                <span style={{fontFamily:T.fHead, fontSize:26, fontWeight:900, color:T.navy}}>{k.val}</span>
                <span style={{fontFamily:T.fMono, fontSize:10, color:k.color, fontWeight:700}}>{k.delta}</span>
              </div>
              <div style={{fontFamily:T.fMono, fontSize:8.5, color:T.ink4, letterSpacing:0.3, marginTop:2}}>{k.en}</div>
            </div>
          ))}
        </div>
        <div style={{background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:'14px 14px 16px', marginBottom:12}}>
          <BilingualLabel bn="সাপ্তাহিক প্রবণতা" en="Weekly trend · assessments" sizeBn={13} sizeEn={10} weight={700} style={{marginBottom:12}}/>
          <div style={{display:'flex', alignItems:'flex-end', gap:6, height:80, padding:'0 2px'}}>
            {weekly.map((v,i)=>(
              <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                <div style={{width:'100%', height:`${v}%`, background:`linear-gradient(180deg, ${T.teal}, ${T.teal2})`, borderRadius:'6px 6px 0 0', position:'relative'}}>
                  <span style={{position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)',
                    fontFamily:T.fMono, fontSize:8.5, color:T.ink3, fontWeight:700, whiteSpace:'nowrap'}}>{bn(v)}</span>
                </div>
                <span style={{fontFamily:T.fMono, fontSize:8, color:T.ink4}}>{['W1','W2','W3','W4','W5','W6','W7'][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:'14px 14px', marginBottom:12}}>
          <BilingualLabel bn="গড় মাত্রা-স্কোর" en="Avg score by dimension" sizeBn={13} sizeEn={10} weight={700} style={{marginBottom:12}}/>
          {dimAvg.map(d=>(
            <div key={d.id} style={{marginBottom:10}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
                <span style={{fontFamily:T.fBn, fontSize:11.5, color:T.ink2, fontWeight:600}}>{d.bn}</span>
                <span style={{fontFamily:T.fMono, fontSize:10, color:d.color, fontWeight:700}}>{bn(d.pct)}%</span>
              </div>
              <div style={{height:6, background:T.cream2, borderRadius:3, overflow:'hidden'}}>
                <div style={{width:`${d.pct}%`, height:'100%', background:d.color, borderRadius:3}}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:T.navy, borderRadius:14, padding:14, color:'#fff'}}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
            <FreyaOrb size={30} pulse={false}/>
            <div>
              <div style={{fontFamily:T.fMono, fontSize:8.5, color:T.teal, letterSpacing:1.5, fontWeight:700}}>FREYA · BRANCH INSIGHT</div>
              <div style={{fontFamily:T.fBn, fontSize:13, fontWeight:700, color:'#fff'}}>এই সপ্তাহে খেয়াল রাখুন</div>
            </div>
          </div>
          <div style={{fontFamily:T.fBn, fontSize:11.5, color:'rgba(255,255,255,0.75)', lineHeight:1.6}}>
            • ব্যবসায়িক জ্ঞান মাত্রায় গড় ৫১% — ৩ জন কর্মকর্তার প্রশিক্ষণ প্রয়োজন<br/>
            • ১৯টি মিথ্যা-পতাকার মধ্যে ৭টি রফিক গ্রুপ থেকে — পুনরায় সাক্ষাৎকার নিন<br/>
            • মোট ১৪৭টি মূল্যায়নের মধ্যে ২২% মহিলা — টার্গেট ৪০%
          </div>
        </div>
      </div>
      <BottomNav ctx={ctx} active="analytics"/>
    </div>
  );
}

Object.assign(window, { BottomNav, DashboardScreen, IntakeScreen, HistoryScreen, AnalyticsScreen });
