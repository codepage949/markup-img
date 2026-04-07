# markup-img

HTML 파일을 이미지(PNG/JPEG)로 변환하는 CLI 도구.

## 설치

[Releases](https://github.com/codepage949/markup-img/releases)에서 패키지를 다운로드하고 압축 해제.

```
markup-img-linux/
├── markup-img            # 실행 파일
├── neutralino-linux_x64  # Neutralinojs 바이너리
└── resources/            # 렌더러 리소스
```

## 사용법

```
./markup-img <html-path> [output-path]
```

- `html-path`: 변환할 HTML 파일 경로 (필수)
- `output-path`: 출력 이미지 경로 (선택, 기본값: `result.png`)
  - `.jpg` / `.jpeg` 확장자 사용 시 JPEG로 저장

## 예제

```bash
./markup-img page.html
./markup-img page.html output.png
./markup-img page.html output.jpg
```

## HTML 작성 방법

캡처할 요소를 `id="markup-img"` div로 감싸면 해당 요소만 캡처됩니다.  
`#markup-img`가 없으면 `<body>` 전체를 캡처합니다.

```html
<!DOCTYPE html>
<html>
  <head>
    <title>example</title>
  </head>
  <body style="padding: 0; margin: 0;">
    <div id="markup-img" style="display: inline-flex;">
      <!-- 캡처할 내용 -->
      <img src="./image.jpg" />
      <div style="position: absolute; left: 0; top: 0; font-size: 50px;">텍스트</div>
    </div>
  </body>
</html>
```

## 빌드

```bash
# 개발 실행
deno task start <html-path> [output-path]

# 바이너리 컴파일
deno task compile
```
