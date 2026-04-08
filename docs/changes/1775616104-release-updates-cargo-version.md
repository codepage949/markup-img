# 릴리즈 시 Cargo 버전 자동 갱신

## 배경

- 현재 Rust 전환 이후에도 `Cargo.toml`의 `version`은 수동 관리 상태다.
- 릴리즈 태그와 Cargo 패키지 버전이 어긋나면 바이너리 메타데이터와 소스 트리 상태가 일치하지 않는다.
- 릴리즈 과정에서 `Cargo.toml`과 `Cargo.lock`을 함께 갱신하는 편이 일관성이 좋다.

## 목표

- GitHub Actions 릴리즈 워크플로에서 입력 태그를 Cargo 버전으로 변환한다.
- `Cargo.toml`의 `package.version`을 자동 갱신한다.
- 갱신된 `Cargo.lock`까지 포함한 릴리즈 커밋을 만든 뒤, 그 커밋 기준으로 빌드/태그/릴리즈를 수행한다.

## 구현 계획

1. 태그 문자열에서 Cargo 버전을 추출하는 로직을 테스트 가능한 함수로 분리한다.
2. `Cargo.toml`을 갱신하는 Rust 헬퍼 바이너리를 추가한다.
3. 릴리즈 워크플로에 prepare job을 추가해 버전 커밋과 SHA 출력을 만든다.
4. build/release job은 prepare job이 만든 commit SHA를 기준으로 동작하게 바꾼다.

## 구현 내용

- `src/lib.rs`에 `parse_cargo_version_from_tag()`를 추가했다.
  - 입력은 `v1.2.3` 형식만 허용한다.
  - 성공 시 Cargo용 `1.2.3` 문자열을 반환한다.
- `src/bin/prepare-release-version.rs`를 추가했다.
  - 입력 태그를 Cargo 버전으로 변환한다.
  - `Cargo.toml`의 `package.version`을 갱신한다.
- `.github/workflows/release.yml`에 `prepare` job을 추가했다.
  - 태그 중복 검사
  - `prepare-release-version` 실행
  - `cargo generate-lockfile` 실행
  - `Cargo.toml`, `Cargo.lock` 변경분 커밋 및 push
  - release SHA 출력
- `build`와 `release` job은 `prepare` job이 만든 release SHA를 기준으로 checkout 하도록 바꿨다.
- 릴리즈 태그는 release SHA를 가리키도록 생성한다.
- 같은 버전이 이미 `Cargo.toml`에 들어 있으면 커밋 단계는 건너뛴다.

## 검증 계획

- `cargo test`
- `cargo run --bin prepare-release-version -- v1.2.3`
- `.github/workflows/release.yml` YAML 파싱

## 검증 결과

- `cargo test` 통과
- `cargo run --bin prepare-release-version -- v1.2.3` 실행으로 `Cargo.toml` 버전이 `1.2.3`으로 갱신되는 것 확인
- 이후 `cargo run --bin prepare-release-version -- v0.1.0`으로 현재 개발 버전으로 복구
- `cargo generate-lockfile` 재생성 확인
- `.github/workflows/release.yml` YAML 파싱 확인

## 주의 사항

- 실제 GitHub Actions 실행 검증은 아직 하지 않았다.
- 현재 구조에서는 릴리즈 커밋이 먼저 push된 뒤, 그 commit SHA 기준으로 빌드와 태그 생성이 이어진다.
