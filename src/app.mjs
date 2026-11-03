import { questions } from './questions.mjs';
import { QuizSession } from './quiz.mjs';

const session = new QuizSession(questions);
const app = document.querySelector('#app');
const alphabet = ['A', 'B', 'C', 'D'];
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function focusHeading() { app.querySelector('h1').focus({ preventScroll: true }); }

function renderQuestion(focus = false) {
  const q = session.current;
  app.innerHTML = `
    <section class="intro">
      <p class="eyebrow">A LITTLE PYTHON, EVERY DAY</p>
      <h1 tabindex="-1">한 문제씩, 파이썬을 익혀요.</h1>
      <p>답을 고르고 해설을 읽으며 기초 개념을 가볍게 복습해 보세요.</p>
    </section>
    <div class="workspace">
      <section class="question-card" aria-labelledby="question-title">
        <div class="question-meta"><span class="question-number">QUESTION ${String(session.index + 1).padStart(2, '0')}</span><span class="topic">${q.topic}</span></div>
        <h2 id="question-title">${q.question}</h2>
        <pre class="code"><span class="code-label">PYTHON</span><code>${escape(q.code)}</code></pre>
        <form id="answer-form">
          <fieldset><legend>정답 하나를 선택하세요</legend><div class="choices">${q.choices.map((choice, i) => `
            <label class="choice" data-choice="${i}"><input type="radio" name="answer" value="${i}"><span class="choice-key" aria-hidden="true">${alphabet[i]}</span><span class="choice-text">${escape(choice)}</span><span class="choice-indicator" aria-hidden="true"></span></label>`).join('')}
          </div></fieldset>
          <div class="answer-actions"><span class="action-hint" id="action-hint">선택 후 정답을 확인해 주세요.</span><button class="primary" id="answer-button" type="submit" disabled>정답 확인 <span aria-hidden="true">→</span></button></div>
        </form>
        <section id="feedback" class="feedback" aria-live="polite" aria-atomic="true" hidden></section>
      </section>
      <aside class="side-panel" aria-label="학습 진행 상황">
        <section class="progress-card"><p class="eyebrow">TODAY'S PROGRESS</p><div class="progress-value"><strong id="completed">${session.completedCount}</strong><span>/ ${questions.length} 문제</span></div>
          <div class="progress-segments" role="progressbar" aria-label="완료한 문제" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${session.completedCount}">${questions.map((_, i) => `<span class="${i < session.completedCount ? 'filled' : ''}"></span>`).join('')}</div>
          <div class="correct-stat"><span>맞힌 문제</span><strong><span id="correct-count">${session.correctCount}</span>개</strong></div>
        </section>
        <section class="note-card"><span class="note-icon" aria-hidden="true">✦</span><h2>틀려도 괜찮아요.</h2><p>정답보다 중요한 건 이유를 아는 것.<br>문제마다 해설이 준비되어 있어요.</p><div class="small-tags"><span>기초 개념</span><span>5문제</span><span>약 3분</span></div></section>
      </aside>
    </div>`;
  app.removeAttribute('aria-busy');
  const form = app.querySelector('#answer-form');
  form.addEventListener('change', event => {
    session.select(Number(event.target.value));
    app.querySelectorAll('.choice').forEach(choice => choice.classList.toggle('selected', Number(choice.dataset.choice) === session.selected));
    app.querySelector('#answer-button').disabled = false;
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!session.graded) checkAnswer();
    else {
      session.next();
      if (session.complete) renderResults();
      else renderQuestion(true);
    }
  });
  if (focus) focusHeading();
}

function checkAnswer() {
  const correct = session.check();
  const q = session.current;
  app.querySelectorAll('.choice').forEach(choice => {
    const index = Number(choice.dataset.choice);
    choice.querySelector('input').disabled = true;
    choice.classList.toggle('right', index === q.answer);
    choice.classList.toggle('wrong', index === session.selected && !correct);
  });
  const feedback = app.querySelector('#feedback');
  feedback.hidden = false;
  feedback.classList.add(correct ? 'success' : 'review');
  feedback.innerHTML = `<strong>${correct ? '정답이에요. 잘했어요!' : `조금 아쉬워요. 정답은 ${alphabet[q.answer]}예요.`}</strong><p>${escape(q.explanation)}</p>`;
  const button = app.querySelector('#answer-button');
  button.innerHTML = `${session.index === questions.length - 1 ? '결과 보기' : '다음 문제'} <span aria-hidden="true">→</span>`;
  app.querySelector('#action-hint').textContent = '해설을 읽고 계속해 보세요.';
  app.querySelector('#completed').textContent = session.completedCount;
  app.querySelector('#correct-count').textContent = session.correctCount;
  const progress = app.querySelector('[role="progressbar"]');
  progress.setAttribute('aria-valuenow', session.completedCount);
  progress.querySelectorAll('span').forEach((segment, i) => segment.classList.toggle('filled', i < session.completedCount));
  button.focus({ preventScroll: true });
}

function renderResults() {
  const result = session.result();
  const wrong = result.total - result.correct;
  app.innerHTML = `
    <section class="intro result-intro"><p class="eyebrow">ONE STEP FORWARD</p><h1 tabindex="-1">오늘의 복습, 완료했어요.</h1><p>맞힌 개념은 자신 있게, 헷갈린 개념은 한 번 더 살펴보세요.</p></section>
    <div class="result-layout">
      <section class="score-card" aria-label="최종 점수"><div class="score-ring" style="--score:${result.score}%"><div><strong>${result.score}<span>점</span></strong><p>100점 만점</p></div></div><h2>${result.score === 100 ? '다섯 개념을 모두 익혔어요!' : '좋아요, 한 걸음 더 나아갔어요.'}</h2><p>정답 <strong>${result.correct}</strong> / ${result.total}문제 · 정답률 ${result.score}%</p><button class="primary restart" id="restart" type="button">다시 풀어보기 <span aria-hidden="true">↻</span></button></section>
      <section class="review-card" aria-labelledby="review-title"><div class="review-header"><h2 id="review-title">문항별 복습</h2><span>${wrong ? `오답 ${wrong}문제` : '모두 정답'}</span></div><p class="review-description">각 문항을 누르면 정답과 해설을 확인할 수 있어요.</p>
        <div class="review-list">${result.items.map((item, i) => `<details class="review-item" ${!item.correct ? 'open' : ''}><summary><span class="review-index">${String(i + 1).padStart(2, '0')}</span><strong>${item.topic}</strong><span class="status ${item.correct ? 'status-right' : 'status-wrong'}">${item.correct ? '정답' : '오답'}</span></summary><div class="review-content"><p class="review-answers">내 선택 ${alphabet[item.selected]} · 정답 ${alphabet[item.answer]} ${escape(item.choices[item.answer])}</p><p>${escape(item.explanation)}</p></div></details>`).join('')}</div>
      </section>
    </div>`;
  app.querySelector('#restart').addEventListener('click', () => { session.restart(); renderQuestion(true); });
  focusHeading();
}

renderQuestion();
fetch('./build-info.json', { cache: 'no-store' }).then(response => {
  if (!response.ok) throw new Error('버전 정보를 읽을 수 없습니다.');
  return response.json();
}).then(info => {
  const version = document.querySelector('#version');
  version.textContent = `v${info.version}`;
  version.title = `버전 ${info.version} · 커밋 ${info.commit.slice(0, 7)}`;
}).catch(() => { /* The quiz remains usable when optional version metadata is unavailable. */ });
