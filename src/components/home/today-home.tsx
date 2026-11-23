"use client";

import { KanaSync } from "@/components/kana/kana-sync";
import { SplitColumns } from "@/components/shell/page-frame";
import { LESSONS } from "@/lib/kana/lessons";
import { todayPlan } from "@/lib/kana/plan";
import { actionHref } from "@/lib/today/actions";
import { kstDate } from "@/lib/today/kst";
import { minutesLabel, studyStreak } from "@/lib/today/listening";
import { pickToday } from "@/lib/today/pick";
import { countInRange, kanaProgress } from "@/lib/today/progress";
import { focusBook } from "@/lib/today/schedule";
import type { HomeData } from "@/lib/today/server-data";
import { actionText } from "./action-text";
import { BeforeStart } from "./before-start";
import { BookLinks } from "./book-links";
import { MainCard } from "./main-card";
import { ProgressPanel } from "./progress-panel";
import { RestList } from "./rest-list";
import { Tools } from "./tools";
import { useHomeKana } from "./use-home-kana";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/** 첫 화면 "오늘": 날짜와 진도에 따라 가장 크게 보일 것 하나(또는 둘)와 나머지 */
export function TodayHome({ data }: { data: HomeData }) {
  const { kana, ready } = useHomeKana(data.serverKana);
  const { nowMs } = data;
  const date = kstDate(nowMs);
  const kanaPlan = todayPlan(kana, nowMs);
  const today = pickToday({
    nowMs,
    kana: {
      plan: kanaPlan,
      lessonsDone: LESSONS.filter((l) => kana.lessons[l.id]).length,
    },
    ilmuta: data.ilmuta
      ? {
          pick: data.ilmuta.pick,
          lectureDone: new Set(data.ilmuta.lectureDone),
          nextListen: data.ilmuta.nextListen,
          pendingWriting: data.ilmuta.pendingWriting,
        }
      : null,
    ilmunta: data.ilmunta
      ? { resume: data.ilmunta.resume, done: new Set(data.ilmunta.done) }
      : null,
  });

  const header = (
    <header className="flex items-baseline justify-between">
      <p lang="ja" className="font-ja-serif text-4xl font-bold tracking-widest">
        にほんご
      </p>
      <p className="text-sm text-ink-soft">
        {date.month}월 {date.day}일 {WEEKDAY[date.weekday]}요일
      </p>
    </header>
  );

  if (today.phase === "before")
    return (
      <>
        {ready ? <KanaSync /> : null}
        {header}
        <BeforeStart
          daysLeft={today.daysLeft}
          lesson0Sec={
            data.ilmuta?.playable.find((l) => l.no === 0)?.lecture
              .durationSec ?? null
          }
        />
      </>
    );

  const days = new Set([...data.listen.days, ...kana.days]);
  const streak = studyStreak(days, nowMs);
  const listened = minutesLabel(data.listen.todaySec);
  const lessonOf = (no: number) =>
    data.ilmuta?.playable.find((l) => l.no === no);

  return (
    <>
      {ready ? <KanaSync /> : null}
      {header}
      {listened || streak > 1 ? (
        <p className="-mt-3 text-sm text-ink-soft">
          {[
            listened ? `오늘 ${listened} 들음` : null,
            streak > 1 ? `${streak}일째 이어서` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      <SplitColumns
        main={
          <>
            <section
              aria-label="오늘 할 것"
              className="flex flex-col gap-3 lg:gap-4"
            >
              {today.main.length === 0 ? (
                <div className="rounded-3xl bg-bg-raised p-6">
                  <p className="text-lg font-bold">
                    오늘 정해 둔 것은 다 했어요
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    좋아하는 강을 골라 다시 들어 보세요.
                  </p>
                </div>
              ) : (
                today.main.map((a, i) => (
                  <MainCard
                    key={actionHref(a)}
                    action={a}
                    text={actionText(a, data)}
                    primary={i === 0}
                    lesson={
                      a.kind === "ilmuta-listen" ? lessonOf(a.no) : undefined
                    }
                  />
                ))
              )}
            </section>

            <RestList
              items={today.rest.map((a) => ({
                action: a,
                text: actionText(a, data),
              }))}
            />
          </>
        }
        side={
          <>
            <ProgressPanel
              kana={kanaProgress(kana.cards)}
              ilmuta={
                data.ilmuta
                  ? countInRange(new Set(data.ilmuta.lectureDone), 1, 60)
                  : null
              }
              ilmunta={
                data.ilmunta && focusBook(nowMs) === "ilmunta"
                  ? data.ilmunta.done.length
                  : null
              }
              quota={today.quota}
              month={date.month}
            />

            <BookLinks title="책" />
            <Tools />
          </>
        }
      />
    </>
  );
}
