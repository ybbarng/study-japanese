# study-japanese

2027년 일본어 학습 기록과 학습 사이트(study-ja.byb.kr, PWA, 로그인 필수)를 함께 두는 저장소다.

- 배경 결정의 정본: `~/personal/notes/언어/언어 학습 로드맵.md`의 "2027 다시 정한 것"·"2027 일본어 — 학습 설계" 절
- 시작 인계: `~/personal/notes/언어/일본어/study-japanese 시작 인계.md`
- 교재 원본(git 밖): 일무따 `~/personal/study/japanese/BN003460_total`, 일문따 `~/personal/study/japanese/BN003602_total`
- 참고 구현(복사해서 출발, 공유하지 않음): `~/personal/projects/francais-tres-facile`

## 구조
- `src/` Next.js 앱(App Router, TypeScript strict, Tailwind)
- `content/` 사이트가 읽는 학습 데이터(가나표 등). `content/textbook/`은 교재에서 뽑은 글이라 git 밖
- `media/` 교재 오디오(git 밖). 서버에서는 앱 컨테이너에 읽기 전용으로 붙인다
- `scripts/` 데이터 준비 스크립트
- `study/` 학습 기록(문장 쓰기·진도·점검)
- `docs/` 설계·배포 문서

## 명령
- `pnpm dev` / `pnpm lint` / `pnpm typecheck` / `pnpm test:run`

@docs/standing-rules.md
