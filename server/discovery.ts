import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { createDiscoveryService, DiscoveryError } from './discovery-service.ts';

export function createDiscoveryHandler(root: string, env: Record<string, string | undefined>, token?: string) {
  const service = createDiscoveryService(root, env.QM_PORTAL_URL || 'http://localhost:8129');
  const send = (res: ServerResponse, code: number, value: unknown) => {
    res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(JSON.stringify(value));
  };
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = (req.url || '').split('?')[0];
    if (!path.startsWith('/api/discovery/')) return next();
    try {
      if (token) {
        const supplied = Buffer.from(req.headers.authorization || '');
        const expected = Buffer.from(`Bearer ${token}`);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return send(res, 401, { error: 'Unauthorized.' });
      } else {
        const host = new URL(`http://${req.headers.host || ''}`);
        if (!['localhost', '127.0.0.1', '[::1]'].includes(host.hostname) || (req.headers.origin && new URL(req.headers.origin).host !== host.host) || req.headers['sec-fetch-site'] === 'cross-site') return send(res,403,{error:'Local discovery requires a same-origin loopback request.'});
      }
      let body: unknown;
      if (req.method === 'POST') {
        if (req.headers['content-type']?.split(';')[0] !== 'application/json') return send(res,415,{error:'Expected application/json.'});
        let raw = '';
        for await (const chunk of req) { raw += chunk.toString(); if (Buffer.byteLength(raw) > 4096) return send(res,413,{error:'Request is too large.'}); }
        try { body = JSON.parse(raw); } catch { return send(res,400,{error:'Invalid JSON.'}); }
      }
      const value = await service.dispatch(req.method || '', path, body);
      send(res,200,value);
    } catch (error) {
      if (!res.headersSent) send(res,error instanceof DiscoveryError ? error.code : 503,{error:error instanceof DiscoveryError ? error.message : 'QM histories or validated analysis are unavailable. Check the local bridge.'});
    }
  };
}
export function discoveryPlugin(root: string, env: Record<string,string|undefined>): Plugin {
  const handler = createDiscoveryHandler(root,env);
  return { name:'appstract-qm-input', configureServer(server) { server.middlewares.use((req,res,next) => { void handler(req,res,next); }); }, configurePreviewServer(server) { server.middlewares.use((req,res,next) => { void handler(req,res,next); }); } };
}
