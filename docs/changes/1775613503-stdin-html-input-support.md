# stdin HTML 입력 지원

## 개요

HTML 파일 경로 대신 표준 입력(stdin)으로 전달된 HTML 문자열도 렌더링할 수 있도록 지원한다.

## 배경

- 현재는 첫 번째 인자를 파일 경로로만 해석한다.
- 파이프라인 사용 시 `cat page.html | markup-img - output.png` 형태의 사용성이 필요하다.
- 기존 렌더링은 파일 경로 기반 마운트 구조이므로, stdin 입력도 임시 HTML 파일로 연결하는 방식이 안전하다.

## 구현 방향

- 첫 번째 인자가 `-`이면 HTML 입력을 stdin에서 읽음
- 읽은 내용을 임시 `.html` 파일에 저장하고 기존 파일 기반 흐름 재사용
- 종료 시 임시 HTML 파일 정리
- README와 테스트에 stdin HTML 입력 사용법 반영

## 검증 계획

- `deno test`
- `printf '<html>...</html>' | env -u DISPLAY deno task start -`

## 구현 결과

- `main.ts`
  - 첫 번째 인자 `-`를 stdin HTML 입력으로 해석
  - stdin 내용을 임시 `.html` 파일에 저장한 뒤 기존 파일 기반 렌더링 흐름 재사용
  - 종료 시 임시 HTML 파일 정리
- `main_test.ts`
  - stdin HTML 경로 판별 테스트 추가
  - help 플래그 및 help 텍스트 테스트 추가
- `README.md`
  - stdin HTML 입력 예시 추가
  - `markup-img --help` 안내 추가
- `main.ts`
  - `--help`, `-h` 지원 및 상세 사용법 텍스트 출력 추가

## 검증 결과

- `deno test --allow-read` 통과
- `printf '<html>...</html>' | env -u DISPLAY deno task start - stdin-result.png`
  - `stdin-result.png` 생성 확인
  - 종료 시 기존 Neutralino `websocketpp::exception invalid state` 문제로 exit code가 `134`로 종료됨
  - 즉 stdin 입력 기능 자체는 동작하지만 종료 로그 문제는 별도 기존 이슈 영향
- 파일 입력과 stdin 입력으로 생성한 이미지의 크기와 SHA-256 해시가 동일함을 확인
