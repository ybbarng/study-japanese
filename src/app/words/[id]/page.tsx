import Link from "next/link";
import { notFound } from "next/navigation";
import { DrillRecord } from "@/components/dictionary/drill-record";
import { WordExamples } from "@/components/dictionary/word-examples";
import { WordPictureSlot } from "@/components/dictionary/word-picture-slot";
import { PageFrame, TwoColumn } from "@/components/shell/page-frame";
import { SourceCredit } from "@/components/sources/source-credit";
import { loadDictWord } from "@/lib/dictionary/server";
import { lessonLabel } from "@/lib/ilmuta/labels";
import { naverDictUrl, posLabel } from "@/lib/songs/words";
import { sourceById } from "@/lib/sources/registry";

interface Props {
  params: Promise<{ id: string }>;
}

function decode(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export async function generateMetadata({ params }: Props) {
  return { title: `${decode((await params).id)} — 낱말 사전` };
}

// 낱말 하나: 읽는 법·짧은 뜻·처음 배운 강·나오는 예문(누르면 그 문장 소리)·내 드릴 기록·네이버 사전
export default async function WordPage({ params }: Props) {
  const data = await loadDictWord(decode((await params).id));
  if (!data) notFound();
  const { entry, examples, limited } = data;
  const source = sourceById("gilbut-ilmuta");

  const info = (
    <section className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1
            lang="ja"
            className="font-ja-serif text-5xl leading-tight font-bold"
          >
            {entry.word}
          </h1>
          {entry.readings.some((r) => r !== entry.word) ? (
            <p lang="ja" className="mt-1 text-xl text-ink-soft">
              {entry.readings.join("・")}
            </p>
          ) : null}
        </div>
        <WordPictureSlot word={entry.word} />
      </div>
      {entry.glosses.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-medium">{entry.glosses[0]}</p>
          {entry.glosses.length > 1 ? (
            <p className="text-ink-soft">
              <span className="mr-2 text-sm text-ink-faint">다른 뜻</span>
              {entry.glosses.slice(1).join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {entry.pos.length > 0 ? (
          <>
            <dt className="text-ink-faint">품사</dt>
            <dd>{entry.pos.map(posLabel).join(" · ")}</dd>
          </>
        ) : null}
        {entry.firstLesson !== null ? (
          <>
            <dt className="text-ink-faint">처음 배움</dt>
            <dd>
              <Link
                href={`/ilmuta/${entry.firstLesson}`}
                className="text-accent underline underline-offset-4"
              >
                일무따 {lessonLabel(entry.firstLesson)} →
              </Link>
            </dd>
          </>
        ) : null}
        {entry.ilmuntaLesson !== null ? (
          <>
            <dt className="text-ink-faint">일문따</dt>
            <dd>
              <Link
                href={`/ilmunta/${entry.ilmuntaLesson}`}
                className="text-accent underline underline-offset-4"
              >
                {entry.ilmuntaLesson}과 →
              </Link>
            </dd>
          </>
        ) : null}
      </dl>
      {entry.drill ? <DrillRecord drill={entry.drill} /> : null}
      <a
        href={naverDictUrl(entry.word)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-fit rounded-xl border border-line px-4 py-2 text-sm hover:bg-bg-raised"
      >
        네이버 사전에서 뜻 보기 ↗
      </a>
    </section>
  );

  const list = (
    <section aria-label="나오는 예문" className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">
        나오는 예문{" "}
        <span className="text-sm font-normal text-ink-faint">
          {examples.length}개 · 누르면 그 문장 소리
        </span>
      </h2>
      <WordExamples examples={examples} />
    </section>
  );

  return (
    <PageFrame className="pb-40 lg:pb-28">
      <Link href="/words" className="text-sm text-ink-faint">
        ← 낱말 사전
      </Link>
      <div className="mt-4">
        <TwoColumn
          main={
            <>
              <div className="lg:hidden">{info}</div>
              {list}
            </>
          }
          asideLabel="낱말 정보"
          asideWidth="28rem"
          aside={info}
        />
      </div>
      {source && !limited && examples.length > 0 ? (
        <div className="mt-8">
          <SourceCredit source={source} closed={false} />
        </div>
      ) : null}
    </PageFrame>
  );
}
