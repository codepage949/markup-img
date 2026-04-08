# 수동 GitHub 릴리즈 워크플로 추가

## 개요

GitHub Actions에서 수동 실행(`workflow_dispatch`) 가능한 릴리즈 워크플로를 추가한다.

## 요구사항

- 입력으로 버전명(`v1.2.3` 형태)을 받음
- 아래 target별로 `deno compile --target` 수행
  - `x86_64-unknown-linux-gnu`
  - `aarch64-unknown-linux-gnu`
  - `x86_64-pc-windows-msvc`
  - `x86_64-apple-darwin`
  - `aarch64-apple-darwin`
- 각 target 산출물에 `resources/`, 플랫폼별 `neutralino-*`를 포함해 zip 생성
- zip 이름 규칙 예: `markup-img-v1.2.3-linux-x64.zip`
- 실행 브랜치 기준으로 태그 생성
- 태그가 이미 있으면 실패
- 릴리즈 노트는 이전 태그부터 현재 태그까지의 `git log --oneline` 기반
- GitHub 릴리즈 생성은 `gh` CLI 사용

## 구현 방향

- `.github/workflows/release.yml` 추가
- 매트릭스로 target/산출물 이름/Neutralino 바이너리 이름을 관리
- 각 매트릭스 job이 zip을 artifact로 업로드
- 최종 job이 artifact를 모아 태그 생성 및 `gh release create` 수행

## 검증 계획

- 워크플로 YAML 정적 검토
- shell 스크립트 문법 점검
- 로컬에서 가능한 범위의 빌드 명령 검토

## 구현 결과

- `.github/workflows/release.yml` 추가
- `workflow_dispatch` 입력 `version`을 받아 5개 target 빌드
- 각 build job에서 `deno task download`로 `neutralino-*` 런타임 바이너리 준비
- target별로 실행 파일, `resources/`, 대응 `neutralino-*` 바이너리를 zip으로 패키징
- 마지막 job에서 태그 중복 검사 후 태그 생성, `gh release create` 실행
- 이전 태그가 있으면 `git log --oneline <prev>..HEAD`, 없으면 전체 로그를 릴리즈 노트로 사용
- `README.md`에 릴리즈 워크플로 존재를 간단히 안내

## 검증 결과

- `python3` + `PyYAML`로 `.github/workflows/release.yml` 파싱 확인
- `actionlint`는 현재 로컬 환경에 없어 실행하지 못함
- `.gitignore`의 `.*` 규칙 때문에 `.github/`가 무시되던 문제를 예외 규칙으로 함께 수정
