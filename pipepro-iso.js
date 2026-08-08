/* PipePro — ISO Engine: 3D pipe graph, iso projection, fittings, welds, BOM */
const ISO_KEY='pipepro_iso_v1';
const ISO_DIRS={N:[0,1,0],S:[0,-1,0],E:[1,0,0],W:[-1,0,0],UP:[0,0,1],DN:[0,0,-1]};
function v3(a,b,f){return[a[0]+f*b[0],a[1]+f*b[1],a[2]+f*b[2]]}
function vDot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function vNorm(a){const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}
function combineDirs(keys){if(!keys.length)return null;const s=keys.reduce((acc,k)=>v3(acc,ISO_DIRS[k],1),[0,0,0]);if(Math.hypot(...s)<0.5)return null;return vNorm(s)}
// ── B16.9 / B16.5 takeouts (center-to-face, inches, by NPS) ──
const TO_90LR={0.5:1.5,0.75:1.125,1:1.5,1.25:1.875,1.5:2.25,2:3,2.5:3.75,3:4.5,4:6,6:9,8:12,10:15,12:18,14:21,16:24,18:27,20:30,24:36};
const TO_90SR={1:1,1.25:1.25,1.5:1.5,2:2,2.5:2.5,3:3,4:4,6:6,8:8,10:10,12:12,14:14,16:16,18:18,20:20,24:24};
const TO_45={0.5:0.625,0.75:0.75,1:0.875,1.25:1,1.5:1.125,2:1.375,2.5:1.75,3:2,4:2.5,6:3.75,8:5,10:6.25,12:7.5,14:8.75,16:10,18:11.25,20:12.5,24:15};
const TO_TEE={0.5:1,0.75:1.125,1:1.5,1.25:1.875,1.5:2.25,2:2.5,2.5:3,3:3.375,4:4.125,6:5.625,8:7,10:8.5,12:10,14:11,16:12,18:13.5,20:15,24:17};
function isoTakeout(fitType,nps){
  if(fitType==='ell90')return TO_90LR[nps]??1.5*nps;
  if(fitType==='ell90sr')return TO_90SR[nps]??nps;
  if(fitType==='ell45')return TO_45[nps]??0.625*nps;
  if(fitType==='tee'||fitType==='teebr')return TO_TEE[nps]??nps;
  return 0; // joint, open, cap (welds on), flange WN (adds beyond pipe)
}
function isoFmt(v){ // inches → 6'-2 3/16"
  if(v==null)return'—';const neg=v<0;v=Math.abs(v);let t=Math.round(v*16);let ft=Math.floor(t/192);t-=ft*192;let inn=Math.floor(t/16);const f=t-inn*16;
  const fr=f?(typeof FRACS!=='undefined'?FRACS[f]:f+'/16'):'';
  let s=ft?ft+"'-"+inn+(fr?' '+fr:'')+'"':inn+(fr?' '+fr:'')+'"';
  return(neg?'-':'')+s;
}
// ── Iso projection: 30° axes, 4 view corners ──
function isoProject(p,corner){
  const k={NE:0,SE:1,SW:2,NW:3}[corner]||0;let[x,y,z]=p;
  for(let i=0;i<k;i++){const t=x;x=y;y=-t}
  return[(x-y)*0.8660254,-((x+y)*0.5+z)];
}
const ISO_CORNERS=['NE','SE','SW','NW'];
// ── Model computation: positions, fittings, welds, cut list, warnings ──
function computeModel(d){
  const pos={},runsBy={},warn=[];
  d.nodes.forEach(n=>{runsBy[n.id]=[]});
  d.runs.forEach(r=>{runsBy[r.a].push(r);runsBy[r.b].push(r)});
  // positions: BFS from first node
  if(d.nodes.length){pos[d.nodes[0].id]=[0,0,0];const q=[d.nodes[0].id],seen={[d.nodes[0].id]:1};
    while(q.length){const id=q.shift();for(const r of runsBy[id]){const other=r.a===id?r.b:r.a;if(seen[other])continue;seen[other]=1;const dir=r.a===id?r.dir:[-r.dir[0],-r.dir[1],-r.dir[2]];pos[other]=v3(pos[id],dir,r.len);q.push(other)}}}
  // fitting inference per node
  const nodeFit={};
  d.nodes.forEach(n=>{
    const rs=runsBy[n.id],deg=rs.length;
    const away=rs.map(r=>r.a===n.id?r.dir:[-r.dir[0],-r.dir[1],-r.dir[2]]);
    if(deg===0)nodeFit[n.id]={type:'open',deg};
    else if(deg===1)nodeFit[n.id]={type:d.endOv?.[n.id]||'open',deg};
    else if(deg===2){
      const dot=vDot(away[0],away[1]);const bend=Math.round(180-Math.acos(Math.max(-1,Math.min(1,dot)))*180/Math.PI);
      let type=bend<=5?'joint':bend<=50?'ell45':bend<=95?'ell90':'bendX';
      if(type==='ell90'&&d.fitOv?.[n.id]==='ell90sr')type='ell90sr';
      if(type==='bendX')warn.push('Node '+n.id+': '+bend+'° bend — no std fitting');
      nodeFit[n.id]={type,deg,bend};
    }else if(deg===3){
      let hi=0,hj=1,best=1;
      for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const dt=vDot(away[i],away[j]);if(dt<best){best=dt;hi=i;hj=j}}
      const bk=[0,1,2].find(k=>k!==hi&&k!==hj);
      if(best>-0.95)warn.push('Node '+n.id+': tee header not straight');
      nodeFit[n.id]={type:'tee',deg,headerRuns:[rs[hi].id,rs[hj].id],branchRun:rs[bk].id};
    }else{nodeFit[n.id]={type:'cross',deg};warn.push('Node '+n.id+': '+deg+'-way — not supported')}
  });
  // takeout for a run at a node
  const nps=(typeof NPS!=='undefined'&&NPS[d.size])||parseFloat(d.size)||2;
  function toAt(nodeId,runId){const f=nodeFit[nodeId];if(!f)return 0;
    if(f.type==='tee')return isoTakeout('tee',nps);
    return isoTakeout(f.type,nps);
  }
  // welds walk (numbering follows build order), stable keys for S/F flags
  const welds=[];const emitted={};
  const wcount={joint:1,ell45:2,ell90:2,ell90sr:2,tee:3,cap:1,flangeWN:1,open:0,cross:0,bendX:2};
  const fitName={joint:'BUTT JOINT',ell45:'45° ELL',ell90:'90° LR ELL',ell90sr:'90° SR ELL',tee:'TEE',cap:'CAP',flangeWN:'WN FLANGE',bendX:'NON-STD BEND'};
  function emitNode(id){if(emitted[id])return;emitted[id]=1;const f=nodeFit[id];const n=wcount[f.type]||0;
    for(let k=0;k<n;k++){const key=id+'-'+k;welds.push({key,no:welds.length+1,at:id,desc:fitName[f.type]||f.type,sf:d.sfOv?.[key]||'S'})}}
  d.runs.forEach(r=>{emitNode(r.a);(d.valves?.[r.id]||[]).forEach((v,i)=>{
    const key='v'+r.id+'-'+i+'a',key2='v'+r.id+'-'+i+'b';
    welds.push({key,no:welds.length+1,at:r.id,desc:v.type+' VLV FLG 1',sf:d.sfOv?.[key]||'S'});
    welds.push({key:key2,no:welds.length+1,at:r.id,desc:v.type+' VLV FLG 2',sf:d.sfOv?.[key2]||'S'});
  });emitNode(r.b)});
  // cut list
  const runsInfo=d.runs.map((r,i)=>{
    const toA=toAt(r.a,r.id),toB=toAt(r.b,r.id);
    const vff=(d.valves?.[r.id]||[]).reduce((s,v)=>s+(v.ff||0),0);
    const cut=r.len-toA-toB-vff;
    if(cut<0)warn.push('P'+(i+1)+': cut length negative — run shorter than takeouts');
    return{run:r,mark:'P'+(i+1),cc:r.len,toA,toB,vff,cut};
  });
  const openEnds=d.nodes.filter(n=>nodeFit[n.id]&&nodeFit[n.id].deg<=1&&nodeFit[n.id].type==='open').map(n=>n.id);
  return{pos,runsBy,nodeFit,welds,runsInfo,openEnds,warn,nps};
}
// ── BOM ──
function isoBOM(d,m){
  const items=[];const spec=d.size+' '+(d.mat||'')+' '+(d.sch||'');
  const totCut=m.runsInfo.reduce((s,ri)=>s+Math.max(0,ri.cut),0);
  if(totCut>0)items.push({qty:isoFmt(totCut),desc:'PIPE '+spec+' (net cut)'});
  const counts={};Object.values(m.nodeFit).forEach(f=>{counts[f.type]=(counts[f.type]||0)+1});
  const map={ell90:'90° LR ELL '+d.size+' BW',ell90sr:'90° SR ELL '+d.size+' BW',ell45:'45° ELL '+d.size+' BW',tee:'TEE '+d.size+' BW',cap:'CAP '+d.size+' BW',flangeWN:'WN FLANGE '+d.size};
  Object.keys(map).forEach(k=>{if(counts[k])items.push({qty:counts[k],desc:map[k]})});
  let vlvFlg=0;Object.values(d.valves||{}).forEach(list=>list.forEach(v=>{items.push({qty:1,desc:v.type.toUpperCase()+' VALVE '+d.size+' FLGD'+(v.ff?' (F-F '+isoFmt(v.ff)+')':'')});vlvFlg+=2}));
  if(vlvFlg)items.push({qty:vlvFlg,desc:'WN FLANGE '+d.size+' (valve bolt-up)'});
  const s=m.welds.filter(w=>w.sf==='S').length,f=m.welds.length-s;
  if(m.welds.length)items.push({qty:m.welds.length,desc:'BW WELDS — '+s+' SHOP / '+f+' FIELD'});
  return items;
}
// ── Storage ──
function isoLoad(){try{const s=JSON.parse(localStorage.getItem(ISO_KEY));if(s&&s.jobs)return s}catch(e){}return{jobs:[],drawnBy:'',seq:1}}
function isoSave(st){try{localStorage.setItem(ISO_KEY,JSON.stringify(st))}catch(e){}}
function isoNewDrawing(st,defaults){
  const n=st.seq++;const pad=String(n).padStart(3,'0');
  return{id:'d'+Date.now(),name:'ISO-'+pad,lineNo:(defaults.size||'4"')+'-'+pad,size:defaults.size||'4"',mat:defaults.mat||'CS A106 Gr.B',sch:defaults.sch||'Sch 40',
    corner:'NE',asset:'',drawnBy:st.drawnBy||'',created:Date.now(),updated:Date.now(),
    nodes:[{id:1}],runs:[],nextId:2,fitOv:{},endOv:{},sfOv:{},valves:{},activeEnd:1};
}
// ── Label layout: collision-avoiding placement (run dims + weld tags) ──
function _segRectHit(a,b,R){
  if((a[0]<R.x0&&b[0]<R.x0)||(a[0]>R.x1&&b[0]>R.x1)||(a[1]<R.y0&&b[1]<R.y0)||(a[1]>R.y1&&b[1]>R.y1))return false;
  const ins=p=>p[0]>=R.x0&&p[0]<=R.x1&&p[1]>=R.y0&&p[1]<=R.y1;
  if(ins(a)||ins(b))return true;
  const iv=(p1,p2,p3,p4)=>{const dn=(p2[0]-p1[0])*(p4[1]-p3[1])-(p2[1]-p1[1])*(p4[0]-p3[0]);if(!dn)return false;const t=((p3[0]-p1[0])*(p4[1]-p3[1])-(p3[1]-p1[1])*(p4[0]-p3[0]))/dn;const u=((p3[0]-p1[0])*(p2[1]-p1[1])-(p3[1]-p1[1])*(p2[0]-p1[0]))/dn;return t>=0&&t<=1&&u>=0&&u<=1};
  const c=[[R.x0,R.y0],[R.x1,R.y0],[R.x1,R.y1],[R.x0,R.y1]];
  for(let i=0;i<4;i++)if(iv(a,b,c[i],c[(i+1)%4]))return true;
  return false;
}
function _clipToRect(p,c,R){
  const dx=c[0]-p[0],dy=c[1]-p[1];let bt=1;
  const test=t=>{if(t>0&&t<bt){const x=p[0]+dx*t,y=p[1]+dy*t;if(x>=R.x0-0.01&&x<=R.x1+0.01&&y>=R.y0-0.01&&y<=R.y1+0.01)bt=t}};
  if(dx){test((R.x0-p[0])/dx);test((R.x1-p[0])/dx)}
  if(dy){test((R.y0-p[1])/dy);test((R.y1-p[1])/dy)}
  return[p[0]+dx*bt,p[1]+dy*bt];
}
function isoLabelPlan(d,m,pts,fs){
  const segs=[],rects=[];
  d.runs.forEach(r=>{const a=pts[r.a],b=pts[r.b];if(a&&b)segs.push([a,b])});
  d.nodes.forEach(n=>{const p=pts[n.id];if(p)rects.push({x0:p[0]-fs*0.7,y0:p[1]-fs*0.7,x1:p[0]+fs*0.7,y1:p[1]+fs*0.7,soft:1})});
  d.runs.forEach(r=>{if(!(d.valves?.[r.id]||[]).length)return;const a=pts[r.a],b=pts[r.b];if(!a||!b)return;const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;rects.push({x0:mx-fs*1.1,y0:my-fs*0.85,x1:mx+fs*1.1,y1:my+fs*0.85})});
  const pad=fs*0.28;
  const cost=R=>{const E={x0:R.x0-pad,y0:R.y0-pad,x1:R.x1+pad,y1:R.y1+pad};let c=0;
    for(const g of segs)if(_segRectHit(g[0],g[1],E))c+=2;
    for(const q of rects)if(!(E.x1<q.x0||q.x1<E.x0||E.y1<q.y0||q.y1<E.y0))c+=(q.soft?1:3);
    return c};
  const plan={runs:{},welds:{}};
  d.runs.forEach(r=>{
    const a=pts[r.a],b=pts[r.b];if(!a||!b)return;
    const ri=m.runsInfo.find(q=>q.run.id===r.id);
    const t1=isoFmt(r.len),t2=ri?ri.mark+' CUT '+isoFmt(Math.max(0,ri.cut)):'';
    const w=Math.max(t1.length,t2.length*0.82)*fs*0.62,h=fs*2.4;
    const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,px=-dy/L,py=dx/L;
    const base=w/2*Math.abs(px)+h/2*Math.abs(py)+fs*0.55;
    const flip=py<0||(py===0&&px<0)?-1:1;
    let best=null;
    outer:for(const dist of[base,base+fs*1.4,base+fs*2.8])
      for(const t of[0.5,0.36,0.64,0.25,0.75])
        for(const sgn of[flip,-flip]){
          const cx=a[0]+dx*t+px*sgn*dist,cy=a[1]+dy*t+py*sgn*dist;
          const R={x0:cx-w/2,y0:cy-h/2,x1:cx+w/2,y1:cy+h/2};
          const c=cost(R);
          if(!best||c<best.c)best={c,cx,cy,R,t,sgn,dist};
          if(!c)break outer;
        }
    rects.push(best.R);
    const lp={x:best.cx,y:best.cy,leader:null};
    if(best.dist>base+fs*0.7){
      const sx=a[0]+dx*best.t+px*best.sgn*fs*0.5,sy=a[1]+dy*best.t+py*best.sgn*fs*0.5;
      const e=_clipToRect([sx,sy],[best.cx,best.cy],best.R);
      lp.leader=[sx,sy,e[0],e[1]];
    }
    plan.runs[r.id]=lp;
  });
  const at={};m.welds.forEach(wd=>{if(!pts[wd.at])return;(at[wd.at]=at[wd.at]||[]).push(wd)});
  Object.keys(at).forEach(id=>{
    const p=pts[id],lbl=at[id].map(wd=>'W'+wd.no+(wd.sf==='F'?'·F':'')).join(' ');
    const w=lbl.length*fs*0.52,h=fs*1.15;
    let best=null;
    outer2:for(const mult of[1,1.9])
      for(const[qx,qy]of[[1,-1],[-1,-1],[1,1],[-1,1],[0,-1.6],[0,1.6],[1.4,0],[-1.4,0]]){
        const cx=p[0]+qx*fs*1.05*mult+(qx?Math.sign(qx)*w/2:0),cy=p[1]+qy*fs*1.05*mult;
        const R={x0:cx-w/2,y0:cy-h/2,x1:cx+w/2,y1:cy+h/2};
        const c=cost(R);
        if(!best||c<best.c)best={c,cx,cy,R};
        if(!c)break outer2;
      }
    rects.push(best.R);
    plan.welds[id]={x:best.cx,y:best.cy};
  });
  return plan;
}
// ── Print SVG (black on white, for PDF sheet) ──
function buildPrintSVG(d,m,widthPx){
  const pts=Object.values(m.pos).map(p=>isoProject(p,d.corner));
  if(!pts.length)return{svg:'',w:10,h:10};
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;pts.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)});
  const pad=Math.max((x1-x0),(y1-y0))*0.18+18;x0-=pad;y0-=pad;x1+=pad;y1+=pad;
  const W=x1-x0,H=y1-y0,sc=widthPx/W;
  const P=p=>{const[x,y]=isoProject(p,d.corner);return[(x-x0)*sc,(y-y0)*sc]};
  const fs=Math.max(10,widthPx/55),lw=Math.max(1.4,widthPx/480);
  const pmap={};d.nodes.forEach(n=>{if(m.pos[n.id])pmap[n.id]=P(m.pos[n.id])});
  const plan=isoLabelPlan(d,m,pmap,fs);
  let s='';
  d.runs.forEach(r=>{const[ax,ay]=P(m.pos[r.a]),[bx,by]=P(m.pos[r.b]);
    s+=`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#000" stroke-width="${lw*1.6}" stroke-linecap="round"/>`;
    const mx=(ax+bx)/2,my=(ay+by)/2,dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy)||1,px=-dy/L,py=dx/L;
    // flow arrow
    if(L>fs*3){const t=0.62,fx=ax+dx*t,fy=ay+dy*t,u=fs*0.42;
      s+=`<polygon points="${fx+dx/L*u},${fy+dy/L*u} ${fx+px*u*0.6-dx/L*u*0.5},${fy+py*u*0.6-dy/L*u*0.5} ${fx-px*u*0.6-dx/L*u*0.5},${fy-py*u*0.6-dy/L*u*0.5}" fill="#000"/>`}
    const ri=m.runsInfo.find(q=>q.run.id===r.id);
    const lp=plan.runs[r.id];
    if(lp){
      if(lp.leader)s+=`<line x1="${lp.leader[0]}" y1="${lp.leader[1]}" x2="${lp.leader[2]}" y2="${lp.leader[3]}" stroke="#000" stroke-width="${lw*0.55}" opacity="0.5"/>`;
      s+=`<text x="${lp.x}" y="${lp.y-fs*0.25}" font-size="${fs}" font-family="Helvetica" text-anchor="middle" fill="#000">${isoFmt(r.len)}</text>`;
      s+=`<text x="${lp.x}" y="${lp.y+fs*0.85}" font-size="${fs*0.78}" font-family="Helvetica" text-anchor="middle" fill="#000">${ri?ri.mark+' CUT '+isoFmt(Math.max(0,ri.cut)):''}</text>`;
    }
    (d.valves?.[r.id]||[]).forEach(()=>{const u=fs*0.8;
      s+=`<polygon points="${mx-u},${my-u*0.7} ${mx+u},${my+u*0.7} ${mx+u},${my-u*0.7} ${mx-u},${my+u*0.7}" fill="#fff" stroke="#000" stroke-width="${lw}"/>`});
  });
  d.nodes.forEach(n=>{const f=m.nodeFit[n.id];if(!f)return;const[x,y]=P(m.pos[n.id]);
    if(f.type==='open'){s+=`<circle cx="${x}" cy="${y}" r="${fs*0.5}" fill="#fff" stroke="#000" stroke-width="${lw}"/>`}
    else if(f.type==='cap'){s+=`<circle cx="${x}" cy="${y}" r="${fs*0.4}" fill="#000"/>`}
    else if(f.type==='flangeWN'){s+=`<circle cx="${x}" cy="${y}" r="${fs*0.45}" fill="#fff" stroke="#000" stroke-width="${lw*1.8}"/>`}
  });
  // weld dots + labels
  const at={};m.welds.forEach(w=>{if(typeof w.at!=='number'&&!m.pos[w.at])return;const p=m.pos[w.at];if(!p)return;(at[w.at]=at[w.at]||[]).push(w)});
  Object.keys(at).forEach(id=>{const[x,y]=P(m.pos[id]);const ws=at[id];
    s+=`<circle cx="${x}" cy="${y}" r="${fs*0.32}" fill="#000"/>`;
    const lbl=ws.map(w=>'W'+w.no+(w.sf==='F'?'·F':'')).join(' ');
    const wp=plan.welds[id];
    s+=`<text x="${wp?wp.x:x+fs*0.8}" y="${wp?wp.y+fs*0.28:y-fs*0.7}" font-size="${fs*0.78}" font-family="Helvetica" text-anchor="${wp?'middle':'start'}" fill="#000">${lbl}</text>`});
  return{svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W*sc} ${H*sc}" width="${W*sc}" height="${H*sc}"><rect width="100%" height="100%" fill="#fff"/>${s}</svg>`,w:W*sc,h:H*sc};
}
