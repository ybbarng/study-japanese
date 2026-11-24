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
  // 활용이 없는 과의 바로 가기: 그 과까지 나온 활용을 섞어 복습한다
  const rawUpTo = (await searchParams).upto;
  const u = typeof rawUpTo === "string" ? Number(rawUpTo) : Number.NaN;
  const reviewUpTo =
    onlyLesson === undefined && Number.isInteger(u) && u >= 2 && u <= 56
      ? u
      : undefined;
  const from = onlyLesson ?? reviewUpTo;
  return (
    <PageShell
      back={from ? `/ilmunta/${from}` : "/ilmunta"}
      backLabel={from ? `${from}과` : "일문따"}
      title="활용 드릴"
    >
      <DrillApp
        key={onlyLesson ?? (reviewUpTo ? `upto${reviewUpTo}` : "all")}
        onlyLesson={onlyLesson}
        reviewUpTo={reviewUpTo}
      />
    </PageShell>
  );
}
