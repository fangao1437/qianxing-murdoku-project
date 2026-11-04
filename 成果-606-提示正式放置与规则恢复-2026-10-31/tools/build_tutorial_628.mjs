import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,stateBlocks,pairOf,pairValue,setPair,findChildListTop,asIdList,setChildList,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,report]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),changed=new Set();
const R=n=>{const r=by.get(n);if(!r)throw Error(n);return r;};
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const prop=r=>ns(r.field,[505,503,75])[0];
const text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
function num(p,k,v){let f=p.sub.find(x=>x.field===k&&x.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v);}
function txt(r,t){const f=ns(r.field,[505,503,75,510,501])[0];if(!f)throw Error('text '+r.name);f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id);}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);}changed.add(r.id);}
function line(n,t,y,color=0xFFD3CCBD){const r=R(n);txt(r,t);place(r,-352,y,660,36);for(const[k,v]of [[502,0],[512,16],[513,16],[504,color],[508,0],[509,1]])num(prop(r),k,v);}
const icon=R('home.tutorial627.icon');let removed=false;
function remove(a){for(let i=a.length-1;i>=0;i--){if(a[i]===icon.field){a.splice(i,1);removed=true;}else if(a[i].sub)remove(a[i].sub);}}
remove(g.tree);if(!removed)throw Error('icon not removed');
const home=R('home'),cl=findChildListTop(home.field.sub);setChildList(cl,asIdList(cl.payload,true).filter(id=>id!==icon.id));changed.add(home.id);
place(R('home.tutorial627.label'),-530,55,120,48);num(prop(R('home.tutorial627.label')),512,26);num(prop(R('home.tutorial627.label')),513,26);
txt(R('what.2.4'),'随行记者在夜班门卫的上方（不要求同列）');
const p='td.l2.page.4.';
for(const r of g.recs)if(r.name?.startsWith(p)&&(r.name.slice(p.length).startsWith('body.')||r.name.slice(p.length).startsWith('rewrite617.'))&&text(r)!==undefined)txt(r,'');
txt(R(p+'heading'),'推导示例：先假设卡 4 为假');
line(p+'rewrite617.1','① 暂定卡 4 为假，其余线索与通用线索为真。',82);
line(p+'rewrite617.0','A 在书架旁；(6,1)是地毯，(6,3)在植物旁。',50);
line(p+'body.0.0','只有 E 在植物旁，所以 A 只能站 (5,2)。',18);
line(p+'body.x7','② 继续枚举剩余约束，此分支仅余 E=(6,3)。',-14,0xFFFFCB7A);
line(p+'body.x6','E 在 A 下方，卡 4 确为假；上方不要求同列。',-46);
line(p+'body.x5','这是一个假设分支，不能据此排除其他假话。',-78);
txt(R(p+'chipt.0'),'假设卡 4 为假');txt(R(p+'chipt.1'),'A 在第 5 行');txt(R(p+'chipt.2'),'E 在第 6 行');
txt(R(p+'cluesay.0'),'随行记者在夜班门卫的上方（不要求同列）。');
// Replace the unsupported uniqueness shortcut with explicit hypothesis checking.
const p3='td.l2.page.3.';
txt(R(p3+'body.0.0'),'③ 分别检查');txt(R(p3+'body.1.0'),'假话候选');txt(R(p3+'body.2.0'),'；记录');txt(R(p3+'body.2.1'),'每个假设下的可行摆位，');txt(R(p3+'body.2.2'),'不要过早锁定说谎者。');
txt(R(p3+'notet'),'下一页演示卡 4 为假的分支；不代表排除其他分支。');
const script=fs.readFileSync('dist/client_script.lua'),leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const expected=new Map(g.recs.filter(r=>r!==icon).map(r=>[r.id,encodeMsg([r.field])]));
writeGil(g,output,{label:'628 persistent home tutorial and case2 above semantics',expectRecs:g.recs.length-1,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script';for(const r of t.recs)if(!expected.get(r.id)?.equals(encodeMsg([r.field])))return 'record '+r.name;return true;}});
const disk=readGil(output);if(disk.recs.some(r=>r.name===icon.name))throw Error('icon remains');
for(const r of disk.recs)if(!changed.has(r.id)&&!before.get(r.id)?.equals(encodeMsg([r.field])))throw Error('unexpected '+r.name);
for(const r of disk.recs)if((r.name==='what.2.4'||r.name?.startsWith('td.l2.'))&&text(r)?.includes('同一列'))throw Error('old same-column copy '+r.name);
const result={records:disk.recs.length,removed:[icon.name],changed:disk.recs.filter(r=>changed.has(r.id)).map(r=>r.name),scriptMatches:findScriptLeaf(disk).buf.equals(script),bytes:fs.statSync(output).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')};
if(report)fs.writeFileSync(report,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
