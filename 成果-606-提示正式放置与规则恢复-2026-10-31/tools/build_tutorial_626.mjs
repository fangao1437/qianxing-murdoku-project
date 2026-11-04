import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,report]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),changed=new Set(),checks=[];
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const prop=r=>ns(r.field,[505,503,75])[0],text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
const geo=r=>{const s=stateBlocks(r.field.sub,[])[0];return [504,505].flatMap(k=>[pairValue(pairOf(s,k),0),pairValue(pairOf(s,k),1)])};
const original=new Map(g.recs.map(r=>[r.id,text(r)])),textChanges=new Set();
function txt(r,t){const f=ns(r.field,[505,503,75,510,501])[0];if(!f)throw Error('missing text '+r.name);f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id);textChanges.add(r.id)}
function num(r,k,v){let f=prop(r).sub.find(f=>f.field===k&&f.wt===0);if(!f)prop(r).sub.push(f={field:k,wt:0});f.num=BigInt(v);changed.add(r.id)}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h)}changed.add(r.id)}
function move(r,y){const[x,,w,h]=geo(r);place(r,x,y,w,h)}
function title(r,t,y){txt(r,t);for(const[k,v]of [[512,13],[513,13],[508,0],[509,1],[504,0xFF80956D]])num(r,k,v);place(r,-352,y,660,30)}
const source=by.get('td.l1.page.5.chipt.2');txt(source,'');for(const n of ['td.l1.page.5.chip.2']){const r=by.get(n);place(r,0,0,0,0)}
const sourceName=by.get('td.l1.page.5.cluename');txt(sourceName,text(sourceName)+'；卡 3 · 夜班清洁工（C）');
for(const tag of ['l1','l2'])for(let page=1;page<=(tag==='l1'?8:4);page++){
 const pre=`td.${tag}.page.${page}.`,R=s=>by.get(pre+s),hasClue=!!R('clue'),summary=tag==='l1'&&page===7;
 const body=g.recs.filter(r=>r.name?.startsWith(pre)&&/\.(body\.|rewrite617\.)/.test(r.name)&&text(r)?.trim());
 for(const r of body){const y=geo(r)[1];move(r,summary?68-(76-y)/32*28:y-8)}
 // Inline submit glyphs must follow the moved first body line.
 if(tag==='l1'&&page===8)for(const s of ['ico.submit','ico.submit.bg','ico.submit.t'])move(R(s),geo(R(s))[1]-8);
 if(!hasClue)continue;
 const mainBottom=summary?-44:-56;
 for(const s of ['main','main.border']){const r=R(s);if(r){const[x,,w]=geo(r);place(r,x,(180+mainBottom)/2,w,180-mainBottom)}}
 let top=mainBottom-12;
 const kinds=['chips','note','clue'].filter(k=>R(k));
 for(const kind of kinds){const h=kind==='chips'?72:kind==='note'?52:summary?140:116;
  for(const suffix of [kind,kind+'.border']){const r=R(suffix);if(r){const[x,,w]=geo(r);place(r,x,top-h/2,w,h)}}
  if(kind==='chips'){
   move(R('chipsk'),top-17);
   for(let i=0;R('chipt.'+i);i++){const t=R('chipt.'+i);if(!text(t)?.trim())continue;move(t,top-50);move(R('chip.'+i),top-50)}
  }else if(kind==='note'){
   for(const s of ['notet','notei','notei.bg'])if(R(s))move(R(s),top-h/2);
  }else{
   title(R('cluek'),summary?'推理依据':'线索来源',top-17);
   move(R('cluename'),top-52);
   for(const s of ['clueface','clueface.bg'])if(R(s))move(R(s),top-64);
   for(let i=0;i<3;i++)if(R('cluesay.'+i)&&text(R('cluesay.'+i)))move(R('cluesay.'+i),top-88);
   if(summary)move(R('rule617.0'),top-122);
  }
  checks.push({name:pre+kind,top,bottom:top-h});top-=h+12;
 }
 if(top+12 < -280)throw Error('bottom overflow '+pre);
}
// Apply the same non-overlapping title/label spacing to the other conclusion cards.
for(const tag of ['l1','l2'])for(let page=1;page<=(tag==='l1'?8:4);page++){
 const pre=`td.${tag}.page.${page}.`,R=s=>by.get(pre+s);if(R('clue')||!R('chips'))continue;
 for(const s of ['chips','chips.border'])if(R(s)){const[x,y,w]=geo(R(s));place(R(s),x,y-6,w,72)}
 move(R('chipsk'),-125);for(let i=0;R('chipt.'+i);i++){move(R('chipt.'+i),-158);move(R('chip.'+i),-158)}
 // Push following note card down with its inline controls.
 for(const r of g.recs.filter(r=>r.name?.startsWith(pre)&&(/\.(note|note\.border|notet|notei|notei\.bg)$/.test(r.name)||/\.ico\.(undo|redo|hint)(\.bg|\.t)?$/.test(r.name))))move(r,geo(r)[1]-12);
}
const expected=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),script=Buffer.from(findScriptLeaf(g).buf);
writeGil(g,output,{label:'626 tutorial source section and independent heading',expectRecs:g.recs.length,assert(t){return t.recs.every(r=>expected.get(r.id)?.equals(encodeMsg([r.field])))||'record mismatch'}});
const disk=readGil(output);for(const r of disk.recs){if(!expected.get(r.id)?.equals(encodeMsg([r.field])))throw Error('disk mismatch');if(!textChanges.has(r.id)&&text(r)!==original.get(r.id))throw Error('text changed '+r.name);if(!changed.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))throw Error('unexpected change');}
if(!findScriptLeaf(disk).buf.equals(script))throw Error('script changed');
const result={records:disk.recs.length,changed:changed.size,preserved:disk.recs.length-changed.size,textChanges:[...textChanges].map(id=>({name:g.recs.find(r=>r.id===id).name,before:original.get(id),after:text(g.recs.find(r=>r.id===id))})),checks,scriptUnchanged:true,bytes:fs.statSync(output).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')};if(report)fs.writeFileSync(report,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
