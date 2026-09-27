import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadQmHistories } from './qm-input.ts';
import { validatePatterns, type History } from './patterns.ts';
import type { DiscoveryJob } from '../src/discovery-types.ts';
import type { Pattern } from '../src/data.ts';

export const historyHash = (history: History) => createHash('sha256').update(JSON.stringify(history)).digest('hex');
export class DiscoveryError extends Error {
  constructor(public code: number, message: string) { super(message); }
}
export function createDiscoveryService(root: string, origin: string, loader = loadQmHistories) {
  let cached: { histories: History[]; at: number } | undefined;
  let pending: Promise<History[]> | undefined;
  async function histories() {
    if (cached && Date.now() - cached.at < 5000) return cached.histories;
    pending ||= loader(origin).then(value => { cached = { histories: value, at: Date.now() }; return value; }).finally(() => { pending = undefined; });
    return pending;
  }
  async function patternsFor(history: History) {
    try {
      const path = resolve(root, '.context/qm-analysis', `${history.persona.id}.json`);
      const inputs: History[] = JSON.parse(await readFile(resolve(root, '.context/qm-analysis-inputs.json'), 'utf8'));
      const input = inputs.find(h => h.persona.id === history.persona.id);
      if (!input || historyHash(input) !== historyHash(history)) throw new DiscoveryError(409, 'QM history changed. Refresh the local Appstract analysis before showing results.');
      const patterns: Pattern[] = JSON.parse(await readFile(path, 'utf8'));
      // Recheck every saved quote against the current live QM transcript.
      const verified = validatePatterns(JSON.stringify({ patterns: patterns.map(p => ({ ...p, evidence: p.evidence.map(e => ({ sessionId: e.sessionId, turn: Number(e.id.split('/').at(-1)), quote: e.quote })) })) }), history);
      return { patterns: verified, analyzedAt: (await stat(path)).mtime.toISOString() };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
  async function job(sourceIds: string[], id?: string): Promise<DiscoveryJob> {
    const all = await histories();
    if (!Array.isArray(sourceIds) || !sourceIds.length || sourceIds.length > all.length || new Set(sourceIds).size !== sourceIds.length || sourceIds.some(id => typeof id !== 'string' || !all.some(h => h.persona.id === id))) throw new DiscoveryError(400, 'Choose one or more known, distinct history sources.');
    const selected = all.filter(h => sourceIds.includes(h.persona.id));
    const selection = Buffer.from(JSON.stringify(selected.map(h => h.persona.id))).toString('base64url');
    const fingerprint = createHash('sha256').update(selected.map(historyHash).join(':')).digest('hex').slice(0, 24);
    const jobId = `${selection}.${fingerprint}`;
    if (id && id !== jobId) throw new DiscoveryError(409, 'QM histories changed. Start discovery again.');
    const results = await Promise.all(selected.map(patternsFor));
    const completed = results.filter(r => r !== null);
    return {
      id: jobId, status: completed.length === selected.length ? 'complete' : 'running',
      sourceIds: selected.map(h => h.persona.id), totalSources: selected.length, completedSources: completed.length,
      patterns: completed.flatMap(r => r.patterns).sort((a,b) => b.sessionIds.length - a.sessionIds.length).map((p,i) => ({ ...p, rank: i+1 })),
      runs: [], startedAt: completed.map(r => r.analyzedAt).sort()[0] || new Date().toISOString(),
      source: 'qm', analysisMode: 'saved', readAt: new Date().toISOString(),
      analyzedAt: completed.map(r => r.analyzedAt).sort().at(-1),
    };
  }
  return {
    async dispatch(method: string, path: string, body?: unknown): Promise<unknown> {
      if (path === '/api/discovery/status' && method === 'GET') {
        try {
          const all = await histories();
          return { configured: true, source: 'qm', synthetic: true, sources: all.length, sessions: all.reduce((n,h) => n+h.sessions.length,0), messages: all.reduce((n,h) => n+h.sessions.reduce((m,s) => m+s.turns.length,0),0) };
        } catch { return { configured: false, error: 'The local QM demo bridge is offline or its synthetic histories are unavailable.' }; }
      }
      if (path === '/api/discovery/jobs' && method === 'POST') return job((body as { sourceIds: string[] })?.sourceIds);
      const match = path.match(/^\/api\/discovery\/jobs\/([A-Za-z0-9_-]+\.[a-f0-9]{24})$/);
      if (match && method === 'GET') {
        let sourceIds: string[];
        try { sourceIds = JSON.parse(Buffer.from(match[1].split('.')[0], 'base64url').toString()); } catch { throw new DiscoveryError(400, 'Invalid discovery selection.'); }
        return job(sourceIds, match[1]);
      }
      const historyMatch = path.match(/^\/api\/discovery\/history\/([a-z0-9-]+)$/);
      if (historyMatch && method === 'GET') {
        const found = (await histories()).find(h => h.persona.id === historyMatch[1]);
        if (!found) throw new DiscoveryError(404, 'Unknown synthetic source.');
        return { source: 'qm', synthetic: true, readAt: new Date().toISOString(), ...found };
      }
      throw new DiscoveryError(404, 'Unknown discovery endpoint.');
    },
  };
}
