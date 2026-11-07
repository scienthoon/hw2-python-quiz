import http from 'node:http';
import https from 'node:https';

export const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));

export function gradeRequest(base, phase='check') {
  const target=new URL('/api/grade',base);
  const transport=target.protocol==='https:'?https:http;
  const start=performance.now();
  const payload=JSON.stringify({answers:[1,0,2,1,2]});
  return new Promise(resolve => {
    let finished=false;
    const done=result=>{if(!finished){finished=true;resolve({phase,at:new Date().toISOString(),milliseconds:Math.round((performance.now()-start)*100)/100,...result});}};
    const req=transport.request(target,{method:'POST',agent:false,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)},timeout:1500},res=>{
      let body='';
      res.on('data',chunk=>{body+=chunk;});
      res.on('end',()=>{
        try {
          const data=JSON.parse(body);
          done({ok:res.statusCode===200&&data.score===60,status:res.statusCode,score:data.score,version:data.version,commit:data.commit});
        } catch {done({ok:false,status:res.statusCode,error:'Invalid grading response'});}
      });
      res.on('error',error=>done({ok:false,error:error.code||error.message}));
    });
    req.on('timeout',()=>req.destroy(new Error('Request timeout')));
    req.on('error',error=>done({ok:false,error:error.code||error.message}));
    req.end(payload);
  });
}

export function summarize(samples, extra={}) {
  const phases={};
  for(const phase of ['before','during','after']) {
    const subset=samples.filter(sample=>sample.phase===phase);
    phases[phase]={requests:subset.length,successes:subset.filter(sample=>sample.ok).length,failures:subset.filter(sample=>!sample.ok).length};
  }
  return { ...extra, requests:samples.length,successes:samples.filter(s=>s.ok).length,failures:samples.filter(s=>!s.ok).length,
    phases, versions:[...new Set(samples.filter(s=>s.ok).map(s=>s.version))],commits:[...new Set(samples.filter(s=>s.ok).map(s=>s.commit))] };
}
