import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { loadHistories } from '../server/patterns.ts';

const root = process.cwd();
const qmRoot = resolve(process.env.QM_SOURCE_DIR || '.context/qm-source');
const state = JSON.parse(await readFile(join(process.env.HOME!, '.config/qm/slack-pool/leases/pool1.lock/boot-spec.json'), 'utf8'));
if (state.worktree !== qmRoot || state.callerEnv.DEV_INSTANCE_ORG_ID !== 'appstract-test') throw new Error('Refusing to seed anything except this workspace’s Appstract test instance.');
const actor = state.callerEnv.DEV_INSTANCE_ADMIN_PRINCIPAL;
if (actor !== 'appstract-tester') throw new Error('Unexpected test principal.');
const { ensureLocalPostgres } = await import(pathToFileURL(join(qmRoot, 'scripts/dev/lib/postgres.ts')).href);
const { createPostgresSessionStore } = await import(pathToFileURL(join(qmRoot, 'src/sessions/postgres-session-store.ts')).href);
const { url } = await ensureLocalPostgres(qmRoot, () => {});
const expectedDb = `qm_dev_${createHash('sha1').update(qmRoot).digest('hex').slice(0,12)}`;
if (new URL(url).hostname !== '127.0.0.1' || new URL(url).pathname !== `/${expectedDb}`) throw new Error('Unexpected seed database.');
const store = createPostgresSessionStore(url);
const scope = `personal:${actor}`;
const manifest: any = { schemaVersion: 1, synthetic: true, portalUrl: 'http://localhost:8129', importedAt: new Date().toISOString(), sources: [] };
let inserted = 0;
for (const history of await loadHistories(root)) {
  const source: any = { persona: history.persona, sessions: [] };
  for (const original of history.sessions) {
    const session = await store.getOrCreateByThread(`appstract-synthetic:v1:${history.persona.id}:${original.id}`, 'dm', scope, undefined, 'web');
    await store.addParticipant(session.id, actor, undefined, { includeHistory: true });
    const { lease } = await store.acquireLease(session.id, 'backfill');
    if (!lease) throw new Error(`Session is busy: ${original.id}`);
    try {
      const existing = await store.getEntries(session.id, { limit: 10000 });
      if (existing.length > original.turns.length || existing.some((e: any, i: number) => e.type !== original.turns[i].role || e.payload?.text !== original.turns[i].content || e.payload?.appstract?.turn !== original.turns[i].n)) throw new Error(`Imported session was modified: ${original.id}. Nothing overwritten.`);
      for (const turn of original.turns.slice(existing.length)) {
        await store.append(lease, { type: turn.role, scopeLabel: scope, payload: {
          text: turn.content, ...(turn.role === 'user' ? { author: history.persona.name } : {}),
          appstract: { synthetic: true, corpus: 'hra-v1', persona: history.persona, sessionId: original.id, sessionTitle: original.title, sessionStartedAt: original.started_at, turn: turn.n, at: turn.at },
        }});
        inserted++;
      }
      await store.updateTitle(session.id, `[Synthetic HRA] ${history.persona.name} · ${original.id} · ${original.title}`);
    } finally { await store.releaseLease(lease); }
    source.sessions.push({ originalId: original.id, qmSessionId: session.id, turns: original.turns.length });
  }
  manifest.sources.push(source);
  console.log(`${history.persona.name}: ${source.sessions.length} QM sessions verified`);
}
await writeFile('.context/qm-seed-manifest.json', JSON.stringify(manifest,null,2), {mode:0o600});
console.log(JSON.stringify({ sessions: manifest.sources.reduce((n: number,s: any)=>n+s.sessions.length,0), insertedTurns: inserted, totalTurns: manifest.sources.reduce((n: number,s: any)=>n+s.sessions.reduce((m: number,x: any)=>m+x.turns,0),0) }));
process.exit(0);
