# Rust CLI 런처 전환

## 배경

- `deno compile` 결과 바이너리 크기가 경량 CLI라는 방향성과 맞지 않는다.
- 현재 Deno는 렌더링 엔진이 아니라 Neutralino 런처와 보조 스크립트 역할만 맡고 있다.
- 따라서 웹 렌더링 리소스는 유지하면서 CLI/다운로드 계층만 Rust로 치환할 수 있다.

## 목표

- `main.ts`가 담당하던 CLI 진입점을 Rust 바이너리로 교체한다.
- `scripts/download-neutralino.ts`도 Rust 바이너리로 교체한다.
- 기존 동작을 유지한다.
  - HTML 파일 입력
  - stdin HTML 입력(`-`)
  - stdout 이미지 출력(`-`, `-.png`, `-.jpg`, `-.jpeg`)
  - `--help`
  - Linux 헤드리스 환경의 `Xvfb` 자동 기동
  - `Xvfb` 미설치 시 명확한 안내 메시지
- GitHub Actions 릴리즈 워크플로를 Rust 빌드 기준으로 갱신한다.

## 구현 계획

1. Cargo 프로젝트와 공용 라이브러리 모듈을 추가한다.
2. 기존 순수 로직을 Rust 테스트로 먼저 옮긴다.
3. Rust CLI에서 입력 처리, Neutralino 실행, timeout, cleanup을 구현한다.
4. Neutralino 다운로드 바이너리를 별도 Rust bin으로 구현한다.
5. README와 릴리즈 워크플로를 Rust 기준으로 정리한다.

## 구현 내용

- `Cargo.toml`, `src/lib.rs`, `src/main.rs`, `src/bin/download-neutralino.rs`를 추가해 Deno 런처와 다운로드 스크립트를 Rust로 치환했다.
- 기존 Deno 순수 함수는 Rust 라이브러리 함수로 옮기고, 한글 테스트 13개로 유지했다.
- CLI 동작은 기존과 동일하게 유지했다.
  - HTML 파일 입력
  - stdin HTML 입력
  - stdout 이미지 출력
  - `--help`
  - Linux 헤드리스 환경의 `Xvfb` 자동 기동
  - `Xvfb` 미설치 안내 메시지
- stdin HTML은 현재 작업 디렉터리에 임시 파일을 우선 생성해 상대 경로 해석을 유지하고, 실패 시 시스템 temp 디렉터리로 fallback한다.
- 상대 출력 경로도 현재 작업 디렉터리 기준으로 절대 경로화해서 기존 동작과 맞췄다.
- 릴리즈 워크플로는 Cargo 빌드 기준으로 갱신했다.
  - Linux x64: native cargo build
  - Linux arm64: `cross build`
  - Windows x64: native cargo build
  - macOS x64/arm64: 각 runner에서 native cargo build
- README는 Rust 기준 개발 흐름으로 바꾸고, `단일 바이너리` 표현은 실제 패키지 구조에 맞춰 `작은 배포 패키지`로 조정했다.
- 기존 Deno 관련 파일(`main.ts`, `main_test.ts`, `scripts/download-neutralino.ts`, `deno.json`, `deno.lock`)은 제거했다.

## 검증 계획

- `cargo test`
- `cargo run --bin markup-img -- --help`
- `cargo run --bin download-neutralino`
- `env -u DISPLAY cargo run --bin markup-img -- test.html rust-result.png`
- `cat test.html | env -u DISPLAY cargo run --bin markup-img -- - rust-stdin-result.png`

## 검증 결과

- `cargo test` 통과
- `cargo run --bin markup-img -- --help` 출력 확인
- `cargo run --bin download-neutralino` 성공
- `env -u DISPLAY cargo run --bin markup-img -- test.html rust-result.png` 성공
- `cat test.html | env -u DISPLAY cargo run --bin markup-img -- - rust-stdin-result.png` 성공
- `rust-result.png`, `rust-stdin-result.png`의 크기와 SHA-256 해시가 동일함을 확인
- `cargo build --release --bin markup-img --bin download-neutralino` 통과
- `target/release/markup-img` 크기: `589K`
- `target/release/download-neutralino` 크기: `3.2M`

## 남은 리스크

- GitHub Actions 릴리즈 워크플로는 YAML 파싱까지만 로컬에서 확인했고, 실제 Actions 실행 검증은 아직 못 했다.
