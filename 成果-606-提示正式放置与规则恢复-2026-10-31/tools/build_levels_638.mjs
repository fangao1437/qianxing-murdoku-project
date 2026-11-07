import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,cloneField,textsOf,bigIds,ensureChildListTop,findChildListTop,asIdList,setChildList,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,report]=process.argv.slice(2);
if(!input||!output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),by=new Map(g.recs.map(r=>[r.name,r])),added=[],changed=new Set();
const R=n=>{if(!by.has(n))throw Error('missing '+n);return by.get(n)};
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const tn=r=>ns(r.field,[505,503,75,510,501])[0];
function txt(r,t){const f=tn(r);if(!f)throw Error('missing text '+r.name);f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id);}
let max=BigInt(g.maxId);
function copyRow(i){
 const root=R('row.2.'+i),family=g.recs.filter(r=>r.id===root.id||r.parentId===root.id),map=new Map(family.map(r=>[r.id,Number(++max)]));
 for(const src of family){
  const f=cloneField(src.field),id=map.get(src.id),name=src.name.replace('.2.','.4.');
  function remap(a){for(const q of a){if(q.num!==undefined&&map.has(Number(q.num)))q.num=BigInt(map.get(Number(q.num)));if(q.sub)remap(q.sub);}}
  remap(f.sub);
  const namef=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===src.name);namef.payload=Buffer.from(name);namef.len=namef.payload.length;
  const cl=findChildListTop(f.sub);if(cl)setChildList(cl,asIdList(cl.payload,true).map(v=>map.get(v)||v));
  const stack=[g.tree];let found=false;while(stack.length&&!found){const a=stack.pop();for(let j=0;j<a.length;j++){const q=a[j];if(!q.sub)continue;if(bigIds(q.sub,[])[0]?.num===BigInt(src.id)){a.splice(j+1,0,f);found=true;break;}stack.push(q.sub);}}
  if(!found)throw Error('holder '+src.name);
  const r={id,name,parentId:map.get(src.parentId)||src.parentId,field:f};added.push(r);by.set(name,r);
 }
 const parent=g.recs.find(r=>r.id===root.parentId),cl=ensureChildListTop(parent);setChildList(cl,[...asIdList(cl.payload,true),map.get(root.id)]);changed.add(parent.id);
}
for(let i=1;i<=6;i++)copyRow(i);
const data=JSON.parse(fs.readFileSync('../第三四关内容设计/design_selected_v4_638.json','utf8'));
for(let j=0;j<2;j++)for(let i=0;i<6;i++)for(const [slot,t]of [['letter','ABCDEV'[i]],['who','ABCDEV'[i]],['what',data[j].cards[i].join('；')]])txt(R(`${slot}.${j+3}.${i+1}`),t);
const script=fs.readFileSync('dist/client_script.lua'),leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const expected=new Map([...g.recs,...added].map(r=>[r.id,encodeMsg([r.field])]));
writeGil(g,output,{label:'638 levels 3 and 4',expectRecs:expected.size,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';for(const r of t.recs)if(!expected.get(r.id)?.equals(encodeMsg([r.field])))return 'record mismatch '+r.name;return true;}});
const disk=readGil(output),names=new Map(disk.recs.map(r=>[r.name,r]));
for(const r of disk.recs){if(before.has(r.id)&&!changed.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))throw Error('unrelated change '+r.name);}
for(let j=0;j<2;j++)for(let i=0;i<6;i++){const root=names.get(`row.${j+3}.${i+1}`);for(const slot of ['who','what','letter']){const r=names.get(`${slot}.${j+3}.${i+1}`);if(r.parentId!==root.id)throw Error('wrong parent');if(!asIdList(findChildListTop(root.field.sub).payload,true).includes(r.id))throw Error('missing child link');}if(tn(names.get(`what.${j+3}.${i+1}`)).payload.toString('utf8')!==data[j].cards[i].join('；'))throw Error('clue mismatch');}
for(const n of ['clues.help627.hit','help617','help617.close','select.card.4'])if(!names.has(n))throw Error('missing '+n);
const result={records:disk.recs.length,added:added.length,changedExisting:changed.size,firstTwoLevelsRecordsUnchanged:true,scriptMatches:true,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')};if(report)fs.writeFileSync(report,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
