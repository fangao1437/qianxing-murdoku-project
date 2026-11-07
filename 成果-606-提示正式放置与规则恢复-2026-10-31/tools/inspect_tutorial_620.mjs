import {readGil,stateBlocks,pairOf,pairValue} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
const [file]=process.argv.slice(2); const g=readGil(file); const text=r=>{const walk=a=>{for(const q of a||[]){if(q.payload?.length&&q.payload.length<500){const s=q.payload.toString('utf8');if(/[\u4e00-\u9fff?]/.test(s))return s}const z=walk(q.sub);if(z)return z}};return walk(r.field.sub)||''};
for(const r of g.recs.filter(r=>/td\.(home|l1|l2)\.page\.(1|3|7|8)|help617|rule617|rewrite617|svg\.[0-9]+$/.test(r.name||''))){const st=stateBlocks(r.field.sub,[])[0];let geo='';if(st)for(const k of [504,505]){const p=pairOf(st,k);if(p)geo+=` ${k}:${pairValue(p,0)},${pairValue(p,1)},${pairValue(p,2)},${pairValue(p,3)}`}let ids=[];const walk=a=>{for(const q of a||[]){if(q.field===503&&q.wt===0)ids.push(String(q.num));if(q.sub)walk(q.sub)}};walk(r.field.sub);console.log(r.name,geo,'TEXT=',JSON.stringify(text(r)),'IMG=',ids.join(','));}



