"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lessonLabel } from "@/lib/ilmuta/labels";
import { dueByLesson } from "@/lib/quiz/review-state";
import { useQuizStore } from "@/lib/quiz/store";
import { QuizSync, useQuizHydrated } from "./use-quiz-ready";

/** 60강 지도 위: 틀렸던 확인 문제를 다시 풀 때가 된 강으로 바로 간다(그 구역 끝 문제가 그 문제부터 낸다) */
export function QuizReviewLinks() {
  const hydrated = useQuizHydrated();
  const data = useQuizStore((s) => s.data);
  // 지금 시각은 화면을 연 뒤에 정한다(서버 렌더와 어긋나지 않게)
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const due = hydrated && now !== null ? dueByLesson(data, now) : [];
  return (
    <>
      <QuizSync />
      {due.length > 0 ? (
        <p className="mt-3 px-2 text-sm text-ink-soft">
          다시 풀 확인 문제:{" "}
          {due.slice(0, 6).map((d, i) => (
            <span key={d.lesson}>
              {i > 0 ? ", " : ""}
              <Link
                href={`/ilmuta/${d.lesson}?step=${d.step}`}
                className="text-accent underline-offset-2 active:underline"
              >
                {lessonLabel(d.lesson)} {d.count}개
              </Link>
            </span>
          ))}
          {due.length > 6 ? " …" : ""}
        </p>
      ) : null}
    </>
  );
}
