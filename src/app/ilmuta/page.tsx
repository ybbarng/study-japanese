import Link from "next/link";
import { ContinueCard } from "@/components/ilmuta/continue-card";
import { LessonRow } from "@/components/ilmuta/lesson-row";
import { NoTextbook } from "@/components/ilmuta/no-textbook";
import { BOOK_NAME, lessonLabel } from "@/lib/ilmuta/labels";
import { loadMapData } from "@/lib/ilmuta/server-data";

export const metadata = { title: "일무따 — にほんご" };

// 60강 지도: 이어서 할 강을 크게, 그 아래 강마다 들은 정도와 쓰기.
export default async function IlmutaMapPage() {
  const data = await loadMapData();
  if (!data) return <NoTextbook />;
  const current = data.pick.kind === "done" ? null : data.pick.no;
  const lecturesDone = data.rows.filter((r) => r.progress.lectureDone).length;

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-8">
      <header className="px-2">
        <Link href="/" className="text-sm text-ink-faint">
          ← にほんご
        </Link>
        <h1 className="mt-3 text-2xl font-bold">{BOOK_NAME}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          강의 {lecturesDone}/{data.rows.length} 들음
          {data.pendingWriting.length > 0
            ? ` · 문장 쓰기 남은 강 ${data.pendingWriting.length}개`
            : ""}
        </p>
      </header>

      <div className="mt-5">
        <ContinueCard pick={data.pick} rows={data.rows} />
      </div>

      {data.pendingWriting.length > 0 ? (
        <p className="mt-3 px-2 text-sm text-ink-soft">
          쓰기 남은 강:{" "}
          {data.pendingWriting.slice(0, 6).map((no, i) => (
            <span key={no}>
              {i > 0 ? ", " : ""}
              <Link
                href={`/ilmuta/${no}?step=writing`}
                className="text-accent underline-offset-2 active:underline"
              >
                {lessonLabel(no)}
              </Link>
            </span>
          ))}
          {data.pendingWriting.length > 6 ? " …" : ""}
        </p>
      ) : null}

      <ol className="mt-6 space-y-1">
        {data.rows.map((row) => (
          <li key={row.no}>
            <LessonRow row={row} current={row.no === current} />
          </li>
        ))}
      </ol>
    </main>
  );
}
