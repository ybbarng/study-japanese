import Link from "next/link";
import { BOOK_NAME, lessonLabel } from "@/lib/ilmuta/labels";
import { loadMapData } from "@/lib/ilmuta/server-data";

/** 첫 화면의 일무따 입구: 이어서 할 강을 바로 누르게 */
export async function IlmutaEntry() {
  const data = await loadMapData();
  if (!data)
    return (
      <Link href="/ilmuta" className="rounded-2xl bg-bg-raised p-5">
        <span className="block text-lg font-medium">{BOOK_NAME}</span>
        <span className="text-sm text-ink-soft">교재 데이터가 없습니다</span>
      </Link>
    );
  const { pick, rows } = data;
  const row = pick.kind === "done" ? null : rows.find((r) => r.no === pick.no);
  const href =
    pick.kind === "write"
      ? `/ilmuta/${pick.no}?step=writing`
      : pick.kind === "listen"
        ? `/ilmuta/${pick.no}`
        : "/ilmuta";
  return (
    <div className="overflow-hidden rounded-2xl bg-bg-raised">
      <Link href={href} className="block p-5 active:bg-bg-sunken">
        <span className="text-sm text-accent">
          {pick.kind === "write"
            ? "일무따 · 문장 쓰기"
            : pick.kind === "listen"
              ? "일무따 · 이어서 듣기"
              : "일무따 · 완주"}
        </span>
        {pick.kind !== "done" ? (
          <span className="mt-1 flex items-baseline gap-3">
            <span className="text-xl font-bold">{lessonLabel(pick.no)}</span>
            {row?.title ? (
              <span lang="ja" className="truncate font-ja-serif text-xl">
                {row.title}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="mt-1 block text-xl font-bold">60강 모두 마침</span>
        )}
        {row?.titleKo ? (
          <span className="text-sm text-ink-soft">{row.titleKo}</span>
        ) : null}
      </Link>
      <Link
        href="/ilmuta"
        className="block border-t border-line px-5 py-3 text-sm text-ink-soft active:bg-bg-sunken"
      >
        60강 지도 보기
      </Link>
    </div>
  );
}
