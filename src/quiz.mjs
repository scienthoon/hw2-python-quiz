export class QuizSession {
  constructor(questions) {
    if (!questions.length) throw new Error('문제가 필요합니다.');
    this.questions = questions;
    this.restart();
  }

  get current() { return this.questions[this.index]; }
  get completedCount() { return this.answers.filter(answer => answer !== null).length; }
  get correctCount() {
    return this.answers.filter((answer, i) => answer === this.questions[i].answer).length;
  }

  select(answer) {
    if (this.complete || this.graded) throw new Error('이미 채점한 문항입니다.');
    if (!Number.isInteger(answer) || answer < 0 || answer >= this.current.choices.length) {
      throw new Error('선택지 범위를 확인하세요.');
    }
    this.selected = answer;
  }

  check() {
    if (this.complete || this.graded) throw new Error('이미 채점한 문항입니다.');
    if (this.selected === null) throw new Error('답을 먼저 선택하세요.');
    this.answers[this.index] = this.selected;
    this.graded = true;
    return this.selected === this.current.answer;
  }

  next() {
    if (this.complete || !this.graded) throw new Error('먼저 정답을 확인하세요.');
    if (this.index === this.questions.length - 1) {
      this.complete = true;
    } else {
      this.index += 1;
      this.selected = null;
      this.graded = false;
    }
  }

  result() {
    if (!this.complete) throw new Error('퀴즈를 먼저 완료하세요.');
    return {
      total: this.questions.length,
      correct: this.correctCount,
      score: Math.round(this.correctCount / this.questions.length * 100),
      items: this.questions.map((question, i) => ({
        ...question, selected: this.answers[i], correct: this.answers[i] === question.answer,
      })),
    };
  }

  restart() {
    this.index = 0;
    this.answers = this.questions.map(() => null);
    this.selected = null;
    this.graded = false;
    this.complete = false;
  }
}
