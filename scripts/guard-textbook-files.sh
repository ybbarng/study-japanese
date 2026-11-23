#!/usr/bin/env bash
# 산 교재 자료(오디오·PDF·xlsx)와 교재 원본 폴더가 커밋되지 않게 막는다.
# 인자: 스테이징된 파일 경로들 (lefthook {staged_files})
set -euo pipefail

blocked=()
for f in "$@"; do
  case "$f" in
    *.mp3 | *.MP3 | *.m4a | *.wav | *.pdf | *.xlsx) blocked+=("$f") ;;
    media/* | textbook-src/* | content/textbook/* | content/transcripts/*) blocked+=("$f") ;;
  esac
done

if ((${#blocked[@]} > 0)); then
  echo "교재 자료로 보이는 파일은 커밋하지 않습니다(저작권, docs/standing-rules.md):" >&2
  printf '  %s\n' "${blocked[@]}" >&2
  exit 1
fi
