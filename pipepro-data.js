/* PipePro — Data Layer v2 (weights, welds, new fittings) */

// ─── Brand — Themes ───────────────────────────────────────────────────────────
var DARK_T={isDark:true,bg:'#0A0B0D',s1:'#0f1318',s2:'#1a1f26',s3:'#252c35',bdr:'#2e3740',bdrS:'#1e252d',lime:'#A6CE39',lime6:'#8DB22A',org:'#E8631A',amb:'#C9842E',fg:'#E8EDF2',fg2:'#9AAAB8',fg3:'#5a6a78',ok:'#3EA66A',danger:'#D04030',navy:'#152240'};
var LIGHT_T={isDark:false,bg:'#E6E9EC',s1:'#F5F6F8',s2:'#FFFFFF',s3:'#D8DCE1',bdr:'#B0BAC4',bdrS:'#C4CCD4',lime:'#4A8800',lime6:'#3A7000',org:'#B83800',amb:'#7A5000',fg:'#0D1318',fg2:'#344050',fg3:'#607080',ok:'#1E7848',danger:'#B02020',navy:'#1A2C48'};
var T=DARK_T; // var so window.T assignment in App propagates to all scripts
const FB="'Barlow',system-ui,sans-serif";
const FM="'JetBrains Mono',ui-monospace,monospace";
const FD="'Saira Condensed','Arial Narrow',sans-serif";

// ─── Pipe Data ────────────────────────────────────────────────────────────────
const SIZES=['1/2"','3/4"','1"','1-1/4"','1-1/2"','2"','2-1/2"','3"','4"','6"','8"','10"','12"','14"','16"','18"','20"','24"'];
const SW_SZ=['1/2"','3/4"','1"','1-1/4"','1-1/2"','2"','2-1/2"','3"','4"'];
// ─── Materials — grouped by alloy family ──────────────────────────────────────
// Each group: { label, color, items[] }  (color = UI accent for that family)
const MATS_GROUPS=[
  {label:'Carbon Steel',color:'#A6CE39',
   items:['CS A106 Gr.B','CS A106 Gr.C','CS A53 Gr.B','CS A333 Gr.6','CS A333 Gr.1','CS A671 CC65','CS A672 B70'],
   descs:['SMLS — high-temp process · B31.3 workhorse','SMLS — higher yield, heavy-wall','ERW/SMLS — general utility service','SMLS — low-temp service, −50°F / −46°C','SMLS — low-temp service, −50°F','EFW — moderate temp · large diameter','EFW — elevated temp · large diameter'],
  },
  {label:'Chrome-Moly',color:'#E8631A',
   items:['CrMo A335 P1','CrMo A335 P5','CrMo A335 P9','CrMo A335 P11','CrMo A335 P22','CrMo A335 P91','CrMo A335 P92'],
   descs:['0.5Mo — mild elevated temp service','5Cr-0.5Mo — refinery / H₂ service','9Cr-1Mo — refinery high-temp','1.25Cr-0.5Mo — boiler / HRH piping','2.25Cr-1Mo — refinery / boiler headers','9Cr-1Mo-V — ultra high-temp steam','9Cr-2W — ultra-supercritical steam'],
  },
  {label:'Stainless Steel',color:'#40C8D8',
   items:['SS A312 TP304','SS A312 TP304L','SS A312 TP304H','SS A312 TP316','SS A312 TP316L','SS A312 TP316H','SS A312 TP321','SS A312 TP321H','SS A312 TP347','SS A312 TP347H','SS A312 N08904'],
   descs:['Austenitic — general corrosion service','Low-C — welded, no sensitization','High-C — elevated temp > 800°F','Mo-bearing — pitting / crevice resistance','Low-C Mo — welded corrosion service','High-C Mo — elevated temp service','Ti-stabilized — sensitization resistant','Ti-stabilized H — high temp service','Nb-stabilized — sensitization resistant','Nb-stabilized H — high temp service','904L — high-alloy acid / seawater'],
  },
  {label:'Duplex / Super Duplex',color:'#BF5AF2',
   items:['Duplex A790 S31803','SupDuplex A790 S32750','SupDuplex A790 S32760'],
   descs:['2205 — offshore / chemical / seawater','2507 — extreme corrosion / seawater','Zeron 100 — seawater / offshore'],
  },
  {label:'Nickel Alloys',color:'#C9842E',
   items:['Alloy 625 B444 N06625','Alloy 825 B423 N08825','Alloy C276 B622 N10276','Alloy C22 B622 N06022','Alloy 600 B167 N06600','Alloy 400 B165 N04400','Alloy 20 B464 N08020'],
   descs:['Inconel 625 — acid / high-temp','Incoloy 825 — acid / H₂S service','Hastelloy C-276 — most severe corrosion','Hastelloy C-22 — oxidizing acids','Inconel 600 — high-temp / caustic','Monel 400 — seawater / HF acid','Alloy 20 — sulfuric acid service'],
  },
  {label:'Non-Ferrous',color:'#3A8FD4',
   items:['Copper B88 Type K','Copper B88 Type L','Aluminum B241 6061-T6','Titanium B338 Gr.2'],
   descs:['Thick wall — underground / refrigeration','Medium wall — plumbing / utilities','Structural aluminum alloy pipe','CP titanium — seawater / bleach / chlorine'],
  },
];

// Flat list for backwards compatibility and simple selects
const MATS = MATS_GROUPS.flatMap(g => g.items);

const SCHEDS=['Sch 40','Sch 80','Sch 10','Sch 5','Sch 160','STD','XH','XXH'];
const BW_F=['Open End','90° Elbow LR','90° Elbow SR','45° Elbow','Tee','Reducing Tee','Weld Cap','Flange WN','Flange SO','Flange Blind','Reducer Con','Reducer Ecc','Gate Valve','Ball Valve','Globe Valve','Check Valve','Butterfly Valve','PRV/Relief','Strainer','Weldolet','Expansion Joint','Spectacle Blind (Open)','Spectacle Blind (Closed)','Figure 8 Blind','Swage Nipple'];
const SW_F=['Open End','SW 90° Elbow','SW 45° Elbow','SW Tee','SW Union','SW Coupling','SW Cap','Gate Valve SW','Ball Valve SW','Globe Valve SW','Sockolet'];
const TH_F=['Open End','THD 90° Elbow','THD 45° Elbow','THD Tee','THD Coupling','THD Union','THD Cap','Gate Valve THD','Ball Valve THD','Thredolet'];
const NPS={'1/2"':0.5,'3/4"':0.75,'1"':1,'1-1/4"':1.25,'1-1/2"':1.5,'2"':2,'2-1/2"':2.5,'3"':3,'4"':4,'6"':6,'8"':8,'10"':10,'12"':12,'14"':14,'16"':16,'18"':18,'20"':20,'24"':24};
const OD_TBL={'1/2"':0.840,'3/4"':1.050,'1"':1.315,'1-1/4"':1.660,'1-1/2"':1.900,'2"':2.375,'2-1/2"':2.875,'3"':3.500,'4"':4.500,'6"':6.625,'8"':8.625,'10"':10.750,'12"':12.750,'14"':14,'16"':16,'18"':18,'20"':20,'24"':24};
const SW90={'1/2"':0.875,'3/4"':1.000,'1"':1.188,'1-1/4"':1.438,'1-1/2"':1.563,'2"':1.875,'2-1/2"':2.250,'3"':2.500,'4"':3.125};
const SW45={'1/2"':0.500,'3/4"':0.563,'1"':0.688,'1-1/4"':0.813,'1-1/2"':0.875,'2"':1.000,'2-1/2"':1.188,'3"':1.375,'4"':1.688};
const SWCO={'1/2"':0.438,'3/4"':0.500,'1"':0.563,'1-1/4"':0.688,'1-1/2"':0.750,'2"':0.875,'2-1/2"':1.000,'3"':1.125,'4"':1.375};
const FRACS=['','1/16','1/8','3/16','1/4','5/16','3/8','7/16','1/2','9/16','5/8','11/16','3/4','13/16','7/8','15/16'];
// ── B16.9 takeouts (center-to-face, inches, by NPS) — single source of truth
//    for BOTH the CUT tab (getTO) and the DRAW iso engine (isoTakeout) ──
const TO_90LR={0.5:1.5,0.75:1.125,1:1.5,1.25:1.875,1.5:2.25,2:3,2.5:3.75,3:4.5,4:6,6:9,8:12,10:15,12:18,14:21,16:24,18:27,20:30,24:36};
const TO_90SR={1:1,1.25:1.25,1.5:1.5,2:2,2.5:2.5,3:3,4:4,6:6,8:8,10:10,12:12,14:14,16:16,18:18,20:20,24:24};
const TO_45={0.5:0.625,0.75:0.75,1:0.875,1.25:1,1.5:1.125,2:1.375,2.5:1.75,3:2,4:2.5,6:3.75,8:5,10:6.25,12:7.5,14:8.75,16:10,18:11.25,20:12.5,24:15};
const TO_TEE={0.5:1,0.75:1.125,1:1.5,1.25:1.875,1.5:2.25,2:2.5,2.5:3,3:3.375,4:4.125,6:5.625,8:7,10:8.5,12:10,14:11,16:12,18:13.5,20:15,24:17};
// Olet display names — one place so BOM, weld map and editor never drift
function oletName(o){if(!o)return'OLET';const t=o.t==='SOL'?'SOCKOLET':o.t==='TOL'?'THREADOLET':'WELDOLET';return o.bs?t+' '+o.bs:t;}
const F8=[0,2,4,6,8,10,12,14];
const SPOOL_PAL=['#A6CE39','#E8631A','#3A8FD4','#BF5AF2','#E84040','#28B865','#E8B830','#40C8D8','#FF9F0A','#A07850'];
const ISO_SC=52;
const PR_W={'1/2"':1.7,'3/4"':2.1,'1"':2.7,'1-1/4"':3.1,'1-1/2"':3.6,'2"':4.3,'2-1/2"':5,'3"':5.8,'4"':7,'6"':9,'8"':11,'10"':13,'12"':15,'14"':16,'16"':18,'18"':20,'20"':22,'24"':26};
const QUICK=[{l:'3"',v:3},{l:'6"',v:6},{l:'9"',v:9},{l:"1'",v:12},{l:"2'",v:24},{l:"5'",v:60},{l:"10'",v:120},{l:"20'",v:240}];
const PRESETS=[
  {lbl:'CS-A106-40', mat:'CS A106 Gr.B',         sch:'Sch 40', col:'#A6CE39'},
  {lbl:'CS-A106-80', mat:'CS A106 Gr.B',         sch:'Sch 80', col:'#E8631A'},
  {lbl:'CS-A53-STD', mat:'CS A53 Gr.B',          sch:'STD',    col:'#C9842E'},
  {lbl:'LT-A333-40', mat:'CS A333 Gr.6',         sch:'Sch 40', col:'#BF5AF2'},
  {lbl:'P91-Sch80',  mat:'CrMo A335 P91',        sch:'Sch 80', col:'#FF6B35'},
  {lbl:'P22-Sch80',  mat:'CrMo A335 P22',        sch:'Sch 80', col:'#FF9F0A'},
  {lbl:'SS-304-10S', mat:'SS A312 TP304',         sch:'Sch 10', col:'#40C8D8'},
  {lbl:'SS-316L-10S',mat:'SS A312 TP316L',        sch:'Sch 10', col:'#3A8FD4'},
  {lbl:'SS-321-40',  mat:'SS A312 TP321',         sch:'Sch 40', col:'#64D2FF'},
  {lbl:'2205-10S',   mat:'Duplex A790 S31803',    sch:'Sch 10', col:'#BF5AF2'},
  {lbl:'C276-10S',   mat:'Alloy C276 B622 N10276',sch:'Sch 10', col:'#FFD60A'},
  {lbl:'625-10S',    mat:'Alloy 625 B444 N06625', sch:'Sch 10', col:'#FF9F0A'},
];
const SAVE_KEY='pipepro_drawings_v2';

// ─── Wall Thickness — ASME B36.10 / B36.19 (inches) ─────────────────────────
const PIPE_WT_IN={
  '1/2"': {'Sch 5':0.065,'Sch 10':0.083,'Sch 40':0.109,'Sch 80':0.147,'Sch 160':0.188,'STD':0.109,'XH':0.147,'XXH':0.294},
  '3/4"': {'Sch 5':0.065,'Sch 10':0.083,'Sch 40':0.113,'Sch 80':0.154,'Sch 160':0.219,'STD':0.113,'XH':0.154,'XXH':0.308},
  '1"':   {'Sch 5':0.065,'Sch 10':0.109,'Sch 40':0.133,'Sch 80':0.179,'Sch 160':0.250,'STD':0.133,'XH':0.179,'XXH':0.358},
  '1-1/4"':{'Sch 5':0.065,'Sch 10':0.109,'Sch 40':0.140,'Sch 80':0.191,'Sch 160':0.250,'STD':0.140,'XH':0.191,'XXH':0.382},
  '1-1/2"':{'Sch 5':0.065,'Sch 10':0.109,'Sch 40':0.145,'Sch 80':0.200,'Sch 160':0.281,'STD':0.145,'XH':0.200,'XXH':0.400},
  '2"':   {'Sch 5':0.065,'Sch 10':0.109,'Sch 40':0.154,'Sch 80':0.218,'Sch 160':0.344,'STD':0.154,'XH':0.218,'XXH':0.436},
  '2-1/2"':{'Sch 5':0.083,'Sch 10':0.120,'Sch 40':0.203,'Sch 80':0.276,'Sch 160':0.375,'STD':0.203,'XH':0.276,'XXH':0.552},
  '3"':   {'Sch 5':0.083,'Sch 10':0.120,'Sch 40':0.216,'Sch 80':0.300,'Sch 160':0.438,'STD':0.216,'XH':0.300,'XXH':0.600},
  '4"':   {'Sch 5':0.083,'Sch 10':0.120,'Sch 40':0.237,'Sch 80':0.337,'Sch 160':0.531,'STD':0.237,'XH':0.337,'XXH':0.674},
  '6"':   {'Sch 5':0.109,'Sch 10':0.134,'Sch 40':0.280,'Sch 80':0.432,'Sch 160':0.719,'STD':0.280,'XH':0.432,'XXH':0.864},
  '8"':   {'Sch 5':0.109,'Sch 10':0.148,'Sch 40':0.322,'Sch 80':0.500,'Sch 160':0.906,'STD':0.322,'XH':0.500,'XXH':0.875},
  '10"':  {'Sch 5':0.134,'Sch 10':0.165,'Sch 40':0.365,'Sch 80':0.594,'Sch 160':1.125,'STD':0.365,'XH':0.500,'XXH':1.000},
  '12"':  {'Sch 5':0.156,'Sch 10':0.180,'Sch 40':0.375,'Sch 80':0.688,'Sch 160':1.312,'STD':0.375,'XH':0.500,'XXH':1.000},
  '14"':  {'Sch 5':0.156,'Sch 10':0.188,'Sch 40':0.375,'Sch 80':0.750,'STD':0.375,'XH':0.500},
  '16"':  {'Sch 5':0.165,'Sch 10':0.188,'Sch 40':0.375,'Sch 80':0.844,'STD':0.375,'XH':0.500},
  '18"':  {'Sch 5':0.165,'Sch 10':0.188,'Sch 40':0.375,'Sch 80':0.938,'STD':0.375,'XH':0.500},
  '20"':  {'Sch 5':0.188,'Sch 10':0.218,'Sch 40':0.375,'Sch 80':1.031,'STD':0.375,'XH':0.500},
  '24"':  {'Sch 5':0.218,'Sch 10':0.250,'Sch 40':0.375,'Sch 80':1.219,'STD':0.375,'XH':0.500},
};

// W = 10.68 × t × (OD − t)  lbs/ft  (ASME standard formula, CS & SS)
function pipeWtPerFt(sz,sch){const od=OD_TBL[sz],wt=PIPE_WT_IN[sz]?.[sch];if(!od||!wt)return null;return 10.68*wt*(od-wt);}
function pipeWt(sz,sch,mat,lenFt){const b=pipeWtPerFt(sz,sch);if(!b||!lenFt)return null;return b*(mat?.includes('TP')||mat?.includes('SS')?1.02:1.0)*lenFt;}
function fmtLbs(lb){if(lb==null)return'—';return lb>=2000?`${(lb/2000).toFixed(3)} T`:`${lb.toFixed(2)} lb`;}

// ─── Utilities ────────────────────────────────────────────────────────────────
function dcomp(di){if(!isFinite(di))return{neg:false,ft:0,ins:0,f16:0};const neg=di<0,a=Math.abs(di);let ft=Math.floor(a/12),r=a-ft*12,ins=Math.floor(r),f16=Math.round((r-ins)*16);if(f16>=16){f16=0;ins++;}if(ins>=12){ins=0;ft++;}return{neg,ft,ins,f16};}
function fmt(di){if(!isFinite(di))return'ERR';const{neg,ft,ins,f16}=dcomp(di);const n=neg?'-':'',fr=f16?' '+FRACS[f16]:'',i=(ins||f16)?ins+fr+'"':'',f=ft?ft+"'":'';return(f||i)?n+f+(f&&i?' ':'')+i:'0"';}
function fmtDec(di){return isFinite(di)?di.toFixed(3)+'"':'—';}
function fmtMM(di){return isFinite(di)?(di*25.4).toFixed(2)+' mm':'—';}
function fmtM(di){return isFinite(di)?(di*25.4/1000).toFixed(4)+' m':'—';}
function fmtFtD(di){return isFinite(di)?(di/12).toFixed(4)+"'":'—';}
function getTO(t,sz){
  if(!t||t==='Open End')return 0;const D=NPS[sz]||4;
  if(t.startsWith('SW ')||t==='Sockolet'){if(t.includes('90°')||t==='Sockolet')return SW90[sz]??0.88*D;if(t.includes('45°'))return SW45[sz]??0.5*D;return SWCO[sz]??0.44*D;}
  if(t.startsWith('THD ')||t==='Thredolet'){if(t.includes('90°')||t==='Thredolet')return(SW90[sz]??0.88*D)+0.0625;if(t.includes('45°'))return(SW45[sz]??0.5*D)+0.0625;return(SWCO[sz]??0.44*D)+0.0625;}
  // B16.9 table values for wrought fittings (formulas only as >24" fallback)
  const bm={'90° Elbow LR':TO_90LR[D]??1.5*D,'90° Elbow SR':TO_90SR[D]??D,'45° Elbow':TO_45[D]??0.625*D,'Tee':TO_TEE[D]??D,'Reducing Tee':TO_TEE[D]??D,'Weld Cap':0.5*D,'Flange WN':0,'Flange SO':0,'Flange Blind':0,'Reducer Con':0.5*D,'Reducer Ecc':0.5*D,'Gate Valve':3*D,'Ball Valve':2*D,'Globe Valve':3.5*D,'Check Valve':2.5*D,'Butterfly Valve':D,'PRV/Relief':2.5*D,'Strainer':2*D,'Weldolet':D,'Expansion Joint':3*D,'Spectacle Blind (Open)':0,'Spectacle Blind (Closed)':0,'Figure 8 Blind':0,'Swage Nipple':0.5*D};
  return bm[t]??0;
}
function getFitMat(m,conn){
  if(!m)return conn==='BW'?'A234 WPB':'A105';
  const bw=conn==='BW';
  // Carbon Steel
  if(m.includes('A106')||m.includes('A53')||m.includes('A671')||m.includes('A672'))return bw?'A234 WPB':'A105';
  if(m.includes('A333 Gr.6')||m.includes('A333 Gr.1'))return bw?'A420 WPL6':'A350 LF2';
  // Chrome-Moly
  if(m.includes('P92'))return bw?'A234 WP92':'A182 F92';
  if(m.includes('P91'))return bw?'A234 WP91':'A182 F91';
  if(m.includes('P22'))return bw?'A234 WP22':'A182 F22';
  if(m.includes('P11'))return bw?'A234 WP11':'A182 F11';
  if(m.includes('P9'))return bw?'A234 WP9':'A182 F9';
  if(m.includes('P5'))return bw?'A234 WP5':'A182 F5';
  if(m.includes('P1'))return bw?'A234 WP1':'A182 F1';
  // Stainless — check H-grade before base grade to avoid partial match
  if(m.includes('TP304H'))return bw?'A403 WP304H':'A182 F304H';
  if(m.includes('TP304L'))return bw?'A403 WP304L':'A182 F304L';
  if(m.includes('TP304')) return bw?'A403 WP304':'A182 F304';
  if(m.includes('TP316H'))return bw?'A403 WP316H':'A182 F316H';
  if(m.includes('TP316L'))return bw?'A403 WP316L':'A182 F316L';
  if(m.includes('TP316')) return bw?'A403 WP316':'A182 F316';
  if(m.includes('TP321H'))return bw?'A403 WP321H':'A182 F321H';
  if(m.includes('TP321')) return bw?'A403 WP321':'A182 F321';
  if(m.includes('TP347H'))return bw?'A403 WP347H':'A182 F347H';
  if(m.includes('TP347')) return bw?'A403 WP347':'A182 F347';
  if(m.includes('N08904')||m.includes('904L'))return bw?'A403 WP904L':'A182 F904L';
  // Duplex
  if(m.includes('S31803')||m.includes('2205'))return bw?'A815 WPS31803':'A182 F51';
  if(m.includes('S32750')||m.includes('2507'))return bw?'A815 WPS32750':'A182 F53';
  if(m.includes('S32760'))                    return bw?'A815 WPS32760':'A182 F55';
  // Nickel alloys
  if(m.includes('N06625')||m.includes('625')) return bw?'B366 WPNCI':'B564 N06625';
  if(m.includes('N08825')||m.includes('825')) return bw?'B366 WPNCMC':'B564 N08825';
  if(m.includes('N10276')||m.includes('C276'))return bw?'B366 WPNIHC':'B564 N10276';
  if(m.includes('N06022')||m.includes('C22')) return bw?'B366 WPNIHC':'B564 N06022';
  if(m.includes('N06600')||m.includes('600')) return bw?'B366 WPNCI':'B564 N06600';
  if(m.includes('N04400')||m.includes('400')) return bw?'B366 WPNCMC':'B564 N04400';
  if(m.includes('N08020')||m.includes('Alloy 20'))return bw?'B366 WP20CB3':'B462 N08020';
  // Non-ferrous
  if(m.includes('Copper')||m.includes('B88')) return bw?'B75 Copper Tube':'B16.18 Cast Cu';
  if(m.includes('Aluminum')||m.includes('6061'))return bw?'B361 WP6061':'B247 6061';
  if(m.includes('Titanium')||m.includes('Gr.2'))return bw?'B363 WPT2':'B381 F2';
  // Fallback
  return bw?'A234 WPB':'A105';
}
function getFitClass(sch,conn){if(conn==='SW')return(sch.includes('80')||sch==='XH'||sch.includes('160'))?'6000#':'3000#';if(conn==='THD')return(sch.includes('80')||sch==='XH')?'3000#':'2000#';return'';}
function getAElb(conn,pref){if(conn==='SW')return'SW 90° Elbow';if(conn==='THD')return'THD 90° Elbow';return pref==='SR'?'90° Elbow SR':'90° Elbow LR';}
function getIncDir(cursor,pipes){const k=cursor.join(',');for(let i=pipes.length-1;i>=0;i--){const p=pipes[i];if(p.to.join(',')===k){const dx=p.to[0]-p.from[0],dy=p.to[1]-p.from[1],dz=p.to[2]-p.from[2],L=Math.sqrt(dx*dx+dy*dy+dz*dz);if(L>0)return[dx/L,dy/L,dz/L];}}return null;}

// ─── Color Helpers ────────────────────────────────────────────────────────────
function h2r(hex){return[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];}
function tint(hex,a){const[r,g,b]=h2r(hex||'#888');return`rgb(${Math.min(255,r+a*255)|0},${Math.min(255,g+a*255)|0},${Math.min(255,b+a*255)|0})`;}
function shade(hex,a){const[r,g,b]=h2r(hex||'#888');return`rgb(${Math.max(0,r-a*255)|0},${Math.max(0,g-a*255)|0},${Math.max(0,b-a*255)|0})`;}
function al(hex,a){const[r,g,b]=h2r(hex||'#888');return`rgba(${r},${g},${b},${a})`;}

// ─── Geometry ─────────────────────────────────────────────────────────────────
function i2s(x,y,z,sc,cx,cy){return[cx+(x-z)*(Math.sqrt(3)/2)*sc,cy+(x+z)*0.5*sc-y*sc];}
function rrp(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
function getPDir(fp,pipes,sf){const k=fp.join(',');for(let i=pipes.length-1;i>=0;i--){const p=pipes[i];if(p.from.join(',')===k||p.to.join(',')===k){const[x1,y1]=sf(...p.from),[x2,y2]=sf(...p.to),L=Math.hypot(x2-x1,y2-y1);if(L<1)continue;return[(x2-x1)/L,(y2-y1)/L];}}return[1,0];}

// ─── BOM / Cut ────────────────────────────────────────────────────────────────
function gNodeFit(nk,af,mf){const f=[...af,...mf].find(x=>x.pos.join(',')===nk);if(f)return{lbl:`${f.size} ${f.type}`,to:f.toOvr!=null?f.toOvr:getTO(f.type,f.size),open:false};return{lbl:'Open End',to:0,open:true};}
function gCutInfo(pipe,af,mf){const ff=gNodeFit(pipe.from.join(','),af,mf),tf=gNodeFit(pipe.to.join(','),af,mf),cc=pipe.cc||0;return{cc,cut:cc-ff.to-tf.to,fromFit:ff,toFit:tf};}
function gBOM(pipes,af,mf,dmat,dsch){
  const m={};
  for(const p of pipes){const k=`P|${p.size}|${p.material||dmat}|${p.schedule||dsch}`;if(!m[k])m[k]={item:`${p.size} ${p.material||dmat} ${p.schedule||dsch}`,qty:0,unit:'ft',wt:0};const ft=(p.cc||0)/12;m[k].qty+=ft;const w=pipeWt(p.size,p.schedule||dsch,p.material||dmat,ft);if(w)m[k].wt+=w;}
  for(const f of[...af,...mf]){const cls=getFitClass(f.schedule||dsch,f.conn||'BW'),fm=getFitMat(f.material||dmat,f.conn||'BW');const k=`F|${f.size}|${f.type}|${cls}`;if(!m[k])m[k]={item:`${f.size} ${f.type}${cls?' '+cls:''} ${fm}`,qty:0,unit:'ea',wt:0};m[k].qty++;}
  return Object.values(m);
}

// ─── Weld Map ─────────────────────────────────────────────────────────────────
function buildWeldMap(pipes,af,mf){
  const map=new Map();let n=1;
  for(const p of pipes){for(const pos of[p.from,p.to]){const k=pos.join(',');if(!map.has(k))map.set(k,{id:`W-${String(n++).padStart(2,'0')}`,pos:[...pos],fits:[],pipeIds:[]});map.get(k).pipeIds.push(p.id);}}
  for(const f of[...af,...mf]){const k=f.pos.join(',');if(map.has(k))map.get(k).fits.push(f);}
  return Array.from(map.values());
}
function getWeldId(pos,weldMap){return weldMap.find(w=>w.pos.join(',')===pos.join(','))?.id||'—';}

// ─── Custom Specs Storage ─────────────────────────────────────────────────────
const CUSTOM_SPECS_KEY='pipepro_custom_specs_v1';
function loadCustomSpecs(){try{return JSON.parse(localStorage.getItem(CUSTOM_SPECS_KEY)||'[]');}catch(e){return[];}}
function saveCustomSpecs(specs){try{localStorage.setItem(CUSTOM_SPECS_KEY,JSON.stringify(specs));}catch(e){}}

// ─── Voice Measurement Parser ─────────────────────────────────────────────────
function parseVoiceMeasure(raw){
  let t=raw.toLowerCase().trim()
    .replace(/\bone\b/g,'1').replace(/\btwo\b/g,'2').replace(/\bthree\b/g,'3').replace(/\bfour\b/g,'4').replace(/\bfive\b/g,'5')
    .replace(/\bsix\b/g,'6').replace(/\bseven\b/g,'7').replace(/\beight\b/g,'8').replace(/\bnine\b/g,'9').replace(/\bten\b/g,'10')
    .replace(/\beleven\b/g,'11').replace(/\btwelve\b/g,'12').replace(/\bthirteen\b/g,'13').replace(/\bfourteen\b/g,'14')
    .replace(/\bfifteen\b/g,'15').replace(/\bsixteen\b/g,'16').replace(/\bseventeen\b/g,'17').replace(/\beighteen\b/g,'18')
    .replace(/\bnineteen\b/g,'19').replace(/\btwenty\b/g,'20').replace(/\bthirty\b/g,'30').replace(/\bforty\b/g,'40')
    .replace(/\bfifty\b/g,'50').replace(/\bsixty\b/g,'60').replace(/\bseventy\b/g,'70').replace(/\beighty\b/g,'80')
    .replace(/\bninety\b/g,'90');
  let ft=0,ins=0,frac=0;
  const ftM=t.match(/(\d+\.?\d*)\s*(?:feet|foot|ft)/);if(ftM)ft=parseFloat(ftM[1]);
  const inM=t.match(/(\d+\.?\d*)\s*(?:inches|inch)/);if(inM)ins=parseFloat(inM[1]);
  const fracMap=[['three quarter',12],['three quarters',12],['three eighths',6],['five eighths',10],['seven eighths',14],['one eighth',2],['half',8],['a half',8],['quarter',4],['a quarter',4]];
  for(const[w,s]of fracMap){if(t.includes(w)){frac=s/16;break;}}
  // If no unit keywords, treat all digits as inches
  if(!ftM&&!inM&&!frac){const num=parseFloat(t.replace(/[^\d.]/g,''));if(!isNaN(num))return num;}
  const total=ft*12+ins+frac;return total>0.001?total:null;
}

// ─── Auto-Route Algorithm ─────────────────────────────────────────────────────
const ROUTE_ORDERS={
  'up-first':['y','x','z'],
  'horizontal-first':['x','z','y'],
  'north-first':['z','x','y'],
  'east-first':['x','y','z'],
};
function calcAutoRoute(dx,dy,dz,orderKey){
  const order=ROUTE_ORDERS[orderKey]||ROUTE_ORDERS['up-first'];
  const axes=[];
  const map={x:{dir:[dx>0?1:-1,0,0],len:Math.abs(dx)},y:{dir:[0,dy>0?1:-1,0],len:Math.abs(dy)},z:{dir:[0,0,dz>0?1:-1],len:Math.abs(dz)}};
  for(const ax of order){if(map[ax].len>0.001)axes.push({...map[ax],ax});}
  return axes;// [{dir,len,ax}]
}

// ─── Persistence ─────────────────────────────────────────────────────────────
function ppListSaved(){try{const a=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');return Object.entries(a).map(([k,v])=>({key:k,...v})).sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));}catch(e){return[];}}
function ppSave(key,data){try{const a=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');a[key]=data;localStorage.setItem(SAVE_KEY,JSON.stringify(a));return true;}catch(e){return false;}}
function ppLoad(key){try{const a=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');return a[key]||null;}catch(e){return null;}}
function ppDelete(key){try{const a=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');delete a[key];localStorage.setItem(SAVE_KEY,JSON.stringify(a));}catch(e){}}

// ─── ASME B16.5 Flange Data ───────────────────────────────────────────────────
const FLANGE_CLASSES=['#150','#300','#600','#900','#1500','#2500'];
const FLANGE_FACES=['RF','FF','RTJ'];
const FLANGE_END_TYPES=['WN','SO','SW Flg','LJ','Blind'];
const FLANGE_CLASS_IDX={'#150':0,'#300':1,'#600':2,'#900':3,'#1500':4,'#2500':5};

// Bolt counts per joint [#150,#300,#600,#900,#1500,#2500]  ASME B16.5
// Verified 2026-08-08 against Texas Flange, projectmaterials & wermac charts
// (Class 900 ≤2-1/2" uses Class 1500 dims per B16.5; Class 2500 ends at 12")
const FL_BOLTS={
  '1/2"': [4,4,4,4,4,4],'3/4"': [4,4,4,4,4,4],'1"':   [4,4,4,4,4,4],
  '1-1/4"':[4,4,4,4,4,4],'1-1/2"':[4,4,4,4,4,4],
  '2"':   [4,8,8,8,8,8],'2-1/2"':[4,8,8,8,8,8],'3"':   [4,8,8,8,8,8],
  '4"':   [8,8,8,8,8,8],
  '6"':   [8,12,12,12,12,8],'8"':   [8,12,12,12,12,12],
  '10"':  [12,16,16,16,12,12],'12"':  [12,16,20,20,16,12],
  '14"':  [12,20,20,20,16,null],'16"':  [16,20,20,20,16,null],
  '18"':  [16,24,20,20,16,null],'20"':  [20,24,24,20,16,null],
  '24"':  [20,24,24,20,16,null],
};

// Stud bolt diameter per class [#150,#300,#600,#900,#1500,#2500]
// Verified 2026-08-08 — same sources as FL_BOLTS
const FL_STUD_DIA={
  '1/2"': ['1/2"','1/2"','1/2"','3/4"','3/4"','3/4"'],
  '3/4"': ['1/2"','5/8"','5/8"','3/4"','3/4"','3/4"'],
  '1"':   ['1/2"','5/8"','5/8"','7/8"','7/8"','7/8"'],
  '1-1/4"':['1/2"','5/8"','5/8"','7/8"','7/8"','1"'],
  '1-1/2"':['1/2"','3/4"','3/4"','1"','1"','1-1/8"'],
  '2"':   ['5/8"','5/8"','5/8"','7/8"','7/8"','1"'],
  '2-1/2"':['5/8"','3/4"','3/4"','1"','1"','1-1/8"'],
  '3"':   ['5/8"','3/4"','3/4"','7/8"','1-1/8"','1-1/4"'],
  '4"':   ['5/8"','3/4"','7/8"','1-1/8"','1-1/4"','1-1/2"'],
  '6"':   ['3/4"','3/4"','1"','1-1/8"','1-3/8"','2"'],
  '8"':   ['3/4"','7/8"','1-1/8"','1-3/8"','1-5/8"','2"'],
  '10"':  ['7/8"','1"','1-1/4"','1-3/8"','1-7/8"','2-1/2"'],
  '12"':  ['7/8"','1-1/8"','1-1/4"','1-3/8"','2"','2-3/4"'],
  '14"':  ['1"','1-1/8"','1-3/8"','1-1/2"','2-1/4"',null],
  '16"':  ['1"','1-1/4"','1-1/2"','1-5/8"','2-1/2"',null],
  '18"':  ['1-1/8"','1-1/4"','1-5/8"','1-7/8"','2-3/4"',null],
  '20"':  ['1-1/8"','1-1/4"','1-5/8"','2"','3"',null],
  '24"':  ['1-1/4"','1-1/2"','1-7/8"','2-1/2"','3-1/2"',null],
};

// Gasket spec per class
const FL_GASKET={
  '#150':'1/16" Sheet Gasket (Full-Face or Ring)',
  '#300':'Spiral-Wound w/ Inner Ring',
  '#600':'Spiral-Wound w/ Inner + Outer Ring',
  '#900':'Spiral-Wound w/ Inner + Outer Ring',
  '#1500':'Spiral-Wound w/ Inner + Outer Ring',
  '#2500':'Ring Type Joint — Octagonal (RTJ)',
};

// Bolt/nut material per pipe material — ASME B16.5 / B7.1 guidance
function getBoltMat(mat){
  if(!mat)return'A193 Gr.B7 · A194 Gr.2H';
  // Low-temp CS
  if(mat.includes('A333'))return'A320 Gr.L7 · A194 Gr.4 (low-temp)';
  // Chrome-Moly P91/P92
  if(mat.includes('P91')||mat.includes('P92'))return'A193 Gr.B16 · A194 Gr.7';
  // Chrome-Moly general
  if(mat.includes('P1')||mat.includes('P5')||mat.includes('P9')||mat.includes('P11')||mat.includes('P22'))return'A193 Gr.B7 · A194 Gr.2H';
  // Stainless 304/316/321/347
  if(mat.includes('TP304')||mat.includes('TP321')||mat.includes('TP347'))return'A193 Gr.B8 Cl.2 · A194 Gr.8';
  if(mat.includes('TP316'))return'A193 Gr.B8M Cl.2 · A194 Gr.8M';
  if(mat.includes('N08904')||mat.includes('904L'))return'A193 Gr.B8M Cl.2 · A194 Gr.8M';
  // Duplex
  if(mat.includes('S31803')||mat.includes('2205')||mat.includes('S32750')||mat.includes('2507')||mat.includes('S32760'))return'A193 Gr.B8M Cl.2 · A194 Gr.8M (duplex stud)';
  // Nickel alloys
  if(mat.includes('N06625')||mat.includes('625')||mat.includes('N10276')||mat.includes('C276')||mat.includes('N06022')||mat.includes('C22'))return'B193 Alloy 625 stud · A194 Gr.8M or B564 N06625';
  if(mat.includes('N08825')||mat.includes('825'))return'A193 Gr.B8M Cl.2 · A194 Gr.8M';
  if(mat.includes('N06600')||mat.includes('600')||mat.includes('N04400')||mat.includes('400'))return'A193 Gr.B8M Cl.2 · A194 Gr.8M';
  if(mat.includes('N08020')||mat.includes('Alloy 20'))return'A193 Gr.B8M Cl.2 · A194 Gr.8M';
  // Non-ferrous
  if(mat.includes('Copper')||mat.includes('B88')||mat.includes('Aluminum')||mat.includes('6061')||mat.includes('Titanium')||mat.includes('Gr.2'))return'A193 Gr.B8M · A194 Gr.8M (consult engineer)';
  // Default CS
  return'A193 Gr.B7 · A194 Gr.2H';
}

// Valve detection helpers
const VALVE_NAMES_BASE=['Gate Valve','Ball Valve','Globe Valve','Check Valve','Butterfly Valve','PRV/Relief','Strainer'];
function isValveFitting(f){if(!f||f==='Open End')return false;return VALVE_NAMES_BASE.some(v=>f===v||f.startsWith(v));}
function getValveName(f){return VALVE_NAMES_BASE.find(v=>f&&(f===v||f.startsWith(v)))||null;}

// Engineering notes + field recommendations per valve type
const VALVE_NOTES={
  'Gate Valve':{note:'Full-bore isolation. Specify OS&Y (Outside Screw & Yoke) for above-ground process service. Rising stem required for visual open/close confirmation.',recs:[]},
  'Ball Valve':{note:'Full or reduced bore. Trunnion-mounted design recommended for ≥ 3" in high-pressure service. Verify Cv if used for flow control.',recs:[]},
  'Globe Valve':{note:'Throttling service. Flow direction is critical — verify T-body vs. angle pattern. Stem-up orientation preferred for long-term seating.',recs:[]},
  'Check Valve':{note:'Flow direction arrow ➜ must match process flow. Min 5D straight run upstream required to prevent disc chatter.',recs:['Upstream block valve recommended for maintenance']},
  'Butterfly Valve':{note:'Verify lug vs. wafer vs. flanged type. Lug style required for dead-end service. Check disc edge clearance vs. pipe ID.',recs:['Lug type for dead-end / line-blind service','Wafer type requires flanges on both sides']},
  'PRV/Relief':{note:'Must be ASME code-stamped (UV or V stamp). Inlet block valve required — car-sealed open. Discharge must route to safe location per code.',recs:['Gate valve upstream — LO tagged, car-sealed open','Discharge piped to flare / vent header / safe atmosphere','Drip leg at PRV inlet (liquid or two-phase service)','Test connection between inlet block and PRV body']},
  'Strainer':{note:'Y-strainer for ≤ 2"; basket strainer for ≥ 3". Screen pocket orientation is critical for self-cleaning and blow-off access.',recs:['3/4" NPT blow-off valve on screen pocket','Block valve each side — allows in-line screen pull']},
};

// Process assembly templates
const PROC_ASSEMBLIES=[
  {id:'pump-suct',name:'PUMP SUCTION',color:'#3A8FD4',
    items:['Gate valve — inlet isolation','Eccentric reducer — flat-top up (pocket down)','Y-strainer w/ 3/4" NPT blow-off valve','Short nipple or flange to pump nozzle (match pump rating)'],
    note:'Eccentric reducer must be flat-top to prevent air pockets. Screen pocket MUST face down. Flange rating must match pump nozzle class.'},
  {id:'pump-disc',name:'PUMP DISCHARGE',color:'#3A8FD4',
    items:['Swing / tilting-disc check valve (verify flow direction ➜)','Gate valve — outlet isolation','1/2" NPT pressure gauge connection'],
    note:'Check valve always upstream of isolation gate valve. Confirm pressure class ≥ pump shutoff head + max system backpressure.'},
  {id:'steam-trap',name:'STEAM TRAP ASSEMBLY',color:'#C9842E',
    items:['Gate valve — inlet isolation','Y-strainer (blow-off pocket down)','Steam trap — inverted bucket / thermostatic / F&T per service','Gate valve — outlet isolation','Union or companion flange (for trap maintenance)','Globe valve — bypass, same line size (across trap)'],
    note:'Blow-off between strainer and trap allows steam purging. Bypass globe used at startup and for trap testing. Test connection between outlet isolation and trap recommended.'},
  {id:'ctrl-valve',name:'CONTROL VALVE — 3-VALVE BYPASS',color:'#BF5AF2',
    items:['Gate valve — upstream block (HO tagged)','Control valve — flanged, with actuator & positioner','Gate valve — downstream block (HO tagged)','Globe valve — bypass (1 pipe size LARGER than CV body)'],
    note:'Bypass globe must be 1 pipe size larger than control valve. All tagged HO (hand-open) per P&ID. Verify actuator fail-safe position (FO / FC / FL) matches safety requirement.'},
  {id:'prv-station',name:'PRV / SAFETY VALVE STATION',color:'#E8631A',
    items:['Gate valve — inlet block (LO, car-sealed open)','PRV or safety relief valve — ASME UV or V stamped','Discharge piping → safe vent / flare / header (sized for rated capacity)'],
    note:'Outlet block valve may be code-prohibited on some services — verify per ASME Section VIII / API 520. Inlet valve car-sealed open. Drip leg required at inlet for liquid or two-phase.'},
  {id:'sample-pt',name:'SAMPLE POINT',color:'#28B865',
    items:['Weldolet or Sockolet — 1/2" or 3/4" branch','Root valve (needle or globe — rated for process)','Sample cooler (required if process > 120°F)','Sample connection / quick-connect fitting'],
    note:'Use double-block-and-bleed (DBB) for toxic or high-pressure service. Verify wetted material compatibility. Install sloping to drain; avoid pockets where sample can stagnate.'},
  {id:'inst-conn',name:'INSTRUMENT CONNECTION',color:'#28B865',
    items:['Weldolet or Sockolet — 1/2" or 3/4" NPS','Root isolation valve (ball or gate)','Secondary isolation valve (instrument side)','Instrument nozzle — PT / FT / LT / TT per data sheet'],
    note:'Double-block and bleed (DBB) required for Class 600+ and toxic / lethal service. Verify impulse line material matches process. Vent/drain valve between block valves for safe maintenance isolation.'},
  {id:'expansion',name:'EXPANSION LOOP / JOINT',color:'#9AAAB8',
    items:['Fixed anchors — both ends (designed for full thermal thrust)','Pipe guides on straight runs (axial movement only)','Expansion loop (preferred) or bellows expansion joint','Vent and drain on high/low points as required'],
    note:'Fixed anchors must be designed for full thrust load — coordinate with structural. Pipe guides must allow axial movement only. Expansion loops preferred over bellows for high-cycle or vibration service.'},
];
