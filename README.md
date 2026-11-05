# Claude로 만드는 나만의 수학 수업 도구와 홈페이지 — 연수 웹 교재

대구미래교육연구원 중등 교사 연수(2026.11.10.) 웹 교재입니다.

- 주소: https://joongki-j.github.io/mathai/
- 프롬프트 상자의 **[복사]** 버튼으로 바로 Claude에 붙여넣을 수 있습니다.
- 연수 자료는 `files/` 폴더에 올리면 페이지의 **자료실**에 자동으로 나타납니다.

## 구성
- `index.html` — 교재 본문
- `assets/` — 스타일, 스크립트, 화면 캡처
- `files/` — 자료실 파일 (올리면 자동 목록화)
- `.github/workflows/pages.yml` — 푸시할 때마다 GitHub Pages로 배포하고 자료실 목록(files/index.json)을 만듭니다
