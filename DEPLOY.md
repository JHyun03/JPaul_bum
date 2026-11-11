# 🚀 배포 가이드 (Render)

예상 비용: **월 약 $7.25** (Starter 서버 $7 + 1GB 디스크 $0.25)
사진과 작품 정보는 영구 디스크(`/var/data`)에 저장돼서 재배포·재시작해도 지워지지 않아요.

## 1. Render 가입
1. https://render.com 에 접속해 **GitHub 계정으로 가입**합니다.
2. 결제 카드를 등록합니다 (영구 디스크는 유료 플랜에서만 쓸 수 있어요).

## 2. Blueprint로 한 번에 만들기
1. Render 대시보드 오른쪽 위 **New + → Blueprint** 를 누릅니다.
2. GitHub 저장소 `JPaul_bum` 을 연결합니다. (목록에 없으면 *Configure GitHub* 에서 저장소 접근을 허용)
3. 브랜치를 고릅니다. 이 코드를 `main`에 합친 뒤 `main`을 고르는 걸 추천해요.
4. Render가 `render.yaml`을 읽어 아래 설정을 자동으로 채워요.
   - 서버: Node 22, Starter, 싱가포르 리전 (한국에서 가장 가까움)
   - 디스크: `photos` 1GB → `/var/data`
5. **CLUB_CODE** 입력칸이 나오면 동호회 입장 코드를 정해 넣으세요. (예: `당근사진2026`)
   - 이 코드를 아는 사람만 작품을 걸 수 있어요. 감상은 누구나 가능해요.
   - 비워두면 링크를 아는 누구나 사진을 올릴 수 있어요.
6. **Apply** 를 누르면 몇 분 뒤 `https://carrot-photo-village.onrender.com` 같은 주소가 생겨요.

## 3. 회원들에게 공유
- 사이트 주소 + 입장 코드를 동호회 단톡방/공지에 올리면 끝!
- 처음 작품을 걸 때만 코드를 물어보고, 그 다음부터는 브라우저에 기억돼요.

## 운영 팁
- **코드 바꾸기**: Render → 서비스 → *Environment* → `CLUB_CODE` 수정 → 저장하면 자동 재시작.
- **용량 늘리기**: *Disks* 에서 크기를 키울 수 있어요 (줄이는 건 안 돼요). 사진 10MB × 100장 ≈ 1GB.
- **백업**: *Shell* 탭에서 `ls /var/data/uploads` 로 확인. Render는 디스크 스냅샷을 매일 자동으로 만들어 줘요.
- **내 도메인 연결**: *Settings → Custom Domains* 에서 추가.
- **업데이트**: 연결한 브랜치에 코드를 푸시하면 자동으로 다시 배포돼요.
- **부적절한 사진 지우기**: 지금은 올린 사람만 내릴 수 있어요. 운영진용 삭제 기능이 필요하면 말씀해 주세요.

---

## 다른 곳에 배포하고 싶다면 (Docker)
`Dockerfile`이 들어 있어서 VPS나 Fly.io 등 Docker가 되는 곳이면 어디든 띄울 수 있어요.
사진은 컨테이너의 `/data`에 저장되니 꼭 볼륨을 연결하세요.

```bash
docker build -t carrot-photo-village .
docker run -d --name cpv -p 80:3000 \
  -v cpv-data:/data \
  -e CLUB_CODE=당근사진2026 \
  --restart unless-stopped carrot-photo-village
```

### 환경 변수
| 이름 | 설명 | 기본값 |
|---|---|---|
| `PORT` | 서버 포트 | `3000` |
| `STORAGE_DIR` | 사진/데이터 저장 위치 (영구 디스크 경로) | 프로젝트 폴더 |
| `CLUB_CODE` | 작품을 걸 때 필요한 입장 코드 (비우면 누구나) | 없음 |
