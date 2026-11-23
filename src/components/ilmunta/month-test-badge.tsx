"use client";

import Link from "next/link";
import { PASS_SCORE } from "@/lib/ilmunta/months";
import { useTestsStore } from "@/lib/ilmunta/stores";
import { bestScore } from "@/lib/ilmunta/test-state";
import { useTestsReady } from "./use-synced-store";

/** 달 범위 끝에 두는 월말 시험 입구와 지금까지 최고 점수 */
export function MonthTestBadge({ month }: { month: number }) {
  const ready = useTestsReady();
  const data = useTestsStore((s) => s.data);
  const best = ready ? bestScore(data, month) : null;
  return (
    <Link
      href={`/ilmunta/test/${month}`}
      className="mt-3 flex items-center justify-between rounded-2xl bg-bg-raised p-4 active:bg-bg-sunken"
    >
      <span>
        <span className="block font-medium">{month}월 범위 시험</span>
        <span className="text-xs text-ink-soft">
          활용·문형 30문제 · {PASS_SCORE}점 목표
        </span>
      </span>
      <span
        className={
          best === null
            ? "text-sm text-ink-faint"
            : best >= PASS_SCORE
              ? "text-lg font-bold text-good"
              : "text-lg font-bold text-warn"
        }
      >
        {best === null ? "아직" : `${best}점`}
      </span>
    </Link>
  );
}
