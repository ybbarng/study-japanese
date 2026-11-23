import { notFound } from "next/navigation";
import { LessonFlow } from "@/components/ilmuta/lesson-flow";
import { NoTextbook } from "@/components/ilmuta/no-textbook";
import { lessonLabel } from "@/lib/ilmuta/labels";
import { loadLessonData } from "@/lib/ilmuta/server-data";
import { lessonSteps, parseStep } from "@/lib/ilmuta/steps";

interface Props {
  params: Promise<{ no: string }>;
  searchParams: Promise<{ step?: string | string[] }>;
}

function parseNo(value: string): number | null {
  return /^\d{1,2}$/.test(value) ? Number(value) : null;
}

export async function generateMetadata({ params }: Props) {
  const no = parseNo((await params).no);
  return { title: `${no === null ? "일무따" : lessonLabel(no)} — にほんご` };
}

export default async function IlmutaLessonPage({
  params,
  searchParams,
}: Props) {
  const no = parseNo((await params).no);
  if (no === null) notFound();
  const loaded = await loadLessonData(no);
  if (loaded.kind === "missing") return <NoTextbook />;
  if (loaded.kind === "notFound") notFound();
  const steps = lessonSteps(loaded.data.lesson);
  const initialStep = parseStep((await searchParams).step, steps);
  return (
    <LessonFlow
      key={no}
      data={loaded.data}
      steps={steps}
      initialStep={initialStep}
    />
  );
}
