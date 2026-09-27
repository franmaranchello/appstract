import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createDiscoveryHandler } from '../server/discovery.ts';
await mkdir('.context',{recursive:true});
const tokenPath = '.context/qm-bridge-token';
let token: string;
try { token = (await readFile(tokenPath,'utf8')).trim(); } catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  token = randomBytes(32).toString('hex');
  await writeFile(tokenPath,token,{mode:0o600,flag:'wx'});
}
if (token.length < 32) throw new Error('Bridge token is invalid.');
const handler = createDiscoveryHandler(process.cwd(),process.env,token);
const server = createServer((req,res) => { void handler(req,res,() => { res.writeHead(404); res.end(); }); });
server.requestTimeout = 20_000;
server.listen(5176,'127.0.0.1',() => console.log('QM synthetic input bridge listening on 127.0.0.1:5176'));
