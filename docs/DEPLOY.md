# 배포

`study-ja.byb.kr` → byb.kr 서버 → Traefik(TLS) → `study-ja` 컨테이너. 앞단 구성은 servers 저장소 방식을 따른다.

- 서버를 돌리는 설정(compose·배포 스크립트)은 `ybbarng/servers` 저장소의 `byb.kr/apps/study-ja/`에 둔다(servers 세션 몫). 이 저장소는 앱 코드와 이미지 빌드만 맡는다.
- `main`에 push하면 `.github/workflows/image.yml`이 검사(lint·타입·테스트) → 이미지 빌드(`ghcr.io/ybbarng/study-japanese`) → 배포 키로 서버에 `deploy <sha>`를 보낸다. `docs/`·`study/`·`*.md`만 바뀐 push는 건너뛴다.

## 서버 폴더 (컨테이너에 붙일 것)

| 서버 | 컨테이너 | 권한 | 내용 |
|---|---|---|---|
| `~/data/study-ja/media/` | `/app/media` | 읽기 전용 | 교재 오디오. `ilmuta/`(일무따 원본 폴더 통째), `ilmunta/`(일문따), `kana/`(가나 글자별 소리), `songs/`(노래 파일, 관리자만 받는다) |
| `~/data/study-ja/content/` | `/app/content` | 읽기 전용 | 교재에서 뽑은 글 JSON(`textbook/ilmuta.json` 등), 세션이 쓴 노래 분석(`songs/<slug>.json`) |
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

Claude가 고친 자막 줄(교정 파일, docs/transcript-review.md)은 자막 API가 요청 때마다 읽으므로 올리면 바로 반영된다(재배포 필요 없음).

```bash
rsync -av content/transcripts-review/ byb.kr:data/study-ja/content/transcripts-review/
```

## 노래 넣기 (관리자)

1. 노래 파일(mp3·m4a)을 영문 이름으로 서버에 둔다. `songs/`는 출처 목록에 없는 폴더라 로그인한 사람만 받는다.
   ```bash
   rsync -av ~/Music/lemon.mp3 byb.kr:data/study-ja/media/songs/lemon.mp3
   ```
2. 사이트에서 로그인 → 노래 → 노래 넣기. 제목·가수·주소 이름(`lemon`)·오디오 파일 이름(`lemon.mp3`, 비우면 주소 이름.mp3)을 쓰고 가사를 줄마다 붙여 넣는다. 한국어 해석이 있으면 옆(폰은 아래) 칸에 가사와 줄 수를 맞춰 붙여 넣는다(해석이 없는 줄은 `-`). 서버 DB에는 가사·해석·박자·메모만 저장된다.
3. 세션에 "이 노래 분석해 줘"라고 한다. 세션이 `docs/song-analysis.md` 순서대로 분석 파일(`content/songs/<slug>.json`)을 만들고 확인한 뒤 서버에 올린다. 분석 파일은 가사 화면이 요청 때마다 읽으므로 올리면 바로 보이고, 재배포할 필요가 없다.
   ```bash
   rsync -av content/songs/lemon.json byb.kr:data/study-ja/content/songs/
   ```
   올리는 것은 분석 파일(`<slug>.json`)뿐이다. `pnpm songs:pull`이 받은 가사 파일(`<slug>.lyrics.json`)은 세션이 읽는 사본이라 올리지 않는다.
4. 가사 화면 → 박자 맞추기에서 노래를 틀고 줄이 시작될 때마다 Space(폰은 큰 단추)를 눌러 저장한다.
5. 가사를 방문자에게 보이지 않으려면 고치기에서 "가사 공개"를 끈다(분석 파일도 같이 가려진다). 같은 이름의 파일을 바꿔 넣으면 브라우저가 옛 파일을 30일까지 들고 있을 수 있으니 새 이름으로 넣는다.
6. 가사를 고치면 글이 바뀐 줄은 분석 없이 보이고, 관리자 화면에 "n줄은 다시 분석해야 함"이 뜬다. 세션에 다시 분석을 맡긴다.

## 기록 받기

```bash
STUDY_URL=https://study-ja.byb.kr STUDY_PASSWORD=... pnpm progress:pull
```
