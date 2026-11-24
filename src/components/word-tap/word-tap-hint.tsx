"use client";

import { useWordTap } from "./word-tap-provider";

/** 누를 수 있는 문장이 있을 때 한 줄 안내. 글자 도움을 펼친 초반 강에서는 글자 소리까지 알린다 */
export function WordTapHint() {
  const tap = useWordTap();
  if (!tap) return null;
  if (tap.mode === "open")
    return (
      <p className="text-sm text-ink-faint">
        밑줄 친 낱말을 누르면 뜻·읽는 법과 함께 글자 하나씩 소리와 한글 근사치가
        나옵니다.
      </p>
    );
  if (Object.keys(tap.data.analyses).length === 0) return null;
  return (
    <p className="text-sm text-ink-faint">
      밑줄 친 낱말을 누르면 뜻·읽는 법·품사가 나옵니다.
    </p>
  );
}
