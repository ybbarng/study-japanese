import type { Metadata } from "next";
import Link from "next/link";
import { LessonMap } from "@/components/ilmunta/lesson-map";
import { NoIlmunta, PageShell } from "@/components/ilmunta/page-shell";
import { BOOK_FULL_NAME, pagesLabel } from "@/lib/ilmunta/labels";
import { monthOfLesson } from "@/lib/ilmunta/months";
import { loadIlmuntaMap } from "@/lib/ilmunta/server-data";

export const metadata: Metadata = { title: "일문따 · にほんご" };

export default async function IlmuntaPage() {
  const data = await loadIlmuntaMap();
  if (!data) return <NoIlmunta />;
  const { book, listens, resume } = data;
  const next = resume ? book.lessons.find((l) => l.no === resume) : null;
  const nextListen = listens.find((l) => l.no === resume);

  return (
    <PageShell back="/" backLabel="にほんご">
      <div>
        <p className="text-sm text-accent">2027년 4~6월 · 56과</p>
        <h1 className="mt-1 text-2xl font-bold">{BOOK_FULL_NAME}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          걸으며 강의를 듣고, 앉아서 책을 펴고, 활용은 드릴로 손에 익힌다.
        </p>
      </div>

      {next ? (
        <Link
          href={`/ilmunta/${next.no}`}
          className="rounded-2xl bg-accent p-5 text-white active:opacity-90"
        >
          <span className="text-sm opacity-80">
            이어서 · {monthOfLesson(next.no)?.month}월 범위
          </span>
          <span className="mt-1 flex items-baseline gap-3">
            <span className="text-2xl font-bold">{next.no}과</span>
            <span className="truncate text-lg">{next.title}</span>
          </span>
          <span className="text-sm opacity-80">
            {pagesLabel(next) ? `책 ${pagesLabel(next)}` : ""}
            {nextListen
              ? ` · 강의 ${nextListen.heard}/${nextListen.total}`
              : ""}
          </span>
        </Link>
      ) : (
        <p className="rounded-2xl bg-bg-raised p-5">
          56과 강의를 모두 들었습니다.
        </p>
      )}

      <Link
        href="/ilmunta/drill"
        className="rounded-2xl bg-bg-raised p-5 active:bg-bg-sunken"
      >
        <span lang="ja" className="block font-ja-serif text-xl">
          飲む → 飲んで
        </span>
        <span className="mt-1 block font-medium">활용 드릴</span>
        <span className="text-sm text-ink-soft">
          1~25과 동사 활용과 명사·형용사, 뒤쪽 문형까지. 약한 활용을 더 자주
          묻는다.
        </span>
      </Link>

      {book.preparation ? (
        <p className="text-sm text-ink-faint">
          시작 전에: 준비마당 「{book.preparation.title}」
          {book.preparation.pages ? ` 책 ${pagesLabel(book.preparation)}` : ""}
        </p>
      ) : null}

      <LessonMap book={book} listens={listens} />
    </PageShell>
  );
}
