# 앱 아이콘

2026-10-08 사용자가 제공한 SVG 원본을 보관하고, 네이티브 앱 호환용 PNG를 SVG 전체에서 4× 해상도로 렌더링했다. SVG 대부분이 PNG를 내장한 형식이며 `person.svg`의 알파 마스크도 함께 렌더링했다. 도형을 다시 그리거나 아이콘 라이브러리로 대체하지 않았다. 원본 SVG의 크기/경로/이미지는 변경하지 않았다.

- `home.svg` ← `home 1.svg`: 손님 하단 홈.
- `marketing.svg` ← `marketing 8.svg`: 손님/점주 하단 제보.
- `point.svg` ← `point 3.svg`: 점주 하단 프로모션 및 손님 My 포인트 안내.
- `data.svg` ← `data-analytics 4.svg`: 점주 하단 데이터.
- `person.svg` ← `Mask group.svg`: 손님/점주 하단 My 및 손님 기본 프로필.
- 위 파일과 같은 이름의 `.png`는 SVG를 librsvg 2.62.91 / sharp 0.35.4, density 288(4×)로 렌더링한 앱 표시용 이미지다.
- `search.png`: 이전에 사용자가 제공한 512×512 투명 PNG 원본을 유지한다. 이번 전달 파일에는 검색 SVG가 없다.

`src/components/AppIcon.tsx`에서 원본 비율을 유지하며, 하단 메뉴 선택 시 검정/비선택 시 흰색 tint를 적용한다. 모든 호출부가 같은 자산을 공유한다. 네이티브 Pressable 버튼과 화면 이동 동작은 그대로 유지한다. 포인트 등 백엔드 연결 범위는 이번 자산 교체에서 변경하지 않았다.
