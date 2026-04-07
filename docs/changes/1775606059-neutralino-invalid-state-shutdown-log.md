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
