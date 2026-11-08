import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readGil,stateBlocks,pairOf,setPair,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,textsOf,encodeMsg} from '../../qianxing-murdoku/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../qianxing-murdoku/tools/gil/gilwrite.mjs';
import {setHiddenRecord} from '../../qianxing-murdoku-tool/dsh-plugin-qianxing-art-pipeline/src/gil/ops.js';
const dir=path.dirname(fileURLToPath(import.meta.url)),base=path.resolve(dir,'../..');
const input=path.join(base,'qianxing-murdoku/存档/近30版/正式版641_实机对齐_v2.gil'),output=path.join(base,'qianxing-murdoku/存档/近30版/正式版642_选关分层复刻_v3.gil');
if(fs.existsSync(output))throw Error('Output exists');
const layers=[];
const g=readGil(input),by=new Map(g.recs.filter(r=>r.name).map(r=>[r.name,r])),R=n=>{let r=by.get(n);if(!r)throw Error(n);return r;};
const original=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),changed=new Set(),added=[];let max=BigInt(g.maxId);
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
function number(p,k,v){let f=p.sub.find(q=>q.field===k&&q.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v>>>0);}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);const rot=s.sub.find(q=>q.field===508);if(rot){rot.sub=[];rot.payload=null;rot.len=0;}}changed.add(r.id);}
function remap(a,from,to,d=0){for(const q of a){if(!(d===0&&q.field===504)&&q.num===BigInt(from))q.num=BigInt(to);if(q.sub)remap(q.sub,from,to,d+1);}}
function clone(proto,parent,name){const f=cloneField(proto.field),id=Number(++max);remap(f.sub,proto.id,id);const nf=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);nf.payload=Buffer.from(name);nf.len=nf.payload.length;f.sub=f.sub.filter(q=>!(q.field===504&&q.wt===0));f.sub.push({field:504,wt:0,num:BigInt(parent.id)});const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);const r={id,name,parentId:parent.id,field:f};g.tree.find(q=>q.field===9).sub.push(f);const pc=ensureChildListTop(parent);setChildList(pc,[...asIdList(pc.payload,true),id]);changed.add(parent.id);setHiddenRecord(f,false);added.push(r);return r;}

const select=R('art641.select');for(const r of g.recs)if(r.parentId===select.id){setHiddenRecord(r.field,true);changed.add(r.id);}
const groups={};for(const n of ['backdrop','board','paper','thread','lighting','frames','buttons']){groups[n]=clone(R('stage'),select,'art642.select.'+n);place(groups[n],0,0,1600,900);}
const seed=R('td.home.page.1.help619.icon');
function add(group,name,x,y,w,h,color,id=100001,rotation=0){const r=clone(seed,groups[group],'art642.select.'+name);place(r,x+w/2-800,450-y-h/2,w,h);const ip=ns(r.field,[505,503,84])[0];number(ip,503,id);number(ip,502,parseInt(color.length===9?color.slice(1):color.replace('#','FF'),16));number(ip,504,1);if(rotation)for(const st of stateBlocks(r.field.sub,[])){let f=st.sub.find(q=>q.field===508);if(!f)st.sub.push(f={field:508,wt:2});f.sub=[{field:3,wt:5,f:rotation}];f.payload=null;f.len=5;}layers.push({name:r.name,group,x,y,w,h,color,imageId:id,rotation});return r;}
function txt(name,value,x,y,w,h,size,color){const r=clone(R('td.l1.page.1.heading'),groups.buttons,'art642.select.'+name);place(r,x+w/2-800,450-y-h/2,w,h);const p=ns(r.field,[505,503,75])[0],f=ns(r.field,[505,503,75,510,501])[0];f.payload=Buffer.from(value);f.len=f.payload.length;for(const[k,v]of [[502,0],[512,size],[513,size],[504,parseInt(color.replace('#','FF'),16)],[508,1],[509,1]])number(p,k,v);layers.push({name:r.name,group:'buttons',text:value,x,y,w,h,size,color});return r;}
function line(group,name,x1,y1,x2,y2,width,color){let dx=x2-x1,dy=y2-y1;return add(group,name,(x1+x2)/2-Math.hypot(dx,dy)/2,(y1+y2)/2-width/2,Math.hypot(dx,dy),width,color,100001,-Math.atan2(dy,dx)*180/Math.PI);}
function paper(n,x,y,w,h,c,rot=0){if(!/back|lip|yellow/.test(n))add('paper',n+'.shadow',x+5,y+8,w,h,'#6627160D',106056,rot);add('paper',n,x,y,w,h,c,100001,rot);}
// Background textile: two separately editable diamond patterns along both margins.
add('backdrop','background',0,0,1600,900,'#090704');
add('backdrop','warm.center',384,256,736,148,'#B06000',106057,0);
add('backdrop','warm.lower',500,872,776,88,'#714D04',100001,0);
const scraps=[['left.upper',104,226,154,92,'#6B430A',-18],['left.mid',78,352,118,152,'#2C2517',12],['left.lower',170,617,188,104,'#6A4708',-12],['top.mid',286,176,138,78,'#8B5205',-13],['top.center',518,100,190,72,'#4B2A08',8],['top.right',1126,92,92,172,'#6E4A08',14],['right.mid',1298,272,148,90,'#402809',-16],['right.lower',1250,610,214,126,'#714D04',-14],['bottom.mid',640,748,176,84,'#754B06',9],['bottom.left',362,710,142,76,'#4E2B08',-11]];
for(const [n,x,y,w,h,c,r] of scraps)add('backdrop','scrap.'+n,x,y,w,h,c,100001,r);
const nodes=[[210,315],[392,188],[640,188],[930,310],[1278,496],[1008,704],[688,704],[448,520]];
for(let i=1;i<nodes.length;i++){const [x1,y1]=nodes[i-1],[x2,y2]=nodes[i];line('thread','ref.border.'+i,x1,y1,x2,y2,10,'#3D140F');line('thread','ref.line.'+i,x1,y1,x2,y2,4,'#8F2E1D');}
line('thread','ref.diagonal.border',688,704,930,310,10,'#3D140F');line('thread','ref.diagonal',688,704,930,310,4,'#8F2E1D');
nodes.forEach(([x,y],i)=>{add('thread','ref.node.outer.'+i,x-18,y-18,36,36,'#32120F',100002);add('thread','ref.node.inner.'+i,x-10,y-10,20,20,'#B45A25',100002);});
// Oversized board and irregular backing paper; no flattened screenshot.
add('board','board.shadow',90,-40,1460,1010,'#C0000000',106056,-3);
add('board','board.back',157,-32,1315,978,'#50280E',100001,-3);
add('board','board.face',169,-46,1283,1000,'#934221',100001,-3);
add('board','board.light',170,10,1260,980,'#60E69B13',106057);
// Torn pale edge visible at upper-right and lower-left, built from triangles.
for(let i=0;i<9;i++){const x=1250+i*34,y=16+i*4;add('board','tear.topRight.'+i,x,y,42,30,i%2?'#F1D6A1':'#C9A370',100003,82+i%3*8);}
for(let i=0;i<10;i++){const x=138+i*34,y=804+i*3.2;add('board','tear.bottomLeft.'+i,x,y,42,32,i%2?'#E4C896':'#B98952',100003,268+i%3*8);}
// Individually layered scattered scraps, including overlaps from the reference.
// replaced by reference backdrop layers













// Thread has its own layer under photograph frames.
// 旧版 pins/cord 已移除，使用上方 ref.* 节点链。
// Four photograph stacks: backing sheets, drop shadows, white border, brown opening.
const sx=1600/6236,sy=900/3508;
for(let i=1;i<=4;i++){let x=(1264+(i-1)*968)*sx,y=1216*sy,w=784*sx,h=1120*sy;
add('frames','card.'+i+'.softshadow',x-18,y+3,w+44,h+40,'#B02C180C',106057,-2);
add('frames','card.'+i+'.backpaper',x-13,y-15,w+6,h-7,'#C8B186',100001,i%2?5:-5);

add('frames','card.'+i+'.paper',x,y,w,h,'#FCFBF7');
add('frames','card.'+i+'.opening',x+15,y+17,w-30,h-65,'#934221');
for(const name of ['select.card.'+i,'hit.select.card.'+i])place(R(name),x+w/2-800,450-y-h/2,w,h);
}
// Large soft edge shadows and warm pool use native alpha sprites, not fitted pixels.
add('lighting','board.shadow',120,0,1360,900,'#80000000',106057,-1);
add('lighting','card.glow',300,300,1000,360,'#45000000',106057,0);
add('lighting','warm.pool',500,820,780,120,'#806B3A00',106057,0);
// Buttons are separate from backdrop; original clickable controls stay above them.
add('buttons','previous.shadow',17,403,124,80,'#6021140D',106056);
add('buttons','previous.body',18,420,106,54,'#804E1F');add('buttons','previous.tip',0,413,65,68,'#804E1F',100003,90);
add('buttons','previous.icon.tip',31,428,31,30,'#F9E9BF',100003,90);add('buttons','previous.icon.shaft',48,438,39,10,'#F9E9BF');
add('buttons','next.lower',1483,413,83,83,'#6D4A07',100001,45);add('buttons','next.upper',1481,410,74,74,'#DFB12A',100001,45);add('buttons','next.icon',1506,426,35,39,'#FFF0AE',100003,-90);
function skinImage(rec,x,y,w,h,color,id=100001){const ip=ns(rec.field,[505,503,84])[0];if(ip){number(ip,503,id);number(ip,502,parseInt(color.replace('#','FF'),16));number(ip,504,1);}place(rec,x+w/2-800,450-y-h/2,w,h);}
const existingBack=R('select.back');skinImage(existingBack,34,81,99,60,'#38261B',100001);
const existingBackHit=R('hit.select.back');place(existingBackHit,34+49.5-800,450-111,99,60);
// 原返回图标本身保留，仅由现有 select.back 记录换成设计图底板。
// 结算按钮复用 settle.btn 及其原文字，只替换背景素材和位置。
const existingSettle=R('settle.btn');
const settleBg=ns(existingSettle.field,[505,503,84])[0];
if(settleBg){number(settleBg,503,100001);number(settleBg,502,0xFFAD6B27);number(settleBg,504,1);}
place(existingSettle,1450-800,450-838,296,60);
const settleShadow=clone(R('td.home.page.1.help619.icon'),groups.buttons,'art642.select.settle.shadow');
place(settleShadow,1450-800+10,450-848,310,76);const sip=ns(settleShadow.field,[505,503,84])[0];number(sip,503,106057);number(sip,502,0x50702114);number(sip,504,1);
// 结算底板使用单个现有背景控件，文字与倒计时子控件保持原样。
// 原结算文本不拼接、不新建，沿用 settle.btn 的文字子控件。
// Click areas are aligned with the independent visual buttons, not baked into background.
for(const[n,x,y,w,h]of [['back',25,80,110,65],['prev',0,413,124,68],['next',1470,402,112,100]])for(const prefix of ['select.','hit.select.']){place(R(prefix+n),x+w/2-800,450-y-h/2,w,h);}
let leaf=findScriptLeaf(g).field,script=leaf.payload.toString();
const marker='local TPL_PROBE_DONE = false';if(!script.includes(marker))throw Error('marker');
const patch=`-- 642: independently layered select art; all original actions are retained.
local art642_settle_original = nil
local art642_selected = false
local function sync_art642()
  if not adapter then return end
  local cur = Murdoku.current()
  local ctrl = cur and cur.controller
  if not ctrl then return end
  local selected = ctrl.screen == "select"
  local settle = adapter:find("settle.btn")
  local bg = adapter:sub("settle.btn", "bg")
  local label = adapter:sub("settle.btn", "label")
  if selected then
    for _, id in ipairs({"select.back", "select.prev", "select.next", "select.card.1", "select.card.2", "select.card.3", "select.card.4"}) do
      local c = adapter:find(id)
      if c then pcall(function() c.imageColor = 0x00FFFFFF end) end
    end
    if settle and not art642_selected then
      local x,y = settle:GetAnchoredPosition()
      local w,h = settle:GetSizeDelta()
      art642_settle_original = {x,y,w,h}
      pcall(function() settle:SetAnchoredPosition(652,-390); settle:SetSizeDelta(296,60) end)
    end
    if bg then pcall(function() bg.imageColor = 0x00FFFFFF end) end
    if label then help_visible(label,false) end
  elseif art642_selected then
    if settle and art642_settle_original then
      local r=art642_settle_original
      pcall(function() settle:SetAnchoredPosition(r[1],r[2]); settle:SetSizeDelta(r[3],r[4]) end)
    end
    if bg then pcall(function() bg.imageColor = ctrl:can_settle() and 0xFFFFFFFF or 0xFF686B70 end) end
    if label then help_visible(label,true) end
  end
  art642_selected = selected
end

`;
script=script.replace(marker,patch+marker).replace('  sync_art641()\n','  sync_art641()\n  sync_art642()\n');leaf.payload=Buffer.from(script);leaf.len=leaf.payload.length;
fs.mkdirSync(path.join(dir,'_tmp'),{recursive:true});
fs.writeFileSync(path.join(dir,'select_spec_642.json'),JSON.stringify({canvas:[1600,900],reference:[6236,3508],method:'independent_named_layers',groups:Object.keys(groups),layers},null,2));
const shadow=fs.readFileSync(path.join(base,'qianxing-murdoku/tools/qx/samples/mono/106057.png')).toString('base64');
let defs='<defs><mask id="soft" maskContentUnits="objectBoundingBox"><image href="data:image/png;base64,'+shadow+'" width="1" height="1"/></mask></defs>';
function svgLayer(l){let color=l.color,opacity=1;if(color.length===9){opacity=parseInt(color.slice(1,3),16)/255;color='#'+color.slice(3);}let transform='rotate('+(-l.rotation||0)+' '+(l.x+l.w/2)+' '+(l.y+l.h/2)+')';let a=' fill="'+color+'" opacity="'+opacity+'" transform="'+transform+'"';if(l.text)return '<text x="'+(l.x+l.w/2)+'" y="'+(l.y+l.h/2)+'" dominant-baseline="central" text-anchor="middle" font-family="Microsoft YaHei" font-size="'+l.size+'"'+a+'>'+l.text+'</text>';if([106056,106057].includes(l.imageId))return '<rect x="'+l.x+'" y="'+l.y+'" width="'+l.w+'" height="'+l.h+'" mask="url(#soft)"'+a+'/>';if(l.imageId===100002)return '<ellipse cx="'+(l.x+l.w/2)+'" cy="'+(l.y+l.h/2)+'" rx="'+l.w/2+'" ry="'+l.h/2+'"'+a+'/>';if(l.imageId===100003)return '<polygon points="'+(l.x+l.w/2)+','+l.y+' '+l.x+','+(l.y+l.h)+' '+(l.x+l.w)+','+(l.y+l.h)+'"'+a+'/>';return '<rect x="'+l.x+'" y="'+l.y+'" width="'+l.w+'" height="'+l.h+'"'+a+'/>';}
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="none">'+defs+layers.map(svgLayer).join('')+'</svg>';
fs.writeFileSync(path.join(dir,'_tmp/select642.html'),'<!doctype html><meta charset="utf-8"><title>642选关分层预览</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{width:100%;height:100%;display:block}</style>'+svg);
fs.writeFileSync(path.join(process.env.FEIBO_TMP,'client642.lua'),script);
const expected=new Map([...g.recs,...added].map(r=>[r.id,encodeMsg([r.field])]));
writeGil(g,output,{label:'642 layered select art',expectRecs:expected.size,assert(t){if(!findScriptLeaf(t).buf.equals(Buffer.from(script)))return 'script mismatch';for(const r of t.recs)if(!expected.get(r.id)?.equals(encodeMsg([r.field])))return 'record mismatch '+r.name;return true;}});
console.log(JSON.stringify({output,records:expected.size,layers:layers.length,groups:Object.keys(groups),originalRecordsMissing:0}));
