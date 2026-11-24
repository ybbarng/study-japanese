import Link from "next/link";
import {
  lessonDrillTarget,
  type Skill,
  skillLabel,
} from "@/lib/ilmunta/curriculum";
import { ilmuntaPdfLinks } from "@/lib/ilmunta/media";
import { monthOfLesson } from "@/lib/ilmunta/months";
import type { IlmuntaLesson } from "@/lib/textbook/schema";

/** 종이책을 펴라는 안내: 쪽수와 60일 스케줄의 날 */
export function BookCue({ lesson }: { lesson: IlmuntaLesson }) {
  const month = monthOfLesson(lesson.no);
  return (
    <div className="rounded-2xl border border-line p-5">
      {lesson.pages ? (
        <p className="text-xl">
          책{" "}
          <span className="font-bold text-accent">
            {lesson.pages.from}~{lesson.pages.to}쪽
          </span>
          을 펴세요
        </p>
      ) : (
        <p className="text-ink-soft">책 쪽수를 아직 모릅니다</p>
      )}
      <p className="mt-1 text-sm text-ink-soft">
        {lesson.scheduleDays?.length
          ? `60일 스케줄 ${lesson.scheduleDays.join("·")}일째`
          : null}
        {month ? ` · ${month.month}월 범위(${month.from}~${month.to}과)` : null}
      </p>
    </div>
  );
}

/**
 * 드릴로 바로 가기. 이 과에서 다루는 활용이 있으면 그 과만, 활용이 없는 과(쓰임·조사)는
 * 지금까지 나온 활용을 섞어 복습한다(배운 것을 잊지 않게 과마다 꺼내 써 보기).
 */
export function LessonDrillLink({ no }: { no: number }) {
  const target = lessonDrillTarget(no);
  if (!target) return null;
  const labels = [
    ...new Set(target.skills.map((s: Skill) => skillLabel(s).split(" · ")[0])),
  ];
  return (
    <Link
      href={target.href}
      data-drill-link={target.kind}
      className="flex flex-col gap-2 rounded-2xl bg-bg-raised p-5 active:bg-bg-sunken"
    >
      <span className="font-medium">
        {target.kind === "lesson"
          ? "이 과 활용 드릴"
          : `활용 복습 드릴 · 1~${no}과`}
      </span>
      {target.kind === "review" ? (
        <span className="text-sm text-ink-soft">
          이 과는 활용을 새로 배우지 않으니, 지금까지 나온 활용을 섞어 풀어
          봅니다.
        </span>
      ) : null}
      <span className="flex flex-wrap gap-1.5">
        {labels.slice(0, 8).map((l) => (
          <span
            key={l}
            lang="ja"
            className="rounded-full bg-bg-sunken px-2.5 py-1 text-xs"
          >
            {l}
          </span>
        ))}
      </span>
      <span className="text-sm text-ink-soft">
        읽고 끝내지 말고 바로 꺼내 써 보기. 틀리면 규칙을 짚어 준다.
      </span>
    </Link>
  );
}

/** 함께 보는 PDF(로그인 뒤 열림). 소책자는 그 과의 쪽으로 바로 연다 */
export function PdfLinks({ lesson }: { lesson: IlmuntaLesson }) {
  return (
    <div className="flex flex-col gap-2">
      {ilmuntaPdfLinks(lesson).map((p) => (
        <a
          key={p.href}
          href={p.href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-xl bg-bg-raised px-4 py-3 text-sm active:bg-bg-sunken"
        >
          <span>{p.label}</span>
          <span className="text-ink-faint">{p.note}</span>
        </a>
      ))}
    </div>
  );
}
