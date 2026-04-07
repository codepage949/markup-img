# Neutralino 디렉터리 리소스 모드 수정

## 개요

`deno task start test.html` 실행 시 Neutralino가 `resources/resources.neu`를 찾다가 실패하는 문제를 수정한다.

## 문제 원인

- 현재 실행 코드는 `--path=<resourcesDir>`만 전달한다.
- Neutralino 런타임은 기본적으로 번들 리소스(`resources.neu`) 모드로 시작해 파일 트리를 생성하려고 시도한다.
- 그 결과 디렉터리 기반 리소스를 의도했더라도 `resources.neu is missing` 오류가 먼저 발생한다.

## 수정 방향

- Neutralino 실행 시 디렉터리 리소스 모드를 명시적으로 사용한다.
- 관련 설정과 문서를 실제 동작과 일치하도록 정리한다.
- 핵심 경로/출력 판별 로직 테스트는 유지하고, 실행 경로 관련 검증을 보강한다.

## 구현 결과

- `main.ts`에 Neutralino 실행 인자 생성 함수를 추가하고 `--res-mode=directory`를 함께 전달하도록 수정
- `main_test.ts`에 실행 인자 검증 테스트 추가
- `README.md`의 자동 다운로드 설명을 수동 다운로드 방식에 맞게 수정

## 검증 계획

- `deno test`
- `deno task start test.html`

## 검증 결과

- `deno test` 통과
- `xvfb-run -a deno task start test.html` 실행 시 `resources.neu is missing` 오류 없이 `result.png` 생성 확인
- GUI 디스플레이가 없는 셸에서는 `xvfb-run` 없이 실행 시 GTK display connection 오류가 발생할 수 있음
- 성공 종료 후 Neutralino 런타임에서 `websocketpp::exception invalid state` 메시지가 출력되는 현상은 별도로 남아 있음
