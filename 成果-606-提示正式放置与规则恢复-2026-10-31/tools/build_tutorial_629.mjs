import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,stateBlocks,pairOf,setPair,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,report]=process.argv.slice(2);
if(!input||!output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),script=Buffer.from(findScriptLeaf(g).buf),changed=new Set(),wanted=new Map();
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
const R=n=>{const r=by.get(n);if(!r)throw Error(n);return r;};
function txt(n,t){const r=R(n),f=ns(r.field,[505,503,75,510,501])[0];if(!f)throw Error('text '+n);f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id);wanted.set(n,t);}
function num(p,k,v){let f=p.sub.find(q=>q.field===k&&q.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v);}
function line(n,t,y,size=16,color=0xFFD3CCBD,x=-352,w=660){txt(n,t);const r=R(n);for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,36);}const p=ns(r.field,[505,503,75])[0];for(const[k,v]of [[502,0],[512,size],[513,size],[504,color],[508,0],[509,1]])num(p,k,v);if([...t].reduce((a,c)=>a+(/[\x00-\x7f]/.test(c)?size*.6:size),0)>w-24)throw Error('width '+n);}
function clearBody(p){for(const r of g.recs)if(r.name?.startsWith(p)&&/^(body\.|rewrite617\.)/.test(r.name.slice(p.length))&&text(r)!==undefined)txt(r.name,'');}
const p2='td.l2.page.2.',p3='td.l2.page.3.',p4='td.l2.page.4.';
clearBody(p2);txt(p2+'heading','只有盗窃者可能说谎');
line(p2+'rewrite617.3','不会提前告知是否存在假话。',76);
line(p2+'rewrite617.2','当且仅当盗窃者没有多余可选位置时他会提供假线索',44,16,0xFFFFCB7A);
line(p2+'rewrite617.1','盗窃者仍有多余可选位置时，他提供真线索。',12);
line(p2+'rewrite617.0','其他人（包括受害者）提供的线索始终为真。',-20);
line(p2+'body.0.0','通用线索始终为真。',-52);
txt(p2+'chipt.0','仅盗窃者');txt(p2+'chipt.1','无余位才说谎');txt(p2+'chipt.2','其余均为真');
line('td.l1.page.7.rule617.0','（注：只有盗窃者可能说谎；当且仅当他没有多余可选位置时提供假线索。）',-262,13,0xFFD3CCBD,-342,680);
clearBody(p3);txt(p3+'heading','抓谎：结合身份与可选位置判断');
line(p3+'rewrite617.3','① 先用通用线索和棋盘规则排除不合法位置。',68);
line(p3+'rewrite617.2','② 若某条线索为假，其提供者必须是盗窃者。',28);
line(p3+'rewrite617.1','③ 还需检查：该盗窃者是否没有多余可选位置。',-12);
line(p3+'rewrite617.0','其他人的线索必须为真，不能只按假话条数筛选。',-52);
line(p3+'notet','下一页演示卡 4 为假的分支，并检查说谎条件。',-94,16,0xFFD3CCBD,-327,640);
line(p3+'cluesay.0','随行记者在夜班门卫的上方（不要求同列）。',-220,16,0xFFD3CCBD,-314,630);
clearBody(p4);txt(p4+'heading','推导示例：假设 D 提供假线索');
line(p4+'rewrite617.1','① 假设卡 4 为假，则提供者 D 必须是盗窃者。',68);
line(p4+'rewrite617.0','其余线索为真：书架旁排除地毯和植物旁，',38);
line(p4+'body.0.0','得 A=(5,2)；此分支剩余约束得 E=(6,3)。',8);
line(p4+'body.x7','② E 在 A 下方，卡 4 为假；上方不要求同列。',-22);
line(p4+'body.x6','还需核验 D 无多余可选位置，才能确认该分支。',-52);
txt(p4+'chipt.0','D 假话分支');txt(p4+'chipt.1','仅盗窃者说谎');txt(p4+'chipt.2','核验可选位置');
line(p4+'cluesay.0','随行记者在夜班门卫的上方（不要求同列）。',-240,16,0xFFD3CCBD,-314,630);
const expected=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])]));
writeGil(g,output,{label:'629 thief-only lie rule tutorial text',expectRecs:g.recs.length,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script changed';return true;}});
const disk=readGil(output);for(const r of disk.recs){if(!expected.get(r.id)?.equals(encodeMsg([r.field])))throw Error('record mismatch '+r.name);if(!changed.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))throw Error('non-target '+r.name);if(wanted.has(r.name)&&text(r)!==wanted.get(r.name))throw Error('text '+r.name);if(text(r)&&/任何人提供的线索|受害者提供的线索也不例外|无人有多个可选位置|要求两人同列|都可能是假话/.test(text(r)))throw Error('obsolete '+r.name);}
if(!findScriptLeaf(disk).buf.equals(script))throw Error('disk script');
const result={records:disk.recs.length,changed:disk.recs.filter(r=>!before.get(r.id).equals(encodeMsg([r.field]))).map(r=>r.name),scriptUnchanged:true,textChecks:wanted.size,bytes:fs.statSync(output).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')};if(report)fs.writeFileSync(report,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
