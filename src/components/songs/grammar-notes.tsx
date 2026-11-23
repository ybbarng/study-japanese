import Link from "next/link";
import { lessonLabel } from "@/lib/ilmuta/labels";
import type { GrammarNote } from "@/lib/songs/analysis";

function refLabel(ref: NonNullable<GrammarNote["ref"]>): string {
  return ref.book === "ilmuta"
    ? `일무따 ${lessonLabel(ref.lesson)}`
    : `일문따 ${ref.lesson}과`;
}

/** 가사 한 줄의 문법 메모. 접어 두고 펼쳐 본다. 교재 강이 있으면 그 강으로 간다 */
export function GrammarNotes({
  notes,
  index,
}: {
  notes: readonly GrammarNote[];
  index: number;
}) {
  if (notes.length === 0) return null;
  return (
    <details className="group mt-1 text-sm">
      <summary
        className="w-fit cursor-pointer list-none rounded-lg px-1.5 py-0.5 text-ink-faint hover:bg-bg-raised"
        aria-label={`${index + 1}번째 줄 문법 메모 ${notes.length}개`}
      >
        <span className="group-open:hidden">▸</span>
        <span className="hidden group-open:inline">▾</span> 문법 {notes.length}
      </summary>
      <ul className="mt-2 flex flex-col gap-2 rounded-xl bg-bg-sunken p-3">
        {notes.map((note, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 메모 차례가 곧 열쇠다
          <li key={i} className="flex flex-col gap-1">
            <p>
              <span lang="ja" className="font-ja-serif font-bold text-accent">
                {note.pattern}
              </span>
              {note.ref ? (
                <Link
                  href={`/${note.ref.book}/${note.ref.lesson}`}
                  className="ml-2 text-xs text-ink-soft underline underline-offset-4"
                >
                  {refLabel(note.ref)}에서 배움 →
                </Link>
              ) : null}
            </p>
            <p className="leading-relaxed whitespace-pre-line text-ink-soft">
              {note.explain}
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}
