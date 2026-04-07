# Node+Electron → Deno+Neutralinojs 마이그레이션

## 개요

HTML을 이미지로 변환하는 CLI 도구를 Node.js+Electron 기반에서 Deno+Neutralinojs 기반으로 전면 교체.

## 변경 동기

- `deno compile`로 바이너리 배포 가능
- Electron 대비 경량화 (Neutralinojs)
- npm 의존성 제거

## 실행 방법

```
markup-img html-path [output-path]
```

## 아키텍처

```
사용자 실행: markup-img user.html [output.png]
    ↓
main.ts (Deno binary)
  - CLI 인자 파싱
  - HTML_PATH, OUTPUT_PATH 환경변수 설정
  - resources/neutralino.config.json 런타임 생성
  - neutralino-linux_x64 실행 (--path=resources/)
    ↓
Neutralinojs (resources/index.html)
  - HTML_PATH에서 사용자 HTML 파일명/디렉토리 파싱
  - Neutralino.server.mount("/html/", htmlDir) 로 HTML 디렉토리 마운트
  - iframe에 마운트된 URL로 사용자 HTML 로드
  - 이미지 src를 절대 URL로 교체 (html2canvas clone 시 URL 오해석 방지)
  - html2canvas로 #markup-img (없으면 body) 캡처
  - Neutralino.filesystem.writeBinaryFile()로 이미지 저장
  - Neutralino.app.exit(0)
```

## 배포 패키지 구조

```
./
├── markup-img          # deno compile 결과물 (실행 파일)
├── neutralino-linux_x64  # Neutralinojs 바이너리
├── resources/
│   ├── index.html        # 캡처 로직 (Neutralinojs 렌더러)
│   ├── neutralino.js     # Neutralinojs 클라이언트 라이브러리 v6.7.0
│   └── js_in_html.js     # html2canvas 번들
└── test.html             # 샘플 HTML
```

## 파일 변경 사항

### 생성
- `main.ts` - Deno CLI 진입점
- `deno.json` - 빌드 설정 (start, compile 태스크)
- `resources/index.html` - 캡처 로직
- `resources/neutralino.js` - Neutralinojs 클라이언트 v6.7.0
- `resources/js_in_html.js` - html2canvas 번들 (Electron 커스텀 코드 제거)
- `neutralino-linux_x64` - Neutralinojs 바이너리 v6.7.0

### 삭제
- `main.js` - Electron 메인 프로세스
- `main.py` - Python 래퍼
- `index.js` - 빈 익스포트
- `index.html` - 이전 테스트 파일
- `package.json`, `package-lock.json` - Node.js 설정

## 주요 기술 결정

### --path=resources/ 플래그
Neutralinojs에서 `--path`로 appPath를 resources 디렉토리로 설정.
`resources/` 에서 정적 파일 서빙 + `resources/neutralino.config.json` 읽기.

### 런타임 config 생성
`neutralino.config.json`을 실행 시마다 새로 생성. binary 위치(`Deno.execPath()`)로 resources 경로를 동적 결정.

### Neutralino.server.mount
사용자 HTML 디렉토리를 `/html/` 경로에 마운트. iframe이 same-origin으로 사용자 HTML을 로드하여 html2canvas가 DOM에 접근 가능.

### 이미지 절대 URL 교체
html2canvas가 document clone 시 `./data.jpg`를 `/data.jpg`로 잘못 resolve하는 버그 우회.
`img.setAttribute("src", img.src)` 로 절대 URL로 교체한 뒤 캡처.

### port: 0
자동 포트 할당. `window.NL_PORT` 전역변수로 접근.
