# 배포

`study-ja.byb.kr` → byb.kr 서버 → Traefik(TLS) → `study-ja` 컨테이너. 앞단 구성은 servers 저장소 방식을 따른다.

- 서버를 돌리는 설정(compose·배포 스크립트)은 `ybbarng/servers` 저장소의 `byb.kr/apps/study-ja/`에 둔다(servers 세션 몫). 이 저장소는 앱 코드와 이미지 빌드만 맡는다.
- `main`에 push하면 `.github/workflows/image.yml`이 검사(lint·타입·테스트) → 이미지 빌드(`ghcr.io/ybbarng/study-japanese`) → 배포 키로 서버에 `deploy <sha>`를 보낸다. `docs/`·`study/`·`*.md`만 바뀐 push는 건너뛴다.

## 서버 폴더 (컨테이너에 붙일 것)

| 서버 | 컨테이너 | 권한 | 내용 |
|---|---|---|---|
| `~/data/study-ja/media/` | `/app/media` | 읽기 전용 | 교재 오디오. `ilmuta/`(일무따 원본 폴더 통째), `ilmunta/`(일문따), `kana/`(가나 글자별 소리) |
| `~/data/study-ja/content/` | `/app/content` | 읽기 전용 | 교재에서 뽑은 글 JSON(`textbook/ilmuta.json` 등) |
| `~/data/study-ja/data/` | `/app/data` | 읽고 쓰기 | 학습 기록 `study.db`. 배포 전 백업 |

교재 자료는 웹 루트 밖 이 폴더에만 두고, 앱이 로그인을 확인한 뒤 내준다. 이미지·GHCR·git에는 들어가지 않는다.

## 서버 값 (`servers/byb.kr/apps/study-ja/.env`)

| 이름 | 값 |
|---|---|
| `SITE_PASSWORD` | 로그인 암호. 사용자 한 명이라 IP 제한 없이 실패마다 늦추기만 하므로 **긴 무작위 값**으로 둔다 |
| `SESSION_SECRET` | 로그인 쿠키 서명용, 32자 이상 무작위 |

둘 중 하나라도 없으면 아무도 로그인할 수 없다(열린 채로 뜨지 않는다).

## 헬스체크

`GET /login`이 200이면 떠 있는 것이다(로그인 없이 열리는 화면).

## GitHub Secrets

`SERVER_HOST` / `SERVER_USER` / `SERVER_PORT` / `SERVER_SSH_KEY`(forced-command로 `apps/study-ja/deploy.sh`에 묶인 배포 키).

## 교재 자료 옮기기 (맥 → 서버, 한 번)

```bash
rsync -av --progress ~/personal/study/japanese/BN003460_total/ byb.kr:data/study-ja/media/ilmuta/
rsync -av --progress ~/personal/study/japanese/BN003602_total/ byb.kr:data/study-ja/media/ilmunta/
rsync -av media/kana/ byb.kr:data/study-ja/media/kana/
rsync -av content/textbook/ byb.kr:data/study-ja/content/textbook/
```

## 기록 받기

```bash
STUDY_URL=https://study-ja.byb.kr STUDY_PASSWORD=... pnpm progress:pull
```
