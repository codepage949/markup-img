# Windows 경로 처리 수정

## 문제

Windows에서 실행 시 앱이 동작하지 않음.

### 원인

Windows 경로(`C:\path\to\resources`)가 Neutralinojs에 그대로 전달되어 두 가지 문제 발생:

1. **`--path` 인자 혼용 구분자**: `${binaryDir}/resources` 템플릿 리터럴로 생성된 경로가
   `C:\markup-img/resources` 형태(역슬래시+슬래시 혼용)가 됨.
   Neutralinojs가 appPath를 올바르게 파싱하지 못해 dir mode fallback 실패 → 앱 비정상 종료.

2. **`HTML_PATH` 파싱 오류**: `index.html`에서 `lastIndexOf("/")` 로 경로 분리 시
   `C:\Users\...\file.html` 경로에서 `/`를 찾지 못해 htmlDir/htmlFile 추출 실패.

### 참고: NE_RS_TREEGER 경고

`NE_RS_TREEGER`(resources.neu 없음 경고)는 Linux/Windows 모두에서 출력되며, 수정 후에도 계속 나타남.
이는 Neutralinojs가 bundled resources 없이 dir mode로 동작할 때 나오는 정상적인 경고로, Windows에서는
Console API를 통해 직접 출력되어 Deno의 `stderr: "null"` 설정으로 억제 불가. **동작에는 영향 없음.**

## 수정 방법

`main.ts`에서 Neutralinojs에 전달하는 모든 경로를 forward slash로 정규화:
- `--path=` 인자
- `HTML_PATH` 환경변수
- `OUTPUT_PATH` 환경변수

```typescript
const toFwdSlash = (p: string) => p.replace(/\\/g, "/");
```

## 파일 변경 사항

### 수정
- `main.ts` — Neutralinojs 전달 경로 forward slash 정규화
