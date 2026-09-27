import type { History } from './patterns.ts';

export const QM_IMPORT_PREFIX = 'appstract-synthetic:v1:';
export function qmPortalOrigin(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('QM input must use the local test portal origin.');
  return url.origin;
}
export async function loadQmHistories(origin: string, transport: typeof fetch = fetch): Promise<History[]> {
  origin = qmPortalOrigin(origin);
  async function get(path: string): Promise<any> {
    const response = await transport(`${origin}${path}`, {signal: AbortSignal.timeout(15000), redirect:'error'});
    if (!response.ok) throw new Error(`QM history read failed (HTTP ${response.status}).`);
    return response.json();
  }
  const list = await get('/api/sessions');
  if (!Array.isArray(list.sessions)) throw new Error('QM returned an invalid session list.');
  const sessions = list.sessions.filter((s: any) => typeof s.threadRef === 'string' && s.threadRef.startsWith(QM_IMPORT_PREFIX));
  if (!sessions.length || sessions.length > 500) throw new Error('QM has no imported synthetic histories, or exceeds the import limit.');
  const histories = new Map<string, History>();
  for (const session of sessions) {
    const parts = session.threadRef.slice(QM_IMPORT_PREFIX.length).split(':');
    if (parts.length !== 2 || !parts.every((part: string) => /^[a-zA-Z0-9_-]+$/.test(part))) throw new Error('QM import has an invalid source identifier.');
    const [sourceId, originalId] = parts;
    const entries: any[] = [];
    let beforeSeq: number | undefined;
    for (let page = 0; ; page++) {
      if (page >= 50) throw new Error('QM transcript exceeded the page limit.');
      const value = await get(`/api/sessions/${encodeURIComponent(session.id)}?tailTurns=20${beforeSeq === undefined ? '' : `&beforeSeq=${beforeSeq}`}`);
      if (value.session?.id !== session.id || !Array.isArray(value.entries)) throw new Error('QM returned an invalid transcript.');
      entries.unshift(...value.entries);
      if (!value.earlierEntries) break;
      const firstSeq = Math.min(...value.entries.map((e: any) => e.seq));
      if (!Number.isSafeInteger(firstSeq) || firstSeq < 0 || (beforeSeq !== undefined && firstSeq >= beforeSeq)) throw new Error('QM transcript pagination stalled.');
      beforeSeq = firstSeq;
    }
    const turns: History['sessions'][number]['turns'] = [];
    let first: any;
    for (const entry of entries) {
      if (!['user', 'assistant'].includes(entry.type) || entry.payload?.hidden) continue;
      const meta = entry.payload?.appstract;
      // Restrict demo imports to the explicitly seeded corpus; never ingest hidden prompts/tools or new private chat turns.
      if (!meta) continue;
      if (meta.synthetic !== true || meta.corpus !== 'hra-v1' || meta.persona?.id !== sourceId || meta.sessionId !== originalId || typeof meta.persona.name !== 'string' || !Number.isSafeInteger(meta.turn) || typeof entry.payload.text !== 'string' || typeof meta.at !== 'string') throw new Error('QM synthetic source metadata is invalid.');
      first ||= meta;
      turns.push({ n: meta.turn, role: entry.type, content: entry.payload.text, at: meta.at });
    }
    if (!first || !turns.length || new Set(turns.map(t=>t.n)).size !== turns.length) throw new Error('QM source has missing or duplicate turns.');
    turns.sort((a,b)=>a.n-b.n);
    let history = histories.get(sourceId);
    if (!history) { history = { persona: first.persona, sessions: [] }; histories.set(sourceId, history); }
    if (history.sessions.some(s=>s.id === originalId)) throw new Error('QM source has duplicate sessions.');
    history.sessions.push({ id: originalId, title: first.sessionTitle, started_at: first.sessionStartedAt, qmSessionId: session.id, turns });
  }
  return [...histories.values()].map(h=>({...h,sessions:h.sessions.sort((a,b)=>a.started_at.localeCompare(b.started_at) || a.id.localeCompare(b.id))})).sort((a,b)=>a.persona.id.localeCompare(b.persona.id));
}
