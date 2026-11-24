# 인계

## 운영 점검
- 배포 때마다 GitHub Actions `Image` 워크플로의 deploy job 마지막 단계 "운영 점검"이 `pnpm check:prod --wait-sha <커밋>`을 돈다. 새 커밋이 `/api/version`에 뜰 때까지 기다린 뒤 모든 강 화면·교재 미디어(화면에서 뽑은 전부)·자막 표본·노래 접근을 GET으로 확인하고, 실패가 있으면 워크플로가 실패로 보인다.
- 결과 보는 곳: `gh run list -R ybbarng/study-japanese --workflow image.yml` → `gh run view <id> --log | grep -E '확인 [0-9]+건|실패'`.
- 로컬에서 자막까지 전부 보려면 `pnpm check:prod`(로컬 `content/`가 있으면 자막 전부·부록 오디오를 합친다).
- 이 점검은 GET으로 받아지는지만 본다. 재생 위치가 늘어나는지·자막이 따라가는지 같은 화면 동작은 배포 뒤 브라우저로 따로 본다(docs/standing-rules.md "운영에서 직접 확인한다").

## 사용자가 할 일(책상에도 있음)
- 노래 네 곡 가사 시각 맞추기(`/songs/<곡>/sync`)
- 안드로이드 폰에서 설치·화면 끈 채 재생·녹음·오프라인
- 가나 ほ·ぽ 소리 듣기
