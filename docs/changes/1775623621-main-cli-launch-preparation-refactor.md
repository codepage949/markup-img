# CLI 실행 준비 단계 분리

## 배경

- `src/main.rs`의 `run` 함수가 입력 파일 준비, 출력 경로 준비, 런타임 경로 계산, Xvfb 초기화, Neutralino 실행까지 한 번에 담당하고 있다.
- 현재 동작은 유지되고 있지만, 실행 준비 책임이 한 곳에 몰려 있어 이후 기능 추가나 에러 처리 수정 시 영향 범위가 넓다.

## 목표

- CLI 실행 전 준비 단계를 작은 책임 단위로 분리한다.
- 현재 동작과 인터페이스는 유지한다.
- 이후 리팩토링에서 재사용할 수 있는 구조체와 헬퍼 경계를 만든다.

## 구현 계획

1. 출력 경로 표현을 별도 구조체로 분리한다.
2. 런타임 경로 계산을 별도 구조체/함수로 분리한다.
3. 환경 변수 및 Xvfb 준비를 별도 구조체/함수로 분리한다.
4. `run`은 전체 흐름 조합만 담당하도록 정리한다.

## 구현 내용

- `src/main.rs`에 `OutputTarget`, `RuntimePaths`, `LaunchContext`를 추가해 실행 준비 단계를 데이터 구조로 분리했다.
- stdout 출력용 임시 파일 여부와 실제 출력 경로를 `create_output_target`으로 묶어 반환하도록 바꿨다.
- 런타임 루트 계산과 Neutralino 바이너리 위치 계산을 `resolve_runtime_paths`로 분리했다.
- 환경 변수 수집, Xvfb 기동 여부 판단, DISPLAY 주입을 `prepare_launch_context`로 분리했다.
- Neutralino 자식 프로세스 설정은 `build_neutralino_command`로 이동해 `run`은 전체 흐름 조합과 결과 처리에 집중하도록 정리했다.
- Xvfb 정리는 `cleanup_launch_context`로 분리했다.

## 검증 계획

- `cargo test`
- `cargo fmt --check`

## 검증 결과

- `cargo test` 통과
- `cargo fmt --check` 통과

## 다음 판단

- 이번 라운드의 주요 목표였던 실행 준비 단계 분리는 완료됐다.
- 다음 리팩토링은 cleanup 보장 방식(`Drop` 또는 범위 기반 정리)까지 손대는 방향이지만, 그 변경은 에러 경로 검증이 더 필요하므로 이번 라운드에서는 멈춘다.
