import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamRunner } from "@/components/ilmunta/exam-runner";
import { PageShell } from "@/components/ilmunta/page-shell";
import { MONTHS, monthRange } from "@/lib/ilmunta/months";

export function generateStaticParams() {
  return MONTHS.map((m) => ({ month: String(m.month) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ month: string }>;
}): Promise<Metadata> {
  return { title: `${(await params).month}월 범위 시험 · 일문따` };
}

export default async function MonthTestPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const range = monthRange(Number((await params).month));
  if (!range) notFound();
  return (
    <PageShell
      back="/ilmunta"
      backLabel="일문따"
      title={`${range.month}월 범위 시험`}
    >
      <ExamRunner range={range} />
    </PageShell>
  );
}
