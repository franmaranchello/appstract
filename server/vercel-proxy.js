
export default async function handler(req, res) {
  res.setHeader('content-type','application/json');
  res.setHeader('cache-control','no-store');
  res.setHeader('x-content-type-options','nosniff');
  const send = (status, value) => { res.statusCode=status; res.end(JSON.stringify(value)); };
  const path = (req.url || '').split('?')[0];
  const allowed = (req.method === 'GET' && /^\/api\/discovery\/(status|history\/[a-z0-9-]+|jobs\/[A-Za-z0-9_-]+\.[a-f0-9]{24})$/.test(path)) || (req.method === 'POST' && path === '/api/discovery/jobs');
  if (!allowed || path.length > 1024) return send(404,{error:'Unknown discovery endpoint.'});
  const token=process.env.QM_BRIDGE_TOKEN;
  const origin=process.env.QM_BRIDGE_URL;
  if (!token || !origin) return send(503,{error:'The QM demo bridge is not configured.'});
  try {
    const base = new URL(origin);
    if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('Invalid bridge origin');
    let body;
    if (req.method === 'POST') {
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') return send(415,{error:'Expected application/json.'});
      body=typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (!body || Buffer.byteLength(body)>4096) return send(413,{error:'Invalid request size.'});
      try { JSON.parse(body); } catch { return send(400,{error:'Invalid JSON.'}); }
    }
    const upstream=await fetch(`${base.origin}${path}`,{method:req.method, headers:{authorization:`Bearer ${token}`,...(body ? {'content-type':'application/json'} : {})},body,redirect:'error',signal:AbortSignal.timeout(12_000)});
    if (!upstream.headers.get('content-type')?.includes('application/json')) throw new Error('Bridge unavailable');
    const value=await upstream.json();
    if (upstream.status === 401) return send(503,{error:'The QM demo bridge connection needs to be restored.'});
    return send(upstream.status,value);
  } catch { return send(503,{error:'The live QM demo bridge is offline. Keep the demo Mac and tunnel running, then retry.'}); }
}
