# 📸 markup-img

> **HTML을 이미지로 변환하는 CLI 도구**  
> Rust와 Neutralinojs를 활용한 초경량·고성능 렌더링 솔루션.

![Rust](https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white)
![Neutralinojs](https://img.shields.io/badge/Neutralinojs-e43937?style=flat-square&logo=neutralinojs&logoColor=white)
![SnapDOM](https://img.shields.io/badge/SnapDOM-blue?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square)

---

## ✨ 주요 특징

- 🚀 **초경량**: Electron 대비 압도적으로 작은 용량 (Neutralinojs 기반)
- 🎯 **정밀 렌더링**: `SnapDOM` (SVG foreignObject) 기반의 정확한 DOM 캡처
- 🌍 **멀티 플랫폼**: Windows, macOS, Linux 지원
- 🛠️ **파이프라인 친화적**: `stdout` 출력을 지원하여 다른 CLI 도구와 연동 가능
- 📦 **작은 배포 패키지**: 실행 파일과 최소 리소스만 포함
- 🖥️ **헤드리스 Linux 지원**: `DISPLAY`가 없으면 `Xvfb`를 자동으로 사용

---

## 🚀 시작하기

### 설치하기
[Releases](https://github.com/codepage949/markup-img/releases)에서 운영체제에 맞는 패키지를 다운로드하세요. 별도의 설치 과정 없이 압축을 풀고 바로 사용하면 됩니다.

### 기본 사용법
```bash
# 기본 저장 (result.png)
./markup-img example.html

# 파일명 지정 저장
./markup-img example.html my-image.png

# JPEG 포맷 저장
./markup-img example.html my-image.jpg

# stdin으로 HTML 입력
cat example.html | ./markup-img - output.png
```

### 💡 꿀팁: Stdout 출력 및 파이프 활용
`-` 기호를 사용하여 이미지 파일 대신 표준 출력으로 결과물을 보낼 수 있습니다.
```bash
# stdout으로 PNG 출력 (파이프 활용)
./markup-img page.html - > output.png

# ImageMagick 등을 활용한 즉시 변환
./markup-img page.html -.jpg | convert - result.webp

# stdin HTML + stdout 이미지 조합
cat page.html | ./markup-img - -
```

---

## 🎨 HTML 작성 가이드

전체 화면을 캡처하거나, 특정 요소만 콕 집어서 캡처할 수 있습니다.

### 특정 요소만 캡처하기
캡처하고 싶은 요소를 `id="markup-img"`로 지정하세요. 해당 영역만 깔끔하게 이미지로 변환됩니다.

```html
<div id="markup-img" style="padding: 20px; background: #f0f0f0;">
  <h1>이 영역만 캡처됩니다! 📸</h1>
  <p>배경색과 패딩이 모두 포함됩니다.</p>
</div>
```

> **참고**: `#markup-img` 아이디를 찾지 못하면 `<body>` 전체를 캡처합니다.

---

## 🛠️ 기술 스택 및 구조

| 기술 | 역할 |
| :--- | :--- |
| **Rust** | CLI 런타임 및 바이너리 배포 |
| **Neutralinojs** | OS 네이티브 웹뷰 기반 렌더링 엔진 |
| **SnapDOM** | 고정밀 DOM to Canvas 변환 라이브러리 |

### 프로젝트 구조
```text
/
├── src/main.rs        # Rust CLI 진입점
├── src/bin/download-neutralino.rs
├── resources/         # 렌더러 리소스
│   ├── index.html     # 캡처 로직 (WebView)
│   └── snapdom.mjs    # SnapDOM 엔진
└── neutralino-*       # 플랫폼별 런타임
```

---

## 🧑‍💻 개발 및 빌드

Rust 툴체인(`cargo`)이 설치되어 있어야 합니다.

```bash
# Neutralinojs 런타임 다운로드
cargo run --bin download-neutralino

# 개발 모드 실행
cargo run --bin markup-img -- <html-path> [output-path]

# 유닛 테스트 실행
cargo test

# 릴리즈 빌드
cargo build --release
```

Linux 헤드리스 환경에서는 시스템에 `Xvfb`가 설치되어 있으면 자동으로 기동합니다.

`resources/neutralino.config.json`은 정적 파일로 저장소에 포함되어 관리합니다.

CLI 사용법은 `markup-img --help`로 터미널에서 확인할 수 있습니다.
