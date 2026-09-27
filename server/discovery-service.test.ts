import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createDiscoveryService} from './discovery-service.ts';
import {validatePatterns,type History} from './patterns.ts';

test('saved results are checked against live input; selection resumes without a process job or model execution', async()=>{
  const root=await mkdtemp(join(tmpdir(),'appstract-test-'));
  const history: History={persona:{id:'clash-detection',name:'Priya'},sessions:[1,2].map(n=>({id:`s${n}`,qmSessionId:`qm${n}`,title:'Coordination',started_at:'2026-01-01',turns:[{n:1,role:'user',content:'Please run the weekly model clash coordination report.',at:'2026-01-01'}]}))};
  const make=()=>createDiscoveryService(root,'http://localhost:8129',async()=>[history]);
  try {
    await mkdir(join(root,'.context/qm-analysis'),{recursive:true});
    await writeFile(join(root,'.context/qm-analysis-inputs.json'),JSON.stringify([history]));
    const service=make();
    const running:any=await service.dispatch('POST','/api/discovery/jobs',{sourceIds:['clash-detection']});assert.equal(running.status,'running');
    const patterns=validatePatterns(JSON.stringify({patterns:[{title:'Clash report',category:'BIM',description:'Repeated coordination',outcome:'Review issues',input:'Model',output:'Report',workflow:'clash-coordination',signals:['Weekly'],evidence:history.sessions.map(s=>({sessionId:s.id,turn:1,quote:s.turns[0].content}))}]}),history);
    await writeFile(join(root,'.context/qm-analysis/clash-detection.json'),JSON.stringify(patterns));
    const complete:any=await make().dispatch('GET',`/api/discovery/jobs/${running.id}`);assert.equal(complete.status,'complete');assert.equal(complete.patterns.length,1);assert.equal(complete.patterns[0].evidence[0].qmSessionId,'qm1');
    await assert.rejects(service.dispatch('POST','/api/discovery/jobs',{sourceIds:['../../private']}),/known/);
    await assert.rejects(service.dispatch('POST','/api/discovery/jobs',{sourceIds:['clash-detection','clash-detection']}),/known/);
    await assert.rejects(service.dispatch('POST','/api/discovery/jobs',{}),/known/);
    history.sessions[0].turns[0].content='Updated history';
    await assert.rejects(make().dispatch('GET',`/api/discovery/jobs/${running.id}`),/changed/);
    await assert.rejects(make().dispatch('POST','/api/discovery/jobs',{sourceIds:['clash-detection']}),/changed/);
  } finally {await rm(root,{recursive:true,force:true});}
});
