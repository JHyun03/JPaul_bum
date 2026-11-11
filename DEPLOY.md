# 🥕 무료로 배포하기 (GitHub Pages + Supabase)

비용 **0원**. 안드로이드·아이폰 모두 **홈 화면에 앱으로 설치**해서 쓸 수 있어요.

| 역할 | 서비스 | 무료 한도 |
|---|---|---|
| 앱 화면 호스팅 | GitHub Pages | 공개 저장소면 무료 |
| 사진 저장 | Supabase Storage | 1GB (사진은 자동으로 줄여서 올라가 약 3,000~4,000장) |
| 작품 정보·좋아요 | Supabase Database | 500MB |

> 💡 앱스토어/플레이스토어 등록은 비용이 들어서(애플 연 $99, 구글 $25) 대신 **설치형 웹앱(PWA)** 으로 만들었어요.
> 홈 화면 아이콘으로 열면 주소창 없이 전체 화면 앱처럼 실행돼요.

---

## 1단계. Supabase 만들기 (10분)

1. https://supabase.com → **Start your project** → GitHub 계정으로 가입
2. **New project**
   - Name: `carrot-photo-village`
   - Database Password: 아무거나 (따로 적어두기만 하세요)
   - Region: **Northeast Asia (Seoul)**
   - Plan: **Free**
3. 프로젝트가 만들어지면 왼쪽 메뉴 **SQL Editor** → 이 저장소의 [`supabase/setup.sql`](supabase/setup.sql) 내용을 **전부 복사해 붙여넣고 Run**
   - "Success" 가 나오면 성공이에요.
4. (선택) **동호회 입장 코드** 정하기 — SQL Editor에서 아래 한 줄을 코드만 바꿔 실행:
   ```sql
   update public.settings set club_code = '당근사진2026' where id = 1;
   ```
   코드를 아는 회원만 작품을 걸 수 있어요. 감상은 누구나 가능해요. (안 하면 누구나 업로드 가능)
5. 왼쪽 메뉴 **Authentication → Sign In / Providers** (또는 Providers) → **Allow anonymous sign-ins** 를 **켜고 저장**
   - 회원가입 없이 기기별로 "주민"을 구분하는 데 써요. **꼭 켜야 업로드/좋아요가 돼요!**
6. **Project Settings → API Keys** (또는 Data API) 에서 두 가지를 복사해 두세요.
   - **Project URL** (예: `https://abcdxyz.supabase.co`)
   - **anon public** 키 또는 **Publishable** 키
   - ⚠️ `service_role` / `secret` 키는 절대 쓰지 마세요.

## 2단계. 앱에 연결하기 (2분)

1. GitHub에서 이 저장소의 `public/config.js` 파일을 열고 연필(✏️) 버튼으로 수정
2. 복사한 값을 붙여넣기:
   ```js
   window.APP_CONFIG = {
     SUPABASE_URL: 'https://abcdxyz.supabase.co',
     SUPABASE_KEY: 'eyJhbGciOi... 또는 sb_publishable_...',
   };
   ```
3. **Commit changes** (main 브랜치에 바로 저장)

> anon/publishable 키는 원래 앱에 공개로 들어가는 키라 괜찮아요. 데이터는 `setup.sql`의 보안 규칙으로 보호돼요.

## 3단계. GitHub Pages 켜기 (1분)

1. 저장소 **Settings → Pages**
2. **Build and deployment → Source** 를 **GitHub Actions** 로 선택
3. **Actions** 탭에서 "Deploy to GitHub Pages" 가 초록색 ✅ 이 되면 완료!
   - 안 돌았다면 Actions → Deploy to GitHub Pages → **Run workflow**
4. 주소: **https://jhyun03.github.io/JPaul_bum/**

## 4단계. 회원들에게 공유 📲

단톡방에 주소(+입장 코드)를 올리고 이렇게 안내하세요. 앱 첫 화면의 **"📲 휴대폰에 앱으로 설치"** 버튼을 누르면 기기에 맞는 설치 방법이 나와요.

- **아이폰**: Safari로 열기 → 공유 버튼(⬆︎) → **홈 화면에 추가**
- **안드로이드**: Chrome으로 열기 → ⋮ 메뉴 → **앱 설치** (또는 홈 화면에 추가)
- 카카오톡에서 링크를 누르면 카톡 안 브라우저로 열려요. **다른 브라우저로 열기**를 먼저 해 주세요.

---

## 운영 팁

- **부적절한 사진 지우기 (운영진)**: Supabase → **Table Editor → photos** 에서 해당 줄 삭제 → **Storage → photos** 에서 같은 경로의 파일 삭제
- **입장 코드 바꾸기**: 1단계 4번의 SQL을 새 코드로 다시 실행 (이미 인증한 기기는 계속 업로드 가능)
- **잠자기 방지**: Supabase 무료 프로젝트는 1주일간 아무도 안 쓰면 일시정지돼요. 저장소에 들어 있는 `Keep Supabase awake` 작업이 3일마다 자동으로 깨워줘요.
  - 저장소에 60일 동안 아무 변화가 없으면 GitHub이 이 자동 작업을 멈출 수 있어요. 그땐 Actions 탭에서 다시 켜 주세요.
  - 혹시 일시정지됐다면 Supabase 대시보드에서 **Restore project** 를 누르면 돼요 (데이터는 그대로).
- **사용량 확인**: Supabase → **Settings → Usage** 에서 저장 공간을 볼 수 있어요.
- **앱 업데이트**: main 브랜치에 코드가 올라가면 자동 배포되고, 회원들 앱도 다음 실행 때 자동으로 새 버전이 돼요.

## 내 컴퓨터에서 미리 보기

```bash
npm start   # http://localhost:3000
```
`config.js`가 비어 있으면 **체험 모드**로 동작해요 (사진이 그 기기에만 저장).
