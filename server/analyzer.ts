import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoveryPrompt, validatePatterns, type History } from './patterns.ts';

const string = { type: 'string' };
const patternSchema = {
  type: 'object', additionalProperties: false, required: ['patterns'], properties: {patterns: {
    type:'array', items: {type:'object', additionalProperties:false,
      required:['title','category','description','outcome','input','output','workflow','signals','evidence'],
      properties:{title:string,category:string,description:string,outcome:string,input:string,output:string,
        workflow:{type:'string',enum:['clash-coordination','other']},signals:{type:'array',items:string},
        evidence:{type:'array',items:{type:'object',additionalProperties:false,required:['sessionId','turn','quote'],properties:{sessionId:string,turn:{type:'integer'},quote:string}}},
      },
    },
  }},
};
export async function analyzeHistory(history: History) {
  const dir = await mkdtemp(join(tmpdir(), 'appstract-analysis-'));
  const schemaPath=join(dir,'schema.json'), outputPath=join(dir,'result.json');
  await writeFile(schemaPath,JSON.stringify(patternSchema));
  try {
    const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only',
      '--disable','shell_tool','--disable','apps','--disable','multi_agent','-c','web_search="disabled"',
      '-c','model_reasoning_effort="low"','--cd',dir,'--output-schema',schemaPath,'--output-last-message',outputPath,'--json','-'];
    if(process.env.APPSTRACT_ANALYSIS_MODEL) args.splice(1,0,'--model',process.env.APPSTRACT_ANALYSIS_MODEL);
    await new Promise<void>((resolve,reject)=>{
      const child=spawn(process.env.APPSTRACT_CODEX_BIN || 'codex',args,{stdio:['pipe','ignore','pipe'],env:{...process.env,OPENAI_API_KEY:undefined}});
      let errorTail='';
      child.stderr.on('data',chunk=>{errorTail=(errorTail+chunk).slice(-4000);});
      const timer=setTimeout(()=>child.kill('SIGTERM'),600000);
      child.on('error',()=>{clearTimeout(timer);reject(new Error('Appstract could not start the local Codex analyzer.'));});
      child.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Error(`Appstract analysis failed (${code ?? 'timeout'}). ${/usage limit|quota/i.test(errorTail)?'The model usage limit was reached.':'Check the local Codex login and model availability.'}`));});
      child.stdin.on('error',()=>{});
      child.stdin.end(discoveryPrompt(history));
    });
    const patterns=validatePatterns(await readFile(outputPath,'utf8'),history);
    return patterns;
  } finally { await rm(dir,{recursive:true,force:true}); }
}
