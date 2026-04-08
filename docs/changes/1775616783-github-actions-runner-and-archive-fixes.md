# GitHub Actions 빌드 환경 오류 수정

## 배경

- Windows runner에서 `zip` 명령이 없어 압축 단계가 실패했다.
- macOS x64 runner를 `macos-13`으로 지정했는데 현재 지원 라벨과 맞지 않아 실패했다.
- 일부 GitHub Actions가 Node.js 20 기반이라 deprecation 경고가 발생했다.

## 목표

- 플랫폼별로 동일하게 동작하는 압축 단계를 사용한다.
- 현재 지원되는 macOS runner 라벨로 교체한다.
- Node.js 20 기반 액션 사용을 줄이거나 제거한다.

## 구현 계획

1. 압축 단계에서 외부 `zip` 명령 의존을 제거한다.
2. macOS x64/arm64 runner 라벨을 현재 지원 라벨로 교체한다.
3. `checkout`, `upload-artifact`, artifact download 경로를 Node 24 기준으로 정리한다.

## 구현 내용

- `.github/workflows/release.yml`의 `actions/checkout`을 `@v6`로 올렸다.
- `.github/workflows/release.yml`의 `actions/upload-artifact`를 `@v6`로 올렸다.
- release job의 artifact 다운로드는 `actions/download-artifact` 대신 `gh run download`를 사용하도록 바꿨다.
- Windows에서도 동일하게 동작하도록 압축 단계의 `zip -r` 의존을 제거하고 Python `zipfile` 기반으로 교체했다.
- macOS x64 runner는 `macos-13` 대신 `macos-15-intel`로 바꿨다.
- macOS arm64 runner는 `macos-14` 대신 `macos-15`로 바꿨다.

## 검증 계획

- `.github/workflows/release.yml` YAML 파싱
- 변경 후 workflow 정적 검토

## 검증 결과

- `.github/workflows/release.yml` YAML 파싱 통과
- workflow 정적 검토로 다음을 확인
  - Windows는 더 이상 `zip` 명령에 의존하지 않음
  - macOS x64는 지원 라벨 `macos-15-intel` 사용
  - artifact upload는 Node 24 기반 `actions/upload-artifact@v6` 사용
  - artifact download는 `gh` CLI로 수행해 `actions/download-artifact` 경고 경로 제거

## 참고

- GitHub-hosted macOS Intel runner 라벨: `macos-15-intel`
- GitHub-hosted macOS arm64 runner 라벨: `macos-15`
- `actions/upload-artifact@v6`는 Node.js 24 기반
