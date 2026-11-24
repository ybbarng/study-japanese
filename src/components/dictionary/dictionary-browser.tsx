"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DictSummary } from "@/lib/dictionary/entries";
import { searchDictionary } from "@/lib/dictionary/search";
import { lessonLabel } from "@/lib/ilmuta/labels";
import { posLabel } from "@/lib/songs/words";
import { wordHref } from "./word-href";

interface Props {
  entries: DictSummary[];
  initialQuery: string;
}

/** 강마다 묶기. 일무따 강이 없는 낱말(드릴 낱말)은 맨 뒤 */
function groupByLesson(entries: readonly DictSummary[]) {
  const groups = new Map<number | null, DictSummary[]>();
  for (const e of entries) {
    const key = e.firstLesson;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()].sort(([a], [b]) => (a ?? 999) - (b ?? 999));
}

/** 낱말 사전 찾기와 강별 목록. 찾는 말은 주소(?q=)에 남겨 뒤로 가기로 돌아온다 */
export function DictionaryBrowser({ entries, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const found = useMemo(
    () => searchDictionary(entries, query),
    [entries, query],
  );
  const groups = useMemo(() => groupByLesson(entries), [entries]);

  const onChange = (q: string) => {
    setQuery(q);
    const url = q ? `?q=${encodeURIComponent(q)}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-soft">
          낱말 찾기 — 일본어(히라가나·가타카나·한자), 로마자, 한국어 뜻
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="예: やま, yama, 산"
          lang="ja"
          className="rounded-xl border border-line bg-bg-sunken px-4 py-3 text-lg"
        />
      </label>

      {query.trim() ? (
        <section aria-label="찾은 낱말">
          <p className="text-sm text-ink-faint">
            {found.length > 0 ? `${found.length}개` : "찾은 낱말이 없습니다."}
          </p>
          <WordGrid entries={found} />
        </section>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-faint">
            낱말 {entries.length}개 · 처음 배운 강 차례
          </p>
          {groups.map(([lesson, list], i) => (
            <details
              key={lesson ?? "drill"}
              open={i < 2}
              className="group rounded-2xl bg-bg-raised p-4"
            >
              <summary className="cursor-pointer list-none text-lg font-medium">
                <span className="group-open:hidden">▸</span>
                <span className="hidden group-open:inline">▾</span>{" "}
                {lesson === null
                  ? "일문따 드릴 낱말"
                  : `일무따 ${lessonLabel(lesson)}`}{" "}
                <span className="text-sm text-ink-faint">{list.length}개</span>
              </summary>
              <WordGrid entries={list} />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function WordGrid({ entries }: { entries: readonly DictSummary[] }) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {entries.map((e) => (
        <li key={e.id}>
          <Link
            href={wordHref(e.id)}
            className="flex h-full flex-col rounded-xl border border-line px-3 py-2 hover:border-accent"
          >
            <span className="flex items-baseline gap-2">
              <span lang="ja" className="font-ja-serif text-xl">
                {e.word}
              </span>
              {e.readings[0] && e.readings[0] !== e.word ? (
                <span lang="ja" className="text-sm text-ink-soft">
                  {e.readings.join("・")}
                </span>
              ) : null}
              {e.pos[0] ? (
                <span className="ml-auto text-xs text-ink-faint">
                  {posLabel(e.pos[0])}
                </span>
              ) : null}
            </span>
            <span className="truncate text-sm text-ink-soft">
              {e.glosses.slice(0, 2).join(" · ")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
