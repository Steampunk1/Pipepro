/* PipePro — ISO Engine: 3D pipe graph, iso projection, fittings, welds, BOM */
const ISO_KEY='pipepro_iso_v1';
const ISO_DIRS={N:[0,1,0],S:[0,-1,0],E:[1,0,0],W:[-1,0,0],UP:[0,0,1],DN:[0,0,-1]};
function v3(a,b,f){return[a[0]+f*b[0],a[1]+f*b[1],a[2]+f*b[2]]}
function vDot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function vNorm(a){const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}
function combineDirs(keys){if(!keys.length)return null;const s=keys.reduce((acc,k)=>v3(acc,ISO_DIRS[k],1),[0,0,0]);if(Math.hypot(...s)<0.5)return null;return vNorm(s)}
// ── Takeouts: B16.9 tables (TO_*) live in pipepro-data.js — shared with getTO ──
function isoTakeout(fitType,nps,sw,size){
  if(sw){ // socket-weld takeouts by size string (B16.11 center-to-socket)
    const sw90=(typeof SW90!=='undefined'?SW90[size]:undefined),sw45=(typeof SW45!=='undefined'?SW45[size]:undefined);
    if(fitType==='ell90'||fitType==='ell90sr'||fitType==='tee'||fitType==='teebr')return sw90!=null?sw90:0.88*nps;
    if(fitType==='ell45')return sw45!=null?sw45:0.5*nps;
    return 0;
  }
  if(fitType==='ell90')return TO_90LR[nps]??1.5*nps;
  if(fitType==='ell90sr')return TO_90SR[nps]??nps;
  if(fitType==='ell45')return TO_45[nps]??0.625*nps;
  if(fitType==='tee'||fitType==='teebr')return TO_TEE[nps]??nps;
  return 0; // joint, open, cap (welds on), flange WN (adds beyond pipe), olet (on-run)
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
  const oletOv=d.oletOv||{},redsMap=d.reds||{},isSW=d.conn==='SW';
  if(isSW&&typeof SW_SZ!=='undefined'&&!SW_SZ.includes(d.size))warn.push('SW selected — no SW fittings over 4"');
  const nodeFit={};
  d.nodes.forEach(n=>{
    const rs=runsBy[n.id],deg=rs.length;
    const away=rs.map(r=>r.a===n.id?r.dir:[-r.dir[0],-r.dir[1],-r.dir[2]]);
    if(oletOv[n.id]&&deg>=2){
      // olet: header pipe runs straight through; branch stabs in — no header takeout
      let hi=0,hj=1,best=1;
      for(let i=0;i<deg;i++)for(let j=i+1;j<deg;j++){const dt=vDot(away[i],away[j]);if(dt<best){best=dt;hi=i;hj=j}}
      const bk=deg>2?[...Array(deg).keys()].find(k=>k!==hi&&k!==hj):null;
      if(best>-0.95)warn.push('Node '+n.id+': olet header not straight');
      nodeFit[n.id]={type:'olet',deg,ol:oletOv[n.id],headerRuns:[rs[hi].id,rs[hj].id],branchRun:bk!=null?rs[bk].id:null};
    }
    else if(deg===0)nodeFit[n.id]={type:'open',deg};
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
  // ── Line-size propagation ──────────────────────────────────────────────
  // Size changes at: olet branches (ol.bs), reducing-tee branches (teeBs),
  // and in-line reducers/bushings (reds[].to — the size flips AT the part, in
  // the direction the run was drawn, a→b). BFS from the root mirrors the
  // position walk; runs are always drawn parent→child, so we enter at `a`.
  const teeBs=d.teeBs||{};
  const runById={};d.runs.forEach(r=>{runById[r.id]=r});
  const redSeq=rid=>{const rl=(runById[rid]||{}).len||0;
    return(redsMap[rid]||[]).filter(x=>x.to).slice().sort((p,q)=>((p.dist>0?p.dist:rl/2))-((q.dist>0?q.dist:rl/2)))};
  const runSize={},runSizeEnd={};
  d.runs.forEach(r=>{runSize[r.id]=d.size;runSizeEnd[r.id]=d.size});
  if(d.nodes.length){
    const q2=[d.nodes[0].id];const szAtNode={[d.nodes[0].id]:d.size};
    while(q2.length){
      const id=q2.shift();const f=nodeFit[id];
      for(const r of runsBy[id]){
        const other=r.a===id?r.b:r.a;
        if(szAtNode[other]!=null)continue;
        let sz=szAtNode[id];
        if(f&&f.branchRun===r.id){ // stepping onto a branch leg resets to branch size
          if(f.type==='olet'&&f.ol&&f.ol.bs)sz=f.ol.bs;
          else if(f.type==='tee'&&teeBs[id])sz=teeBs[id];
        }
        if(r.a===id){runSize[r.id]=sz;redSeq(r.id).forEach(rd=>{sz=rd.to});runSizeEnd[r.id]=sz}
        else{runSize[r.id]=sz;runSizeEnd[r.id]=sz} // reverse entry (non-tree edge) — no reducer flip
        szAtNode[other]=sz;
        q2.push(other);
      }
    }
  }
  // size of a specific run AT a specific node (its two ends can differ now)
  const szSide=(rid,nodeId)=>{const r=runById[rid];if(!r)return d.size;
    return nodeId===r.b?(runSizeEnd[rid]??d.size):(runSize[rid]??d.size)};
  // size of a run at a distance along it (for parts placed past a reducer)
  function sizeAt(rid,dist){let cur=runSize[rid]??d.size;const rl=(runById[rid]||{}).len||0;
    redSeq(rid).forEach(rd=>{const dd=rd.dist>0?rd.dist:rl/2;if(dist!=null&&dist>dd)cur=rd.to});
    return cur}
  // node size = size of the pipe passing through it (branch nodes shrink with the branch)
  d.nodes.forEach(n=>{
    const f=nodeFit[n.id];if(!f)return;const rs=runsBy[n.id]||[];
    if(f.type==='tee'&&teeBs[n.id])f.bs=teeBs[n.id];
    const ref=f.type==='olet'?((f.headerRuns&&f.headerRuns[0])??(rs[0]&&rs[0].id)):(rs[0]&&rs[0].id);
    f.sz=ref!=null?szSide(ref,n.id):d.size;
  });
  const npsOf=sz=>((typeof NPS!=='undefined'&&NPS[sz])||parseFloat(sz)||2);
  const warnedTeeM=new Set();
  // takeout for a run at a node — sized to that run's line size AT that node
  function toAt(nodeId,runId){const f=nodeFit[nodeId];if(!f)return 0;
    const sz=szSide(runId,nodeId);
    if(f.type==='tee'&&f.branchRun===runId&&f.bs){
      // reducing tee BRANCH: center-to-outlet is the B16.9 "M" dim, NOT the
      // run-size C. User-set M (teeM) wins; then the verified table; the
      // run-C estimate is a LAST resort and gets its own warning — C ≥ M, so
      // estimating with C cuts the branch piece SHORT (scrap direction).
      const M=(d.teeM||{})[nodeId];
      if(M!=null)return M;
      const hsz=szSide((f.headerRuns&&f.headerRuns[0])??runId,nodeId);
      const t=(typeof REDTEE_M!=='undefined'&&REDTEE_M[hsz]&&REDTEE_M[hsz][f.bs])||null;
      if(t!=null)return t;
      if(!warnedTeeM.has(nodeId)){warnedTeeM.add(nodeId);
        warn.push('Node '+nodeId+': reducing tee '+hsz+' x '+f.bs+' — branch takeout is the run-C ESTIMATE. Set the real B16.9 M dim on the tee sheet before cutting.')}
      return isoTakeout('tee',npsOf(hsz),isSW,hsz);
    }
    // flanged ends: working dims run to the GASKET FACE — the flange's own
    // length (B16.5 Y) comes out of the pipe. SO flange: pipe inserts, ~1/2"
    // face setback per shop convention.
    if(f.type==='flangeWN'||f.type==='blindFlg')return flgTO(sz,(d.endClsOv||{})[nodeId]||'#150');
    if(f.type==='flangeSO')return SO_SETBACK;
    if(f.type==='flangeLJ')return flgSideTO(sz,(d.endClsOv||{})[nodeId]||'#150','LJ');
    if(f.type==='olet'){
      // header runs pass straight through (0); the BRANCH seats on the header —
      // deduct header OD/2 (to the header surface; olet stand-out is mfr-specific)
      if(f.branchRun===runId){
        const hsz=szSide((f.headerRuns&&f.headerRuns[0])??runId,nodeId);
        return ((typeof OD_TBL!=='undefined'&&OD_TBL[hsz])||npsOf(hsz))/2;
      }
      return 0;
    }
    return isoTakeout(f.type,npsOf(sz),isSW,sz);
  }
  if(Object.keys(oletOv).length)warn.push('Olet branch cuts deduct header OD/2 only — verify olet stand-out per mfr before cutting');
  // welds walk (numbering follows build order), stable keys for S/F flags
  const welds=[];const emitted={};
  // olets carry TWO welds (attachment groove to header + branch joint) except
  // threadolets, whose branch connection is threaded — one attachment weld only
  // SO flange = ONE weld-map joint (it takes two fillet passes — hub + face —
  // but it counts and gets tracked as a single joint, not two)
  const wcount={joint:1,ell45:2,ell90:2,ell90sr:2,tee:3,cap:1,flangeWN:1,flangeSO:1,flangeLJ:1,blindFlg:1,capTHD:0,open:0,cross:0,bendX:2};
  const fitName=isSW
    ?{joint:'SW COUPLING',ell45:'SW 45° ELL',ell90:'SW 90° ELL',ell90sr:'SW 90° ELL',tee:'SW TEE',cap:'SW CAP',flangeWN:'SW FLANGE',flangeSO:'SW FLANGE',flangeLJ:'LJ STUB BW',blindFlg:'SW FLG (BLIND END)',capTHD:'THD CAP',bendX:'NON-STD BEND'}
    :{joint:'BUTT JOINT',ell45:'45° ELL',ell90:'90° LR ELL',ell90sr:'90° SR ELL',tee:'TEE',cap:'CAP',flangeWN:'WN FLANGE',flangeSO:'SO FLG (DBL FILLET)',flangeLJ:'LJ STUB BW',blindFlg:'WN FLG (BLIND END)',capTHD:'THD CAP',bendX:'NON-STD BEND'};
  function emitNode(id){if(emitted[id])return;emitted[id]=1;const f=nodeFit[id];
    if(f.type==='olet'){
      const nm=oletName(f.ol);
      const descs=f.ol&&f.ol.t==='TOL'?[nm+' ATTACH']:[nm+' ATTACH',nm+(f.ol&&f.ol.t==='SOL'?' BRANCH SW':' BRANCH BW')];
      descs.forEach((desc,k)=>{const key=id+'-'+k;
        welds.push({key,no:welds.length+1,at:id,desc,sf:d.sfOv?.[key]||'S'})});
      return;
    }
    const n=wcount[f.type]||0;
    for(let k=0;k<n;k++){const key=id+'-'+k;
      welds.push({key,no:welds.length+1,at:id,desc:fitName[f.type]||f.type,sf:d.sfOv?.[key]||'S'})}}
  const vlvLbl={FLGD:'FLG',BW:'BW',SW:'SW',THD:'THD'};
  d.runs.forEach(r=>{emitNode(r.a);
    (d.valves?.[r.id]||[]).forEach((v,i)=>{
      const conn=v.conn||'FLGD';
      if(conn==='THD')return; // threaded parts screw on — no welds
      const lbl=conn==='FLGD'?(v.ftype==='SO'?'SO FLG FILLET':v.ftype==='LJ'?'STUB BW':'FLG'):(vlvLbl[conn]||'FLG');
      const key='v'+r.id+'-'+i+'a',key2='v'+r.id+'-'+i+'b';
      welds.push({key,no:welds.length+1,at:r.id,desc:v.type+' '+lbl+' 1',sf:d.sfOv?.[key]||'S'});
      welds.push({key:key2,no:welds.length+1,at:r.id,desc:v.type+' '+lbl+' 2',sf:d.sfOv?.[key2]||'S'});
    });
    (redsMap[r.id]||[]).forEach((rd,i)=>{
      if(rd.kind==='BUSH')return; // threaded bushing screws in — no welds
      const nm=(rd.kind==='ECC'?'ECC':'CON')+' RED '+(isSW?'SW':'BW');
      const key='r'+r.id+'-'+i+'a',key2='r'+r.id+'-'+i+'b';
      welds.push({key,no:welds.length+1,at:r.id,desc:nm+' 1',sf:d.sfOv?.[key]||'S'});
      welds.push({key:key2,no:welds.length+1,at:r.id,desc:nm+' 2',sf:d.sfOv?.[key2]||'S'});
    });
    ((d.flgs||{})[r.id]||[]).forEach((fl,i)=>{
      const ft=fl.ftype||'WN';
      const nm=ft==='SO'?'BRKOUT SO FLG FILLET':ft==='LJ'?'BRKOUT STUB BW':'BRKOUT WN FLG';
      const key='f'+r.id+'-'+i+'a',key2='f'+r.id+'-'+i+'b';
      welds.push({key,no:welds.length+1,at:r.id,desc:nm+' 1',sf:d.sfOv?.[key]||'S'});
      welds.push({key:key2,no:welds.length+1,at:r.id,desc:nm+' 2',sf:d.sfOv?.[key2]||'S'});
    });
  emitNode(r.b)});
  // cut list — header runs continue THROUGH olets, so runs joined by an olet
  // node merge into one cut piece (one stick of pipe, olet welded onto it)
  const perRun=d.runs.map(r=>{
    const ded=(d.valves?.[r.id]||[]).reduce((s,v)=>s+(v.ff||0),0)
             +(redsMap[r.id]||[]).reduce((s,x)=>s+(x.len||0),0);
    return{run:r,toA:toAt(r.a,r.id),toB:toAt(r.b,r.id),ded};
  });
  const parent={};const find=k=>parent[k]===k?k:(parent[k]=find(parent[k]));
  d.runs.forEach(r=>{parent[r.id]=r.id});
  Object.values(nodeFit).forEach(f=>{
    if(f&&f.type==='olet'&&f.headerRuns){const[a,b]=f.headerRuns;if(a!=null&&b!=null&&a!==b)parent[find(a)]=find(b)}});
  const groups=new Map();
  perRun.forEach(pr=>{const g=find(pr.run.id);if(!groups.has(g))groups.set(g,[]);groups.get(g).push(pr)});
  // ── Segment cut engine ──────────────────────────────────────────────────
  // Every inline part (valve / reducer / breakout flange pair) BREAKS the pipe
  // at its field-measured distance: the piece becomes separate cut segments
  // between break faces. dist = run-start → part CENTER, as measured in field.
  function runBreaks(rid){
    // effective break width = what the part REALLY consumes between pipe ends:
    // flanged parts include their two mating WN flanges + gasket allowances.
    // Breaks are folded in drawn order so each part is sized at the line size
    // where it actually sits (a valve past a reducer stacks at the small size),
    // and each break carries the size on its two sides (szBefore/szAfter).
    const raw=[];
    (d.valves?.[rid]||[]).forEach(v=>raw.push({pk:'v',o:v,dist:v.dist,rid}));
    (redsMap[rid]||[]).forEach(rd=>raw.push({pk:'r',o:rd,dist:rd.dist,rid}));
    (((d.flgs||{})[rid])||[]).forEach(fl=>raw.push({pk:'f',o:fl,dist:fl.dist,rid}));
    const rlen=(runById[rid]||{}).len||0;
    raw.sort((p,q)=>((p.dist>0?p.dist:rlen/2))-((q.dist>0?q.dist:rlen/2)));
    let cur=runSize[rid]??d.size;
    raw.forEach(br=>{
      const sz=cur;br.szBefore=sz;
      if(br.pk==='v'){const v=br.o;const conn=v.conn||'FLGD';const ft=v.ftype||'WN';
        br.kind=v.type;
        br.ff=conn==='FLGD'?(v.ff||0)+2*(flgSideTO(sz,v.cls||'#150',ft)+GSK_ALLOW):(v.ff||0);
        // SO mating flanges are fillet-welded — no root gap; WN/LJ butt-weld
        br.gap=conn==='BW'||(conn==='FLGD'&&ft!=='SO');
      }else if(br.pk==='r'){const rd=br.o;
        if(rd.kind==='BUSH'){br.kind='THD BUSHING';br.ff=rd.len||1;br.gap=false}
        else{br.kind=(rd.kind==='ECC'?'ECC':'CONC')+' RED';
          const big=rd.to&&npsOf(rd.to)>npsOf(sz)?rd.to:sz; // B16.9 H — larger end governs
          br.ff=rd.len||RED_H[npsOf(big)]||0;br.gap=!isSW}
        if(rd.to)cur=rd.to;
      }else{const fl=br.o;const ft=fl.ftype||'WN';
        br.kind='BRKOUT FLGS';
        br.ff=2*flgSideTO(sz,fl.cls||'#150',ft)+GSK_ALLOW+(fl.ff||0);br.gap=ft!=='SO'}
      br.szAfter=cur;
    });
    return raw;
  }
  // root gap applies at BUTT-welded boundaries only (BW drawings)
  const endGap=nodeId=>{
    if(isSW)return false;
    const f=nodeFit[nodeId];if(!f)return false;
    return!['open','capTHD','flangeSO','cross'].includes(f.type);
  };
  const runsInfo=[];const perRunMap={};let pi=1;let unplaced=0;
  for(const prs of groups.values()){
    // order member runs into a chain (they join end-to-end through olet nodes)
    let chain;
    if(prs.length===1)chain=[{run:prs[0].run,rev:false}];
    else{
      const useCount={};prs.forEach(p=>{[p.run.a,p.run.b].forEach(n=>useCount[n]=(useCount[n]||0)+1)});
      let node=prs.map(p=>p.run.a).concat(prs.map(p=>p.run.b)).find(n=>useCount[n]===1);
      const unused=new Set(prs.map(p=>p.run.id));chain=[];
      while(unused.size){
        const p=prs.find(q=>unused.has(q.run.id)&&(q.run.a===node||q.run.b===node));
        if(!p)break;
        const rev=p.run.b===node;
        chain.push({run:p.run,rev});unused.delete(p.run.id);
        node=rev?p.run.a:p.run.b;
      }
      if(chain.length!==prs.length){chain=prs.map(p=>({run:p.run,rev:false}))} // fallback: unordered
    }
    const L=chain.reduce((s,c)=>s+c.run.len,0);
    const firstC=chain[0],lastC=chain[chain.length-1];
    const startNode=firstC.rev?firstC.run.b:firstC.run.a;
    const endNode=lastC.rev?lastC.run.a:lastC.run.b;
    const startTO=toAt(startNode,firstC.run.id),endTO=toAt(endNode,lastC.run.id);
    // size at the chain start; reducer/bushing breaks flip it as we walk
    let curSz=firstC.rev?(runSizeEnd[firstC.run.id]??d.size):(runSize[firstC.run.id]??d.size);
    // map every break to a global position along the chain
    const breaks=[];let off=0;
    chain.forEach(c=>{
      runBreaks(c.run.id).forEach(br=>{
        let dd=br.dist;
        if(dd==null||!(dd>0)||dd>c.run.len){dd=c.run.len/2;br.noDist=true;unplaced++}
        // size on the far side of this break, in CHAIN direction (a reversed
        // run is walked against its drawn direction, so the sides swap)
        breaks.push({...br,s:off+(c.rev?c.run.len-dd:dd),szNext:c.rev?br.szBefore:br.szAfter});
      });
      off+=c.run.len;
    });
    breaks.sort((a,b)=>a.s-b.s);
    // segments between: [start takeout] … part faces … [end takeout]
    const segMarks=[];
    const gapStart=endGap(startNode),gapEnd=endGap(endNode);
    let prevFace=startTO;
    const emitSeg=(face,leftDed,rightDed,span,gL,gR)=>{
      const gaps=((gL?1:0)+(gR?1:0))*ROOT_GAP;
      const cut=face-prevFace-gaps;
      const mark='P'+pi;pi++;
      if(cut<0)warn.push(mark+': parts overlap or takeouts exceed span — check field distances');
      runsInfo.push({run:prs[0].run,runIds:prs.map(p=>p.run.id),mark,cc:span,toA:leftDed,toB:rightDed+gaps,vff:0,cut,size:curSz,labelRun:null});
      segMarks.push(mark);
    };
    if(breaks.length===0){
      const gaps=((gapStart?1:0)+(gapEnd?1:0))*ROOT_GAP;
      const cut=L-startTO-endTO-gaps;
      const mark='P'+pi;pi++;
      if(cut<0)warn.push(mark+': cut length negative — run shorter than takeouts');
      const labelRun=chain.reduce((m2,c)=>c.run.len>m2.run.len?c:m2,chain[0]).run.id;
      runsInfo.push({run:prs[0].run,runIds:prs.map(p=>p.run.id),mark,cc:L,toA:startTO,toB:endTO+gaps,vff:0,cut,size:curSz,labelRun});
      segMarks.push(mark);
    }else{
      let sPrev=0,dedPrev=startTO,gPrev=gapStart;
      breaks.forEach(br=>{
        emitSeg(br.s-br.ff/2,dedPrev,br.ff/2,br.s-sPrev,gPrev,br.gap);
        prevFace=br.s+br.ff/2;sPrev=br.s;dedPrev=br.ff/2;gPrev=br.gap;
        curSz=br.szNext??curSz; // size flips at reducer/bushing breaks
      });
      emitSeg(L-endTO,dedPrev,endTO,L-sPrev,gPrev,gapEnd);
    }
    const riList=runsInfo.slice(runsInfo.length-segMarks.length);
    // run-dim label shows the marks that live on that piece, on its longest member
    const labelRun=chain.reduce((m2,c)=>c.run.len>m2.run.len?c:m2,chain[0]).run.id;
    riList.forEach(ri=>{ri.labelRun=labelRun;ri.marks=segMarks});
    prs.forEach(p=>{perRunMap[p.run.id]={toA:p.toA,toB:p.toB,ded:p.ded,ri:riList[0],marks:segMarks,breaks:breaks.filter(b=>b.rid===p.run.id)}});
  }
  if(unplaced>0)warn.push(unplaced+' part(s) have no field distance — placed mid-run. Tap the part row to set the measured distance.');
  // reducer inventory with real from/to sizes (folded in drawn order) — BOM + UI
  const redList=[];
  d.runs.forEach(r=>{
    let cur=runSize[r.id]??d.size;const rl=r.len||0;
    (redsMap[r.id]||[]).slice().sort((p,q)=>((p.dist>0?p.dist:rl/2))-((q.dist>0?q.dist:rl/2))).forEach(rd=>{
      redList.push({rid:r.id,kind:rd.kind,from:cur,to:rd.to||cur,rd});
      if(rd.to)cur=rd.to;
    });
  });
  const openEnds=d.nodes.filter(n=>nodeFit[n.id]&&nodeFit[n.id].deg<=1&&nodeFit[n.id].type==='open').map(n=>n.id);
  return{pos,runsBy,nodeFit,welds,runsInfo,perRun:perRunMap,runSize,runSizeEnd,sizeAt,redList,openEnds,warn,nps:npsOf(d.size)};
}
// ── BOM ──
function isoBOM(d,m){
  const isSW=d.conn==='SW';
  const items=[];
  // pipe: net cut grouped by line size (olet branches buy at branch size)
  const cutBySize={};
  m.runsInfo.forEach(ri=>{const sz=ri.size||d.size;cutBySize[sz]=(cutBySize[sz]||0)+Math.max(0,ri.cut)});
  Object.entries(cutBySize).forEach(([sz,cut])=>{
    if(cut>0)items.push({qty:isoFmt(cut),desc:'PIPE '+sz+' '+(d.mat||'')+' '+(d.sch||'')+' (net cut)'});
  });
  // fittings counted at the size of the pipe passing through them
  const fitDesc=(type,sz)=>isSW
    ?({ell90:'SW 90° ELL '+sz,ell90sr:'SW 90° ELL '+sz,ell45:'SW 45° ELL '+sz,tee:'SW TEE '+sz,cap:'SW CAP '+sz,flangeWN:'SW FLANGE '+sz,flangeSO:'SW FLANGE '+sz,flangeLJ:'LJ FLANGE + STUB END '+sz,blindFlg:'BLIND END SET '+sz+' (SW flg + blind + gskt + studs)',capTHD:'THD CAP '+sz,joint:'SW FULL COUPLING '+sz})[type]
    :({ell90:'90° LR ELL '+sz+' BW',ell90sr:'90° SR ELL '+sz+' BW',ell45:'45° ELL '+sz+' BW',tee:'TEE '+sz+' BW',cap:'CAP '+sz+' BW',flangeWN:'WN FLANGE '+sz,flangeSO:'SO FLANGE '+sz,flangeLJ:'LJ FLANGE + STUB END '+sz,blindFlg:'BLIND END SET '+sz+' (WN flg + blind + gskt + studs)',capTHD:'THD CAP '+sz})[type];
  const counts={};
  Object.values(m.nodeFit).forEach(f=>{
    // reducing tee: header size x header size x outlet
    const desc=f.type==='tee'&&f.bs
      ?(isSW?'SW TEE ':'TEE ')+(f.sz||d.size)+' x '+f.bs+' RED'+(isSW?'':' BW')
      :fitDesc(f.type,f.sz||d.size);
    if(desc)counts[desc]=(counts[desc]||0)+1;
  });
  Object.entries(counts).forEach(([desc,q])=>items.push({qty:q,desc}));
  // olets, header size x branch size
  const olCounts={};
  Object.values(m.nodeFit).forEach(f=>{
    if(f.type==='olet'&&f.ol){
      const k=oletName({t:f.ol.t}).replace(/ $/,'')+' '+(f.sz||d.size)+' x '+(f.ol.bs||d.size);
      olCounts[k]=(olCounts[k]||0)+1;
    }});
  Object.entries(olCounts).forEach(([k,q])=>items.push({qty:q,desc:k}));
  // valves — sized to their run; bolt-up hardware only for flanged (2 joints per valve)
  // bolted-joint hardware, grouped by size + flange TYPE (WN / SO / LJ).
  // LJ rides on stub ends — the loose flange plus a stub per side.
  const hw={};
  const addHw=(sz,ft,joints,flanges,tag)=>{
    const k=sz+'|'+(ft||'WN')+'|'+tag;
    hw[k]=hw[k]||{sz,ft:ft||'WN',tag,joints:0,flanges:0};
    hw[k].joints+=joints;hw[k].flanges+=flanges;
  };
  const flgName=ft=>ft==='SO'?'SO FLANGE':ft==='LJ'?'LJ FLANGE':(isSW?'SW FLANGE':'WN FLANGE');
  const SPECIALTY=['Expansion Joint','Union','Swage Nipple'];
  Object.entries(d.valves||{}).forEach(([rid,list])=>list.forEach(v=>{
    const c=v.conn||'FLGD';const sz=m.sizeAt?m.sizeAt(+rid,v.dist):((m.runSize&&m.runSize[rid])||d.size);
    const noun=SPECIALTY.includes(v.type)?'':' VALVE';
    items.push({qty:1,desc:v.type.toUpperCase()+noun+' '+sz+' '+c+(v.cls&&c==='FLGD'?' '+v.cls:'')+(c==='FLGD'&&v.ftype&&v.ftype!=='WN'?' ('+v.ftype+' mating flgs)':'')+(v.ff?' (F-F '+isoFmt(v.ff)+')':'')});
    if(c==='FLGD')addHw(sz,v.ftype,2,2,'valve bolt-up');
  }));
  // reducers & bushings — real from x to (folded through prior size changes)
  (m.redList||[]).forEach(ri=>{
    if(ri.kind==='BUSH')items.push({qty:1,desc:'THD RED BUSHING '+ri.from+' x '+ri.to+' (field fit — verify engagement)'});
    else items.push({qty:1,desc:(ri.kind==='ECC'?'ECC':'CON')+' REDUCER '+ri.from+' x '+ri.to+(isSW?' SW':' BW')});
  });
  // breakout flange pairs
  Object.entries(d.flgs||{}).forEach(([rid,list])=>list.forEach(fl=>{
    const sz=m.sizeAt?m.sizeAt(+rid,fl.dist):((m.runSize&&m.runSize[rid])||d.size);
    addHw(sz,fl.ftype,1,2,'breakout');
  }));
  Object.values(hw).forEach(h=>{
    items.push({qty:h.flanges,desc:flgName(h.ft)+' '+h.sz+' ('+h.tag+')'});
    if(h.ft==='LJ')items.push({qty:h.flanges,desc:'STUB END '+h.sz+' B16.9 ('+h.tag+')'});
    items.push({qty:h.joints,desc:'GASKET '+h.sz+' ('+h.tag+')'});
    items.push({qty:h.joints,desc:'STUD BOLT SET '+h.sz+' — count/dia per class: TOOLS > FLANGE'});
  });
  const s=m.welds.filter(w=>w.sf==='S').length,f=m.welds.length-s;
  if(m.welds.length)items.push({qty:m.welds.length,desc:(isSW?'SW':'BW')+' WELDS — '+s+' SHOP / '+f+' FIELD'});
  return items;
}
// ── Storage ──
function isoLoad(){try{const s=JSON.parse(localStorage.getItem(ISO_KEY));if(s&&s.jobs)return s}catch(e){}return{jobs:[],drawnBy:'',seq:1}}
function isoSave(st){try{localStorage.setItem(ISO_KEY,JSON.stringify(st))}catch(e){}}
function isoNewDrawing(st,defaults){
  const n=st.seq++;const pad=String(n).padStart(3,'0');
  return{id:'d'+Date.now(),name:'ISO-'+pad,lineNo:(defaults.size||'4"')+'-'+pad,size:defaults.size||'4"',mat:defaults.mat||'CS A106 Gr.B',sch:defaults.sch||'Sch 40',
    corner:'NE',asset:'',drawnBy:st.drawnBy||'',created:Date.now(),updated:Date.now(),conn:'BW',
    nodes:[{id:1}],runs:[],nextId:2,fitOv:{},endOv:{},endClsOv:{},sfOv:{},valves:{},reds:{},oletOv:{},flgs:{},teeBs:{},teeM:{},activeEnd:1};
}
// Run-dim second line: single segment shows its cut; a piece split by parts
// lists its marks and points at the cut list (each segment has its own cut)
function markLbl(ri){
  const ms=ri.marks&&ri.marks.length?ri.marks:[ri.mark];
  if(ms.length===1)return ms[0]+' CUT '+isoFmt(Math.max(0,ri.cut));
  const lbl=ms.length>3?ms[0]+'-'+ms[ms.length-1]:ms.join('/');
  return lbl+' — SEE CUT LIST';
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
    const ri=m.perRun?m.perRun[r.id]?.ri:m.runsInfo.find(q=>q.runIds?q.runIds.includes(r.id):q.run.id===r.id);
    const t1=isoFmt(r.len),t2=ri&&ri.labelRun===r.id?markLbl(ri):'';
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
    const ri=m.perRun?m.perRun[r.id]?.ri:m.runsInfo.find(q=>q.runIds?q.runIds.includes(r.id):q.run.id===r.id);
    const lp=plan.runs[r.id];
    if(lp){
      if(lp.leader)s+=`<line x1="${lp.leader[0]}" y1="${lp.leader[1]}" x2="${lp.leader[2]}" y2="${lp.leader[3]}" stroke="#000" stroke-width="${lw*0.55}" opacity="0.5"/>`;
      s+=`<text x="${lp.x}" y="${lp.y-fs*0.25}" font-size="${fs}" font-family="Helvetica" text-anchor="middle" fill="#000">${isoFmt(r.len)}</text>`;
      s+=`<text x="${lp.x}" y="${lp.y+fs*0.85}" font-size="${fs*0.78}" font-family="Helvetica" text-anchor="middle" fill="#000">${ri&&ri.labelRun===r.id?markLbl(ri):''}</text>`;
    }
    // inline parts drawn AT their field-measured distance, with the measurement
    const partAt=(dist,draw)=>{
      const t=Math.max(0.02,Math.min(0.98,(dist!=null&&dist>0?dist:r.len/2)/r.len));
      const px2=ax+dx*t,py2=ay+dy*t;draw(px2,py2);
      return[px2,py2];
    };
    (d.valves?.[r.id]||[]).forEach(v=>{const u=fs*0.8;
      const[vx,vy]=partAt(v.dist,(x,y)=>{
        s+=`<polygon points="${x-u},${y-u*0.7} ${x+u},${y+u*0.7} ${x+u},${y-u*0.7} ${x-u},${y+u*0.7}" fill="#fff" stroke="#000" stroke-width="${lw}"/>`});
      if(v.dist!=null&&v.dist>0)s+=`<text x="${vx+px*fs*1.15}" y="${vy+py*fs*1.15+fs*0.3}" font-size="${fs*0.66}" font-family="Helvetica" text-anchor="middle" fill="#000">@ ${isoFmt(v.dist)}</text>`;
    });
    ((d.reds||{})[r.id]||[]).forEach(rd=>{const u=fs*0.75;
      const[vx,vy]=partAt(rd.dist,(x,y)=>{
        s+=`<polygon points="${x-dx/L*u},${y-dy/L*u} ${x+dx/L*u+px*u*0.75},${y+dy/L*u+py*u*0.75} ${x+dx/L*u-px*u*0.75},${y+dy/L*u-py*u*0.75}" fill="#fff" stroke="#000" stroke-width="${lw}"/>`});
      if(rd.dist!=null&&rd.dist>0)s+=`<text x="${vx+px*fs*1.15}" y="${vy+py*fs*1.15+fs*0.3}" font-size="${fs*0.66}" font-family="Helvetica" text-anchor="middle" fill="#000">@ ${isoFmt(rd.dist)}</text>`;
    });
    (((d.flgs||{})[r.id])||[]).forEach(fl=>{const u=fs*0.55;
      const[vx,vy]=partAt(fl.dist,(x,y)=>{
        const gx=dx/L*fs*0.22,gy=dy/L*fs*0.22;
        s+=`<line x1="${x-gx-px*u}" y1="${y-gy-py*u}" x2="${x-gx+px*u}" y2="${y-gy+py*u}" stroke="#000" stroke-width="${lw*1.6}"/>`;
        s+=`<line x1="${x+gx-px*u}" y1="${y+gy-py*u}" x2="${x+gx+px*u}" y2="${y+gy+py*u}" stroke="#000" stroke-width="${lw*1.6}"/>`});
      if(fl.dist!=null&&fl.dist>0)s+=`<text x="${vx+px*fs*1.15}" y="${vy+py*fs*1.15+fs*0.3}" font-size="${fs*0.66}" font-family="Helvetica" text-anchor="middle" fill="#000">@ ${isoFmt(fl.dist)}</text>`;
    });
  });
  d.nodes.forEach(n=>{const f=m.nodeFit[n.id];if(!f)return;const[x,y]=P(m.pos[n.id]);
    if(f.type==='open'){s+=`<circle cx="${x}" cy="${y}" r="${fs*0.5}" fill="#fff" stroke="#000" stroke-width="${lw}"/>`}
    else if(f.type==='cap'){s+=`<circle cx="${x}" cy="${y}" r="${fs*0.4}" fill="#000"/>`}
    else if(f.type==='flangeWN'||f.type==='flangeSO'||f.type==='flangeLJ'){s+=`<circle cx="${x}" cy="${y}" r="${fs*0.45}" fill="#fff" stroke="#000" stroke-width="${lw*1.8}"/>`}
    else if(f.type==='blindFlg'){s+=`<circle cx="${x}" cy="${y}" r="${fs*0.45}" fill="#fff" stroke="#000" stroke-width="${lw*1.8}"/><circle cx="${x}" cy="${y}" r="${fs*0.2}" fill="#000"/>`}
    else if(f.type==='capTHD'){s+=`<circle cx="${x}" cy="${y}" r="${fs*0.35}" fill="#000"/>`}
    else if(f.type==='olet'){s+=`<circle cx="${x}" cy="${y}" r="${fs*0.38}" fill="#fff" stroke="#000" stroke-width="${lw*1.4}"/><circle cx="${x}" cy="${y}" r="${fs*0.14}" fill="#000"/>`}
    if(f.type==='tee'&&f.bs){s+=`<text x="${x+fs*0.7}" y="${y-fs*0.55}" font-size="${fs*0.66}" font-family="Helvetica" fill="#000">x${f.bs}</text>`}
  });
  // weld dots + labels — shop weld: filled dot; field weld: open dot flagged FW
  const at={};m.welds.forEach(w=>{if(typeof w.at!=='number'&&!m.pos[w.at])return;const p=m.pos[w.at];if(!p)return;(at[w.at]=at[w.at]||[]).push(w)});
  Object.keys(at).forEach(id=>{const[x,y]=P(m.pos[id]);const ws=at[id];
    const anyField=ws.some(w=>w.sf==='F');
    s+=anyField
      ?`<circle cx="${x}" cy="${y}" r="${fs*0.32}" fill="#fff" stroke="#000" stroke-width="${lw*1.2}"/>`
      :`<circle cx="${x}" cy="${y}" r="${fs*0.32}" fill="#000"/>`;
    const lbl=ws.map(w=>'W'+w.no+(w.sf==='F'?' FW':'')).join(' ');
    const wp=plan.welds[id];
    s+=`<text x="${wp?wp.x:x+fs*0.8}" y="${wp?wp.y+fs*0.28:y-fs*0.7}" font-size="${fs*0.78}" font-family="Helvetica" text-anchor="${wp?'middle':'start'}" fill="#000">${lbl}</text>`});
  return{svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W*sc} ${H*sc}" width="${W*sc}" height="${H*sc}"><rect width="100%" height="100%" fill="#fff"/>${s}</svg>`,w:W*sc,h:H*sc};
}
