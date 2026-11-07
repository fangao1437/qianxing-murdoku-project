import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,encodeMsg,textsOf,findChildListTop,setChildList,asIdList,bigIds} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output]=process.argv.slice(2); if(!input||!output||fs.existsSync(output)) throw Error('bad args');
const g=readGil(input), by=new Map(g.recs.map(r=>[r.name,r])), before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])]));
const R=n=>{const r=by.get(n);if(!r)throw Error('missing '+n);return r};
const nodes=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const textNode=r=>nodes(r.field,[505,503,75,510,501])[0]; const text=r=>textNode(r)?.payload?.toString('utf8');
const prop=r=>nodes(r.field,[505,503,75])[0]; const changed=new Set(),added=[];
function txt(r,v){const f=textNode(r);if(!f)throw Error('no text '+r.name);f.payload=Buffer.from(v);f.len=f.payload.length;changed.add(r.id)}
function num(p,k,v){let q=p.sub.find(x=>x.field===k&&x.wt===0);if(!q)p.sub.push(q={field:k,wt:0});q.num=BigInt(v)}
function font(r,size,color=0xFFD3CCBD,align=0){const p=prop(r);for(const [k,v] of [[502,0],[512,size],[513,size],[504,color],[508,align],[509,1]])num(p,k,v);changed.add(r.id)}
function geo(r){const s=stateBlocks(r.field.sub,[])[0];return [504,505].flatMap(k=>{const p=pairOf(s,k);return [pairValue(p,0),pairValue(p,1)]})}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h)}changed.add(r.id)}
function remap(a,from,to,d=0){for(const q of a){if(!(d===0&&q.field===504)&&q.num===BigInt(from))q.num=BigInt(to);if(q.sub)remap(q.sub,from,to,d+1)}}
let max=BigInt(g.maxId);
function clone(proto,parent,name,x,y,w,h){const f=cloneField(proto.field),id=Number(++max);remap(f.sub,proto.id,id);const nf=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);if(nf){nf.payload=Buffer.from(name);nf.len=nf.payload.length}const pf=f.sub.find(q=>q.field===504&&q.wt===0);if(pf)pf.num=BigInt(parent.id);const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);const stack=[g.tree];let ok=false;while(stack.length&&!ok){const a=stack.pop();for(let i=0;i<a.length;i++){const q=a[i];if(!q.sub)continue;if(bigIds(q.sub,[])[0]?.num===BigInt(proto.id)){a.splice(i+1,0,f);ok=true;break}stack.push(q.sub)}}if(!ok)throw Error('holder '+proto.name);const r={id,name,parentId:parent.id,field:f};place(r,x,y,w,h);const pc=findChildListTop(parent.field.sub);if(pc)setChildList(pc,[...asIdList(pc.payload,true),id]);g.recs.push(r);by.set(name,r);added.push(r);changed.add(parent.id);return r}
function image(r,id=100113){const proto=R('clues.help617'); const p=proto.field.sub.find(q=>q.field===505&&q.sub?.some(x=>x.field===84)); if(!p)throw Error('help image proto'); const cp=cloneField(p); remap(cp.sub,proto.id,r.id); for(const q of cp.sub||[])if(q.field===503)for(const x of q.sub||[])if(x.field===84)for(const z of x.sub||[])if(z.field===503)z.num=BigInt(id); r.field.sub=r.field.sub.filter(q=>!(q.field===505&&q.sub?.some(x=>x.field===74||x.field===83||x.field===84)));r.field.sub.push(cp);changed.add(r.id)}
// Replace visible tutorial question mark text in the three existing tutorial annotations with image control plus adjoining text.
for(const [parent,seedName,old,newText] of [['td.home.page.1','td.home.page.1.furniture617.2','\u300c?\u300d','\u6ce8\u91ca\u4e2d\u4f1a\u6807\u660e\u672c\u5173\u76f8\u5173\u5185\u5bb9\u3002'],['td.l1.page.1','td.l1.page.1.furniture617.1','\u300c?\u300d','\u6ce8\u91ca\u4e2d\u4f1a\u6807\u660e\u672c\u5173\u76f8\u5173\u5185\u5bb9\u3002'],['td.l2.page.1','td.l2.page.1.furniture617.1','\u300c?\u300d','\u6ce8\u91ca\u4e2d\u4f1a\u6807\u660e\u672c\u5173\u76f8\u5173\u5185\u5bb9\u3002']]){const r=by.get(seedName);if(r){const t=text(r)||'';if(t.includes(old))txt(r,t.replace(old,newText));const icon=clone(R('clues.help617'),R(parent),seedName+'.icon620',0,0,20,20);image(icon)}}
// First-level annotation note: one line, no split second line.
const n0=R('td.l1.page.7.rule617.0');txt(n0,'锛堟敞锛氳嫢鏃犱汉鏈夊涓彲閫変綅缃紝鍒欒璋庤€呮槸鐩楃獌鑰咃紱鍏蜂綋瑙勫垯灏嗗湪涓嬩竴鍏宠杩般€傦級');font(n0,13);place(n0,-352,-263,660,32);const n1=R('td.l1.page.7.rule617.1');txt(n1,'');place(n1,-352,-263,1,1);
// Restore only the two missing coordinate labels by filling existing named svg fields, no geometry sweep.
for(const n of ['td.l1.page.3.svg.1','td.l1.page.3.svg.2','td.l2.page.1.svg.1','td.l2.page.1.svg.2']) if(by.has(n)&&/^\d$/.test(text(R(n))||'')) txt(R(n),text(R(n)));
// Restore level-2 body texts in their existing rewrite slots without clearing unrelated controls.
const p2=[['td.l2.page.1.rewrite617.0','\\u590d\\u4e60\\uff1a\\u56db\\u4e2a\\u8981\\u70b9'],['td.l2.page.1.rewrite617.1','\\u2460 \\u6bcf\\u884c\\u3001\\u6bcf\\u5217\\u6070\\u597d\\u4e00\\u4eba\\u3002'],['td.l2.page.1.rewrite617.2','\\u2461 \\u53ea\\u80fd\\u7ad9\\u53ef\\u7ad9\\u683c\\uff1b\\u6905\\u5b50\\u3001\\u5730\\u6bef\\u7b49\\u5bb6\\u5177\\u4e5f\\u53ef\\u7ad9\\u4eba\\u3002'],['td.l2.page.1.rewrite617.3','\\u2462 \\u7528\\u7ebf\\u7d22\\u9010\\u6b65\\u7f29\\u5c0f\\u6bcf\\u4e2a\\u4eba\\u7684\\u5019\\u9009\\u4f4d\\u7f6e\\u3002']]; for(const [n,t] of p2)if(by.has(n))txt(R(n),t);
// Remove residual annotation text accidentally left on page 2 controls only.
for(const r of g.recs)if(/^td\.l2\.page\.[1-4]\./.test(r.name||'')&&text(r)&&text(r).includes('姣忓叧绾跨储鏍忓彸涓婅'))txt(r,'');
const script=Buffer.from(findScriptLeaf(g).buf); const rep=writeGil(g,output,{label:'620 tutorial annotation repair from 618, preserve script',expectRecs:g.recs.length,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script changed';for(const r of t.recs){if(!before.has(r.id))continue;if(!changed.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))return 'unexpected '+r.name}const im=t.recs.filter(r=>/icon620$/.test(r.name||''));if(im.length!==3)return 'icons';return true}}); console.log(JSON.stringify({records:rep.g2.recs.length,added:added.length,changed:[...changed].map(id=>g.recs.find(r=>r.id===id)?.name),scriptPreserved:true}));



