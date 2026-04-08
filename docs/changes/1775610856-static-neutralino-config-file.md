# Neutralino 설정 파일 정적 관리 전환

## 개요

실행 시마다 `resources/neutralino.config.json`을 동적으로 생성하던 방식을 제거하고,
정적 파일을 Git에 포함해 관리하도록 전환한다.

## 배경

- 현재 `main.ts`는 고정된 JSON 내용을 실행 시마다 `resources/neutralino.config.json`에 기록한다.
- 그러나 현재 설정값은 실행 환경에 따라 달라지는 값이 없고 모두 상수다.
- 실제 리소스 디렉터리 결정은 `neutralino` 실행 인자의 `--path=<resourcesDir>`가 담당하므로,
  설정 파일 자체를 매번 다시 쓸 필요가 없다.

## 변경 방향

- `resources/neutralino.config.json`을 정적 파일로 저장소에 포함
- `main.ts`의 설정 객체 생성 및 `writeTextFile` 제거
- `.gitignore`와 문서를 현재 방식에 맞게 정리

## 검증 계획

- `deno test`
- `env -u DISPLAY deno task start test.html`

## 구현 결과

- `resources/neutralino.config.json`을 정적 설정 파일로 저장소에 포함
- `main.ts`에서 설정 객체 생성 및 파일 쓰기 제거
- `.gitignore`에서 해당 파일 제외 규칙 제거
- `README.md`에 정적 관리 방식 반영

## 검증 결과

- `deno test --allow-read` 통과
- `env -u DISPLAY deno task start test.html` 실행 성공
