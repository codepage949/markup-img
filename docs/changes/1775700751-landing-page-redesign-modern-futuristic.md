# 랜딩 페이지 리디자인 — Modern Futuristic

## 배경

- 기존 페이지가 주황/노랑 계열의 따뜻한 톤으로 데모스럽다는 피드백을 받음
- 고급지고 세련된 느낌, modern/futuristic 방향으로 전면 재설계 요청
- backdrop-filter를 적극 활용해 흐릿한 배경 효과를 극대화해야 함
- 과도한 라운딩 자제 (기존 24–30px → 6–12px)

## 목표

- 라이트 기반이되 차갑고 세련된 색상 팔레트 적용
- 전체 배경: 연한 블루-화이트 (`#eef1f8`) + 다층 컬러 오브
- 모든 카드에 강한 backdrop-filter (blur + saturate) 적용
- 기술적·미래지향적 느낌: 격자 텍스처, 모노스페이스 태그, 날카로운 엣지
- 라운딩 최대 12px, 태그/버튼 6px

## 색상 팔레트

| 역할 | 값 |
|------|-----|
| 배경 | `#eef1f8` |
| 텍스트 | `#080d1e` |
| 텍스트 소프트 | `#2d3460` |
| 뮤트 | `#7b839c` |
| 프라이머리 | `#0055ff` (일렉트릭 블루) |
| 액센트 시안 | `#00b4d8` |
| 액센트 바이올렛 | `#6d28d9` |

## 구현 내용

- 배경 오브 세 개 (시안, 바이올렛, 블루) + 44px 격자 텍스처 오버레이
- topbar: 브랜드 로고+태그라인, `backdrop-filter: blur(48px) saturate(180%)` 유리 효과, 라운딩 10px
- hero-card, panel, metric: `backdrop-filter: blur(32px) saturate(180%)`
- hero-card: 좌측 블루→시안 2px 액센트 라인
- eyebrow: 모노스페이스 + 펄스 애니메이션 점
- 히어로 타이핑 텍스트: 블루→시안 그래디언트
- version-card: 블루 계열 유리 카드
- code-window: 다크 배경 + 상단 블루→시안 1px 그래디언트 라인
- metric 3종: 모노스페이스 태그 (lightweight / pipeline / cross-platform)
- 버튼: 라운딩 6px, primary에 glow shadow
- footer: 간결하게 단순화

## 검증

- 로컬 파일 열어 각 패널의 유리 효과 육안 확인
- backdrop-filter: 오브 위 패널의 블러·채도 증폭 효과 정상 동작
- 반응형: 920px, 640px 브레이크포인트 레이아웃 확인
