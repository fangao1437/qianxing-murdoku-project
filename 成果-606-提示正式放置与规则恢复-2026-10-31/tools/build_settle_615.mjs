// 614 -> 615: restore modal.cancel to the no-countdown (612) editor position; script shifts it only while the countdown is visible.
// Usage: node tools/build_settle_615.mjs 正式版614.gil 正式版615.gil 正式版612.gil
import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,ref]=process.argv.slice(2);
if(!input||!output||!ref||input===output||fs.existsSync(output))throw Error('invalid or existing output');
const g=readGil(input),base=readGil(ref),script=fs.readFileSync('dist/client_script.lua');
for(const m of ['key == "settle_shift"','cancel.settle_shift'])if(!script.includes(Buffer.from(m)))throw Error('missing '+m);
const pos=r=>stateBlocks(r.field.sub,[]).map(s=>[pairValue(pairOf(s,504),0),pairValue(pairOf(s,504),1),pairValue(pairOf(s,505),0),pairValue(pairOf(s,505),1)]);
const cur=g.recs.find(r=>r.name==='modal.cancel'),orig=base.recs.find(r=>r.name==='modal.cancel');
if(!cur||!orig||cur.id!==orig.id)throw Error('modal.cancel mismatch');
const want=pos(orig),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])]));
stateBlocks(cur.field.sub,[]).forEach((s,i)=>setPair(pairOf(s,504),want[i][0],want[i][1]));
const leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const rep=writeGil(g,output,{label:'615 cancel default layout, shift only with countdown',expectRecs:g.recs.length,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';
 const r=t.recs.find(r=>r.id===cur.id);if(JSON.stringify(pos(r))!==JSON.stringify(want))return 'cancel not restored';
 return true;}});
const old=readGil(input),oldMap=new Map(old.recs.map(r=>[r.id,encodeMsg([r.field])]));
const changed=rep.g2.recs.filter(r=>!oldMap.get(r.id)?.equals(encodeMsg([r.field]))).map(r=>r.name);
console.log(JSON.stringify({records:rep.g2.recs.length,cancel:{from:pos(old.recs.find(r=>r.id===cur.id))[0],to:want[0]},changed}));
