# Cleanup 소유권 기반 정리

## 배경

- 현재 `src/main.rs`는 실행 준비 단계를 분리했지만, 임시 HTML 파일 삭제와 Xvfb 종료는 여전히 `run` 함수의 마지막 명시적 cleanup 코드에 의존한다.
- 중간에 에러가 발생하면 cleanup 코드까지 도달하지 못할 수 있어, 리소스 정리 책임이 흐름 제어에 묶여 있다.

## 목표

- 임시 파일과 Xvfb 프로세스 정리를 소유 타입으로 옮긴다.
- 에러 경로를 포함해 cleanup이 범위 종료 시 자동으로 수행되도록 만든다.
- 외부 동작은 유지한다.

## 구현 계획

1. stdin 임시 HTML 파일을 자체 정리하는 타입으로 감싼다.
2. Xvfb 세션 정리를 `Drop`으로 이동한다.
3. `run`에서 수동 cleanup 코드를 제거한다.

## 검증 계획

- `cargo test`
- `cargo fmt --check`

## 구현 내용

- `HtmlInput`에 `Drop`을 구현해 stdin에서 만든 임시 HTML 파일을 범위 종료 시 자동으로 삭제하도록 바꿨다.
- `XvfbSession`에 `Drop`을 구현해 세션 소유권이 끝날 때 프로세스를 종료하고 wait 하도록 바꿨다.
- `LaunchContext`가 Xvfb 세션을 소유하도록 유지하고, 필드명을 `_xvfb`로 바꿔 cleanup 소유 의도를 코드에 드러냈다.
- `run`에서 Xvfb 종료와 임시 HTML 삭제를 직접 호출하던 수동 cleanup 코드를 제거했다.

## 검증 결과

- `cargo test` 통과
- `cargo fmt --check` 통과

## 다음 판단

- 에러 경로 cleanup 보장은 이번 라운드에서 정리됐다.
- 다음 후보는 stdout 출력용 임시 파일도 같은 방식으로 소유 타입에 묶어 일관성을 맞추는 것이다.
- 다만 현재 stdout 임시 파일은 출력 성공 여부에 따라 write 후 즉시 삭제하는 흐름이 자연스러워, 우선순위는 앞선 라운드보다 낮다.
