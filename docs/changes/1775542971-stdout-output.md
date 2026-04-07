# 표준 출력(stdout) 지원

## 개요

출력 경로에 `-`, `-.png`, `-.jpg`를 지정하면 파일 대신 stdout으로 이미지를 출력.

## 사용법

```bash
# PNG를 stdout으로 출력 (기본값)
./markup-img page.html -

# 명시적 포맷 지정
./markup-img page.html -.png
./markup-img page.html -.jpg

# 파이프 활용
./markup-img page.html - > result.png
./markup-img page.html -.jpg | convert - output.webp
```

## 동작 방식

```
출력 경로가 `-`, `-.png`, `-.jpg`, `-.jpeg`인 경우
    ↓
임시 파일 생성 (올바른 확장자)
    ↓
Neutralino가 임시 파일에 이미지 저장
    ↓
Deno가 임시 파일을 읽어 stdout으로 출력
    ↓
임시 파일 삭제
```

## 파일 변경 사항

### 수정
- `main.ts` — `isStdoutPath`, `getStdoutFormat` 함수 추가, stdout 파이프 로직 추가
- `main_test.ts` — stdout 경로 판별 및 포맷 감지 테스트 추가
- `README.md` — stdout 사용법 추가
