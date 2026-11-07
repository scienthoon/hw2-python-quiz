import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {gradeRequest,sleep,summarize} from './probe.mjs';

const exec=promisify(execFile);
const args=process.argv.slice(2);
const option=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
const oldImage=option('--old'),newImage=option('--new');
if(!oldImage||!newImage)throw new Error('Provide --old and --new local image tags');
const name='hw3-naive-comparison',port=18083,base=`http://127.0.0.1:${port}`;
const out=resolve(option('--output')||'evidence');
const docker=async args=>(await exec('docker',args,{timeout:60000})).stdout.trim();
try{await docker(['container','inspect',name]);throw new Error('A comparison container already exists; inspect it before continuing.');}catch(error){if(!error.stderr?.includes('No such'))throw error;}
const run=async image=>docker(['run','-d','--name',name,'--label','io.hw3.project=hw3-naive-comparison','-p',`127.0.0.1:${port}:8080`,image]);
const ready=async()=>{for(let i=0;i<50;i++){const sample=await gradeRequest(base);if(sample.ok)return;await sleep(100);}throw new Error('Comparison service not ready');};
let monitoring=false,task,phase='before';const samples=[];
try{
  await run(oldImage);await ready();
  monitoring=true;task=(async()=>{while(monitoring){samples.push(await gradeRequest(base,phase));await sleep(80);}})();
  await sleep(2000);phase='during';
  // No artificial outage is inserted: measure the real stop/remove/start gap.
  await docker(['stop',name]);await docker(['rm',name]);await run(newImage);await ready();
  phase='after';await sleep(3000);monitoring=false;await task;
  const summary=summarize(samples,{kind:'stop-then-start',baseUrl:base,artificialDelay:false});
  await mkdir(out,{recursive:true});
  await writeFile(join(out,'stop-start.json'),JSON.stringify({...summary,samples},null,2)+'\n');
  console.log(JSON.stringify(summary,null,2));
}finally{
  monitoring=false;if(task)await task;
  try{await docker(['rm','-f',name]);}catch{}
}
