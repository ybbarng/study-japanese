import Link from "next/link";
import { skillsOfLesson } from "@/lib/ilmunta/curriculum";
import { pagesLabel } from "@/lib/ilmunta/labels";
import { MONTHS } from "@/lib/ilmunta/months";
import type { LessonListen } from "@/lib/ilmunta/progress";
import type { Ilmunta, IlmuntaLesson } from "@/lib/textbook/schema";
import { MonthTestBadge } from "./month-test-badge";

/** 56과를 달 범위(4·5·6월)로 묶어 보여 준다 */
export function LessonMap({
  book,
  listens,
}: {
  book: Ilmunta;
  listens: LessonListen[];
}) {
  const listenOf = new Map(listens.map((l) => [l.no, l]));
  return (
    <div className="flex flex-col gap-8">
      {MONTHS.map((m) => {
        const lessons = book.lessons.filter(
          (l) => l.no >= m.from && l.no <= m.to,
        );
        const heard = lessons.reduce(
          (n, l) => n + (listenOf.get(l.no)?.heard ?? 0),
          0,
        );
        const total = lessons.reduce((n, l) => n + l.lectures.length, 0);
        const first = lessons[0]?.pages?.from;
        const last = lessons.at(-1)?.pages?.to;
        return (
          <section key={m.month} aria-labelledby={`month-${m.month}`}>
            <div className="sticky top-0 z-10 -mx-5 bg-bg/95 px-5 py-2 backdrop-blur lg:-mx-10 lg:px-10">
              <div className="flex items-baseline justify-between">
                <h2 id={`month-${m.month}`} className="text-lg font-bold">
                  {m.month}월{" "}
                  <span className="text-ink-soft">
                    · {m.from}~{m.to}과
                  </span>
                </h2>
                <span className="text-xs text-ink-faint">
                  {first && last ? `책 ${first}~${last}쪽` : null}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-raised">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{
                    width: `${total ? Math.round((heard / total) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-ink-faint">
                강의 {heard}/{total} 들음
              </p>
            </div>
            <ol className="mt-2 flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-8 2xl:grid-cols-3">
              {lessons.map((l) => (
                <LessonRow key={l.no} lesson={l} listen={listenOf.get(l.no)} />
              ))}
            </ol>
            <MonthTestBadge month={m.month} />
          </section>
        );
      })}
    </div>
  );
}

function LessonRow({
  lesson,
  listen,
}: {
  lesson: IlmuntaLesson;
  listen?: LessonListen;
}) {
  const done = listen && listen.total > 0 && listen.heard >= listen.total;
  const hasDrill = skillsOfLesson(lesson.no).length > 0;
  return (
    <li>
      <Link
        href={`/ilmunta/${lesson.no}`}
        className="flex items-center gap-4 border-b border-line py-3 active:bg-bg-raised lg:rounded-lg lg:px-2 lg:hover:bg-bg-raised"
      >
        <span
          className={
            done
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-good/20 font-bold text-good"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-raised font-bold"
          }
        >
          {lesson.no}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate">{lesson.title}</span>
          <span className="text-xs text-ink-faint">
            {pagesLabel(lesson)}
            {lesson.scheduleDays?.length
              ? ` · ${lesson.scheduleDays.join("·")}일째`
              : ""}
            {hasDrill ? " · 드릴" : ""}
          </span>
        </span>
        <span className="shrink-0 text-xs text-ink-soft">
          {listen ? `${listen.heard}/${listen.total}` : null}
        </span>
      </Link>
    </li>
  );
}
