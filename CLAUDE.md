# CLAUDE.md

## 회고

### 2026-04-07 Node+Electron → Deno+Neutralinojs 마이그레이션

#### 삽질했던 부분

**Neutralinojs 리소스 로딩 방식 파악**
- `--load-dir-res` 플래그가 deprecated임에도 시도하느라 시간 낭비
- `resources.neu`가 ZIP 포맷이 아닌 ASAR 유사 커스텀 바이너리 포맷임
- 정답: `--path=<resourcesDir>` 플래그로 appPath를 resources 디렉토리로 설정

**html2canvas의 document clone 시 이미지 URL 오해석**
- iframe에서 `./data.jpg`는 브라우저가 `/html/data.jpg`로 정확히 resolve
- 그러나 html2canvas가 내부적으로 document clone 시 base URL을 잃어버려 `/data.jpg`로 잘못 resolve
- `<base href>` 주입으로 해결 시도했으나 실패
- 정답: `img.setAttribute("src", img.src)` 로 절대 URL로 교체한 뒤 html2canvas 실행

**`127.0.0.1` vs `localhost` 동일 origin 문제**
- Neutralinojs 서버는 `127.0.0.1`로 서빙, iframe에 `localhost`를 쓰면 cross-origin 에러
- iframe src는 반드시 `http://127.0.0.1:${port}/...` 형태로 작성해야 함

**`Neutralino.server.mount` API 시그니처**
- 문서 없이 추측으로 객체 형태 `{path, target}` 전달 → 오류
- 실제 시그니처: `mount(path, target)` (두 개 별도 인자)

#### 다음에 기억할 것

- Neutralinojs 리소스 서빙: `--path=<dir>` 플래그 사용
- html2canvas + iframe: 캡처 전 `img.setAttribute("src", img.src)` 로 절대 URL 교체
- Neutralinojs 서버 주소: `127.0.0.1`, `localhost` 아님
- Neutralinojs JS API 확인: `resources/neutralino.js` 소스에서 함수 시그니처 직접 확인

### 2026-04-07 Neutralino 바이너리 다운로드 스크립트 분리

#### 다음에 기억할 것

- 패키지는 인라인(`npm:fflate@0.8.2`)으로 지정하지 말고 `deno.json`의 `imports`에 등록 후 이름으로 import
