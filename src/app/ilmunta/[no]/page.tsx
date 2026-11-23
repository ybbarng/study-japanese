import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/ilmunta/lesson-player";
import {
  BookCue,
  LessonDrillLink,
  PdfLinks,
} from "@/components/ilmunta/lesson-side";
import { NoIlmunta, PageShell } from "@/components/ilmunta/page-shell";
import { loadIlmuntaLesson } from "@/lib/ilmunta/server-data";

function parseNo(raw: string): number | null {
  return /^\d{1,2}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ no: string }>;
}): Promise<Metadata> {
  const no = parseNo((await params).no);
  return { title: no ? `일문따 ${no}과 · にほんご` : "일문따" };
}

export default async function IlmuntaLessonPage({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  const no = parseNo((await params).no);
  if (no === null) notFound();
  const load = await loadIlmuntaLesson(no);
  if (load.kind === "missing") return <NoIlmunta />;
  if (load.kind === "notFound") notFound();
  const { lesson, prevNo, nextNo, transcripts, heard } = load.data;

  return (
    <PageShell back="/ilmunta" backLabel="일문따 56과">
      <div>
        <p className="text-sm text-accent">일문따 {lesson.no}과</p>
        <h1 className="mt-1 text-2xl font-bold">{lesson.title}</h1>
      </div>
      <BookCue lesson={lesson} />
      <LessonPlayer lesson={lesson} transcripts={transcripts} heard={heard} />
      <LessonDrillLink no={lesson.no} />
      <PdfLinks />
      <nav className="flex justify-between text-sm">
        {prevNo ? (
          <Link href={`/ilmunta/${prevNo}`} className="text-ink-soft">
            ← {prevNo}과
          </Link>
        ) : (
          <span />
        )}
        {nextNo ? (
          <Link href={`/ilmunta/${nextNo}`} className="text-ink-soft">
            {nextNo}과 →
          </Link>
        ) : null}
      </nav>
    </PageShell>
  );
}
