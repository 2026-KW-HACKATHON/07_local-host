# 밥줄 브랜드 이미지

- `bapjul-logo.svg`: 사용자가 제공한 `image 26.svg` 원본 (1254×1254).
- `bapjul-logo.png`: 위 SVG가 참조하는 내장 PNG를 재인코딩 없이 추출. 투명도/색상/픽셀을 변경하지 않았다. React Native `Image`에서 사용한다.
- `bapjul-wordmark.svg`: 사용자가 후속 전달한 `image 2.svg` 원본 (159×79). 이전 Figma 내보내기 로고를 이 파일로 대체했다.
- `bapjul-wordmark.png`: 위 SVG 전체를 4× 해상도(636×316)로 렌더링한 네이티브 표시용 이미지. 내장 이미지와 투명도/비율을 유지한다. librsvg 2.62.91 / sharp 0.35.4, density 288로 렌더링했다.
- `bapjul-onboarding-bowl.png`, `bapjul-onboarding-wordmark.png`: `frontend-b`의 `7dbefe1` 커밋에서 가져온 시작 화면 이미지 원본. 픽셀과 투명도를 그대로 유지했다. `onboarding.css`의 배경색 `#EED451`, 가로 68% 로고 조합, 왼쪽 14%·위 39.6% 배치를 React Native로 옮겼다. 화면 너비·높이에 맞춰 배치하며 최대 너비는 412이다.

Figma에서 확인한 헤더 슬롯은 159×79, 로그인 기준 X=-2/Y=17. 일반 화면은 기존 412→390 스케일을 적용하며 뒤로가기 행은 유지한다. 시작/권한 화면은 frontend-b의 캐릭터와 워드마크 조합, 가입 완료 화면은 기존 조합, 나머지 헤더는 왼쪽 투명 여백을 보정한 워드마크를 쓴다. 전체 화면 캡처나 임의 글꼴로 대체하지 않는다.
