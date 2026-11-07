import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
const file=process.argv[2], g=readGil(file); const find=n=>g.recs.find(r=>r.name===n); const collect=(a,out=[])=>{for(const q of a||[]){if(q.payload?.length&&q.payload.length<500){const s=q.payload.toString('utf8');out.push(s)}if(q.sub)collect(q.sub,out)}return out};
for(const n of ['td.home.page.1.furniture617.2','td.l1.page.1.furniture617.1','td.l2.page.1.furniture617.1','td.l1.page.7.rule617.0','td.l1.page.7.rule617.1','td.l2.page.1.rewrite617.0','td.l2.page.1.rewrite617.1','td.l2.page.1.rewrite617.2','td.l2.page.1.rewrite617.3']){const r=find(n);console.log(n,JSON.stringify(collect(r?.field.sub)))}
for(const r of g.recs.filter(r=>/icon620$/.test(r.name||''))){let ids=[];const walk=a=>{for(const q of a||[]){if(q.field===503&&q.wt===0)ids.push(String(q.num));if(q.sub)walk(q.sub)}};walk(r.field.sub);console.log(r.name,'ids',ids.join(','),'parent',r.parentId)}
console.log('counts',g.recs.length,'coordinateControls',g.recs.filter(r=>/^td\.(home|l1|l2)\.page\.\d+\.svg\.\d+$/.test(r.name||'')).length)



