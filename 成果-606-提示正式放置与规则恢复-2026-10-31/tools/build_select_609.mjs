// 608 -> 609: add select.card.N.result text controls (cloned from select.card.N.info) and embed the new script.
// Usage: node tools/build_select_609.mjs <608.gil> <609.gil>
import fs from 'node:fs';
import {readGil,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,bigIds,textsOf,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output||input===output||fs.existsSync(output))throw Error('missing arguments or existing output');
const g=readGil(input),script=fs.readFileSync('dist/client_script.lua');
const original=new Map(g.recs.map(r=>[r.id,Buffer.from(encodeMsg([r.field]))]));
const by=new Map(g.recs.map(r=>[r.name,r]));
const R=n=>{if(!by.has(n))throw Error(n);return by.get(n);};
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const textNode=r=>nodes(r.field,[505,503,75,510,501])[0];
let max=BigInt(g.maxId);const added=[];
function holder(id){const stack=[g.tree];while(stack.length){const a=stack.pop();for(let i=0;i<a.length;i++){const f=a[i];if(!f.sub)continue;if(bigIds(f.sub,[])[0]?.num===BigInt(id))return {a,i};stack.push(f.sub);}}throw Error('holder');}
function clone(proto,name,parent){const f=cloneField(proto.field),id=Number(++max);
 (function walk(a,d=0){for(const q of a){if(!(d===0&&q.field===504)&&q.num===BigInt(proto.id))q.num=BigInt(id);if(q.sub)walk(q.sub,d+1);}})(f.sub);
 const nf=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);nf.payload=Buffer.from(name);nf.len=nf.payload.length;
 const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);
 const r={id,name,field:f};const h=holder(proto.id);h.a.splice(h.i+1,0,f);
 const pc=ensureChildListTop(parent);setChildList(pc,[...asIdList(pc.payload,true),id]);
 added.push(r);by.set(name,r);return r;}
for(let i=1;i<=4;i++){const r=clone(R(`select.card.${i}.info`),`select.card.${i}.result`,{id:R(`select.card.${i}.info`).parentId,field:g.recs.find(x=>x.id===R(`select.card.${i}.info`).parentId).field});const t=textNode(r);if(t){t.payload=Buffer.from('');t.len=0;}}
const sl=findScriptLeaf(g).field;sl.payload=script;sl.len=script.length;
const rep=writeGil(g,output,{label:'609 select-card best result text, settlement gate',expectRecs:g.recs.length+added.length,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';
 if(new Set(t.recs.map(r=>r.id)).size!==t.recs.length)return 'duplicate ids';
 const m=new Map(t.recs.map(r=>[r.name,r]));
 for(let i=1;i<=4;i++){const r=m.get(`select.card.${i}.result`);if(!r)return 'missing result '+i;}
 return true;}});
const changed=rep.g2.recs.filter(r=>original.has(r.id)&&!original.get(r.id).equals(encodeMsg([r.field]))).map(r=>r.name);
console.log(JSON.stringify({records:rep.g2.recs.length,added:added.map(r=>r.name),changed}));
