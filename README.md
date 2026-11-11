# 🥕 당근 사진 마을 전시회

당근 사진 동호회 회원들이 찍은 사진을 **아늑한 마을 광장을 산책하며** 감상하는 전시회 앱입니다.
회원은 주민 캐릭터를 골라 입장하고, 광장 액자(이젤)에 자기 사진을 직접 걸 수 있어요.

- 📱 **안드로이드 · 아이폰 모두 홈 화면에 앱으로 설치** (PWA, 앱스토어 불필요)
- 💸 **완전 무료 운영**: GitHub Pages(호스팅) + Supabase 무료 플랜(사진·데이터)
- 👉 배포 방법: **[DEPLOY.md](DEPLOY.md)**

## 기능
- **주민 캐릭터 선택**: 당근이 · 토순이 · 무무 · 감자도리 · 다람이 · 밤톨이 (6종) + 닉네임
- **마을 산책**: 방향키/WASD, 휴대폰은 화면을 눌러 이동
- **작품 감상**: 액자를 누르거나 액자 앞에서 `Space`/`E`
- **작품 걸기**: 사진은 올릴 때 자동으로 긴 변 1600px로 줄여서 무료 용량을 아껴요
- **좋아요 ♥**, **모아보기**(전체 / 내 작품 / 인기순), **내 작품 내리기**
- **동호회 입장 코드**(선택): 코드를 아는 회원만 작품 업로드
- 회원가입 없음 — 기기마다 익명 "주민"으로 자동 구분
- 앱 화면은 오프라인에서도 열림

## 구조
```
public/                  ← GitHub Pages로 배포되는 앱
  index.html             화면 (타이틀 → 캐릭터 선택 → 마을)
  config.js              Supabase 연결 정보 (비우면 체험 모드)
  js/characters.js       캐릭터 (오리지널 SVG 일러스트)
  js/store.js            데이터 저장 (Supabase / 체험 모드)
  js/app.js              마을 이동·전시·업로드
  js/install.js          앱 설치 안내
  manifest.webmanifest, sw.js, icons/   설치형 앱(PWA) 설정
  vendor/                Supabase JS 라이브러리
supabase/setup.sql       DB·저장소·보안 규칙 (SQL Editor에 붙여넣기)
.github/workflows/       자동 배포, Supabase 잠자기 방지
```

## 캐릭터 이미지 바꾸기
기본 캐릭터는 이 프로젝트용으로 새로 그린 오리지널 SVG입니다.
사용 허락을 받은 다른 캐릭터 이미지가 있다면 `public/characters/`에 넣고
`public/js/characters.js`에서 해당 캐릭터에 `image: 'characters/파일명.png'`을 추가하면 SVG 대신 그 이미지가 쓰입니다.
