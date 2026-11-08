import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,bigIds,textsOf,encodeMsg} from '../../../qianxing-murdoku/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../../qianxing-murdoku/tools/gil/gilwrite.mjs';
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

// 639: annotation close icon and independent hit button.
const target=R('help617.close'),proto=R('hint635.result.close');
const parts=proto.field.sub.filter(q=>q.field===505).map(cloneField);
for(const q of parts){remap(q.sub,proto.id,target.id);for(const f of textsOf(q.sub,[]))if(f.payload?.toString('utf8')===proto.name){f.payload=Buffer.from(target.name);f.len=f.payload.length;}}
target.field.sub=target.field.sub.filter(q=>q.field!==505);target.field.sub.push(...parts);
place(target,354,184,20,20);
const hit=clone(R('hint635.result.close.hit'),R('help617'),'help617.close.hit',354,184,36,36);
const script=fs.readFileSync('dist/client_script.lua'),leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const expected=new Map([...g.recs,...added].map(r=>[r.id,encodeMsg([r.field])]));
writeGil(g,output,{label:'639 annotation corner close hit',expectRecs:expected.size,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';
 for(const r of t.recs)if(!expected.get(r.id)?.equals(encodeMsg([r.field])))return 'record mismatch '+r.name;
 return true;
}});
const disk=readGil(output),names=new Map(disk.recs.map(r=>[r.name,r]));
for(const r of disk.recs)if(before.has(r.id)&&!changed.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))throw Error('unrelated change '+r.name);
for(const [name,rect] of [['help617.close',[354,184,20,20]],['help617.close.hit',[354,184,36,36]]])if(JSON.stringify(geo(names.get(name)))!==JSON.stringify(rect))throw Error('geometry '+name);
const h=names.get('help617.close.hit');if(!ns(h.field,[505,503,81]).length)throw Error('not button');
const kids=asIdList(findChildListTop(names.get('help617').field.sub).payload,true);
if(kids.at(-1)!==h.id||h.parentId!==names.get('help617').id)throw Error('hit hierarchy');
if(!script.toString().includes('util:_bind("help617.close.hit", close'))throw Error('binding');
console.log(JSON.stringify({records:disk.recs.length,added:added.map(r=>r.name),changed:[...changed],scriptMatches:true,unrelatedRecordsUnchanged:true,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')}));
