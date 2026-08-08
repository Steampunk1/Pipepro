/* PipePro — DRAW v2: jobs list + iso editor (floating compass, gestures) */
const {useState:uS,useRef:uR,useEffect:uE,useMemo:uM}=React;

function BSheet({title,sub,onClose,children,zi}){
  return ReactDOM.createPortal(
    <div style={{position:'fixed',inset:0,zIndex:zi||920,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.7)'}}/>
      <div style={{position:'relative',background:T.s1,borderRadius:'10px 10px 0 0',border:`1px solid ${T.bdr}`,borderBottom:'none',maxHeight:'86vh',display:'flex',flexDirection:'column',boxShadow:'0 -8px 40px rgba(0,0,0,0.65)'}}>
        <div style={{padding:'10px 15px 0',flexShrink:0}}>
          <div style={{width:36,height:4,borderRadius:2,background:T.bdr,margin:'0 auto 10px'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:10,borderBottom:`1px solid ${T.bdr}`}}>
            <div><div style={{fontSize:8,fontFamily:FB,fontWeight:700,color:T.lime,letterSpacing:'0.2em',textTransform:'uppercase'}}>{title}</div>
            {sub&&<div style={{fontSize:12,fontFamily:FM,fontWeight:700,color:T.fg,marginTop:2}}>{sub}</div>}</div>
            <button onClick={onClose} style={{width:38,height:38,borderRadius:3,border:`1px solid ${T.bdr}`,background:T.s2,color:T.fg2,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
        </div>
        <div style={{overflowY:'auto',flex:1,padding:'12px 15px calc(env(safe-area-inset-bottom,0px) + 20px)'}}>{children}</div>
      </div>
    </div>,document.body);
}
function BigBtn({onClick,children,ghost,org,style}){
  return <button onClick={onClick} style={{width:'100%',padding:'13px 12px',borderRadius:4,border:ghost?`1px solid ${T.bdr}`:'none',background:ghost?T.s2:org?T.org:T.lime,color:ghost?T.fg:(org?'#fff':'#0A0B0D'),fontFamily:FB,fontWeight:700,fontSize:13,letterSpacing:'0.06em',textTransform:'uppercase',...style}}>{children}</button>;
}
function Toast({msg}){if(!msg)return null;
  return <div style={{position:'absolute',top:60,left:'50%',transform:'translateX(-50%)',background:T.s3,border:`1px solid ${T.bdr}`,color:T.fg,padding:'8px 14px',borderRadius:4,fontFamily:FB,fontSize:12,fontWeight:600,zIndex:50,boxShadow:'0 6px 18px rgba(0,0,0,.45)',whiteSpace:'nowrap'}}>{msg}</div>;
}

// ── LENGTH KEYPAD SHEET ──
function LenSheet({title,value,onSet,onClose,goLabel}){
  const[v,setV]=uS(value||0);
  const t=Math.round(v*16),ft=Math.floor(t/192),inn=Math.floor((t-ft*192)/16),f16=t-ft*192-inn*16;
  const upd=(nf,ni,nx)=>setV(Math.max(0,nf*12+ni+nx/16));
  const[listening,setListening]=uS(false);
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  function voice(){if(!SR)return;const r=new SR();r.lang='en-US';
    r.onstart=()=>setListening(true);r.onend=()=>setListening(false);r.onerror=()=>setListening(false);
    r.onresult=e=>{const txt=e.results[0][0].transcript;const p=window.parseVoiceMeasure&&parseVoiceMeasure(txt);if(p!=null)setV(p);};r.start();}
  const inp={background:T.s2,border:`1px solid ${T.bdr}`,borderRadius:4,color:T.fg,fontFamily:FM,fontSize:24,fontWeight:700,padding:'12px 4px',width:'100%',textAlign:'center'};
  return(<BSheet title={title||'RUN LENGTH'} sub={isoFmt(v)} onClose={onClose} zi={940}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:8,alignItems:'start',marginBottom:10}}>
      <div><input type="number" inputMode="numeric" value={ft} min="0" onChange={e=>upd(parseInt(e.target.value)||0,inn,f16)} style={inp}/><div style={{fontSize:8,color:T.fg3,textAlign:'center',marginTop:3,fontFamily:FB,fontWeight:700,letterSpacing:'0.14em'}}>FT</div></div>
      <div><input type="number" inputMode="numeric" value={inn} min="0" max="11" onChange={e=>upd(ft,Math.min(11,parseInt(e.target.value)||0),f16)} style={inp}/><div style={{fontSize:8,color:T.fg3,textAlign:'center',marginTop:3,fontFamily:FB,fontWeight:700,letterSpacing:'0.14em'}}>IN</div></div>
      {SR?<button onClick={voice} style={{width:52,height:52,borderRadius:4,border:`1px solid ${listening?T.org:T.bdr}`,background:listening?al(T.org,0.2):T.s2,fontSize:18}}>{listening?'🔴':'🎤'}</button>:<div/>}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:4,marginBottom:10}}>
      {Array.from({length:16},(_,i)=>i).map(fi=><button key={fi} onClick={()=>upd(ft,inn,fi)} style={{padding:'10px 2px',borderRadius:3,border:`1px solid ${f16===fi?T.lime:T.bdr}`,background:f16===fi?al(T.lime,0.2):T.s2,color:f16===fi?T.lime:T.fg2,fontFamily:FM,fontSize:10,fontWeight:f16===fi?700:400}}>{fi===0?'0':FRACS[fi]}</button>)}
    </div>
    <div style={{display:'flex',gap:5,marginBottom:14}}>
      {[['+1"',1],['+6"',6],["+1'",12],["+5'",60],['CLR',null]].map(([l,d])=><button key={l} onClick={()=>setV(d==null?0:v+d)} style={{flex:1,padding:'10px 0',borderRadius:3,border:`1px solid ${T.bdr}`,background:T.s2,color:d==null?T.org:T.fg2,fontFamily:FM,fontSize:11,fontWeight:600}}>{l}</button>)}
    </div>
    <BigBtn onClick={()=>{onSet(v);onClose()}}>{goLabel||'SET LENGTH'}</BigBtn>
  </BSheet>);
}

// ── COMPASS PAD ──
function Compass({armed,onDir,onGo,label}){
  const B=(k,st)=><button onClick={()=>onDir(k)} style={{position:'absolute',width:st.w||48,height:st.w||48,borderRadius:'50%',border:`1.5px solid ${armed.includes(k)?T.lime:T.bdr}`,background:armed.includes(k)?al(T.lime,0.25):T.s2,color:armed.includes(k)?T.lime:(k==='UP'||k==='DN'?T.lime:T.fg),fontFamily:FM,fontSize:st.fs||14,fontWeight:700,...st}}>{k}</button>;
  return(<div style={{position:'absolute',right:12,bottom:14,width:172,height:172,borderRadius:'50%',background:T.isDark===false?'rgba(245,246,248,0.94)':'rgba(15,19,24,0.92)',border:`1px solid ${T.bdr}`,boxShadow:'0 6px 18px rgba(0,0,0,.45)',zIndex:20}}>
    {B('N',{left:62,top:4})}{B('E',{right:4,top:62})}{B('S',{left:62,bottom:4})}{B('W',{left:4,top:62})}
    {B('UP',{right:22,top:22,w:38,fs:10})}{B('DN',{left:22,bottom:22,w:38,fs:10})}
    {label&&<div style={{position:'absolute',left:0,right:0,top:38,textAlign:'center',fontFamily:FM,fontSize:9,fontWeight:700,color:T.lime,pointerEvents:'none'}}>{label}</div>}    <button onClick={onGo} style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',width:56,height:56,borderRadius:'50%',background:armed.length?T.lime:T.s3,color:armed.length?'#0A0B0D':T.fg3,fontFamily:FD,fontStyle:'italic',fontWeight:900,fontSize:17,border:'none',letterSpacing:'0.04em',boxShadow:armed.length?`0 0 0 4px ${al(T.lime,0.25)}`:'none'}}>GO</button>
  </div>);
}

// ── EDITOR ──
function IsoEditor({job,dwg0,onChange,onBack}){
  const[dwg,setDwg]=uS(dwg0);
  const[view,setView]=uS({tx:0,ty:0,s:2});
  const[armed,setArmed]=uS([]);
  const[pendLen,setPendLen]=uS(0);
  const[sheet,setSheet]=uS(null); // {t:'len'|'runlen'|'node'|'run'|'end'|'spec'|'print', ...}
  const[toast,setToastRaw]=uS('');
  const toastT=uR(null);
  const setToast=m=>{setToastRaw(m);clearTimeout(toastT.current);toastT.current=setTimeout(()=>setToastRaw(''),2200)};
  const undoRef=uR([]);
  const hintRef=uR(false);
  const svgRef=uR(null);
  const m=uM(()=>computeModel(dwg),[dwg]);
  const pts=uM(()=>{const o={};dwg.nodes.forEach(n=>{if(m.pos[n.id])o[n.id]=isoProject(m.pos[n.id],dwg.corner)});return o},[m,dwg.corner]);
  const plan=uM(()=>isoLabelPlan(dwg,m,pts,12/view.s),[dwg,m,pts,view.s]);
  uE(()=>{onChange({...dwg,updated:Date.now()})},[dwg]);
  uE(()=>{fit()},[]);
  function mut(fn,snap=true){setDwg(d=>{if(snap){undoRef.current.push(JSON.stringify(d));if(undoRef.current.length>40)undoRef.current.shift()}const c=JSON.parse(JSON.stringify(d));fn(c);return c})}
  function undo(){const p=undoRef.current.pop();if(p)setDwg(JSON.parse(p));else setToast('Nothing to undo')}
  function fit(cornerOverride){
    const el=svgRef.current;if(!el)return;const r=el.getBoundingClientRect();
    const ps=Object.values(pts);if(!ps.length)return setView({tx:r.width/2,ty:r.height/2,s:2});
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;ps.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)});
    const w=Math.max(x1-x0,20),h=Math.max(y1-y0,20);
    const s=Math.min((r.width-120)/w,(r.height-200)/h,6);
    setView({s,tx:r.width/2-(x0+x1)/2*s,ty:(r.height-90)/2-(y0+y1)/2*s});
  }
  function tapDir(k){setArmed(a=>{
    if(a.includes(k))return a.filter(x=>x!==k);
    if(!a.length)return[k];
    if(a.length>=2)return[k];
    const j=a[0],dj=ISO_DIRS[j],dk=ISO_DIRS[k];
    if(vDot(dj,dk)===0)return[j,k]; // perpendicular combo = 45°
    return[k];
  })}
  function commit(){
    const dir=combineDirs(armed);
    if(!dir){setToast('Pick a direction first');return}
    if(pendLen<=0){setSheet({t:'len',go:true});return}
    mut(d=>{
      const nid=d.nextId++;const rid=d.nextId++;
      d.nodes.push({id:nid});
      d.runs.push({id:rid,a:d.activeEnd,b:nid,len:pendLen,dir});
      d.activeEnd=nid;
    });
    setToast(isoFmt(pendLen)+' '+armed.join('+'));
    setArmed([]); // re-arm deliberately per run — prevents accidental 45° combos on the next turn
    if(!hintRef.current&&dwg.runs.length===1){hintRef.current=true;setTimeout(()=>setToast('Tap any fitting, run or glowing end to edit it'),2600)}
  }
  // gestures
  const ge=uR({ptrs:new Map(),moved:false,start:null,pinch:null});
  function wpt(e){const r=svgRef.current.getBoundingClientRect();return[(e.clientX-r.left-view.tx)/view.s,(e.clientY-r.top-view.ty)/view.s]}
  function pd(e){e.target.setPointerCapture&&svgRef.current.setPointerCapture(e.pointerId);
    ge.current.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ge.current.ptrs.size===1){ge.current.moved=false;ge.current.start={x:e.clientX,y:e.clientY,tx:view.tx,ty:view.ty}}
    else if(ge.current.ptrs.size===2){const[p1,p2]=[...ge.current.ptrs.values()];ge.current.pinch={d:Math.hypot(p1.x-p2.x,p1.y-p2.y),s:view.s,cx:(p1.x+p2.x)/2,cy:(p1.y+p2.y)/2,tx:view.tx,ty:view.ty}}}
  function pm(e){const g=ge.current;if(!g.ptrs.has(e.pointerId))return;g.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(g.ptrs.size===1&&g.start){const dx=e.clientX-g.start.x,dy=e.clientY-g.start.y;
      if(Math.hypot(dx,dy)>8)g.moved=true;
      if(g.moved)setView(v=>({...v,tx:g.start.tx+dx,ty:g.start.ty+dy}))}
    else if(g.ptrs.size===2&&g.pinch){const[p1,p2]=[...g.ptrs.values()];const nd=Math.hypot(p1.x-p2.x,p1.y-p2.y);g.moved=true;
      const ns=Math.max(0.3,Math.min(12,g.pinch.s*nd/g.pinch.d));const r=svgRef.current.getBoundingClientRect();
      const cx=g.pinch.cx-r.left,cy=g.pinch.cy-r.top;
      setView({s:ns,tx:cx-(cx-g.pinch.tx)*ns/g.pinch.s,ty:cy-(cy-g.pinch.ty)*ns/g.pinch.s})}}
  function pu(e){const g=ge.current;g.ptrs.delete(e.pointerId);
    if(g.ptrs.size===0&&!g.moved&&g.start){hitTest(wpt(e))}
    if(g.ptrs.size<2)g.pinch=null;if(!g.ptrs.size)g.start=null}
  function hitTest([wx,wy]){
    const rN=30/view.s,rR=20/view.s;
    let best=null,bd=rN;
    dwg.nodes.forEach(n=>{const p=pts[n.id];if(!p)return;const d=Math.hypot(p[0]-wx,p[1]-wy);if(d<bd){bd=d;best=n.id}});
    if(best!=null){const f=m.nodeFit[best];
      if(f.type==='open'){setSheet({t:'end',id:best})}
      else setSheet({t:'node',id:best});return}
    let bR=null,bdd=rR;
    dwg.runs.forEach(r=>{const a=pts[r.a],b=pts[r.b];if(!a||!b)return;
      const d=segDist(wx,wy,a,b);if(d<bdd){bdd=d;bR=r.id}});
    if(bR!=null)setSheet({t:'run',id:bR});
  }
  function segDist(x,y,[ax,ay],[bx,by]){const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy||1;let t=((x-ax)*dx+(y-ay)*dy)/L2;t=Math.max(0,Math.min(1,t));return Math.hypot(x-(ax+dx*t),y-(ay+dy*t))}
  function cycleCorner(){const i=ISO_CORNERS.indexOf(dwg.corner);const c=ISO_CORNERS[(i+1)%4];mut(d=>{d.corner=c},false);setToast('View: '+c+' corner');setTimeout(fit,50)}
  function delRun(rid){
    const r=dwg.runs.find(q=>q.id===rid);if(!r)return;
    const degB=m.runsBy[r.b].length,degA=m.runsBy[r.a].length;
    if(degA>1&&degB>1){setToast('Mid-line run — use UNDO');return}
    mut(d=>{d.runs=d.runs.filter(q=>q.id!==rid);
      const leaf=degB===1?r.b:r.a,keep=degB===1?r.a:r.b;
      d.nodes=d.nodes.filter(n=>n.id!==leaf||d.runs.some(q=>q.a===n.id||q.b===n.id));
      delete d.endOv[leaf];delete d.valves[rid];
      if(!d.nodes.some(n=>n.id===d.activeEnd))d.activeEnd=keep;});
    setSheet(null);setToast('Run deleted');
  }
  const s=view.s,lw=x=>x/s;
  const ghostDir=combineDirs(armed);
  const ghostEnd=ghostDir&&m.pos[dwg.activeEnd]?isoProject(v3(m.pos[dwg.activeEnd],ghostDir,pendLen||24),dwg.corner):null;
  const north=(()=>{const[x,y]=isoProject([0,1,0],dwg.corner);return Math.atan2(y,x)*180/Math.PI})();
  const ovBtn={height:40,padding:'0 13px',borderRadius:4,border:`1px solid ${T.bdr}`,background:al(T.s1,0.92),color:T.fg2,fontFamily:FB,fontWeight:700,fontSize:11,letterSpacing:'0.06em',whiteSpace:'nowrap',boxShadow:'0 4px 12px rgba(0,0,0,.35)'};
  return(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
    {/* sub-header */}
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:T.s1,borderBottom:`1px solid ${T.bdr}`,flexShrink:0}}>
      <button onClick={onBack} style={{...ovBtn,boxShadow:'none',background:T.s2}}>‹ ISOS</button>
      <button onClick={()=>setSheet({t:'spec'})} style={{flex:1,minWidth:0,textAlign:'left',background:'none',padding:'0 2px'}}>
        <div style={{fontFamily:FM,fontSize:13,fontWeight:700,color:T.fg,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{dwg.name} <span style={{color:T.fg3,fontWeight:400}}>· {dwg.lineNo}</span></div>
        <div style={{fontFamily:FM,fontSize:10,color:T.lime,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{dwg.size} · {dwg.mat} · {dwg.sch} <span style={{color:T.fg3}}>▾</span></div>
      </button>
      <button onClick={()=>setSheet({t:'print'})} style={{...ovBtn,background:T.lime,color:'#0A0B0D',border:'none',boxShadow:'none',padding:'0 10px'}}>PDF SHEET</button>
    </div>
    {/* canvas */}
    <div style={{flex:1,minHeight:0,position:'relative',overflow:'hidden',touchAction:'none'}}>
      <svg ref={svgRef} onPointerDown={pd} onPointerMove={pm} onPointerUp={pu} onPointerCancel={pu} style={{position:'absolute',inset:0,width:'100%',height:'100%',display:'block'}}>
        <defs><pattern id="dgrid" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill={T.s3}/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#dgrid)"/>
        <g transform={`translate(${view.tx},${view.ty}) scale(${s})`}>
          {dwg.runs.map(r=>{const a=pts[r.a],b=pts[r.b];if(!a||!b)return null;
            const ri=m.runsInfo.find(q=>q.runIds?q.runIds.includes(r.id):q.run.id===r.id);
            const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,px=-dy/L,py=dx/L;
            const lp=plan.runs[r.id];
            return(<g key={r.id}>
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={T.lime} strokeWidth={lw(3.5)} strokeLinecap="round"/>
              {L*s>70&&<polygon points={`${mx+dx/L*lw(5)},${my+dy/L*lw(5)} ${mx+px*lw(4)-dx/L*lw(4)},${my+py*lw(4)-dy/L*lw(4)} ${mx-px*lw(4)-dx/L*lw(4)},${my-py*lw(4)-dy/L*lw(4)}`} fill={T.fg3}/>}
              {lp&&lp.leader&&<line x1={lp.leader[0]} y1={lp.leader[1]} x2={lp.leader[2]} y2={lp.leader[3]} stroke={T.fg3} strokeWidth={lw(1)} opacity="0.6"/>}
              {lp&&<text x={lp.x} y={lp.y-lw(2)} fontSize={lw(12)} fontFamily={FM} fill={T.fg} textAnchor="middle">{isoFmt(r.len)}</text>}
              {ri&&lp&&<text x={lp.x} y={lp.y+lw(10)} fontSize={lw(9)} fontFamily={FM} fill={al(T.lime,0.9)} textAnchor="middle">{ri.mark} CUT {isoFmt(Math.max(0,ri.cut))}</text>}
              {(dwg.valves[r.id]||[]).map((v,i)=>(<g key={i}>
                <polygon points={`${mx-lw(9)},${my-lw(6)} ${mx+lw(9)},${my+lw(6)} ${mx+lw(9)},${my-lw(6)} ${mx-lw(9)},${my+lw(6)}`} fill={T.s1} stroke={T.fg} strokeWidth={lw(1.6)}/>
              </g>))}
            </g>)})}
          {ghostEnd&&pts[dwg.activeEnd]&&<line x1={pts[dwg.activeEnd][0]} y1={pts[dwg.activeEnd][1]} x2={ghostEnd[0]} y2={ghostEnd[1]} stroke={T.fg2} strokeWidth={lw(2)} strokeDasharray={`${lw(6)} ${lw(5)}`}/>}
          {dwg.nodes.map(n=>{const p=pts[n.id];if(!p)return null;const f=m.nodeFit[n.id];if(!f)return null;
            const ws=m.welds.filter(w=>w.at===n.id);
            return(<g key={n.id}>
              {f.type==='open'&&<g>
                <circle cx={p[0]} cy={p[1]} r={lw(7)} fill="none" stroke={T.lime} strokeWidth={lw(2)}>
                  <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite"/></circle>
                <circle cx={p[0]} cy={p[1]} r={lw(2.5)} fill={T.lime}/></g>}
              {f.type==='cap'&&<circle cx={p[0]} cy={p[1]} r={lw(5)} fill={T.fg}/>}
              {f.type==='flangeWN'&&<g><circle cx={p[0]} cy={p[1]} r={lw(6)} fill="none" stroke={T.fg} strokeWidth={lw(3)}/><circle cx={p[0]} cy={p[1]} r={lw(2)} fill={T.fg}/></g>}
              {(f.type==='tee')&&<circle cx={p[0]} cy={p[1]} r={lw(4)} fill={T.s1} stroke={T.lime} strokeWidth={lw(2)}/>}
              {f.type==='olet'&&<g><circle cx={p[0]} cy={p[1]} r={lw(6)} fill={T.s1} stroke={T.amb} strokeWidth={lw(2)}/><circle cx={p[0]} cy={p[1]} r={lw(2)} fill={T.amb}/></g>}
              {ws.length>0&&(()=>{const wp=plan.welds[n.id];return(<g><circle cx={p[0]} cy={p[1]} r={lw(3)} fill={T.org}/>
                <text x={wp?wp.x:p[0]+lw(9)} y={wp?wp.y+lw(3):p[1]-lw(8)} fontSize={lw(9)} fontFamily={FM} fill={T.org} textAnchor={wp?'middle':'start'}>{ws.map(w=>'W'+w.no+(w.sf==='F'?'·F':'')).join(' ')}</text></g>)})()}
              {n.id===dwg.activeEnd&&<circle cx={p[0]} cy={p[1]} r={lw(11)} fill="none" stroke={al(T.lime,0.5)} strokeWidth={lw(1.5)} strokeDasharray={`${lw(3)} ${lw(3)}`}/>}
            </g>)})}
        </g>
      </svg>
      {!dwg.runs.length&&<div style={{position:'absolute',left:0,right:0,top:'34%',textAlign:'center',pointerEvents:'none'}}>
        <div style={{fontFamily:FD,fontStyle:'italic',fontWeight:900,fontSize:20,color:T.fg3,textTransform:'uppercase'}}>Start drawing</div>
        <div style={{fontFamily:FB,fontSize:12,color:T.fg3,marginTop:6,lineHeight:1.6}}>1 — Tap a direction on the pad<br/>2 — Tap the length chip · 3 — GO</div>
      </div>}
      <div style={{position:'absolute',left:10,top:10,display:'flex',gap:7,zIndex:20}}>
        <button onClick={undo} style={ovBtn}>↩ UNDO</button>
        <button onClick={()=>fit()} style={ovBtn}>FIT</button>
        <button onClick={cycleCorner} style={{...ovBtn,color:T.lime,display:'flex',alignItems:'center',gap:6}}>
          <span style={{display:'inline-block',transform:`rotate(${north}deg)`,fontSize:13}}>↑</span>{dwg.corner} ⟳</button>
      </div>
      {m.warn.length>0&&<button onClick={()=>setToast(m.warn[0])} style={{...ovBtn,position:'absolute',right:12,top:10,zIndex:20,color:T.org,borderColor:al(T.org,0.5)}}>⚠ {m.warn.length}</button>}
      <button onClick={()=>setSheet({t:'len'})} style={{position:'absolute',left:12,bottom:14,zIndex:20,background:al(T.s1,0.94),border:`1px solid ${T.bdr}`,borderRadius:6,padding:'10px 14px',textAlign:'left',boxShadow:'0 6px 18px rgba(0,0,0,.45)'}}>
        <div style={{fontFamily:FM,fontSize:22,fontWeight:700,color:pendLen>0?T.lime:T.fg3}}>{pendLen>0?isoFmt(pendLen):'0"'}</div>
        <div style={{fontSize:7,fontFamily:FB,fontWeight:700,letterSpacing:'0.16em',color:T.fg3,marginTop:2}}>TAP — SET LENGTH</div>
      </button>
      <Compass armed={armed} onDir={tapDir} onGo={commit} label={armed.length?armed.join('+'):''}/>
      <Toast msg={toast}/>
    </div>
    {/* sheets */}
    {sheet?.t==='len'&&<LenSheet value={pendLen} onSet={setPendLen} onClose={()=>setSheet(null)} goLabel={sheet.go?'SET — THEN HIT GO':'SET LENGTH'}/>}
    {sheet?.t==='runlen'&&<LenSheet title="EDIT RUN LENGTH" value={dwg.runs.find(r=>r.id===sheet.id)?.len||0} onSet={v=>mut(d=>{const r=d.runs.find(q=>q.id===sheet.id);if(r)r.len=v})} onClose={()=>setSheet(null)}/>}
    {sheet?.t==='end'&&<EndSheet dwg={dwg} m={m} id={sheet.id} mut={mut} setActive={id=>{mut(d=>{d.activeEnd=id},false);setToast('Drawing from here')}} delRun={delRun} onClose={()=>setSheet(null)}/>}
    {sheet?.t==='node'&&<NodeSheet dwg={dwg} m={m} id={sheet.id} mut={mut} setActive={id=>{mut(d=>{d.activeEnd=id},false);setToast('Branch: pick direction + GO')}} onClose={()=>setSheet(null)}/>}
    {sheet?.t==='run'&&<RunSheet dwg={dwg} m={m} id={sheet.id} mut={mut} delRun={delRun} onEditLen={()=>setSheet({t:'runlen',id:sheet.id})} onClose={()=>setSheet(null)}/>}
    {sheet?.t==='spec'&&<SpecSheet dwg={dwg} mut={mut} onClose={()=>setSheet(null)}/>}
    {sheet?.t==='print'&&window.SheetModal&&<SheetModal job={job} dwg={dwg} m={m} onClose={()=>setSheet(null)}/>}
  </div>);
}

// ── NODE / END / RUN SHEETS ──
function WeldChips({dwg,m,at,mut}){
  const ws=m.welds.filter(w=>w.at===at);if(!ws.length)return null;
  return(<div style={{marginBottom:12}}><Ey ch="Welds — tap to toggle shop / field"/>
    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
      {ws.map(w=><button key={w.key} onClick={()=>mut(d=>{d.sfOv[w.key]=(d.sfOv[w.key]||'S')==='S'?'F':'S'})} style={{padding:'9px 13px',borderRadius:3,border:`1px solid ${w.sf==='F'?T.org:T.bdr}`,background:w.sf==='F'?al(T.org,0.15):T.s2,color:w.sf==='F'?T.org:T.fg,fontFamily:FM,fontSize:12,fontWeight:700}}>W{w.no} — {w.sf==='F'?'FIELD':'SHOP'}</button>)}
    </div></div>);
}
function EndSheet({dwg,m,id,mut,setActive,delRun,onClose}){
  const f=m.nodeFit[id];const leafRun=dwg.runs.find(r=>(r.a===id||r.b===id));
  const opt=(v,l)=><button onClick={()=>mut(d=>{if(v)d.endOv[id]=v;else delete d.endOv[id]})} style={{flex:1,padding:'11px 4px',borderRadius:3,border:`1px solid ${(dwg.endOv[id]||'')===(v||'')?T.lime:T.bdr}`,background:(dwg.endOv[id]||'')===(v||'')?al(T.lime,0.18):T.s2,color:T.fg,fontFamily:FB,fontSize:11,fontWeight:700}}>{l}</button>;
  return(<BSheet title="OPEN END" sub={f?.type==='open'?'Line continues or terminates here':''} onClose={onClose}>
    {dwg.activeEnd!==id&&<div style={{marginBottom:10}}><BigBtn onClick={()=>{setActive(id);onClose()}}>▶ DRAW FROM HERE</BigBtn></div>}
    {dwg.activeEnd===id&&<div style={{marginBottom:10,padding:'10px 12px',borderRadius:4,background:al(T.lime,0.1),border:`1px solid ${al(T.lime,0.4)}`,fontFamily:FB,fontSize:12,color:T.lime,fontWeight:600}}>✓ Currently drawing from this end</div>}
    <Ey ch="End treatment"/>
    <div style={{display:'flex',gap:6,marginBottom:12}}>{opt(null,'OPEN')}{opt('cap','CAP')}{opt('flangeWN','WN FLANGE')}</div>
    <WeldChips dwg={dwg} m={m} at={id} mut={mut}/>
    {leafRun&&<BigBtn ghost org onClick={()=>delRun(leafRun.id)} style={{color:T.danger,borderColor:al(T.danger,0.5),background:'none',border:`1px solid ${al(T.danger,0.5)}`}}>DELETE LAST RUN INTO THIS END</BigBtn>}
  </BSheet>);
}
function NodeSheet({dwg,m,id,mut,setActive,onClose}){
  const f=m.nodeFit[id];
  const olN=f.ol?(f.ol.t==='SOL'?'SOCKOLET':f.ol.t==='TOL'?'THREADOLET':'WELDOLET')+' — '+(f.ol.bs||'')+' BRANCH':'';
  const names={joint:dwg.conn==='SW'?'SW COUPLING JOINT':'BUTT WELD JOINT',ell45:'45° ELBOW',ell90:'90° ELBOW LR',ell90sr:'90° ELBOW SR',tee:'TEE',cross:'CROSS — UNSUPPORTED',bendX:'NON-STD BEND',olet:olN};
  return(<BSheet title="FITTING" sub={names[f.type]||f.type} onClose={onClose}>
    {f.type==='olet'&&<div style={{marginBottom:10}}>
      {f.deg<3&&<div style={{marginBottom:8}}><BigBtn onClick={()=>{setActive(id);onClose()}}>⑂ DRAW THE BRANCH FROM HERE</BigBtn></div>}
      <BigBtn ghost onClick={()=>{mut(d=>{delete d.oletOv[id]});onClose()}} style={{color:T.amb,border:`1px solid ${al(T.amb,0.5)}`,background:'none'}}>REMOVE OLET (BECOMES PLAIN JOINT)</BigBtn>
    </div>}
    {(f.type==='ell90'||f.type==='ell90sr')&&<div style={{marginBottom:12}}><Ey ch="Elbow type"/>
      <Seg value={f.type==='ell90sr'?'sr':'lr'} options={[{v:'lr',lbl:'LONG RADIUS'},{v:'sr',lbl:'SHORT RADIUS'}]} onChange={v=>mut(d=>{if(v==='sr')d.fitOv[id]='ell90sr';else delete d.fitOv[id]})}/></div>}
    {f.deg<3&&f.type!=='joint'&&f.type!=='olet'&&<div style={{marginBottom:10}}><BigBtn onClick={()=>{setActive(id);onClose()}}>⑂ DRAW BRANCH FROM HERE (TEE)</BigBtn>
      <div style={{fontSize:10,fontFamily:FB,color:T.fg3,marginTop:5,lineHeight:1.5}}>Sets this fitting as the start point — pick a direction and GO. A third leg turns it into a tee automatically.</div></div>}
    {f.type==='joint'&&<div style={{marginBottom:10}}><BigBtn onClick={()=>{setActive(id);onClose()}}>⑂ BRANCH HERE (WELDOLET / TEE)</BigBtn></div>}
    <WeldChips dwg={dwg} m={m} at={id} mut={mut}/>
  </BSheet>);
}
function RunSheet({dwg,m,id,mut,delRun,onEditLen,onClose}){
  const r=dwg.runs.find(q=>q.id===id);
  const ri=m.runsInfo.find(q=>q.runIds?q.runIds.includes(id):q.run.id===id);
  if(!r)return null;
  const[vt,setVt]=uS('Gate');const[vc,setVc]=uS('FLGD');
  const[rk,setRk]=uS('CON');
  const szIdx=SIZES.indexOf(dwg.size);
  const smaller=SIZES.slice(0,Math.max(1,szIdx));
  const[rto,setRto]=uS(smaller[smaller.length-1]||SIZES[0]);
  const[ot,setOt]=uS('WOL');
  const[obs,setObs]=uS(smaller[Math.max(0,smaller.length-2)]||SIZES[0]);
  const[oletLen,setOletLen]=uS(false);
  const vs=dwg.valves[id]||[];const rds=(dwg.reds||{})[id]||[];
  function addOlet(dist){
    if(!(dist>0&&dist<r.len))return;
    mut(d=>{
      d.oletOv=d.oletOv||{};d.reds=d.reds||{};
      const rr=d.runs.find(q=>q.id===id);
      const nid=d.nextId++,rid2=d.nextId++;
      const oldB=rr.b,oldLen=rr.len;
      rr.b=nid;rr.len=dist;
      d.nodes.push({id:nid});
      d.runs.splice(d.runs.findIndex(q=>q.id===id)+1,0,{id:rid2,a:nid,b:oldB,len:oldLen-dist,dir:[...rr.dir]});
      d.oletOv[nid]={t:ot,bs:obs};
      d.activeEnd=nid;
    });
    onClose();
  }
  return(<BSheet title={'PIPE RUN — '+(ri?.mark||'')} sub={isoFmt(r.len)+' C-C'} onClose={onClose}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
      {[['PIECE C-C',isoFmt(ri.cc),T.fg],['PIECE CUT',isoFmt(Math.max(0,ri.cut)),T.lime],['TAKEOUTS',isoFmt(ri.toA+ri.toB),T.fg2],['DEDUCTS (F-F)',isoFmt(ri.vff),T.fg2]].map(([l,v,c])=>(
        <div key={l} style={{background:T.s2,border:`1px solid ${T.bdr}`,borderRadius:4,padding:'9px 11px'}}>
          <div style={{fontSize:7,fontFamily:FB,fontWeight:700,letterSpacing:'0.16em',color:T.fg3}}>{l}</div>
          <div style={{fontFamily:FM,fontSize:16,fontWeight:700,color:c,marginTop:3}}>{v}</div></div>))}
    </div>
    <div style={{marginBottom:12}}><BigBtn onClick={onEditLen}>EDIT LENGTH</BigBtn></div>

    <Ey ch="Inline valve"/>
    <div style={{display:'flex',gap:6,marginBottom:6}}>
      <select value={vt} onChange={e=>setVt(e.target.value)} style={{...sSt(),flex:1}}>{['Gate','Ball','Globe','Check','Butterfly','Strainer'].map(v=><option key={v}>{v}</option>)}</select>
      <button onClick={()=>mut(d=>{(d.valves[id]=d.valves[id]||[]).push({type:vt,conn:vc,ff:0})})} style={{padding:'0 18px',borderRadius:4,border:'none',background:T.lime,color:'#0A0B0D',fontFamily:FB,fontWeight:700,fontSize:12}}>+ ADD</button>
    </div>
    <div style={{marginBottom:8}}><Seg value={vc} options={[{v:'FLGD',lbl:'FLANGED'},{v:'BW',lbl:'BUTT WELD'},{v:'SW',lbl:'SOCKET WELD'}]} onChange={setVc} sm/></div>
    {vs.map((v,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:8,background:T.s2,border:`1px solid ${T.bdr}`,borderRadius:4,padding:'8px 10px',marginBottom:6}}>
      <span style={{fontFamily:FM,fontSize:12,fontWeight:700,color:T.fg,flex:1,minWidth:0}}>{v.type} <span style={{color:T.lime,fontSize:10}}>{v.conn||'FLGD'}</span></span>
      <span style={{fontSize:9,fontFamily:FB,color:T.fg3}}>F-F</span>
      <input type="number" inputMode="decimal" value={v.ff||''} placeholder="in" onChange={e=>mut(d=>{d.valves[id][i].ff=parseFloat(e.target.value)||0},false)} style={{...iSt(),width:64,padding:'6px 8px',fontSize:12}}/>
      <button onClick={()=>mut(d=>{d.valves[id].splice(i,1);if(!d.valves[id].length)delete d.valves[id]})} style={{color:T.danger,fontSize:14,padding:'4px 6px'}}>✕</button>
    </div>))}
    {vs.length>0&&<div style={{fontSize:10,fontFamily:FB,color:T.fg3,marginBottom:10,lineHeight:1.5}}>Enter valve face-to-face (inches) so the cut deducts it. Flanged valves add 2 flanges + gaskets + studs to the BOM; BW/SW add 2 welds.</div>}

    <Ey ch="Inline reducer"/>
    <div style={{display:'flex',gap:6,marginBottom:8,alignItems:'center'}}>
      <div style={{flex:1}}><Seg value={rk} options={[{v:'CON',lbl:'CONC'},{v:'ECC',lbl:'ECC'}]} onChange={setRk} sm/></div>
      <select value={rto} onChange={e=>setRto(e.target.value)} style={{...sSt(),width:88}}>{smaller.map(s=><option key={s}>{s}</option>)}</select>
      <button onClick={()=>mut(d=>{d.reds=d.reds||{};(d.reds[id]=d.reds[id]||[]).push({kind:rk,to:rto,len:0})})} style={{padding:'9px 14px',borderRadius:4,border:'none',background:T.lime,color:'#0A0B0D',fontFamily:FB,fontWeight:700,fontSize:12}}>+ ADD</button>
    </div>
    {rds.map((rd,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:8,background:T.s2,border:`1px solid ${T.bdr}`,borderRadius:4,padding:'8px 10px',marginBottom:6}}>
      <span style={{fontFamily:FM,fontSize:12,fontWeight:700,color:T.fg,flex:1}}>{rd.kind==='ECC'?'ECC':'CONC'} RED {dwg.size} × {rd.to}</span>
      <span style={{fontSize:9,fontFamily:FB,color:T.fg3}}>LEN</span>
      <input type="number" inputMode="decimal" value={rd.len||''} placeholder="in" onChange={e=>mut(d=>{d.reds[id][i].len=parseFloat(e.target.value)||0},false)} style={{...iSt(),width:64,padding:'6px 8px',fontSize:12}}/>
      <button onClick={()=>mut(d=>{d.reds[id].splice(i,1);if(!d.reds[id].length)delete d.reds[id]})} style={{color:T.danger,fontSize:14,padding:'4px 6px'}}>✕</button>
    </div>))}
    {rds.length>0&&<div style={{fontSize:10,fontFamily:FB,color:T.fg3,marginBottom:10,lineHeight:1.5}}>Enter the reducer end-to-end length so the cut deducts it. Line size past the reducer stays {dwg.size} on this drawing — start a new ISO for the reduced side if needed.</div>}

    <Ey ch="Olet branch — tap line at distance, then draw"/>
    <div style={{display:'flex',gap:6,marginBottom:8,alignItems:'center'}}>
      <div style={{flex:1}}><Seg value={ot} options={[{v:'WOL',lbl:'WELDOLET'},{v:'SOL',lbl:'SOCKOLET'},{v:'TOL',lbl:'THREADOLET'}]} onChange={setOt} sm/></div>
      <select value={obs} onChange={e=>setObs(e.target.value)} style={{...sSt(),width:88}}>{smaller.map(s=><option key={s}>{s}</option>)}</select>
    </div>
    <div style={{marginBottom:12}}>
      <BigBtn ghost onClick={()=>setOletLen(true)} style={{border:`1px solid ${al(T.amb,0.6)}`,color:T.amb,background:al(T.amb,0.07)}}>⊕ PLACE OLET — SET DISTANCE FROM START</BigBtn>
      <div style={{fontSize:10,fontFamily:FB,color:T.fg3,marginTop:5,lineHeight:1.5}}>Splits the run at that distance and puts the olet there — then pick a direction on the compass and GO to draw the branch (pump discharge, drains, vents, gauges). The header stays one cut piece.</div>
    </div>

    <BigBtn ghost onClick={()=>delRun(id)} style={{color:T.danger,border:`1px solid ${al(T.danger,0.5)}`,background:'none'}}>DELETE RUN</BigBtn>
    {oletLen&&<LenSheet title="OLET — DISTANCE FROM RUN START" value={0} onSet={addOlet} onClose={()=>setOletLen(false)} goLabel="PLACE OLET"/>}
  </BSheet>);
}
function SpecSheet({dwg,mut,onClose}){
  const inp={...iSt(),marginBottom:10};
  const chip=(cur,v,set)=><button key={v} onClick={()=>set(v)} style={{padding:'9px 11px',borderRadius:3,border:`1px solid ${cur===v?T.lime:T.bdr}`,background:cur===v?al(T.lime,0.18):T.s2,color:cur===v?T.lime:T.fg2,fontFamily:FM,fontSize:11,fontWeight:cur===v?700:400}}>{v}</button>;
  return(<BSheet title="DRAWING SETUP" sub={dwg.name} onClose={onClose}>
    <Ey ch="Drawing name"/><input value={dwg.name} onChange={e=>mut(d=>{d.name=e.target.value},false)} style={inp}/>
    <Ey ch="Line number"/><input value={dwg.lineNo} onChange={e=>mut(d=>{d.lineNo=e.target.value},false)} style={inp}/>
    <Ey ch="Asset / area"/><input value={dwg.asset} placeholder="e.g. Cooker #2" onChange={e=>mut(d=>{d.asset=e.target.value},false)} style={inp}/>
    <Ey ch="Drawn by"/><input value={dwg.drawnBy} onChange={e=>mut(d=>{d.drawnBy=e.target.value},false)} style={inp}/>
    <Ey ch="Connection — sets fittings & takeouts"/>
    <div style={{marginBottom:10}}><Seg value={dwg.conn||'BW'} options={[{v:'BW',lbl:'BUTT WELD'},{v:'SW',lbl:'SOCKET WELD ≤4"'}]} onChange={v=>mut(d=>{d.conn=v})}/></div>
    <Ey ch="Size"/><div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>{SIZES.map(z=>chip(dwg.size,z,v=>mut(d=>{d.size=v})))}</div>
    <Ey ch="Material"/><div style={{marginBottom:10}}><MatSelect value={dwg.mat} onChange={v=>mut(d=>{d.mat=v})}/></div>
    <Ey ch="Schedule"/><div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:4}}>{SCHEDS.map(z=>chip(dwg.sch,z,v=>mut(d=>{d.sch=v})))}</div>
  </BSheet>);
}

// ── JOBS / DRAWINGS LIST ──
function JobSheet({onCreate,onClose}){
  const[nm,setNm]=uS('');const[as,setAs]=uS('');
  return(<BSheet title="NEW JOB" onClose={onClose}>
    <Ey ch="Job name"/><input autoFocus value={nm} placeholder="e.g. Valley Proteins — cooker deck" onChange={e=>setNm(e.target.value)} style={{...iSt(),marginBottom:10}}/>
    <Ey ch="Asset / area (optional)"/><input value={as} placeholder="e.g. Cooker #2" onChange={e=>setAs(e.target.value)} style={{...iSt(),marginBottom:14}}/>
    <BigBtn onClick={()=>{if(nm.trim()){onCreate(nm.trim(),as.trim());onClose()}}}>CREATE JOB</BigBtn>
  </BSheet>);
}
function DrawTab(){
  const[st,setSt]=uS(isoLoad);
  const[mode,setMode]=uS(null); // {jobId,dwgId}
  const[newJob,setNewJob]=uS(false);
  function save(next){setSt(next);isoSave(next)}
  function addJob(name,asset){const j={id:'j'+Date.now(),name,asset,drawings:[]};save({...st,jobs:[j,...st.jobs]})}
  function addDwg(job){const d=isoNewDrawing(st,{size:window.tweakValues?.defSize||'4"',mat:window.tweakValues?.defMat,sch:window.tweakValues?.defSch});
    const next={...st,jobs:st.jobs.map(j=>j.id===job.id?{...j,drawings:[d,...j.drawings]}:j)};save(next);setMode({jobId:job.id,dwgId:d.id})}
  function updDwg(jobId,dwg){const next={...st,drawnBy:dwg.drawnBy||st.drawnBy,jobs:st.jobs.map(j=>j.id===jobId?{...j,drawings:j.drawings.map(x=>x.id===dwg.id?dwg:x)}:j)};save(next)}
  function delDwg(jobId,dwgId){if(!confirm('Delete this drawing?'))return;save({...st,jobs:st.jobs.map(j=>j.id===jobId?{...j,drawings:j.drawings.filter(x=>x.id!==dwgId)}:j)})}
  function delJob(jobId){const j=st.jobs.find(x=>x.id===jobId);if(!confirm('Delete job "'+j.name+'"'+(j.drawings.length?' and its '+j.drawings.length+' drawing(s)':'')+'?'))return;save({...st,jobs:st.jobs.filter(x=>x.id!==jobId)})}
  if(mode){const job=st.jobs.find(j=>j.id===mode.jobId);const dwg=job?.drawings.find(d=>d.id===mode.dwgId);
    if(job&&dwg)return <IsoEditor key={dwg.id} job={job} dwg0={dwg} onChange={d=>updDwg(job.id,d)} onBack={()=>setMode(null)}/>;}
  return(<div style={{height:'100%',overflowY:'auto',padding:'14px 14px 30px'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
      <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
        <img src="assets/logo-chrome.jpg" style={{width:36,height:36,objectFit:'cover',borderRadius:3,flexShrink:0,border:`1px solid ${T.bdrS}`}} onError={e=>e.target.style.display='none'}/>
        <div>
          <div style={{fontFamily:FD,fontStyle:'italic',fontWeight:900,fontSize:22,textTransform:'uppercase',color:T.fg,lineHeight:1}}>ISO Drawings</div>
          <div style={{fontSize:9,fontFamily:FB,fontWeight:700,color:T.fg3,letterSpacing:'0.18em',marginTop:3}}>MEASURE → DRAW → SEND THE SHEET</div>
        </div>
      </div>
      <button onClick={()=>setNewJob(true)} style={{padding:'11px 16px',borderRadius:4,border:'none',background:T.lime,color:'#0A0B0D',fontFamily:FB,fontWeight:700,fontSize:12,letterSpacing:'0.05em'}}>+ NEW JOB</button>
    </div>
    {!st.jobs.length&&<div style={{border:`1px dashed ${T.bdr}`,borderRadius:6,padding:'34px 20px',textAlign:'center',marginTop:24}}>
      <div style={{fontFamily:FD,fontStyle:'italic',fontWeight:900,fontSize:18,color:T.fg2,textTransform:'uppercase'}}>No jobs yet</div>
      <div style={{fontSize:12,fontFamily:FB,color:T.fg3,marginTop:8,lineHeight:1.6}}>Start a job (plant + area), then add an ISO per line you're replacing.<br/>Draw with the compass pad — the BOM, cut list and weld map build themselves.</div>
    </div>}
    {st.jobs.map(job=>(<div key={job.id} style={{background:T.s1,border:`1px solid ${T.bdr}`,borderRadius:6,marginBottom:12,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'11px 13px',borderBottom:job.drawings.length?`1px solid ${T.bdrS}`:'none'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:FB,fontWeight:700,fontSize:14,color:T.fg,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{job.name}</div>
          {job.asset&&<div style={{fontSize:10,fontFamily:FM,color:T.fg3,marginTop:1}}>{job.asset}</div>}
        </div>
        <button onClick={()=>addDwg(job)} style={{padding:'9px 12px',borderRadius:3,border:`1px solid ${al(T.lime,0.5)}`,background:al(T.lime,0.1),color:T.lime,fontFamily:FB,fontWeight:700,fontSize:11}}>+ ISO</button>
        <button onClick={()=>delJob(job.id)} style={{width:34,height:34,color:T.fg3,fontSize:13}}>✕</button>
      </div>
      {job.drawings.map(d=>(<div key={d.id} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 13px',borderBottom:`1px solid ${T.bdrS}`}}>
        <button onClick={()=>setMode({jobId:job.id,dwgId:d.id})} style={{flex:1,minWidth:0,textAlign:'left',background:'none',padding:0}}>
          <div style={{fontFamily:FM,fontSize:13,fontWeight:700,color:T.fg}}>{d.name} <span style={{color:T.fg3,fontWeight:400}}>· {d.lineNo}</span></div>
          <div style={{fontSize:10,fontFamily:FM,color:T.fg3,marginTop:2}}>{d.size} · {d.sch} · {d.runs.length} runs · {new Date(d.updated).toLocaleDateString()}</div>
        </button>
        <span style={{color:T.fg3,fontSize:14}}>›</span>
        <button onClick={()=>delDwg(job.id,d.id)} style={{width:30,height:30,color:T.fg3,fontSize:12}}>✕</button>
      </div>))}
    </div>))}
    {newJob&&<JobSheet onCreate={addJob} onClose={()=>setNewJob(false)}/>}
  </div>);
}
Object.assign(window,{DrawTab,IsoEditor,BSheet,BigBtn,LenSheet});
