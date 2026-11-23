import Link from "next/link";
import type { ContinuePick } from "@/lib/ilmuta/continue";
import { lessonLabel } from "@/lib/ilmuta/labels";
import type { LessonRow } from "@/lib/ilmuta/server-data";

interface Props {
  pick: ContinuePick;
  rows: LessonRow[];
}

/** "이어서 하기": 평일엔 다음 강 듣기, 주말엔 밀린 문장 쓰기 */
export function ContinueCard({ pick, rows }: Props) {
  if (pick.kind === "done")
    return (
      <div className="rounded-3xl bg-bg-raised p-6">
        <p className="text-lg font-bold">60강을 모두 마쳤습니다</p>
        <p className="mt-1 text-ink-soft">
          좋아하는 강을 골라 다시 들어 보세요.
        </p>
      </div>
    );
  const row = rows.find((r) => r.no === pick.no);
  const href =
    pick.kind === "write"
      ? `/ilmuta/${pick.no}?step=writing`
      : `/ilmuta/${pick.no}`;
  return (
    <Link
      href={href}
      className="block rounded-3xl bg-accent p-6 text-white active:opacity-90"
    >
      <span className="text-sm opacity-90">
        {pick.kind === "write"
          ? "이어서 하기 · 문장 3개 쓰기"
          : "이어서 하기 · 강의 듣기"}
      </span>
      <span className="mt-2 flex items-baseline gap-3">
        <span className="text-2xl font-bold">{lessonLabel(pick.no)}</span>
        {row?.title ? (
          <span lang="ja" className="truncate font-ja-serif text-2xl">
            {row.title}
          </span>
        ) : null}
      </span>
      {row?.titleKo ? (
        <span className="mt-1 block opacity-90">{row.titleKo}</span>
      ) : null}
    </Link>
  );
}
