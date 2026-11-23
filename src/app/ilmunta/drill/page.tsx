import type { Metadata } from "next";
import { DrillApp } from "@/components/ilmunta/drill-app";
import { PageShell } from "@/components/ilmunta/page-shell";
import { DRILL_LESSONS } from "@/lib/ilmunta/curriculum";

export const metadata: Metadata = { title: "활용 드릴 · 일문따" };

export default async function DrillPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = (await searchParams).lesson;
  const n = typeof raw === "string" ? Number(raw) : Number.NaN;
  const onlyLesson = DRILL_LESSONS.includes(n) ? n : undefined;
  return (
    <PageShell
      back={onlyLesson ? `/ilmunta/${onlyLesson}` : "/ilmunta"}
      backLabel={onlyLesson ? `${onlyLesson}과` : "일문따"}
      title="활용 드릴"
    >
      <DrillApp key={onlyLesson ?? "all"} onlyLesson={onlyLesson} />
    </PageShell>
  );
}
