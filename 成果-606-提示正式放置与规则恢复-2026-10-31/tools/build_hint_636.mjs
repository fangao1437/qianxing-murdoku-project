import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,bigIds,textsOf,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,reportPath]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),ids=new Map(g.recs.map(r=>[r.id,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),changed=new Set(),added=[];
const R=n=>{if(!by.has(n))throw Error(n);return by.get(n);};
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const prop=r=>ns(r.field,[505,503,75])[0],text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
function txt(r,t){const f=ns(r.field,[505,503,75,510,501])[0];if(!f)throw Error('not text '+r.name);f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id);}
function num(p,k,v){let f=p.sub.find(x=>x.field===k&&x.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v);}
function font(r,size,color=0xFFD3CCBD,align=0){for(const [k,v]of [[502,0],[512,size],[513,size],[504,color],[508,align],[509,1]])num(prop(r),k,v);changed.add(r.id);}
const geo=r=>{const s=stateBlocks(r.field.sub,[])[0];return [504,505].flatMap(k=>[pairValue(pairOf(s,k),0),pairValue(pairOf(s,k),1)]);};
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);}changed.add(r.id);}
function remap(a,from,to,d=0){for(const q of a){if(!(d===0&&q.field===504)&&q.num===BigInt(from))q.num=BigInt(to);if(q.sub)remap(q.sub,from,to,d+1);}}
let max=BigInt(g.maxId);
function clone(proto,parent,name,x,y,w,h){const f=cloneField(proto.field),id=Number(++max);remap(f.sub,proto.id,id);const nf=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);nf.payload=Buffer.from(name);nf.len=nf.payload.length;f.sub.find(q=>q.field===504&&q.wt===0).num=BigInt(parent.id);const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);const stack=[g.tree];let found=false;while(stack.length&&!found){const a=stack.pop();for(let i=0;i<a.length;i++){const q=a[i];if(!q.sub)continue;if(bigIds(q.sub,[])[0]?.num===BigInt(proto.id)){a.splice(i+1,0,f);found=true;break;}stack.push(q.sub);}}if(!found)throw Error('holder');const r={id,name,parentId:parent.id,field:f};const pc=ensureChildListTop(parent);setChildList(pc,[...asIdList(pc.payload,true),id]);changed.add(parent.id);place(r,x,y,w,h);added.push(r);by.set(name,r);ids.set(id,r);return r;}

// 636: real button hit controls, appended above the decorative controls.
const hits=[
 ['hint635.menu.position.hit','hint635.menu','hint635.menu.position',390,48],
 ['hint635.menu.clue.hit','hint635.menu','hint635.menu.clue',390,48],
 ['hint635.menu.close.hit','hint635.menu','hint635.menu.close',36,36],
 ['hint635.result.close.hit','hint635.result','hint635.result.close',36,36]
];
for(const [name,parent,visual,w,h] of hits){
 const [x,y]=geo(R(visual));
 clone(R('hit.hint'),R(parent),name,x,y,w,h);
}
const script=fs.readFileSync('dist/client_script.lua');const leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const all=[...g.recs,...added],expected=new Map(all.map(r=>[r.id,encodeMsg([r.field])]));
writeGil(g,output,{label:'636 hint button hit areas and no-selection reminder',expectRecs:all.length,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';
 for(const r of t.recs)if(!expected.get(r.id)?.equals(encodeMsg([r.field])))return 'record mismatch '+r.name;
 return true;
}});
const disk=readGil(output);
for(const r of disk.recs)if(!changed.has(r.id)&&before.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))throw Error('non-target changed '+r.name);
for(const r of added){const parent=disk.recs.find(p=>p.id===r.parentId);if(!asIdList(findChildListTop(parent.field.sub).payload,true).includes(r.id))throw Error('parent link '+r.name);}
for(const [name,parent,visual,w,h] of hits){
 const r=disk.recs.find(q=>q.name===name);
 if(!ns(r.field,[505,503,81]).length)throw Error('missing button '+name);
 if(!r.field.sub.some(f=>f.field===505&&f.sub?.some(q=>q.field===14)))throw Error('missing base '+name);
 if(JSON.stringify(geo(r))!==JSON.stringify([...geo(R(visual)).slice(0,2),w,h]))throw Error('hit geometry '+name);
 const ids=asIdList(findChildListTop(disk.recs.find(q=>q.name===parent).field.sub).payload,true);
 if(ids.indexOf(r.id)<=ids.indexOf(R(visual).id))throw Error('hit layer '+name);
}
const report={records:disk.recs.length,added:added.map(r=>r.name),scriptMatches:true,bytes:fs.statSync(output).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')};
if(reportPath)fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
