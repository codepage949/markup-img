# Neutralinojs 바이너리 자동 다운로드

## 개요

실행 시 플랫폼에 맞는 Neutralinojs 바이너리가 없으면 GitHub 릴리즈에서 자동 다운로드 후 실행.

## 동작 방식

```
markup-img 실행
    ↓
getNeutralinoBinaryName(os, arch) → 바이너리 파일명 결정
    ↓
ensureNeutralinoBinary(binPath)
  - 파일 존재 확인
  - 없으면: GitHub zip 다운로드 → unzip → chmod +x
    ↓
neutralino-{platform} 실행
```

## 지원 플랫폼

| OS      | Arch    | 바이너리명                 |
|---------|---------|---------------------------|
| linux   | x86_64  | neutralino-linux_x64      |
| linux   | aarch64 | neutralino-linux_arm64    |
| darwin  | x86_64  | neutralino-mac_x64        |
| darwin  | aarch64 | neutralino-mac_arm64      |
| windows | x86_64  | neutralino-win_x64.exe    |

## 파일 변경 사항

### 수정
- `main.ts` — 플랫폼 감지, 바이너리 자동 다운로드 로직 추가, `import.meta.main` 가드 추가
- `deno.json` — `--allow-net` 추가, `test` 태스크 추가

### 추가
- `main_test.ts` — `getNeutralinoBinaryName` 단위 테스트
