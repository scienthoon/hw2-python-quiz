const base=process.env.QUIZ_URL || 'http://127.0.0.1:18081';
let ready=false;
for(let i=0;i<60;i++) {
  try { const r=await fetch(base+'/health'); if(r.ok){ready=true;break;} } catch {}
  await new Promise(resolve=>setTimeout(resolve,250));
}
if(!ready)throw new Error('Container did not become ready');
const response=await fetch(base+'/api/grade',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:[1,0,2,1,2]})});
const data=await response.json();
if(response.status!==200 || data.score!==60 || !data.version || !data.commit)throw new Error('Real grading API smoke test failed');
console.log(JSON.stringify({status:'passed',score:data.score,version:data.version,commit:data.commit}));
