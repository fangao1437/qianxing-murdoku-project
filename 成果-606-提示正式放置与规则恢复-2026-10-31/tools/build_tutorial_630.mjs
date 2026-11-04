import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,cloneField,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,reference,output,report]=process.argv.slice(2);
if(!input||!reference||!output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),old=readGil(reference),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),script=Buffer.from(findScriptLeaf(g).buf),targets=new Set();
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
function txt(n,t){const r=by.get(n);if(!r)throw Error(n);const f=ns(r.field,[505,503,75,510,501])[0];if(!f)throw Error('text '+n);f.payload=Buffer.from(t);f.len=f.payload.length;targets.add(r.id);}
// Restore all controls on the two requested pages to the approved 627 reference.
for(const r of old.recs){if(!/^td\.l2\.page\.[34]\./.test(r.name||''))continue;const dst=by.get(r.name);if(!dst||dst.id!==r.id)throw Error('identity '+r.name);const copy=cloneField(r.field);Object.keys(dst.field).forEach(k=>delete dst.field[k]);Object.assign(dst.field,copy);targets.add(dst.id);}
txt('td.l2.page.2.rewrite617.0','其他人（包括受害者）的线索和通用线索始终为真。');
txt('td.l2.page.2.body.0.0','');
// Source cards quote the clue itself; no direction qualifier or reasoning in this section.
for(const n of ['what.2.4','td.l2.page.3.cluesay.0','td.l2.page.4.cluesay.0'])txt(n,'随行记者在夜班门卫的上方。');
const expected=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])]));
writeGil(g,output,{label:'630 restore 627 tutorial pages and simplify truth/source copy',expectRecs:g.recs.length,assert(t){return findScriptLeaf(t).buf.equals(script)||'script changed';}});
const disk=readGil(output);for(const r of disk.recs){if(!expected.get(r.id)?.equals(encodeMsg([r.field])))throw Error('disk mismatch '+r.name);if(!targets.has(r.id)&&!before.get(r.id)?.equals(encodeMsg([r.field])))throw Error('non-target '+r.name);}
if(!findScriptLeaf(disk).buf.equals(script))throw Error('disk script changed');
for(const r of old.recs){if(!/^td\.l2\.page\.[34]\./.test(r.name||'')||r.name.endsWith('cluesay.0'))continue;const d=disk.recs.find(d=>d.id===r.id);if(!encodeMsg([r.field]).equals(encodeMsg([d.field])))throw Error('627 restore '+r.name);}
const result={records:disk.recs.length,changed:disk.recs.filter(r=>!before.get(r.id).equals(encodeMsg([r.field]))).map(r=>r.name),scriptUnchanged:true,restored627Pages:[3,4],sourceText:'随行记者在夜班门卫的上方。',closingBodyKept627:true,bytes:fs.statSync(output).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')};
if(report)fs.writeFileSync(report,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
