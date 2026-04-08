# Linux 헤드리스 환경 자동 Xvfb 기동

## 개요

Linux에서 `DISPLAY`가 없는 헤드리스 환경에서도 사용자가 `xvfb-run`을 직접 입력하지 않도록,
프로그램이 필요 시 `Xvfb`를 자동으로 기동해 Neutralino를 실행하도록 개선한다.

## 배경

- 현재 Linux 헤드리스 환경에서는 GTK/WebKit 기반 Neutralino 실행이 디스플레이 서버 부재로 실패한다.
- 수동으로는 `xvfb-run -a deno task start test.html` 형태로 실행하면 동작한다.
- 사용자 경험상 이 의존을 CLI 내부로 숨기는 편이 낫다.

## 구현 방향

- Linux이고 `DISPLAY`가 비어 있을 때만 자동 Xvfb 경로를 사용
- 시스템의 `Xvfb` 바이너리 존재 여부를 확인
- 사용 가능한 display 번호를 정해 `Xvfb`를 자식 프로세스로 실행
- 해당 `DISPLAY` 환경변수를 설정한 상태에서 Neutralino를 실행
- 종료 시 `Xvfb` 프로세스를 정리
- `Xvfb`가 없으면 설치 안내가 포함된 명확한 오류 메시지 출력

## 검증 계획

- 단위 테스트: 헤드리스 감지/환경 분기/명령 생성 로직
- 실행 테스트:
  - 일반 `deno test`
  - 헤드리스 환경에서 `deno task start test.html`

## 구현 결과

- `main.ts`
  - Linux + `DISPLAY` 없음 조건에서만 `Xvfb` 자동 기동
  - `Xvfb -displayfd 1`로 충돌 없는 display 번호를 받아 사용
  - Neutralino 종료 후 `Xvfb` 자식 프로세스 정리
  - `Xvfb` 미설치 시 명확한 오류 메시지 반환
- `main_test.ts`
  - 헤드리스 판별, `Xvfb` 인자 생성, display 번호 파싱 테스트 추가
  - `Xvfb` 미설치 안내 메시지 테스트 추가
- `README.md`
  - 헤드리스 Linux에서의 자동 `Xvfb` 사용 안내 추가

## 검증 결과

- `deno test --allow-read` 통과
- `env -u DISPLAY deno task start test.html` 실행 성공
  - `xvfb-run` 없이 종료 코드 `0`
  - `result.png` 생성 확인
