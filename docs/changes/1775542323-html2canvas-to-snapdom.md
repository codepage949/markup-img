# html2canvas → SnapDOM 교체

## 개요

캡처 라이브러리를 html2canvas에서 SnapDOM으로 교체.

## 변경 동기

- html2canvas 번들(`js_in_html.js`)을 직접 관리하던 방식 제거
- SnapDOM은 SVG foreignObject 기반으로 더 정확한 렌더링 지원
- ESM 패키지로 npm 없이 URL에서 직접 다운로드 가능

## 파일 변경 사항

### 추가
- `resources/snapdom.mjs` — SnapDOM v2.7.0 번들 (`https://unpkg.com/@zumer/snapdom/dist/snapdom.mjs`)

### 삭제
- `resources/js_in_html.js` — html2canvas 번들

### 수정
- `resources/index.html` — html2canvas → SnapDOM으로 교체

## 코드 변경

### 이전 (html2canvas)

```javascript
const canvas = await html2canvas(target, { scale: 1 });
const blob = await new Promise((resolve) => canvas.toBlob(resolve, imgType));
```

### 이후 (SnapDOM)

```javascript
const { snapdom } = await import("./snapdom.mjs");
const result = await snapdom(target, { scale: 1 });
const canvas = await result.toCanvas();
const blob = await new Promise((resolve) => canvas.toBlob(resolve, imgType));
```

## 주요 기술 결정

### toCanvas() 사용 이유

SnapDOM의 `toPng()` / `toJpg()` 메서드는 Blob을 반환하지 않음 (내부 rasterize 파이프라인의 반환 타입이 다름).  
`toCanvas()`로 HTMLCanvasElement를 받아 표준 `canvas.toBlob()` API로 변환하는 방식이 안정적.

### 동적 import() 사용

SnapDOM은 ESM 전용 패키지. 기존 인라인 스크립트(`<script>` 비모듈)에서 `await import("./snapdom.mjs")`로 로드.  
Neutralinojs HTTP 서버가 `.mjs`를 올바른 MIME 타입으로 서빙하므로 문제 없음.

### img 절대 URL 교체 유지

html2canvas에서 필요했던 `img.setAttribute("src", img.src)` 전처리를 그대로 유지.  
SnapDOM도 리소스를 fetch해서 인라인하므로 절대 URL이어야 정확히 로드됨.
