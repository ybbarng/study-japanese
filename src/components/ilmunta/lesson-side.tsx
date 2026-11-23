import Link from "next/link";
import {
  type Skill,
  skillLabel,
  skillsOfLesson,
} from "@/lib/ilmunta/curriculum";
import { ILMUNTA_PDFS, ilmuntaMediaUrl } from "@/lib/ilmunta/media";
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

/** 이 과에서 다루는 활용이 있으면 드릴로 바로 */
export function LessonDrillLink({ no }: { no: number }) {
  const skills = skillsOfLesson(no);
  if (skills.length === 0) return null;
  const labels = [
    ...new Set(skills.map((s: Skill) => skillLabel(s).split(" · ")[0])),
  ];
  return (
    <Link
      href={`/ilmunta/drill?lesson=${no}`}
      className="flex flex-col gap-2 rounded-2xl bg-bg-raised p-5 active:bg-bg-sunken"
    >
      <span className="font-medium">이 과 활용 드릴</span>
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

/** 함께 보는 PDF(로그인 뒤 열림) */
export function PdfLinks() {
  return (
    <div className="flex flex-col gap-2">
      {ILMUNTA_PDFS.map((p) => (
        <a
          key={p.file}
          href={ilmuntaMediaUrl(p.file)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-xl bg-bg-raised px-4 py-3 text-sm active:bg-bg-sunken"
        >
          <span>{p.label}</span>
          <span className="text-ink-faint">PDF ↗</span>
        </a>
      ))}
    </div>
  );
}
