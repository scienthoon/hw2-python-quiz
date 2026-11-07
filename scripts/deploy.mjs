import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile,rename,rm,appendFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gradeRequest,sleep,summarize} from './probe.mjs';

const exec=promisify(execFile);
const args=process.argv.slice(2);
const option=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined;};
const image=option('--image'), commit=option('--commit');
if(!image||!commit||!/^[-a-zA-Z0-9._:/@]+$/.test(image)||!/^[-a-zA-Z0-9._:]+$/.test(commit))throw new Error('Provide --image and --commit with a valid image reference and commit.');
const prefix=process.env.HW3_PROJECT||'hw3-quiz';
if(!/^[a-z][a-z0-9-]{2,40}$/.test(prefix))throw new Error('Invalid project prefix');
const root=resolve(process.env.HW3_DEPLOY_ROOT||fileURLToPath(new URL('../../runtime/',import.meta.url)));
const port=Number(process.env.HW3_PORT||18080);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid local port');
const base=`http://127.0.0.1:${port}`;
const proxy=prefix+'-proxy', network=prefix+'-net', configVolume=prefix+'-nginx-config', label='io.hw3.project='+prefix;
const statePath=join(root,'state.json'), confDir=join(root,'nginx'), confPath=join(confDir,'default.conf');
const docker=async args=>{const r=await exec('docker',args,{timeout:180000,maxBuffer:8*1024*1024});return r.stdout.trim();};
const inspect=async(kind,name)=>{try{return JSON.parse(await docker([kind,'inspect',name]))[0];}catch{return null;}};
const owned=value=>value?.Config?.Labels?.['io.hw3.project']===prefix||value?.Labels?.['io.hw3.project']===prefix;
async function removeOwned(name){const c=await inspect('container',name);if(c){if(!owned(c))throw new Error('Refusing to remove an unrelated container');await docker(['rm','-f',name]);}}
async function atomic(path,value){const temp=path+'.next';await writeFile(temp,value);await rename(temp,path);}
const config=name=>`server {\n  listen 8080;\n  location / {\n    proxy_pass http://${name}:8080;\n    proxy_http_version 1.1;\n    proxy_set_header Connection "";\n    proxy_connect_timeout 2s;\n    proxy_read_timeout 5s;\n  }\n}\n`;
await mkdir(root,{recursive:true});
await mkdir(join(root,'evidence'),{recursive:true});
const lock=join(root,'deploy.lock');
await mkdir(lock).catch(()=>{throw new Error('Another deployment is running; lock: '+lock);});
let prior=null, candidate=null, oldConfig=null, switched=false, monitorTask=null, monitoring=false, phase='before';
const samples=[];
let summary;
try {
  try{prior=JSON.parse(await readFile(statePath,'utf8'));}catch{}
  if(prior?.commit===commit)throw new Error('This commit is already deployed; use a new commit for a transition experiment.');
  const existingProxy=await inspect('container',proxy);
  if(existingProxy&&!owned(existingProxy))throw new Error('Proxy name belongs to another project');
  if(prior&&!existingProxy)throw new Error('Deployment state exists but its proxy is absent; inspect the saved state before continuing.');
  if(!prior&&existingProxy)throw new Error('An existing proxy has no matching state; refusing to replace it.');
  if(prior){
    const initial=await gradeRequest(base,'before');
    if(!initial.ok||initial.commit!==prior.commit)throw new Error('Existing service does not match saved state.');
    samples.push(initial);
    monitoring=true;
    monitorTask=(async()=>{while(monitoring){samples.push(await gradeRequest(base,phase));await sleep(80);}})();
    await sleep(2000);
  }
  phase='during';
  if(!args.includes('--no-pull'))await docker(['pull',image]);
  const networkInfo=await inspect('network',network);
  if(networkInfo&&!owned(networkInfo))throw new Error('Network name belongs to another project');
  if(!networkInfo)await docker(['network','create','--label',label,network]);
  const slot=prior?.slot==='blue'?'green':'blue';
  candidate=`${prefix}-${slot}-${commit.replace(/[^a-zA-Z0-9]/g,'').slice(0,12)}`;
  await removeOwned(candidate);
  await docker(['run','-d','--name',candidate,'--label',label,'--network',network,'--restart','unless-stopped','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--cap-drop','ALL','--security-opt','no-new-privileges:true',image]);
  let healthy=false;
  for(let i=0;i<45;i++){
    const c=await inspect('container',candidate);
    if(c?.State?.Health?.Status==='healthy'){healthy=true;break;}
    if(c?.State?.Status==='exited')break;
    await sleep(1000);
  }
  if(!healthy)throw new Error('Candidate container failed its health check');
  const release=JSON.parse(await docker(['exec',candidate,'node','-e',"fetch('http://127.0.0.1:8080/api/version').then(r=>r.json()).then(x=>console.log(JSON.stringify(x)))"]));
  if(release.commit!==commit)throw new Error('Candidate image is not the requested commit');
  const readiness=JSON.parse(await docker(['exec',candidate,'node','-e',"fetch('http://127.0.0.1:8080/api/grade',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:[1,0,2,1,2]})}).then(r=>r.json()).then(x=>console.log(JSON.stringify(x)))"]));
  if(readiness.score!==60||readiness.commit!==commit)throw new Error('Candidate grading API failed readiness');
  await mkdir(confDir,{recursive:true});
  try{oldConfig=await readFile(confPath,'utf8');}catch{}
  await atomic(confPath,config(candidate));
  if(!existingProxy){
    const volume=await inspect('volume',configVolume);
    if(volume&&!owned(volume))throw new Error('Configuration volume belongs to another project');
    if(!volume)await docker(['volume','create','--label',label,configVolume]);
    await docker(['run','-d','--name',proxy,'--label',label,'--network',network,'--restart','unless-stopped','--read-only','--tmpfs','/var/cache/nginx','--tmpfs','/var/run','--tmpfs','/tmp','-p',`127.0.0.1:${port}:8080`,'-v',`${configVolume}:/etc/nginx/conf.d`,'nginx:stable-alpine']);
  }
  await docker(['cp',confPath,`${proxy}:/etc/nginx/conf.d/default.conf`]);
  await docker(['exec',proxy,'nginx','-t']);
  await docker(['exec',proxy,'nginx','-s','reload']);
  switched=true;
  let actual;
  for(let i=0;i<50;i++){actual=await gradeRequest(base,'after');if(actual.ok&&actual.commit===commit)break;await sleep(100);}
  if(!actual?.ok||actual.commit!==commit)throw new Error('The service did not switch to the requested commit');
  const next={slot,image,commit,version:release.version,container:candidate,previous:prior?.container||null,updatedAt:new Date().toISOString()};
  await atomic(statePath,JSON.stringify(next,null,2)+'\n');
  phase='after';
  if(prior){await sleep(3000);monitoring=false;await monitorTask;}
  else{for(let i=0;i<15;i++){samples.push(await gradeRequest(base,'after'));await sleep(80);}}
  summary=summarize(samples,{kind:prior?'blue-green':'initial-deployment',image,oldVersion:prior?.version||null,newVersion:release.version,oldCommit:prior?.commit||null,newCommit:commit,switched:true,baseUrl:base});
  summary.passed=summary.failures===0&&summary.commits.includes(commit)&&(!prior||summary.commits.includes(prior.commit));
  if(!summary.passed)throw new Error('Availability verification failed; restoring the previous release');
  if(prior?.previous&&prior.previous!==prior.container&&prior.previous!==candidate)await removeOwned(prior.previous);
}catch(error){
  monitoring=false;if(monitorTask)await monitorTask;
  if(prior&&oldConfig){
    await atomic(confPath,oldConfig);
    if(switched){await docker(['cp',confPath,`${proxy}:/etc/nginx/conf.d/default.conf`]);await docker(['exec',proxy,'nginx','-s','reload']);}
    await atomic(statePath,JSON.stringify(prior,null,2)+'\n');
  }
  if(!prior){await removeOwned(proxy);}
  if(candidate&&!switched)await removeOwned(candidate);
  summary=summarize(samples,{kind:prior?'blue-green':'initial-deployment',passed:false,error:error.message,newCommit:commit,rollback:!!(prior&&switched)});
  process.exitCode=1;
}finally{
  const result={...summary,samples};
  await writeFile(join(root,'evidence',commit+'.json'),JSON.stringify(result,null,2)+'\n');
  const s=summary;
  let md=`## Docker deployment verification\n\nResult: **${s.passed?'PASS':'FAIL'}**\n\nType: ${s.kind}\n\n`;
  if(s.oldVersion)md+=`Release transition: **${s.oldVersion} → ${s.newVersion}**\n\n`;
  md+='| Phase | Requests | Success | Failure |\n| --- | ---: | ---: | ---: |\n';
  for(const [name,stats] of Object.entries(s.phases))md+=`| ${name} | ${stats.requests} | ${stats.successes} | ${stats.failures} |\n`;
  md+=`| **Total** | **${s.requests}** | **${s.successes}** | **${s.failures}** |\n\nObserved commits: ${(s.commits||[]).join(', ')}\n\n`;
  md+=s.kind==='initial-deployment'?'Initial deployment only; this run does not establish uninterrupted redeployment.\n':'Each sample was a real POST /api/grade request checked for HTTP 200 and a correct score of 60. Zero failures describes this measured request sample only.\n';
  if(s.error)md+=`\nFailure: ${s.error}\n`;
  await writeFile(join(root,'evidence',commit+'.md'),md);
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,md);
  await rm(lock,{recursive:true,force:true});
  console.log(JSON.stringify(summary,null,2));
}
