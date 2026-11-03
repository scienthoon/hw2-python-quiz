# Python 한입 퀴즈

다섯 문제로 파이썬 기초 개념을 복습하는 웹서비스입니다. 문항별 채점과 해설, 최종 점수, 오답 복습을 제공합니다.

- 서비스 주소: https://scienthoon.github.io/hw2-python-quiz/
- 소스 코드: https://github.com/scienthoon/hw2-python-quiz
- 자동 배포 기록: https://github.com/scienthoon/hw2-python-quiz/actions

## 로컬 실행

Node.js 20 이상에서 실행합니다. 외부 라이브러리나 모델, API 키를 설치하거나 준비할 필요가 없습니다.

```sh
npm run dev
```

터미널에 표시된 `http://127.0.0.1:4173`을 브라우저에서 엽니다. 종료는 Ctrl+C입니다.

```sh
npm test
npm run build
```

`npm test`는 채점, 입력 검증, 중복 채점 방지, 재시작 동작을 검사합니다. 빌드는 배포할 파일만 `dist/`로 복사하고 버전, 커밋, 빌드 시각을 `dist/build-info.json`에 기록합니다.

## GitHub에서 자동 배포

1. 저장소 Settings → Pages → Build and deployment의 Source를 **GitHub Actions**로 설정합니다.
2. `main` 브랜치에 코드를 push합니다.
3. Actions가 자동 테스트를 수행합니다. 테스트가 성공하면 정적 사이트를 빌드하고 GitHub Pages에 배포합니다.
4. 서비스의 오른쪽 위 버전과 `build-info.json`의 커밋을 확인합니다.

새 버전을 배포하려면 코드를 수정하고 `package.json`의 버전을 변경한 뒤 commit과 push를 실행합니다. GitHub Actions가 후속 배포를 처리하므로 서버에 수동으로 파일을 복사하지 않습니다. PR에서는 테스트와 빌드만 실행하고 운영 사이트는 배포하지 않습니다.

최초 버전 1.0.0 배포 후, 화면 안내 문구와 버전을 1.0.1로 변경하는 후속 push를 통해 자동 갱신을 검증했습니다. `build-info.json`을 조회하면 현재 제공 중인 소스 커밋을 확인할 수 있습니다.

GitHub Pages가 정적 파일을 제공하는 웹서버를 운영합니다. 별도의 상주 Python API 서버는 사용하지 않습니다. 문제와 채점은 브라우저에서 동작하는 학습용 퀴즈이며, 로그인이나 방문자 답안 수집 기능은 없습니다.

## 구조

```text
public/                 HTML, CSS, favicon
src/questions.mjs       문제, 정답, 해설 데이터
src/quiz.mjs            퀴즈 상태 및 채점
src/app.mjs             브라우저 화면과 상호작용
scripts/build.mjs       배포 파일과 버전 정보 생성
scripts/serve.mjs       로컬 개발용 정적 서버
tests/quiz.test.mjs      동작 검증
.github/workflows/      테스트 및 자동 배포 설정
```

## 구현과 검증 범위

AI 도구 Codex로 구현했습니다. GitHub의 공식 Pages 워크플로에 따라 테스트와 배포 단계를 연결했습니다. 자동 테스트와 브라우저에서의 실제 동작 확인은 각각 따로 수행합니다. 배포 성공 여부는 Actions 실행 결과와 배포 URL에서 확인할 수 있습니다.

참고: [GitHub Pages 사용자 정의 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
