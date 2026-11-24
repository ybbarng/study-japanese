"use client";

import type { ReactNode } from "react";
import { TapSentence } from "./tap-sentence";
import { useWordTap } from "./word-tap-provider";

/**
 * 폰 재생기가 접혔을 때 한 줄로 보이는 지금 일본어 줄. 그 줄의 소책자 문장이 모두 낱말 분석을 가졌으면
 * 낱말마다 눌러 정보 창을 연다(재생은 멈추지 않는다). 분석이 하나라도 없거나 공급자 밖이면 원래 글.
 */
export function CueTapLine({
  sentences,
  fallback,
}: {
  sentences: readonly string[];
  fallback: ReactNode;
}) {
  const tap = useWordTap();
  if (
    !tap ||
    sentences.length === 0 ||
    !sentences.every((ja) => tap.data.analyses[ja])
  )
    return fallback;
  return (
    <span data-cue-tap-line>
      {sentences.map((ja, i) => (
        <span key={ja}>
          {i > 0 ? " " : null}
          <TapSentence ja={ja} showReading={false} fallback={ja} />
        </span>
      ))}
    </span>
  );
}
