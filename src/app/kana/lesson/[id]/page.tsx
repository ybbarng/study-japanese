import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hydrated } from "@/components/kana/hydrated";
import { LessonRunner } from "@/components/kana/lesson-runner";
import { LESSON_BY_ID, LESSONS } from "@/lib/kana/lessons";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ id: l.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const lesson = LESSON_BY_ID.get((await params).id);
  return { title: lesson ? `${lesson.title} · かな` : "かな" };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!LESSON_BY_ID.has(id)) notFound();
  return (
    <Hydrated>
      <LessonRunner key={id} lessonId={id} />
    </Hydrated>
  );
}
