# 인계

## 지금 상태 (2026-11-25)
- docs/plan.md 계획 표의 항목은 모두 끝(학습자 점검 3·5차로 판정). 남은 끝 기준은 실제 안드로이드 폰 확인뿐.
- 학습자 점검 보고서: `docs/audit/2026-11-24-learner-audit*.md`, `docs/audit/2026-11-25-learner-audit-5.md`(git 밖 스크린샷 폴더는 커밋 금지). 요구를 "끝"으로 볼 때는 이 점검으로 판정한다(docs/standing-rules.md).

## git 밖 데이터(서버에 rsync로 올림, docs/DEPLOY.md)
- `content/textbook/` 교재에서 뽑은 글, `content/transcripts/` 자막(다시 받아 적은 판), `content/transcripts-before-retry/` 옛 자막 사본
- `content/textbook-analysis/ilmuta/` 일무따 1~60강 예문 낱말 분석(docs/textbook-analysis.md)
- `content/transcripts-review/` Claude 교정 자막(강의 전부, 예문은 진행 중)과 `ilmunta/readings/` 일문따 문장 읽기 파일(docs/transcript-review.md)
- `content/songs/` 노래 가사 분석
- 이 폴더들은 `.gitignore`의 `/content/textbook*/`·`/content/transcripts*/`·`/content/songs/`와 pre-commit `scripts/guard-textbook-files.sh`가 막는다.

## 운영 점검
- 배포 때마다 GitHub Actions `Image` 워크플로의 deploy job 마지막 단계 "운영 점검"이 `pnpm check:prod --wait-sha <커밋>`을 돈다. 새 커밋이 `/api/version`에 뜰 때까지 기다린 뒤 모든 강 화면·교재 미디어(화면에서 뽑은 전부)·자막 표본·노래 접근을 GET으로 확인하고, 실패가 있으면 워크플로가 실패로 보인다.
- 결과 보는 곳: `gh run list -R ybbarng/study-japanese --workflow image.yml` → `gh run view <id> --log | grep -E '확인 [0-9]+건|실패'`.
- 로컬에서 자막까지 전부 보려면 `pnpm check:prod`(로컬 `content/`가 있으면 자막 전부·부록 오디오를 합친다).
- 이 점검은 GET으로 받아지는지만 본다. 재생 위치가 늘어나는지·자막이 따라가는지 같은 화면 동작은 배포 뒤 브라우저로 따로 본다(docs/standing-rules.md "운영에서 직접 확인한다").
- 자막·카드 비율: `CONTENT_DIR=<content> pnpm context:report`(`--items`, `--no-text`, `--no-review`).

## 사용자가 할 일·정할 일(책상에도 있음)
- 노래 네 곡 가사 시각 맞추기(`/songs/<곡>/sync`)
- 안드로이드 폰에서 설치·화면 끈 채 재생·녹음·오프라인
- 가나 ほ·ぽ 소리 듣기
- 정할 것: 학습 기록 DB 매일 백업, 방문자에게 내 학습 기록이 보이는 것, "모든 기기에서 로그아웃" 단추, 폰 웹 글꼴 빼기, 가나 획순 데이터(KanjiVG) 받기, 낱말 그림 출처(OpenMoji)
