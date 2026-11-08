import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,bigIds,textsOf,encodeMsg} from '../../../qianxing-murdoku/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../../qianxing-murdoku/tools/gil/gilwrite.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),added=[];
const R=n=>{if(!by.has(n))throw Error('missing '+n);return by.get(n)};
let max=BigInt(g.maxId);
function remap(a,from,to,d=0){for(const q of a){if(!(d===0&&q.field===504)&&q.num===BigInt(from))q.num=BigInt(to);if(q.sub)remap(q.sub,from,to,d+1)}}
function clone(proto,parent,name){
 const f=cloneField(proto.field),id=Number(++max);remap(f.sub,proto.id,id);
 const nf=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);if(!nf)throw Error('name');nf.payload=Buffer.from(name);nf.len=nf.payload.length;
 f.sub.find(q=>q.field===504&&q.wt===0).num=BigInt(parent.id);
 const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);
 for(const s of stateBlocks(f.sub,[])){setPair(pairOf(s,504),0,0);setPair(pairOf(s,505),1600,900)}
 const stack=[g.tree];let found=false;
 while(stack.length&&!found){const a=stack.pop();for(let i=0;i<a.length;i++){const q=a[i];if(!q.sub)continue;if(bigIds(q.sub,[])[0]?.num===BigInt(proto.id)){a.splice(i+1,0,f);found=true;break}stack.push(q.sub)}}
 if(!found)throw Error('holder');
 const r={id,name,parentId:parent.id,field:f};const pc=ensureChildListTop(parent);setChildList(pc,[...asIdList(pc.payload,true),id]);added.push(r);by.set(name,r);return r;
}
for(const tag of ['modal','confirm','home','l1','l2']){const p=clone(R('td.home'),R('root'),'block640.'+tag);clone(R('hit.hint'),p,p.name+'.hit')}
const script=fs.readFileSync('dist/client_script.lua'),leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const expected=new Map([...g.recs,...added].map(r=>[r.id,encodeMsg([r.field])]));
writeGil(g,output,{label:'640 modal full-screen pointer blockers',expectRecs:expected.size,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';for(const r of t.recs)if(!expected.get(r.id)?.equals(encodeMsg([r.field])))return 'record mismatch '+r.name;return true}});
const disk=readGil(output),names=new Map(disk.recs.map(r=>[r.name,r]));
for(const r of disk.recs)if(before.has(r.id)&&r.name!=='root'&&!before.get(r.id).equals(encodeMsg([r.field])))throw Error('unrelated record changed '+r.name);
for(const tag of ['modal','confirm','home','l1','l2']){
 const p=names.get('block640.'+tag),h=names.get('block640.'+tag+'.hit');
 for(const r of [p,h]){const s=stateBlocks(r.field.sub,[])[0];const rect=[504,505].flatMap(k=>[pairValue(pairOf(s,k),0),pairValue(pairOf(s,k),1)]);if(JSON.stringify(rect)!=='[0,0,1600,900]')throw Error('geometry '+r.name)}
 if(h.parentId!==p.id||JSON.stringify(asIdList(findChildListTop(p.field.sub).payload,true))!==JSON.stringify([h.id]))throw Error('hierarchy');
 const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);if(!ns(h.field,[505,503,81]).length)throw Error('not button');
}
console.log(JSON.stringify({records:disk.recs.length,added:added.map(r=>r.name),originalPopupRecordsUnchanged:true,excludedHelpHintUnchanged:true,scriptMatches:true,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')}));
