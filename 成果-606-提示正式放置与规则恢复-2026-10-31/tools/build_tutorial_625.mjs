import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,report]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),old=readGil('正式版623.gil'),by=new Map(g.recs.map(r=>[r.name,r])),prior=new Map(old.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),changed=new Set();
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const prop=r=>ns(r.field,[505,503,75])[0],text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
const val=(r,k)=>Number(prop(r)?.sub.find(f=>f.field===k)?.num||0);
const geo=r=>{const s=stateBlocks(r.field.sub,[])[0];return [504,505].flatMap(k=>[pairValue(pairOf(s,k),0),pairValue(pairOf(s,k),1)])};
function num(r,k,v){let f=prop(r).sub.find(f=>f.field===k&&f.wt===0);if(!f)prop(r).sub.push(f={field:k,wt:0});f.num=BigInt(v);changed.add(r.id)}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h)}changed.add(r.id)}
const width=(t,size)=>[...t].reduce((s,c)=>s+(/[\x00-\x7F]/.test(c)?size*.6:size),0);
const originalText=new Map(g.recs.map(r=>[r.id,text(r)]));
// Render guard space belongs to the box, not to the sentence's advance.
let metrics=0;for(const r of g.recs){if(!r.name?.startsWith('td.')||!text(r)?.trim()||!prop(r))continue;const [x,y,w,h]=geo(r),size=val(r,512)||16;const need=Math.ceil(width(text(r),size)+32),nw=Math.max(w,need),nh=Math.max(h,size*2+4);if(nw!==w||nh!==h){const align=val(r,508);place(r,align===0?x+(nw-w)/2:x,y,nw,nh);metrics++;}}
const chips=[];
for(const tag of ['l1','l2'])for(let page=1;page<=(tag==='l1'?8:4);page++){const pre=`td.${tag}.page.${page}.`;let left=-682;for(let i=0;by.has(pre+'chipt.'+i);i++){const r=by.get(pre+'chipt.'+i),bg=by.get(pre+'chip.'+i),source=prior.get(r.name);if(!source||!bg)throw Error('missing chip reference '+r.name);const size=16,w=Math.ceil(width(text(r),size)+48),y=geo(r)[1];const palette={1:[0xFF8FD18A,0xFF8FD18A,0xFF9EE9FF],2:[0xFFFFCB7A,0xFFFFCB7A,0xFF9EE9FF],4:[0xFF8FD18A,0xFF8FD18A,0xFFFFCB7A]};num(r,504,tag==='l2'?palette[page][i]:val(source,504));num(r,508,1);place(r,left+w/2,y,w,36);place(bg,left+w/2,y,w,36);chips.push({name:r.name,text:text(r),color:val(r,504),left,right:left+w});left+=w+10;}if(left-10>-6)throw Error('chips overflow '+pre);}
// Preserve action labels before icons; allow full labels to render in roomy boxes.
function action(pre,key,left){const r=by.get(pre+'ico.'+key+'.t');const [,y]=geo(r),advance=width(text(r),val(r,512)||16);place(r,left+(advance+32)/2,y,advance+32,36);for(const s of ['', '.bg']){const im=by.get(pre+'ico.'+key+s),[,,w,h]=geo(im);place(im,left+advance+26,y,w,h);}return left+advance+56;}
for(const [pre,lead,keys]of [['td.l1.page.3.','notet',['undo','redo']],['td.l1.page.8.','notet',['hint']],['td.home.page.1.','rule.5.body.2.0',['undo','redo']],['td.home.page.1.','rule.1.body.1.0',['submit']],['td.l1.page.8.','body.0.0',['submit']]]){const r=by.get(pre+lead),[x,,w]=geo(r);let left=x-w/2+width(text(r),val(r,512)||16)+12;for(const key of keys)left=action(pre,key,left);}
{const r=by.get('td.home.page.1.furniture617.1'),[x,y,w]=geo(r),icon=by.get('td.home.page.1.help619.icon'),[,,iw,ih]=geo(icon);place(icon,x-w/2+width(text(r),val(r,512)||16)+26,y,iw,ih);}
const expected=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),script=Buffer.from(findScriptLeaf(g).buf);
writeGil(g,output,{label:'625 text render bounds and semantic chip colours',expectRecs:g.recs.length,assert(t){return t.recs.every(r=>expected.get(r.id)?.equals(encodeMsg([r.field])))||'record mismatch';}});
const disk=readGil(output);let preserved=0;for(const r of disk.recs){if(!expected.get(r.id)?.equals(encodeMsg([r.field])))throw Error('disk mismatch '+r.name);if(text(r)!==originalText.get(r.id))throw Error('text changed '+r.name);if(!changed.has(r.id)){if(!before.get(r.id).equals(encodeMsg([r.field])))throw Error('unexpected '+r.name);preserved++;}if(r.name?.startsWith('td.')&&text(r)?.trim()){const[,,w,h]=geo(r),size=val(r,512)||16;if(h<size*2||w<width(text(r),size)+31.9)throw Error('text bounds '+r.name);}}
if(!findScriptLeaf(disk).buf.equals(script))throw Error('script changed');
const result={records:disk.recs.length,changed:changed.size,preserved,metrics,chips,allTextUnchanged:true,scriptUnchanged:true,diskVerified:true,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),bytes:fs.statSync(output).size};if(report)fs.writeFileSync(report,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
