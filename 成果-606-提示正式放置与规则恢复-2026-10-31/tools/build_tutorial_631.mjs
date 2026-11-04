import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,stateBlocks,pairOf,setPair,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,bigIds,textsOf,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,report]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),script=Buffer.from(findScriptLeaf(g).buf),changed=new Set(),added=[];
const R=n=>{if(!by.has(n))throw Error(n);return by.get(n)},ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
function txt(r,t){const f=ns(r.field,[505,503,75,510,501])[0];if(!f)throw Error('text '+r.name);f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id);}
function num(p,k,v){let f=p.sub.find(q=>q.field===k&&q.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v);}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);}changed.add(r.id);}
function line(r,t,left,y,w=660,color=0xFFD3CCBD){txt(r,t);const p=ns(r.field,[505,503,75])[0];for(const[k,v]of [[502,0],[512,16],[513,16],[508,0],[509,1],[504,color]])num(p,k,v);place(r,left+w/2,y,w,36);}
function remap(a,from,to,d=0){for(const q of a){if(!(d===0&&q.field===504)&&q.num===BigInt(from))q.num=BigInt(to);if(q.sub)remap(q.sub,from,to,d+1);}}
let max=BigInt(g.maxId);
function clone(proto,parent,name,x,y,w,h){const f=cloneField(proto.field),id=Number(++max);remap(f.sub,proto.id,id);const nf=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);nf.payload=Buffer.from(name);nf.len=nf.payload.length;f.sub.find(q=>q.field===504&&q.wt===0).num=BigInt(parent.id);const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);const stack=[g.tree];let found=false;while(stack.length&&!found){const a=stack.pop();for(let i=0;i<a.length;i++){const q=a[i];if(!q.sub)continue;if(bigIds(q.sub,[])[0]?.num===BigInt(proto.id)){a.splice(i+1,0,f);found=true;break;}stack.push(q.sub);}}if(!found)throw Error('holder');const r={id,name,parentId:parent.id,field:f};const pc=ensureChildListTop(parent);setChildList(pc,[...asIdList(pc.payload,true),id]);changed.add(parent.id);place(r,x,y,w,h);added.push(r);by.set(name,r);return r;}
const p='td.l2.page.3.',note=R(p+'notet'),parent=g.recs.find(r=>r.id===note.parentId);if(!parent)throw Error('note parent');
for(const suffix of ['note','note.border'])place(R(p+suffix),-341.9400329589844,-98,suffix==='note'?715.8130493164062:717.8130493164062,68);
line(note,'寻找谎言难度较高，',-647,-82,640);
const lead=clone(note,parent,p+'note631.lead',0,0,1,1);line(lead,'如有需要可以通过提示',-647,-110,184);
const icon=clone(R('td.l1.page.8.ico.hint'),parent,p+'ico.hint631',-466,-110,22,22);
const tail=clone(note,parent,p+'note631.tail',0,0,1,1);line(tail,'得知线索真假。',-444,-110,380);
const q='td.l2.page.4.';for(const r of g.recs)if(r.name?.startsWith(q)&&/\.(body\.|rewrite617\.)/.test(r.name)&&text(r)!==undefined)txt(r,'');
const lines=['经过推导，所有人的位置都已唯一确定。','推理可得，线索 D 为假线索。','只有盗窃者可能说谎，因此盗窃者是 D。','D 是鉴定师，确认摆位后即可提交并指认。'];
lines.forEach((t,i)=>line(R(q+'rewrite617.'+(3-i)),t,-682,68-i*32,660,i===1||i===2?0xFFFFCB7A:0xFFD3CCBD));
const all=[...g.recs,...added],expected=new Map(all.map(r=>[r.id,encodeMsg([r.field])]));
writeGil(g,output,{label:'631 hint guidance and closing copy',expectRecs:all.length,assert(t){return findScriptLeaf(t).buf.equals(script)||'script changed';}});
const disk=readGil(output);for(const r of disk.recs){if(!expected.get(r.id)?.equals(encodeMsg([r.field])))throw Error('disk mismatch '+r.name);if(!changed.has(r.id)&&before.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))throw Error('non-target '+r.name);}
if(!findScriptLeaf(disk).buf.equals(script))throw Error('script changed');
for(const r of added){const d=disk.recs.find(x=>x.id===r.id),par=disk.recs.find(x=>x.id===d.parentId);if(!asIdList(findChildListTop(par.field.sub).payload,true).includes(d.id))throw Error('parent link '+r.name);}
const result={records:disk.recs.length,changedExisting:disk.recs.filter(r=>before.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field]))).map(r=>r.name),added:added.map(r=>r.name),closing:lines,scriptUnchanged:true,diskVerified:true,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')};if(report)fs.writeFileSync(report,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
