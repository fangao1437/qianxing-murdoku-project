// 607 -> 608: home rule-1 copy, three result popups (perfect / success / fail) text controls, "play again" label.
// Usage: node tools/build_settlement_608.mjs <607.gil> <608.gil>
import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,bigIds,textsOf,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output||input===output||fs.existsSync(output))throw Error('missing arguments or existing output');
const g=readGil(input),script=fs.readFileSync('dist/client_script.lua');
const original=new Map(g.recs.map(r=>[r.id,Buffer.from(encodeMsg([r.field]))]));
const by=new Map(g.recs.map(r=>[r.name,r]));
const R=n=>{if(!by.has(n))throw Error(n);return by.get(n);};
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const prop=r=>nodes(r.field,[505,503,75])[0];
const textNode=r=>nodes(r.field,[505,503,75,510,501])[0];
const text=r=>textNode(r)?.payload?.toString('utf8');
function txt(r,v){const f=textNode(r);if(!f)throw Error('not text '+r.name);f.payload=Buffer.from(v);f.len=f.payload.length;}
function number(p,k,v){let f=p.sub.find(x=>x.field===k&&x.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v>>>0);}
function font(r,size,color,align){number(prop(r),512,size);number(prop(r),504,color);if(align!=null)number(prop(r),508,align);}
function geo(r){const s=stateBlocks(r.field.sub,[])[0];return [pairValue(pairOf(s,504),0),pairValue(pairOf(s,504),1),pairValue(pairOf(s,505),0),pairValue(pairOf(s,505),1)];}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);}}
let max=BigInt(g.maxId);const added=[];
function holder(id){const stack=[g.tree];while(stack.length){const a=stack.pop();for(let i=0;i<a.length;i++){const f=a[i];if(!f.sub)continue;if(bigIds(f.sub,[])[0]?.num===BigInt(id))return {a,i};stack.push(f.sub);}}throw Error('holder');}
function clone(proto,parent,name,x,y,w,h){const f=cloneField(proto.field),id=Number(++max);function walk(a,depth=0){for(const q of a){if(!(depth===0&&q.field===504)&&q.num===BigInt(proto.id))q.num=BigInt(id);if(q.sub)walk(q.sub,depth+1);}}walk(f.sub);const namef=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);namef.payload=Buffer.from(name);namef.len=namef.payload.length;let pf=f.sub.find(q=>q.field===504&&q.wt===0);if(!pf)f.sub.push(pf={field:504,wt:0});pf.num=BigInt(parent.id);const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);const r={id,name,field:f};place(r,x,y,w,h);const hld=holder(proto.id);hld.a.splice(hld.i+1,0,f);const pc=ensureChildListTop(parent);setChildList(pc,[...asIdList(pc.payload,true),id]);added.push(r);by.set(name,r);return r;}

// ---- home rule 1 ----
const GOLD=0xFFFFCB7A,BODY=0xFFD3CCBD,RED=0xFFFF8A7A;
{
 const pre='td.home.page.1.rule.1.body.';
 const size=13,left=-640.2;
 const lines=[
  {y:97,segs:[[ '2.0','摆对',BODY],['2.1','盗窃者',GOLD],['2.2','就能取得胜利，',BODY]]},
  {y:73,segs:[[ '3.0','全部摆对，就能完美通关。',BODY]]}
 ];
 const report=[];
 for(const ln of lines){let x=left,total=0;for(const [k,t,c] of ln.segs){const r=R(pre+k),a=[...t].length*size,w=Math.ceil(a*1.12+size*1.6);txt(r,t);font(r,size,c,0);place(r,x+w/2,ln.y,w,26);x+=a+1;total+=a;}
  if(total>292)throw Error('home line too wide '+total);report.push(ln.segs.map(s=>s[1]).join('')+' ('+total+'px)');}
 console.log(JSON.stringify(report));
}
// ---- result popup ----
const modal=R('modal'),win1=R('win.1'),mt=R('modal.title');
const [tx,ty,tw,th]=geo(mt),[wx,wy,ww,wh]=geo(win1);
const titles=[['result.title.1','恭喜完美破案',GOLD],['result.title.2','恭喜成功破案',0xFF8FC08A],['result.title.3','破案失败',RED]];
for(const [n,t,c] of titles){const r=clone(win1,modal,n,tx,ty,tw,th);txt(r,t);font(r,34,c,1);}
const msgs=[['result.msg.1','全部当事人的位置均已摆对，完美通关！'],['result.msg.2','盗窃者已被抓获，但仍有位置摆错\n全部摆对，才算完美通关'],['result.msg.3','盗窃者没有找对\n看看红圈的位置，再玩一次吧']];
for(const [n,t] of msgs){const r=clone(win1,modal,n,wx,wy,ww,wh);txt(r,t);font(r,20,BODY,1);}
// ---- button label ----
const homeLabelId=g.recs.find(r=>r.name==='label'&&r.parentId===R('result.home').id).id;
txt(g.recs.find(r=>r.id===homeLabelId),'再玩一次');

const sl=findScriptLeaf(g).field;sl.payload=script;sl.len=script.length;
const rep=writeGil(g,output,{label:'608 three result popups, play again, home copy',expectRecs:g.recs.length+added.length,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';
 if(new Set(t.recs.map(r=>r.id)).size!==t.recs.length)return 'duplicate ids';
 const m=new Map(t.recs.map(r=>[r.name,r]));
 for(const [n,tv] of [...titles.map(a=>[a[0],a[1]]),...msgs])if(text(m.get(n))!==tv)return 'text '+n;
 if(text(t.recs.find(r=>r.id===homeLabelId))!=='再玩一次')return 'home label';
 const ids=new Map(t.recs.map(r=>[r.id,r]));
 for(const [n] of [...titles,...msgs]){const r=m.get(n);if(r.parentId!==modal.id)return 'parent '+n;}
 return true;}});
const changed=rep.g2.recs.filter(r=>original.has(r.id)&&!original.get(r.id).equals(encodeMsg([r.field]))).map(r=>r.name);
console.log(JSON.stringify({records:rep.g2.recs.length,added:added.map(r=>r.name),changed}));
