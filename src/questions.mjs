export const questions = [
  {
    id: 'length', topic: '리스트 길이',
    question: '이 리스트에는 원소가 몇 개 있을까요?',
    code: 'len([10, 20, 30])',
    choices: ['2', '3', '4', '오류가 발생해요'], answer: 1,
    explanation: 'len()은 리스트의 원소 개수를 반환해요. 10, 20, 30 세 개의 원소가 있으므로 정답은 3이에요.',
  },
  {
    id: 'type', topic: '자료형 변환',
    question: '문자열을 변환하면 어떤 자료형이 될까요?',
    code: 'type(int("12")).__name__',
    choices: ['int', 'str', 'float', 'list'], answer: 0,
    explanation: 'int()는 숫자로 표현된 문자열을 정수로 변환해요. int("12")는 정수 12가 되므로 자료형은 int예요.',
  },
  {
    id: 'condition', topic: '조건식',
    question: '조건에 따라 어떤 문장이 선택될까요?',
    code: '"짝수" if 7 % 2 == 0 else "홀수"',
    choices: ['짝수', 'True', '홀수', 'False'], answer: 2,
    explanation: '7을 2로 나눈 나머지는 1이에요. 조건이 거짓이므로 else 뒤의 값인 "홀수"가 선택돼요.',
  },
  {
    id: 'range', topic: '반복 범위',
    question: 'range()의 끝값도 리스트에 포함될까요?',
    code: 'list(range(1, 4))',
    choices: ['[1, 2, 3, 4]', '[0, 1, 2, 3]', '[1, 2]', '[1, 2, 3]'], answer: 3,
    explanation: 'range(1, 4)는 1부터 시작하고 끝값 4는 포함하지 않아요. 따라서 1, 2, 3을 담은 리스트가 만들어져요.',
  },
  {
    id: 'dictionary', topic: '딕셔너리',
    question: '딕셔너리에 없는 키를 조회하면 어떻게 될까요?',
    code: '{}.get("score", 0)',
    choices: ['None', '0', 'KeyError', '"score"'], answer: 1,
    explanation: 'get()은 키가 없으면 두 번째 인자로 전달한 기본값을 반환해요. 여기서는 기본값 0이 결과예요.',
  },
];
