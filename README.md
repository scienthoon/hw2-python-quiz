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

1.0.2에서는 배포된 HTML의 CSS 및 JavaScript URL과 모듈 간 import URL에도 버전을 붙입니다. 이전 파일이 브라우저에 캐시되어 있더라도 새 버전에서는 새 파일을 요청하도록 했습니다.

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

## HW3 Docker 기반 CI/CD

정적 웹 화면을 유지하면서 Docker 컨테이너에 Node.js 웹서버와 실제 퀴즈 채점 API를 추가했습니다.

```sh
docker build --build-arg COMMIT_SHA=local -t hw3-python-quiz:local .
docker run --rm -p 127.0.0.1:18081:8080 hw3-python-quiz:local
```

브라우저에서 `http://127.0.0.1:18081`을 엽니다. `GET /health`와 `GET /api/version`은 실행 중인 버전과 커밋을 반환합니다. `POST /api/grade`는 `{"answers":[1,0,2,1,2]}`를 받아 60점을 반환합니다. 선택지 번호는 0부터 시작합니다.

### 자동화 연결

GitHub 저장소의 Actions secrets에 `DOCKERHUB_USERNAME`과 `DOCKERHUB_TOKEN`을 등록합니다. 토큰은 Docker Hub 읽기와 쓰기 권한을 가진 과제 전용 토큰을 사용하고, 코드나 커밋에 넣지 않습니다. Docker Hub의 이미지 저장소 이름은 `hw3-python-quiz`입니다.

로컬 Mac ARM64 러너에는 `hw3-quiz` 라벨을 사용합니다. 러너를 연결하는 것은 GitHub 워크플로 코드가 해당 컴퓨터에서 실행되도록 허용하는 작업입니다. 공개 저장소에 연결할 때는 신뢰하지 않는 변경을 실행하지 않도록 주의해야 합니다. 이 배포 워크플로는 main push만 처리하며 PR 이벤트로 로컬 배포를 실행하지 않습니다. 러너는 검증할 때 직접 실행하고, OS 로그인 시 자동 시작하는 서비스로 설치하지 않습니다.

`docker-cicd.yml`은 컨테이너 내부의 14개 테스트, 실행 후 실제 채점 API 확인, AMD64/ARM64 이미지 빌드 및 Docker Hub 업로드를 수행합니다. 이어서 self-hosted Mac 러너가 해당 커밋 태그의 이미지를 내려받아 배포합니다. 기존 GitHub Pages 워크플로는 유지합니다.

### Blue-green 배포와 검증

```sh
node scripts/deploy.mjs --image "$DOCKERHUB_USERNAME/hw3-python-quiz:COMMIT_SHA" --commit COMMIT_SHA
```

새 컨테이너의 health와 실제 채점 API가 통과한 뒤 NGINX 설정을 검사하고 graceful reload로 연결을 바꿉니다. 이전 컨테이너를 즉시 끄지 않아 전환 중 처리 중인 요청을 보호합니다. 배포 전·중·후에 실제 `POST /api/grade` 요청을 보내 HTTP 상태와 60점 결과, 버전 및 커밋을 기록합니다. 배포 실패 시 이전 설정으로 되돌리며, 검사된 요청 범위에서만 무중단 여부를 판정합니다.

기본 주소는 `http://127.0.0.1:18080`이며 외부 네트워크에는 포트를 공개하지 않습니다. 상태와 원시 측정값은 `HW3_DEPLOY_ROOT`의 evidence 폴더에 저장합니다. 로컬 미리보기에서는 `HW3_PROJECT`, `HW3_PORT`, `HW3_DEPLOY_ROOT`를 별도로 지정해 다른 컨테이너를 보호할 수 있습니다.

수동 교체 방식의 비교 실험은 별도 포트 18083에서 수행하며, 인위적인 지연 없이 실제 stop/remove/start 구간을 측정합니다.

```sh
node scripts/compare-stop-start.mjs --old OLD_IMAGE --new NEW_IMAGE --output evidence
```

구성 파일이 있다는 것만으로 원격 CI/CD 성공을 뜻하지 않습니다. Docker Hub 인증과 러너 연결 후 실제 Actions 결과 및 측정값을 확인해야 합니다.
