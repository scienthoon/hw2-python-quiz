import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createApp} from '../server/create.mjs';

let server, url;
before(async () => {
  server = createApp({distRoot:fileURLToPath(new URL('../public/',import.meta.url)),buildInfo:{version:'test-v1',commit:'test-commit'}});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
const grade = body => fetch(url+'/api/grade',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

test('health reports the serving release and static page is available',async () => {
  const r=await fetch(url+'/health'); assert.equal(r.status,200);
  assert.equal((await r.json()).commit,'test-commit');
  assert.equal((await fetch(url+'/')).status,200);
});
test('grade API returns genuine quiz scores and serving version',async () => {
  for(const [answers,score] of [[[1,0,2,3,1],100],[[0,1,0,0,0],0],[[1,0,2,1,2],60]]) {
    const r=await grade({answers}); assert.equal(r.status,200);
    const data=await r.json(); assert.equal(data.score,score); assert.equal(data.version,'test-v1');
  }
});
test('missing, short, and out-of-range answer lists are rejected',async () => {
  for(const payload of [{},{answers:[1]},{answers:[1,0,2,3,9]},{answers:[1,0,2,3,'1']}]) assert.equal((await grade(payload)).status,422);
});
test('malformed JSON is rejected without terminating the server',async () => {
  const r=await fetch(url+'/api/grade',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});
  assert.equal(r.status,400); assert.equal((await fetch(url+'/health')).status,200);
});
test('unsupported methods and content types are rejected',async () => {
  assert.equal((await fetch(url+'/api/grade')).status,405);
  assert.equal((await fetch(url+'/api/grade',{method:'POST',body:'answers'})).status,415);
});
test('large bodies and absent static files are handled clearly',async () => {
  const r=await grade({data:'x'.repeat(17000)}); assert.equal(r.status,413);
  assert.equal((await fetch(url+'/missing-file')).status,404);
});
