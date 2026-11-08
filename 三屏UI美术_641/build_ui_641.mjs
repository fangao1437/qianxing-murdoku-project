import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,bigIds,textsOf,encodeMsg} from '../../qianxing-murdoku/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../qianxing-murdoku/tools/gil/gilwrite.mjs';
import {setHiddenRecord} from '../../qianxing-murdoku-tool/dsh-plugin-qianxing-art-pipeline/src/gil/ops.js';
const DIR=path.dirname(fileURLToPath(import.meta.url)),BASE=path.resolve(DIR,'../..'),SRC=path.resolve(DIR,'../成果-606-提示正式放置与规则恢复-2026-10-31');
const OUT=path.join(BASE,'qianxing-murdoku/存档/近30版/正式版641_实机对齐_v2.gil');
if(fs.existsSync(OUT))throw Error('Output already exists');
const g=readGil(path.join(BASE,'qianxing-murdoku/存档/近30版/正式版640.gil'));
const by=new Map(g.recs.filter(r=>r.name).map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])]));
const R=n=>{if(!by.has(n))throw Error('missing '+n);return by.get(n)};
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const rect=r=>{const s=stateBlocks(r.field.sub,[])[0];return s?[504,505].flatMap(k=>[pairValue(pairOf(s,k),0),pairValue(pairOf(s,k),1)]):[]};
const added=[],modified=new Set(),layers=[];let max=BigInt(g.maxId);
function number(p,k,v){let f=p.sub.find(q=>q.field===k&&q.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v>>>0)}
function place(r,x,y,w,h,deg=0){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);if(deg){let f=s.sub.find(q=>q.field===508);if(!f)s.sub.push(f={field:508,wt:2});f.sub=[{field:3,wt:5,f:deg}];f.payload=null;f.len=5;}}modified.add(r.id);}
function remap(a,from,to,d=0){for(const q of a){if(!(d===0&&q.field===504)&&q.num===BigInt(from))q.num=BigInt(to);if(q.sub)remap(q.sub,from,to,d+1)}}
function clone(proto,parent,name,x=0,y=0,w=1600,h=900){const f=cloneField(proto.field),id=Number(++max);remap(f.sub,proto.id,id);const nf=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);if(!nf)throw Error('name prototype');nf.payload=Buffer.from(name);nf.len=nf.payload.length;f.sub=f.sub.filter(q=>!(q.field===504&&q.wt===0));if(parent)f.sub.push({field:504,wt:0,num:BigInt(parent.id)});const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);const r={id,name,parentId:parent?.id??null,field:f};g.tree.find(q=>q.field===9).sub.push(f);if(parent){const pc=ensureChildListTop(parent);setChildList(pc,[...asIdList(pc.payload,true),id]);modified.add(parent.id)}place(r,x,y,w,h);setHiddenRecord(f,false);added.push(r);by.set(name,r);return r;}
function group(n,parent=R('root')){const r=clone(R('stage'),parent,n);return r;}
const seed=R('td.home.page.1.help619.icon');
function image(parent,name,x,y,w,h,color,id=100001,deg=0){const r=clone(seed,parent,name,x,y,w,h);const p=ns(r.field,[505,503,84])[0];number(p,503,id);number(p,502,parseInt(color.replace('#','FF'),16));number(p,504,1);place(r,x,y,w,h,deg);layers.push({name,parent:parent.name,x,y,w,h,color,imageId:id,rotation:deg});return r;}
function box(parent,name,x,y,w,h,color,id=100001,deg=0){return image(parent,name,x+w/2-800,450-y-h/2,w,h,color,id,deg)}
function text(parent,name,t,x,y,w,h,size,color,deg=0){const r=clone(R('td.l1.page.1.heading'),parent,name,x+w/2-800,450-y-h/2,w,h);const p=ns(r.field,[505,503,75])[0],f=ns(r.field,[505,503,75,510,501])[0];f.payload=Buffer.from(t);f.len=f.payload.length;for(const[k,v]of [[502,0],[512,size],[513,size],[504,parseInt(color.replace('#','FF'),16)],[508,1],[509,1]])number(p,k,v);place(r,x+w/2-800,450-y-h/2,w,h,deg);layers.push({name,parent:parent.name,x:x+w/2-800,y:450-y-h/2,w,h,color,text:t,size,rotation:deg});return r;}
function frame(p,n,x,y,w,h,c='#FCF9E1',deg=0){box(p,n+'.shadow',x+9,y+12,w,h,'#261A18',100001,deg);box(p,n+'.paper',x,y,w,h,c,100001,deg);}
function tape(p,n,x,y,w,h,deg){box(p,n,x,y,w,h,'#DFAE39',100001,deg);text(p,n+'.text','POLICE TIME  POLICE TIME',x,y,w,h,19,'#33251C',deg)}
function footprint(p,n,x,y,s,deg){box(p,n+'.sole',x,y,s*.65,s,'#513620',100002,deg);for(let j=0;j<4;j++)box(p,n+'.toe'+j,x-5+j*s*.22,y-12-(j===1||j===2?5:0),s*.19,s*.27,'#513620',100002,deg)}
const outer=group('art641.sharedBackground',null);
// A real top-level sibling of the script-bearing root, preceding it in the UI root list.
const top=g.tree.find(q=>q.field===9).sub.find(q=>q.field===501);const tops=asIdList(top.payload,true);const ri=tops.indexOf(R('root').id);if(ri<0)throw Error('root missing from top list');tops.splice(ri,0,outer.id);setChildList(top,tops);
// 三屏共同调查桌面背景：位于编辑器顶层列表，位于脚本 root 容器之外。
box(outer,'art641.shared.background',0,0,1600,900,'#363639');
frame(outer,'art641.shared.file',330,-100,1090,1100,'#B5512A',-12);
frame(outer,'art641.shared.envelope',300,-80,420,900,'#D89334',-16);
frame(outer,'art641.shared.graphpaper',560,-80,750,1030,'#F6EBC2',8);
for(let x=580;x<1250;x+=36)box(outer,'art641.shared.gridv'+x,x,0,1,850,'#DCCFAE',100001,8);
for(let y=20;y<850;y+=36)box(outer,'art641.shared.gridh'+y,560,y,730,1,'#DCCFAE',100001,8);
frame(outer,'art641.shared.photo',1190,200,330,450,'#F8F4DB',-13);box(outer,'art641.shared.photo.inner',1224,235,262,326,'#5C4560',100001,-13);
frame(outer,'art641.shared.note',1350,316,270,260,'#EAAF77',12);box(outer,'art641.shared.note.tape',1390,292,110,28,'#28636D',100001,-20);
for(const [i,x,y,s,d]of [[1,1340,75,44,-35],[2,1410,150,40,-30],[3,1530,230,38,-20],[4,1450,720,44,20],[5,1260,790,38,15]])footprint(outer,'art641.shared.foot'+i,x,y,s,d);
tape(outer,'art641.shared.tape1',-100,705,680,70,-22);tape(outer,'art641.shared.tape2',1040,720,720,66,22);tape(outer,'art641.shared.tape3',1200,60,530,62,-27);
box(outer,'art641.shared.edge.top',0,0,1600,35,'#100D0B');box(outer,'art641.shared.edge.bottom',0,860,1600,40,'#100D0B');
const home=group('art641.home'),select=group('art641.select'),game=group('art641.game');
frame(home,'art641.home.document',570,160,490,580,'#FCF9E1',-3);box(home,'art641.home.panel',588,190,448,530,'#5C4560');box(home,'art641.home.pin',780,168,25,25,'#B64B25',100002);
frame(home,'art641.home.camera.photo',175,480,210,260,'#FCF9E1',-5);box(home,'art641.home.camera.photo.inner',195,500,170,182,'#28636D',100001,-5);box(home,'art641.home.camera.body',60,345,438,180,'#6F3721',107102);box(home,'art641.home.camera.top',60,316,438,65,'#EAAF77');box(home,'art641.home.camera.window',330,325,115,45,'#38251C');for(let i=0;i<2;i++)box(home,'art641.home.camera.dot'+i,90+i*38,330,20,20,'#38251C',100002);
const btns=['home.select','home.continue','home.shop','home.bag'];btns.forEach((n,i)=>{const r=R(n);place(r,5,120-i*106,330,65);for(const id of asIdList(ensureChildListTop(r).payload,true)){const c=g.recs.find(q=>q.id===id);if(!c)continue;if(ns(c.field,[505,503,84]).length){place(c,0,0,330,65);const p=ns(c.field,[505,503,84])[0];number(p,503,107102);number(p,502,0xFFE9B94D)}else if(ns(c.field,[505,503,75]).length){place(c,0,0,310,60);number(ns(c.field,[505,503,75])[0],504,0xFF473226);number(ns(c.field,[505,503,75])[0],512,24)}}});
place(R('home.title'),5,232,410,46);place(R('home.tutorial627.bg'),-520,-3,140,140);place(R('home.tutorial627.ring'),-520,-3,140,140);place(R('home.tutorial627.label'),-520,-3,115,48);place(R('home.tutorial627.hit'),-520,-3,140,140);
box(select,'art641.select.base',0,0,1600,900,'#201612');frame(select,'art641.select.cork',165,20,1270,850,'#934221',-2);box(select,'art641.select.cork.inner',205,50,1190,792,'#A65B18');
for(const[i,x,y,w,h,d,c]of [[1,235,40,360,180,-15,'#B06002'],[2,700,60,230,150,7,'#B06002'],[3,1200,130,90,270,-12,'#E6B83B'],[4,85,300,240,230,18,'#DFC17B'],[5,180,640,170,220,-20,'#29323F'],[6,1190,630,300,170,-12,'#E3B437'],[7,500,700,220,120,16,'#CB8D23']])box(select,'art641.select.scrap'+i,x,y,w,h,c,100001,d);
function line(p,n,x1,y1,x2,y2,c,width=5){let dx=x2-x1,dy=y2-y1;return image(p,n,(x1+x2)/2-800,450-(y1+y2)/2,Math.hypot(dx,dy),width,c,100001,-Math.atan2(dy,dx)*180/Math.PI)}
const pins=[[235,360],[420,120],[1040,120],[1360,430],[680,750],[1330,790]];for(let i=1;i<pins.length;i++)line(select,'art641.select.thread'+i,...pins[i-1],...pins[i],'#8D251F',5);pins.forEach(([x,y],i)=>{box(select,'art641.select.pinborder'+i,x-13,y-13,26,26,'#66221A',100002);box(select,'art641.select.pin'+i,x-9,y-9,18,18,'#DD7536',100002)});
for(let i=1;i<=4;i++){const x=324+(i-1)*249.5;frame(select,'art641.select.card'+i,x,310,202,286,'#FCFBF7',0);box(select,'art641.select.card'+i+'.inner',x+14,325,174,224,'#5C371F');const card=R('select.card.'+i),hit=R('hit.select.card.'+i);place(card,x+101-800,450-453,202,286);place(hit,x+101-800,450-453,202,286);const p=ns(card.field,[505,503,84])[0];number(p,503,100001);number(p,502,0x00FFFFFF);}
// The existing thumbnails, titles and progress remain generated by their original code.
// The frame is decorative and has no pointer handler.
// 关卡页左侧记事本是参考图中的固定美术层，真实 clues 控件叠在其上方。
box(game,'art641.game.notebook.shadow',40,264,380,515,'#17151A');box(game,'art641.game.notebook.cover',45,260,365,500,'#242229');box(game,'art641.game.notebook.paper',64,271,334,472,'#F6EBCB');
for(let y=290;y<735;y+=24)box(game,'art641.game.rule'+y,74,y,312,1,'#D4C5A4');for(let y=295;y<730;y+=65){box(game,'art641.game.ring'+y,38,y,38,9,'#6C6962',107102);box(game,'art641.game.ringhole'+y,68,y-1,8,11,'#262229',100002)}
frame(game,'art641.game.boardframe',580,70,648,706,'#FDFBEA');box(game,'art641.game.boardbottom',592,738,624,24,'#EDE5C8');
// Match the existing 584px board and all its generated grids; do not replace gameplay with an image.
place(R('clues'),-570,-61.1,360,544);const cb=ns(R('clues.bg').field,[505,503,84])[0];number(cb,502,0x00FFFFFF);modified.add(R('clues.bg').id);
box(game,'art641.game.help.tab',367,256,51,67,'#B64B25',100001,-5);place(R('clues.help617'),-407,160,30,30);place(R('clues.help627.hit'),-407,160,51,67);
const actions=[['back',70,110,64],['submit',1454,153,70],['redo',1454,252,70],['undo',1454,346,70],['hint',1454,730,70]];
for(const[n,x,y,size]of actions){box(game,'art641.game.flag.'+n,x-42,y-46,84,96,n==='back'?'#29252D':'#A44B24');place(R('hex.'+n),x-800,450-y,size,size);place(R('hit.'+n),x-800,450-y,84,96)}
// Render order: shared background is outside root; each screen's decorative group precedes gameplay.
const rootList=ensureChildListTop(R('root'));let ids=asIdList(rootList.payload,true).filter(id=>![home.id,select.id,game.id].includes(id));setChildList(rootList,[home.id,select.id,game.id,...ids]);
setHiddenRecord(home.field,false);setHiddenRecord(select.field,true);setHiddenRecord(game.field,true);
const script=fs.readFileSync(path.join(SRC,'dist/client_script.lua'));const leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const expected=new Map([...g.recs,...added].map(r=>[r.id,encodeMsg([r.field])]));
fs.mkdirSync(path.join(DIR,'_tmp'),{recursive:true});fs.writeFileSync(path.join(DIR,'ui_spec_641.json'),JSON.stringify({canvas:[1600,900],reference:[6236,3508],sharedBackground:{id:outer.id,parent:null,outsideScriptRoot:true},groups:[home.name,select.name,game.name],layers},null,2));
writeGil(g,OUT,{label:'641 reference three-screen UI',expectRecs:expected.size,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';for(const r of t.recs)if(!expected.get(r.id)?.equals(encodeMsg([r.field])))return 'record mismatch '+r.name;return true}});
console.log(JSON.stringify({output:OUT,records:expected.size,added:added.length,layerCount:layers.length,sharedRoot:outer.id,sharedOutsideScript:true,modifiedExisting:[...modified].filter(id=>before.has(id)).length}));
