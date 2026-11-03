import test from 'node:test';
import assert from 'node:assert/strict';
import { QuizSession } from '../src/quiz.mjs';
import { questions } from '../src/questions.mjs';

function finish(answers) {
  const quiz = new QuizSession(questions);
  for (const answer of answers) { quiz.select(answer); quiz.check(); quiz.next(); }
  return quiz.result();
}

test('five correct answers score 100', () => {
  const result = finish([1, 0, 2, 3, 1]);
  assert.equal(result.score, 100);
  assert.equal(result.correct, 5);
  assert.ok(result.items.every(item => item.correct));
});
test('three correct answers score 60 and identify the two wrong topics', () => {
  const result = finish([1, 0, 2, 1, 2]);
  assert.equal(result.score, 60);
  assert.deepEqual(result.items.filter(item => !item.correct).map(item => item.id), ['range', 'dictionary']);
});
test('all incorrect answers score zero', () => {
  assert.equal(finish([0, 1, 0, 0, 0]).score, 0);
});
test('unanswered or unchecked questions cannot be skipped or scored', () => {
  const quiz = new QuizSession(questions);
  assert.throws(() => quiz.check(), /選|선택/);
  assert.throws(() => quiz.next(), /먼저/);
  assert.throws(() => quiz.result(), /완료/);
  quiz.select(1);
  assert.throws(() => quiz.next(), /먼저/);
  assert.equal(quiz.completedCount, 0);
});
test('invalid selections leave the question unanswered', () => {
  const quiz = new QuizSession(questions);
  for (const value of [-1, 4, 1.5, null, '1', NaN]) assert.throws(() => quiz.select(value));
  assert.equal(quiz.selected, null);
  assert.equal(quiz.completedCount, 0);
});
test('grading locks an answer and duplicate grading cannot change a score', () => {
  const quiz = new QuizSession(questions);
  quiz.select(1); quiz.check();
  assert.throws(() => quiz.check());
  assert.throws(() => quiz.select(0));
  assert.equal(quiz.correctCount, 1);
  assert.equal(quiz.completedCount, 1);
});
test('changing an ungraded selection uses only the final choice', () => {
  const quiz = new QuizSession(questions);
  quiz.select(0); quiz.select(1); quiz.check();
  assert.equal(quiz.correctCount, 1);
});
test('restart clears previous responses and restores the first question', () => {
  const quiz = new QuizSession(questions);
  for (const answer of [1, 0, 2, 3, 1]) { quiz.select(answer); quiz.check(); quiz.next(); }
  assert.equal(quiz.result().score, 100);
  quiz.restart();
  assert.equal(quiz.index, 0);
  assert.equal(quiz.complete, false);
  assert.equal(quiz.completedCount, 0);
  assert.equal(quiz.correctCount, 0);
  assert.equal(quiz.selected, null);
});
