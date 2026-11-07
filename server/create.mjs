import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { questions } from '../src/questions.mjs';
import { QuizSession } from '../src/quiz.mjs';

export function createApp({ distRoot, buildInfo }) {
  const mime = { '.html':'text/html; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
  return createServer(async (req, res) => {
    res.setHeader('X-App-Version', buildInfo.version);
    res.setHeader('X-App-Commit', buildInfo.commit);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    const json = (status, value) => {
      res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8' });
      res.end(JSON.stringify(value));
    };
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { json(400, { error:'잘못된 URL입니다.' }); return; }
    if (pathname === '/health' || pathname === '/api/version') {
      if (req.method !== 'GET') { json(405, {error:'GET 요청만 지원합니다.'}); return; }
      json(200, {status:'ok', ...buildInfo}); return;
    }
    if (pathname === '/api/grade') {
      if (req.method !== 'POST') { res.setHeader('Allow','POST'); json(405,{error:'POST 요청이 필요합니다.'}); return; }
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) { json(415,{error:'JSON 요청이 필요합니다.'}); return; }
      let body = '';
      try {
        for await (const chunk of req) {
          body += chunk.toString('utf8');
          if (Buffer.byteLength(body) > 16384) { json(413,{error:'요청이 너무 큽니다.'}); return; }
        }
        let payload;
        try { payload = JSON.parse(body); } catch { json(400,{error:'JSON 형식을 확인하세요.'}); return; }
        const answers = payload?.answers;
        if (!Array.isArray(answers) || answers.length !== questions.length || answers.some((a,i) => !Number.isInteger(a) || a < 0 || a >= questions[i].choices.length)) {
          json(422,{error:'다섯 문항의 선택지 번호 0-3을 입력하세요.'}); return;
        }
        const quiz = new QuizSession(questions);
        for (const answer of answers) { quiz.select(answer); quiz.check(); quiz.next(); }
        json(200, {...quiz.result(), version:buildInfo.version, commit:buildInfo.commit});
      } catch { if (!res.headersSent) json(400,{error:'요청을 처리할 수 없습니다.'}); }
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { json(405,{error:'지원하지 않는 요청입니다.'}); return; }
    const path = resolve(distRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
    const prefix = distRoot.endsWith(sep) ? distRoot : distRoot + sep;
    if (!path.startsWith(prefix)) { json(403,{error:'접근할 수 없습니다.'}); return; }
    try {
      const data = await readFile(path);
      res.writeHead(200, {'Content-Type':mime[extname(path)] || 'application/octet-stream'});
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { json(404,{error:'파일을 찾을 수 없습니다.'}); }
  });
}
