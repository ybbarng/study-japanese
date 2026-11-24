import Link from "next/link";
import { DictionaryBrowser } from "@/components/dictionary/dictionary-browser";
import { PageFrame } from "@/components/shell/page-frame";
import { SourceCredit } from "@/components/sources/source-credit";
import { loadDictList } from "@/lib/dictionary/server";
import { sourceById } from "@/lib/sources/registry";

export const metadata = { title: "낱말 사전 — にほんご" };

interface Props {
  searchParams: Promise<{ q?: string | string[] }>;
}

// 교재에 나온 낱말을 한곳에서 찾는다. 뜻은 교재 맥락의 짧은 뜻, 더 자세한 뜻은 낱말 화면에서 네이버 사전으로.
export default async function WordsPage({ searchParams }: Props) {
  const { entries, limited } = await loadDictList();
  const q = (await searchParams).q;
  const source = sourceById("gilbut-ilmuta");
  return (
    <PageFrame className="pb-40 lg:pb-28">
      <header>
        <Link href="/" className="text-sm text-ink-faint lg:hidden">
          ← にほんご
        </Link>
        <h1 className="mt-3 text-2xl font-bold lg:mt-0 lg:text-3xl">
          낱말 사전
        </h1>
        <p className="mt-1 text-sm text-ink-soft lg:text-base">
          일무따 단어·예문과 일문따 드릴에 나온 낱말. 누르면 읽는 법·뜻·처음
          배운 강·나오는 예문을 봅니다.
        </p>
        {limited ? (
          <p className="mt-2 text-sm text-warn">
            교재 자료를 닫아 두어 드릴 낱말만 보입니다.
          </p>
        ) : null}
      </header>
      <div className="mt-6">
        <DictionaryBrowser
          entries={entries}
          initialQuery={typeof q === "string" ? q : ""}
        />
      </div>
      {source && !limited ? (
        <div className="mt-8">
          <SourceCredit source={source} closed={false} />
        </div>
      ) : null}
    </PageFrame>
  );
}
