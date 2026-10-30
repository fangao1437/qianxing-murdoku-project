import fs from 'node:fs';
import {readGil,findChildListTop,asIdList} from './gilread.mjs';
import {writeGil,findScriptLeaf} from './gilwrite.mjs';
const [input,output,scriptPath]=process.argv.slice(2);
if(!input||!output||!scriptPath||input===output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),script=fs.readFileSync(scriptPath);
if(!script.includes(Buffer.from('function Adapter:_fixed_floor_face')))throw Error('missing 603 fix');
const leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const rep=writeGil(g,output,{label:'603 reuse fixed floor on every initialization path',expectRecs:g.recs.length,expectDiffs:1,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';
 const map=new Map(t.recs.map(r=>[r.id,r]));if(map.size!==t.recs.length)return 'duplicate IDs';
 const stage=t.recs.find(r=>r.name==='stage');
 const names=asIdList(findChildListTop(stage.field.sub).payload,true).map(id=>map.get(id)?.name);
 if(JSON.stringify(names)!==JSON.stringify(['board.bg','board.floors','board.rugs']))return 'stage order';
 for(const id of [1073741888,1073741886]){const r=map.get(id);if(asIdList(findChildListTop(r.field.sub).payload,true).some(id=>map.get(id)?.name==='face'))return 'cell floor covers rugs';}
 return true;
}});
console.log('603 verified records='+rep.g2.recs.length+'; only script changed; static floor/rug order preserved');
