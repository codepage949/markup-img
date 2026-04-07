# 스크립트 모드 디버그 출력 및 프로세스 타임아웃

## 개요

- 스크립트 모드(`deno run`)에서 Neutralino의 stdout/stderr를 터미널로 연결
- Deno에서 60초 타임아웃 후 Neutralino 프로세스를 강제 종료
- DPR 보정으로 CSS 픽셀 = 출력 픽셀 일치

## 동작 방식

### 스크립트/컴파일 환경 분기

`isScript = execName.startsWith("deno")`로 판별:

| 환경 | stdout | stderr |
|------|--------|--------|
| `deno run` (스크립트) | `"inherit"` | `"inherit"` |
| 컴파일 바이너리 | `"null"` | `"null"` |

### 타임아웃

- `proc.output()` 대신 `child = cmd.spawn()` + `child.status` 로 전환
- Deno의 `setTimeout`으로 60초 후 `child.kill()` 호출
- JS 이벤트 루프 블로킹(대형 canvas.toBlob 등)과 무관하게 동작

### DPR 보정

- `snapdom(target, { scale: 1 / window.devicePixelRatio })`
- Windows 디스플레이 배율(125%, 150% 등) 환경에서 CSS 픽셀 기준 출력 보장

### canvas.toBlob null 처리

- blob이 null이면 캔버스 크기 정보와 함께 에러 메시지 출력 후 종료

## 파일 변경 사항

### 수정
- `main.ts` — `isScript` 변수 추가, `spawn()` + `child.kill()` 타임아웃, stdout/stderr 분기
- `resources/index.html` — DPR 보정, blob null 체크
