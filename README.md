# Navier-Stokes_Equations

**소용돌이의 끝에서, 무한대를 만나다.** 고등학교 수학으로 읽는 한국어 HTML 리포트입니다.

2026년 9월 OpenAI가 발표한 매끈한 외력이 있는 3D 비압축 나비에–스토크스 유한시간 발산 구성을 설명하고, 2026년 10월 10일 기준 검토 상태를 구분합니다. 발표를 최종 상 수여나 무외력 문제의 해결로 표현하지 않습니다.

## 읽기

[HTML 리포트](https://aidevksh.github.io/Navier-Stokes_Equations/) · [저장소](https://github.com/aidevksh/Navier-Stokes_Equations)

다운로드한 `index.html`을 브라우저에서 바로 열어도 됩니다. 외부 라이브러리, 폰트, CDN, 서버 없이 본문·MathML 수식·시각화가 작동합니다. 인쇄 / PDF 버튼으로 PDF 저장도 가능합니다.

## 시각 자료

- **2D 함수 그래프:** `1/(1−t)`의 유한시간 발산을 직선·지수함수와 비교합니다.
- **2D 속도장:** 회전과 중심 유입을 조절합니다. 3D 흐름의 단면입니다.
- **3D 물질 튜브:** 실제 xyz 좌표를 원근 투영합니다. 드래그 또는 화살표 키로 회전하고, 변형 슬라이더로 반경·길이·부피 비율을 관찰합니다.
- **에너지 표:** 최대 속력과 전체 에너지의 차이를 숫자로 설명합니다.

시각화와 척도 예시는 교육 모형입니다. 실제 반례의 해를 수치 계산하거나 전체 증명을 독립 검증한 자료가 아닙니다. 모션 감소 설정에서는 자동 애니메이션이 멈춥니다.

## 파일

`index.html`은 본문과 수식, `assets/style.css`는 반응형·인쇄 스타일, `assets/visuals.js`는 Canvas 시각화, `assets/report.js`는 목차·읽기 진행·인쇄 동작입니다. 연구의 1차 출처 여섯 개는 본문 끝에 있습니다.

## 확인

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:browser
```

브라우저 검사에는 로컬 Chromium을 사용할 수 있습니다. macOS에 Google Chrome이 설치되어 있으면 자동 선택하며, `NS_BROWSER_EXECUTABLE`로 경로를 지정할 수도 있습니다. 검사는 인터넷 연결 없는 `file://` 열기, 슬라이더의 수학적 값, 3D 조작, 모션 감소, 모바일 레이아웃, PDF 렌더링을 확인합니다.

## 라이선스

이 저장소의 원본 해설·코드·도형은 [Apache License 2.0](LICENSE)으로 제공합니다. 링크한 외부 논문과 발표문은 각 저작권자의 권리를 따릅니다. 원문 논문 또는 타인의 이미지를 저장소에 재배포하지 않습니다.
