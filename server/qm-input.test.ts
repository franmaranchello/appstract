import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadQmHistories, qmPortalOrigin, QM_IMPORT_PREFIX } from './qm-input.ts';

test('QM importer paginates seeded conversations and excludes private, hidden and tool content', async () => {
  const urls: string[] = [];
  const meta = { synthetic:true, corpus:'hra-v1', persona:{id:'clash-detection',name:'Priya'},sessionId:'s1',sessionTitle:'Test',sessionStartedAt:'2026-01-01',at:'2026-01-01' };
  const transport = (async (input: string | URL | Request) => {
    const url=String(input); urls.push(url);
    const value=url.endsWith('/api/sessions') ? {sessions:[{id:'private',threadRef:'other'},{id:'qm1',threadRef:QM_IMPORT_PREFIX+'clash-detection:s1'}]} : url.includes('beforeSeq=3') ? {session:{id:'qm1'},entries:[{seq:1,type:'user',payload:{text:'Original user request',appstract:{...meta,turn:1}}},{seq:2,type:'system',payload:{text:'Hidden system'}}],earlierEntries:0} : {session:{id:'qm1'},entries:[{seq:3,type:'assistant',payload:{text:'Original response',appstract:{...meta,turn:2}}},{seq:4,type:'user',payload:{text:'Private new turn'}},{seq:5,type:'user',payload:{text:'Hidden prompt',hidden:true,appstract:{...meta,turn:3}}}],earlierEntries:2};
    return new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
  }) as typeof fetch;
  const histories=await loadQmHistories('http://localhost:8129',transport);
  assert.equal(histories.length,1);assert.equal(histories[0].sessions[0].qmSessionId,'qm1');
  assert.deepEqual(histories[0].sessions[0].turns.map(t=>t.content),['Original user request','Original response']);
  assert.equal(urls.length,3);assert.ok(!urls.some(u=>u.includes('/private')));
});
test('QM importer rejects remote origins and missing synthetic data', async () => {
  for(const origin of ['https://example.com','http://localhost:8129/admin','http://user:pass@localhost:8129','http://localhost:8129?x=1']) assert.throws(()=>qmPortalOrigin(origin));
  await assert.rejects(loadQmHistories('http://localhost:8129',(async()=>new Response('{"sessions":[]}')) as typeof fetch),/no imported/);
});
