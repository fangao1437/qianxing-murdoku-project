import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,report]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),base=readGil('正式版630.gil'),by=new Map(g.recs.map(r=>[r.name,r])),old=new Map(base.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),script=Buffer.from(findScriptLeaf(g).buf),changed=new Set();
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
const R=n=>{const r=by.get('td.l2.page.3.'+n);if(!r)throw Error(n);return r;};
const geo=r=>{const s=stateBlocks(r.field.sub,[])[0];return [504,505].flatMap(k=>[pairValue(pairOf(s,k),0),pairValue(pairOf(s,k),1)]);};
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);}changed.add(r.id);}
function txt(r,t){const f=ns(r.field,[505,503,75,510,501])[0];if(!f)throw Error('text');f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id);}
for(const n of ['note','note.border'])place(R(n),...geo(old.get('td.l2.page.3.'+n)));
if(text(R('notet'))!=='寻找谎言难度较高，'||text(R('note631.lead'))!=='如有需要可以通过提示')throw Error('unexpected input');
const prefix='寻找谎言难度较高，如有需要可以通过提示',left=-647,y=-94,advance=[...prefix].length*16;
txt(R('notet'),prefix);place(R('notet'),left+(advance+8)/2,y,advance+8,36);
txt(R('note631.lead'),'');
place(R('ico.hint631'),left+advance+18,y,22,22);
const tailLeft=left+advance+36;place(R('note631.tail'),tailLeft+100,y,200,36);
if(tailLeft+200>10)throw Error('text frame outside panel');
const expected=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])]));
writeGil(g,output,{label:'633 single line hint and original spacing',expectRecs:g.recs.length,assert(t){return findScriptLeaf(t).buf.equals(script)||'script changed';}});
const disk=readGil(output);for(const r of disk.recs){if(!expected.get(r.id)?.equals(encodeMsg([r.field])))throw Error('disk mismatch '+r.name);if(!changed.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))throw Error('non-target '+r.name);}
if(!findScriptLeaf(disk).buf.equals(script))throw Error('script changed');
const result={records:disk.recs.length,changed:disk.recs.filter(r=>!before.get(r.id).equals(encodeMsg([r.field]))).map(r=>({name:r.name,text:text(r),geometry:geo(r)})),scriptUnchanged:true,diskVerified:true,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')};if(report)fs.writeFileSync(report,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
