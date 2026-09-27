import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {loadQmHistories} from '../server/qm-input.ts';
import {analyzeHistory} from '../server/analyzer.ts';
import {historyHash} from '../server/discovery-service.ts';
import type {History} from '../server/patterns.ts';

const histories=await loadQmHistories(process.env.QM_PORTAL_URL || 'http://localhost:8129');
console.log(`Read ${histories.length} histories / ${histories.reduce((n,h)=>n+h.sessions.length,0)} sessions from QM API.`);
await mkdir('.context/qm-analysis',{recursive:true});
let previous: History[]=[];
try {previous=JSON.parse(await readFile('.context/qm-analysis-inputs.json','utf8'));} catch {}
for(const history of histories) {
  const path=`.context/qm-analysis/${history.persona.id}.json`;
  const prior=previous.find(h=>h.persona.id===history.persona.id);
  let exists=false;try {await readFile(path);exists=true;}catch{}
  if(exists && prior && historyHash(prior)===historyHash(history)) {console.log(`${history.persona.name}: reusing validated analysis for unchanged QM input`);continue;}
  await rm(path,{force:true});
}
await writeFile('.context/qm-analysis-inputs.json.tmp',JSON.stringify(histories));
await rename('.context/qm-analysis-inputs.json.tmp','.context/qm-analysis-inputs.json');
for(const history of histories){
  const path=`.context/qm-analysis/${history.persona.id}.json`;
  try {await readFile(path);continue;}catch{}
  console.log(`Analyzing ${history.persona.name}...`);
  let patterns;
  for(let attempt=0;attempt<2;attempt++) {
    try {patterns=await analyzeHistory(history);break;}catch(error) {if(attempt===1)throw error;console.log(`Retrying ${history.persona.name}: ${(error as Error).message}`);}
  }
  await writeFile(`${path}.tmp`,JSON.stringify(patterns,null,2));
  await rename(`${path}.tmp`,path);
  console.log(`${history.persona.name}: ${patterns!.length} validated patterns`);
}
console.log('All QM input analyses are ready for the live bridge.');
