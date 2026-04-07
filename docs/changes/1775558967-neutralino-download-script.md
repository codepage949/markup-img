# Neutralino 바이너리 다운로드 스크립트 분리

## 개요

프로그램 시작 시 자동으로 Neutralinojs 바이너리를 다운로드하던 방식을 제거하고,
별도 스크립트(`scripts/download-neutralino.ts`)와 `deno task download`로 분리.

## 변경 동기

- 프로그램 실행 시마다 바이너리 존재 여부를 체크하는 불필요한 오버헤드 제거
- 다운로드를 명시적인 단계로 분리하여 의도를 명확하게 함

## 사용법

```sh
deno task download   # Neutralinojs 바이너리 다운로드
deno task start <html> [output]  # 실행
```

## 구현 상세

- `fflate`(순수 JS, `deno.json` imports 등록)의 `unzipSync`로 ZIP 압축 해제 → `unzip`, `powershell` 등 시스템 패키지 의존 없음
- 임시 파일 없이 메모리에서 직접 처리
- ZIP 내 모든 파일을 추출하며, 기존 파일은 덮어씀
- 비윈도우 환경에서만 바이너리에 `chmod 0o755` 적용

## 파일 변경 사항

### 추가
- `scripts/download-neutralino.ts` — 플랫폼별 바이너리 다운로드 스크립트 (`npm:fflate` 사용)

### 수정
- `deno.json` — `download` 태스크 추가 (`--allow-run` 불필요)
- `main.ts` — `ensureNeutralinoBinary` 함수 및 호출 제거
