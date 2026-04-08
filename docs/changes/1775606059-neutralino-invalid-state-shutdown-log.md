# Neutralino 종료 시 invalid state 로그 추적

## 개요

렌더링과 파일 저장은 성공하지만, 종료 직후 Neutralino 런타임에서 아래 예외 로그가 출력된다.

```text
terminate called after throwing an instance of 'websocketpp::exception'
  what():  invalid state
```

## 현재 상태

- `resources.neu is missing` 문제는 별도 문서에서 수정 완료
- `xvfb-run -a deno task start test.html` 기준으로 `result.png` 생성은 성공
- 종료 단계에서만 런타임 예외 로그가 남음

## 조사 방향

- `Neutralino.app.exit(0)` 호출 시점과 WebSocket 연결 종료 순서를 확인
- 브라우저 측 종료 처리와 Neutralino 런타임의 경쟁 상태 가능성을 점검
- 필요하면 종료 전에 이벤트 해제 또는 지연 종료 방식을 비교 검증

## 예정 검증

- 종료 직전/직후 로그 추가로 예외 발생 지점 좁히기
- 종료 방식별 재현 비교

## 1차 조사 결과

- `Neutralino.app.writeProcessOutput`로 종료 직전 로그를 남기도록 계측
- 예외는 항상 출력 파일 저장 이후, `Neutralino.app.exit(0)` 호출 직후에 발생
- `xvfb-run -a deno task start test.html` 반복 실행 시 `app.exit(0)` 경로에서 간헐적으로 재현
- `SHUTDOWN_DELAY_MS=100`, `300`으로 지연을 줘도 `app.exit(0)` 경로의 예외는 사라지지 않음
- `Neutralino.app.killProcess()` 경로는 예외 로그가 사라지지만 상위 종료 코드는 `130`
- `Neutralino.window.close()` 경로는 종료되지 않고 정지 상태로 남음

## 현재 가설

- 이미지 저장 실패가 아니라 Neutralino 런타임의 종료 처리와 WebSocket 종료 사이 경쟁 상태 문제일 가능성이 큼
- 애플리케이션 레벨에서 완전히 정상적인 종료 로그 제거가 가능할지는 추가 확인이 필요

## 외부 확인 결과

- 2026-04-08 기준 Neutralinojs 최신 릴리스는 `v6.7.0`이며, 이 버전이 현재 프로젝트가 사용 중인 버전과 동일
- 공개 이슈 [#1469](https://github.com/neutralinojs/neutralinojs/issues/1469) 는 `Neutralino.app.exit()`가 macOS에서 충돌한다고 보고하며 아직 `open` 상태
- 공개 PR [#1533](https://github.com/neutralinojs/neutralinojs/pull/1533) 는 해당 종료 충돌 수정안이지만 아직 `merged` 되지 않음
- Neutralino 소스 `api/app/app.cpp` 기준 `app::exit()`는 `neuserver::stop()` 후 `window::_close(code)`를 호출
- Neutralino 소스 `server/neuserver.cpp` 기준 `neuserver::stop()`는 현재 `stop_listening()`만 수행

## 소스 기반 추론

- 공식 소스만 보면 종료 시 활성 WebSocket 연결을 명시적으로 닫는 처리가 확인되지 않음
- 따라서 Linux에서 보이는 `websocketpp::exception invalid state` 역시 런타임 종료 순서 문제일 가능성이 높음
- 다만 이 부분은 현재 공개 이슈로 직접 확인된 것은 아니고, 소스와 재현 결과를 바탕으로 한 추론임

## 정리

- 현재 릴리스 범위에서는 우리 쪽 애플리케이션 코드만으로 깔끔하게 해결하기보다 Neutralino 런타임 이슈로 보는 쪽이 타당
- 실사용 관점에서는 출력 파일 생성과 부모 프로세스 종료 코드는 정상(`0`)이므로 기능상 치명도는 낮음
- 다음 후보는 Neutralino upstream 이슈 등록 또는 포크 빌드 적용 검토
