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

// Keep the complete visible image prototype used inside the tutorial, including component 14.
const help=R('clues.help617'),seed=R('td.home.page.1.help619.icon');
const kept=help.field.sub.filter(f=>f.field!==505 || f.sub?.some(q=>q.field===12 || (q.field===502&&q.num===12n)));
const parts=seed.field.sub.filter(f=>f.field===505&&!f.sub?.some(q=>q.field===12 || (q.field===502&&q.num===12n) || q.field===80)).map(cloneField);
for(const f of parts)remap(f.sub,seed.id,help.id);
help.field.sub=[...kept,...parts];changed.add(help.id);
const [hx,hy]=geo(help);place(help,hx,hy,32,32);
const hit=clone(R('hit.hint'),R('root'),'clues.help627.hit',hx,hy,48,48);
// Put the hit layer immediately after its picture, below all tutorial and modal layers.
const rootList=ensureChildListTop(R('root'));let rootIds=asIdList(rootList.payload,true).filter(id=>id!==hit.id);
rootIds.splice(rootIds.indexOf(help.id)+1,0,hit.id);setChildList(rootList,rootIds);
function pic(name,id,color,x,y,w,h){const r=clone(seed,R('home'),name,x,y,w,h);num(ns(r.field,[505,503,84])[0],503,id);num(ns(r.field,[505,503,84])[0],502,color);return r;}
// Reference menu: left-middle position. Canvas uses 1600 width, centered origin.
const x=-530,y=55;
pic('home.tutorial627.bg',100002,0xFF252D3B,x,y,144,144);
pic('home.tutorial627.ring',100006,0xFFFFCB7A,x,y,144,144);
pic('home.tutorial627.icon',100113,0xFFFFCB7A,x,y+26,36,36);
const label=clone(R('td.l1.page.1.heading'),R('home'),'home.tutorial627.label',x,y-26,120,48);txt(label,'教程');font(label,22,0xFFFFE7BE,1);
const homeHit=clone(R('home.select'),R('home'),'home.tutorial627.hit',x,y,144,144);
const script=fs.readFileSync('dist/client_script.lua');const leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const all=[...g.recs,...added],expected=new Map(all.map(r=>[r.id,encodeMsg([r.field])]));
const rep=writeGil(g,output,{label:'627 restore help image and separate hit controls; home tutorial',expectRecs:all.length,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';
 for(const r of t.recs)if(!expected.get(r.id)?.equals(encodeMsg([r.field])))return 'record mismatch '+r.name;
 return true;
}});
const disk=readGil(output),dr=new Map(disk.recs.map(r=>[r.name,r]));
for(const r of disk.recs){if(!changed.has(r.id)&&before.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))throw Error('non-target changed '+r.name);}
for(const n of ['clues.help617','clues.help627.hit','home.tutorial627.hit']){
 const r=dr.get(n);if(!r.field.sub.some(f=>f.field===505&&f.sub?.some(q=>q.field===14)))throw Error('missing base component '+n);
 const parent=disk.recs.find(p=>p.id===r.parentId),cl=findChildListTop(parent.field.sub);if(!asIdList(cl.payload,true).includes(r.id))throw Error('parent link '+n);
}
if(!ns(dr.get('clues.help617').field,[505,503,84])[0].sub.some(f=>f.field===503&&f.num===100113n))throw Error('help image');
for(const n of ['clues.help627.hit','home.tutorial627.hit'])if(!ns(dr.get(n).field,[505,503,81]).length)throw Error('missing button '+n);
const result={records:disk.recs.length,changedExisting:g.recs.filter(r=>changed.has(r.id)).map(r=>r.name),added:added.map(r=>r.name),tutorialRecordsUnchanged:disk.recs.filter(r=>r.name?.startsWith('td.')).every(r=>before.get(r.id)?.equals(encodeMsg([r.field]))),scriptMatches:true,bytes:fs.statSync(output).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')};
if(!result.tutorialRecordsUnchanged)throw Error('tutorial changed');if(reportPath)fs.writeFileSync(reportPath,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
