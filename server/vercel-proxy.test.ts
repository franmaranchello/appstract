import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Standalone JS avoids the Vercel function compiler requiring Vite's development types.
import handler from './vercel-proxy.js';

test('Vercel proxy sends only its own token, allowlists paths and hides upstream failures',async()=>{
  const original=globalThis.fetch;
  const oldUrl=process.env.QM_BRIDGE_URL,oldToken=process.env.QM_BRIDGE_TOKEN;
  process.env.QM_BRIDGE_URL='https://test.trycloudflare.com';process.env.QM_BRIDGE_TOKEN='test-token';
  let calls=0;
  async function invoke(url: string,method='GET',body?:unknown) {
    let text='';const res={statusCode:0,setHeader(){},end(value:string){text=value;}};
    await handler({url,method,body,headers:{authorization:'Bearer user-secret',cookie:'private','content-type':'application/json'}},res);
    return {status:res.statusCode,value:JSON.parse(text)};
  }
  globalThis.fetch=(async(url:unknown,options:any)=>{calls++;assert.equal(options.headers.authorization,'Bearer test-token');assert.equal(options.headers.cookie,undefined);assert.equal(options.redirect,'error');assert.match(String(url),/^https:\/\/test.trycloudflare.com\/api\/discovery\//);return new Response('{"configured":true}',{headers:{'content-type':'application/json'}});}) as typeof fetch;
  try {
    assert.equal((await invoke('/api/discovery/status')).status,200);
    assert.equal((await invoke('/api/discovery/history/clash-detection')).status,200);
    assert.equal((await invoke('/api/discovery/jobs','POST',{sourceIds:['clash-detection']})).status,200);
    assert.equal((await invoke('/api/discovery/admin')).status,404);
    assert.equal((await invoke('/api/discovery/jobs','POST','x'.repeat(5000))).status,413);
    assert.equal(calls,3);
    globalThis.fetch=(async()=>new Response('private debug details',{status:502})) as typeof fetch;
    const failed=await invoke('/api/discovery/status');assert.equal(failed.status,503);assert.ok(!JSON.stringify(failed.value).includes('private'));
  }finally {globalThis.fetch=original;if(oldUrl===undefined)delete process.env.QM_BRIDGE_URL;else process.env.QM_BRIDGE_URL=oldUrl;if(oldToken===undefined)delete process.env.QM_BRIDGE_TOKEN;else process.env.QM_BRIDGE_TOKEN=oldToken;}
});
