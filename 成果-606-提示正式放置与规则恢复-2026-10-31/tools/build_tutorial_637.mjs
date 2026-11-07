import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,bigIds,textsOf,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,report]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),script=Buffer.from(findScriptLeaf(g).buf),changed=new Set(),added=[],removed=new Set();let max=BigInt(g.maxId);
const R=n=>{const r=by.get(n);if(!r)throw Error(n);return r;};
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
function num(p,k,v){let q=p.sub.find(x=>x.field===k&&x.wt===0);if(!q)p.sub.push(q={field:k,wt:0});q.num=BigInt(v>>>0);}
function txt(r,t,size=14,color=0xFFD3CCBD,align=1){const f=ns(r.field,[505,503,75,510,501])[0];f.payload=Buffer.from(t);f.len=f.payload.length;const p=ns(r.field,[505,503,75])[0];for(const[k,v]of [[502,0],[512,size],[513,size],[504,color],[508,align],[509,1]])num(p,k,v);changed.add(r.id);}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);}changed.add(r.id);}
function art(r,id,color){for(const p of ns(r.field,[505,503,84])){num(p,503,id);num(p,502,color);}changed.add(r.id);}
function clone(proto,parent,name,x,y,w,h){const f=cloneField(proto.field),id=Number(++max);function fix(a,d=0){for(const q of a){if(!(d===0&&q.field===504)&&q.num===BigInt(proto.id))q.num=BigInt(id);if(q.sub)fix(q.sub,d+1);}}fix(f.sub);const nf=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);nf.payload=Buffer.from(name);nf.len=nf.payload.length;f.sub.find(q=>q.field===504&&q.wt===0).num=BigInt(parent.id);const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);const stack=[g.tree];let done=false;while(stack.length&&!done){const a=stack.pop();for(let i=0;i<a.length;i++){const q=a[i];if(!q.sub)continue;if(bigIds(q.sub,[])[0]?.num===BigInt(proto.id)){a.splice(i+1,0,f);done=true;break;}stack.push(q.sub);}}if(!done)throw Error('holder');const r={id,name,parentId:parent.id,field:f};place(r,x,y,w,h);const pc=ensureChildListTop(parent);setChildList(pc,[...asIdList(pc.payload,true),id]);changed.add(parent.id);added.push(r);by.set(name,r);return r;}
const X=c=>106.69312286376953+(c-1)*60.687828063964844,Y=r=>104.8465576171875-(r-1)*60.687828063964844;
const green=0xFF76DBAA,gold=0xFFFFCB7A,red=0xFFF07878,blue=0xFF8CCEFF;let serial=0;
function pic(p,id,color,x,y,w,h){const r=clone(R('td.l2.page.1.lg.6.bg'),R(`td.l2.page.${p}`),`td.l2.page.${p}.demo637.${++serial}`,x,y,w,h);art(r,id,color);return r;}
function label(p,t,x,y,w=120,size=14,color=gold){const r=clone(R('td.l2.page.1.lg.6'),R(`td.l2.page.${p}`),`td.l2.page.${p}.demo637.${++serial}`,x,y,w,32);txt(r,t,size,color);return r;}
function frame(p,x,y,w,h,color){pic(p,100001,color,x,y+h/2,w,2);pic(p,100001,color,x,y-h/2,w,2);pic(p,100001,color,x-w/2,y,2,h);pic(p,100001,color,x+w/2,y,2,h);}
function cell(p,r,c,color=gold){frame(p,X(c),Y(r),53,53,color);}
function token(p,r,c,t,color=green){pic(p,100002,0xED17232F,X(c),Y(r),36,36);pic(p,100006,color,X(c),Y(r),38,38);label(p,t,X(c),Y(r),52,18,color);}
function caption(p,t){const r=R(`td.l2.page.${p}.caption`);txt(r,t,14);place(r,275,-241,466,34);}
function drop(p,indices){for(const i of indices){const r=R(`td.l2.page.${p}.svg.${i}`);if(script.includes(Buffer.from(r.name)))throw Error('referenced '+r.name);removed.add(r.id);}}
// Remove obsolete numbered callouts and the same-column conflict overlay.
drop(1,[36,75]);drop(2,[43,82]);drop(3,[1,34,35,74,37,76,39,78]);
// Page 1: an illustrative chair occupant, its row/column, and all actual doors.
frame(1,258.41269,Y(1),358,55,blue);frame(1,X(1),-46.873,55,358,blue);cell(1,1,1,green);token(1,1,1,'人',green);cell(1,1,2,red);
for(const [x,y]of [[319.1005,44.1587],[106.6931,-46.873],[258.4127,-77.2169]])pic(1,100006,gold,x,y,24,24);
caption(1,'示例：椅上可站；同行同列不能再放人');
// Page 2: the general clue excludes exactly five carpet squares; no liar is revealed.
const carpets=[[1,4],[3,3],[3,4],[5,1],[6,1]];for(const[r,c]of carpets)cell(2,r,c,red);
caption(2,'通用线索为真：五个地毯格全部排除');
// Page 3: conditional candidates under b + e + general clue, not final placements.
for(const[r,c]of [[1,1],[2,4]]){cell(3,r,c,blue);token(3,r,c,'人',blue);}
for(const[r,c]of [[5,5],[6,3]])token(3,r,c,'E?',gold);
for(const[r,c]of carpets)cell(3,r,c,red);
caption(3,'假设 b、e 为真：E? 为局部候选，须再排除');
// Replace the right-hand legend with a compact reasoning key on this page only.
const proof=['假设 b、d、e 真','b：两椅有人','占1、2行及1、4列','e：仅E在植物旁','红框：地毯禁站','E?：剩余候选','(5,5) 或 (6,3)','d：A须在E下方','E在第6行不行','若E在(5,5)','则A只能在(6,6)','第3行无格可放','故三条不能全真'];
for(let i=0;i<13;i++){const r=R(`td.l2.page.3.lgt.${i}`);txt(r,proof[i],13,i===0?gold:0xFFD3CCBD,0);place(r,585,126-i*27,175,32);}
for(const r of g.recs)if(/^td\.l2\.page\.3\.lg\.\d+(\.bg)?$/.test(r.name||''))removed.add(r.id);
txt(R('td.l2.page.3.legendtitle'),'b、d、e 检验',16,gold);
// Page 4: final solution, with A above E and D highlighted as the false-clue author.
const solution={B:[1,1],D:[2,4],V:[3,6],C:[4,5],A:[5,2],E:[6,3]};for(const [id,[r,c]]of Object.entries(solution))token(4,r,c,id,id==='D'?red:id==='V'?blue:green);
cell(4,5,2,gold);cell(4,6,3,gold);pic(4,100006,red,X(4),Y(2),50,50);
caption(4,'A在第5行，E在第6行：d为假，D是盗窃者');
// Delete obsolete leaf records and repair each affected parent list.
const fields=new Set(g.recs.filter(r=>removed.has(r.id)).map(r=>r.field));for(const r of g.recs){const cl=findChildListTop(r.field.sub);if(!cl)continue;const old=asIdList(cl.payload,true),keep=old.filter(id=>!removed.has(id));if(keep.length!==old.length){setChildList(cl,keep);changed.add(r.id);}}
function prune(a){for(let i=a.length-1;i>=0;i--){if(fields.has(a[i]))a.splice(i,1);else if(a[i].sub)prune(a[i].sub);}}prune(g.tree);
const all=[...g.recs.filter(r=>!removed.has(r.id)),...added],expected=new Map(all.map(r=>[r.id,encodeMsg([r.field])]));
writeGil(g,output,{label:'637 second-level tutorial diagrams',expectRecs:all.length,assert(t){return findScriptLeaf(t).buf.equals(script)||'script changed';}});
const disk=readGil(output);for(const r of disk.recs){if(!expected.get(r.id)?.equals(encodeMsg([r.field])))throw Error('disk mismatch '+r.name);if(before.has(r.id)&&!changed.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))throw Error('non-target changed '+r.name);const cl=findChildListTop(r.field.sub);if(cl&&asIdList(cl.payload,true).some(id=>removed.has(id)))throw Error('dangling child');}if(!findScriptLeaf(disk).buf.equals(script))throw Error('script changed');
const result={records:disk.recs.length,added:added.length,removed:g.recs.filter(r=>removed.has(r.id)).map(r=>r.name),modified:g.recs.filter(r=>!removed.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field]))).map(r=>r.name),unchanged:disk.recs.filter(r=>before.get(r.id)?.equals(encodeMsg([r.field]))).length,scriptUnchanged:true,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')};if(report)fs.writeFileSync(report,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
