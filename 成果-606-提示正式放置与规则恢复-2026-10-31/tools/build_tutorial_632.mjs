import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,report]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),script=Buffer.from(findScriptLeaf(g).buf),changed=new Set();
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
function txt(r,t){const f=ns(r.field,[505,503,75,510,501])[0];if(!f)throw Error('text '+r.name);f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id);}
const q='td.l2.page.4.rewrite617.';
// 631: rewrite617.3 = line1, .2 = line2, .1 = line3, .0 = line4
const edits={3:['经过推导，所有人的位置都已唯一确定。','易得线索 b、d、e 无法同时成立，故其中必有假线索，'],2:['推理可得，线索 D 为假线索。','进一步推理可以得到假线索是线索 d，'],1:['只有盗窃者可能说谎，因此盗窃者是 D。',null],0:['D 是鉴定师，确认摆位后即可提交并指认。','确认其余摆位后即可提交']};
for(const [i,[old,nw]] of Object.entries(edits)){const r=by.get(q+i);if(!r)throw Error('missing '+i);if(text(r)!==old)throw Error('unexpected old text '+i+': '+text(r));if(nw)txt(r,nw);}
const expected=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])]));
writeGil(g,output,{label:'632 closing reasoning copy',expectRecs:g.recs.length,assert(t){return findScriptLeaf(t).buf.equals(script)||'script changed';}});
const disk=readGil(output);for(const r of disk.recs){if(!expected.get(r.id)?.equals(encodeMsg([r.field])))throw Error('disk mismatch '+r.name);if(!changed.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))throw Error('non-target '+r.name);}
if(!findScriptLeaf(disk).buf.equals(script))throw Error('script changed');
const result={records:disk.recs.length,changed:[...changed].map(id=>{const r=disk.recs.find(x=>x.id===id);return [r.name,text(r)]}),scriptUnchanged:true,bytes:fs.statSync(output).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')};
if(report)fs.writeFileSync(report,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
