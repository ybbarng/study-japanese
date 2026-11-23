import Link from "next/link";
import { BOOK_NAME, pagesLabel } from "@/lib/ilmunta/labels";
import { loadIlmuntaMap } from "@/lib/ilmunta/server-data";

/** 첫 화면의 일문따 입구: 이어서 할 과와 활용 드릴 */
export async function IlmuntaEntry() {
  const data = await loadIlmuntaMap();
  const next = data?.resume
    ? data.book.lessons.find((l) => l.no === data.resume)
    : null;
  return (
    <div className="overflow-hidden rounded-2xl bg-bg-raised">
      <Link
        href={next ? `/ilmunta/${next.no}` : "/ilmunta"}
        className="block p-5 active:bg-bg-sunken"
      >
        <span className="text-sm text-accent">{BOOK_NAME} · 문법 56과</span>
        {next ? (
          <>
            <span className="mt-1 flex items-baseline gap-3">
              <span className="text-xl font-bold">{next.no}과</span>
              <span className="truncate text-lg">{next.title}</span>
            </span>
            <span className="text-sm text-ink-soft">
              {pagesLabel(next) ? `책 ${pagesLabel(next)}` : ""}
            </span>
          </>
        ) : (
          <span className="mt-1 block text-ink-soft">
            {data ? "56과 강의를 모두 들었습니다" : "교재 데이터가 없습니다"}
          </span>
        )}
      </Link>
      <div className="flex border-t border-line text-sm">
        <Link
          href="/ilmunta"
          className="flex-1 px-5 py-3 text-ink-soft active:bg-bg-sunken"
        >
          56과 목록
        </Link>
        <Link
          href="/ilmunta/drill"
          className="flex-1 border-l border-line px-5 py-3 text-ink-soft active:bg-bg-sunken"
        >
          활용 드릴
        </Link>
      </div>
    </div>
  );
}
