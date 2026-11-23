"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { examplesOf } from "@/lib/ilmuta/steps";
import {
  draftKey,
  initialTexts,
  parseDraft,
  toWritingDoc,
} from "@/lib/ilmuta/writing-draft";
import type { WritingDoc } from "@/lib/store/writings";
import type { StepProps } from "./lesson-types";
import { RubyText } from "./ruby-text";

type SaveState = "saved" | "dirty" | "saving" | "offline";

function readDraft(no: number) {
  try {
    return parseDraft(localStorage.getItem(draftKey(no)));
  } catch {
    return null;
  }
}

function writeDraft(no: number, texts: string[] | null) {
  try {
    if (texts === null) localStorage.removeItem(draftKey(no));
    else
      localStorage.setItem(
        draftKey(no),
        JSON.stringify({ texts, updatedAt: Date.now() }),
      );
  } catch {
    // 저장 공간을 못 쓰면 초안만 잃는다
  }
}

/** 문장 3개 쓰기: 그 강 문형을 보며 스스로 만든다. 세션이 읽고 고쳐 준다 */
export function StepWriting({ data }: StepProps) {
  const { lesson, glossary } = data;
  const [doc, setDoc] = useState<WritingDoc | null>(data.writing);
  const [texts, setTexts] = useState(
    () => initialTexts(data.writing, null).texts,
  );
  const [save, setSave] = useState<SaveState>("saved");

  // 저장 안 한 초안은 화면이 뜬 뒤 폰에서 꺼낸다(서버 렌더와 어긋나지 않게)
  useEffect(() => {
    const init = initialTexts(data.writing, readDraft(lesson.no));
    if (init.fromDraft) {
      setTexts(init.texts);
      setSave("dirty");
    }
  }, [data.writing, lesson.no]);

  const patterns = examplesOf(lesson, "patterns");
  const heads = patterns.flatMap((e) => e.patterns ?? []);
  const words = examplesOf(lesson, "words").flatMap((e) => e.sentences);

  const onChange = (i: number, value: string) => {
    const next = texts.map((t, j) => (j === i ? value : t));
    setTexts(next);
    setSave("dirty");
    writeDraft(lesson.no, next);
  };

  const onSave = async () => {
    setSave("saving");
    try {
      const res = await fetch("/api/writings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toWritingDoc(lesson.no, texts, Date.now())),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { current } = (await res.json()) as { current: WritingDoc };
      setDoc(current);
      setTexts(initialTexts(current, null).texts);
      writeDraft(lesson.no, null);
      setSave("saved");
    } catch {
      setSave("offline");
    }
  };

  return (
    <div className="space-y-5">
      {heads.length > 0 ? (
        <section className="rounded-2xl bg-bg-raised p-4">
          <h2 className="text-sm text-ink-faint">이 강의 문형</h2>
          <ul className="mt-2 space-y-2">
            {heads.map((p) => (
              <li key={p.no}>
                <span lang="ja" className="font-ja-serif text-xl">
                  {p.ja}
                </span>
                <span className="ml-2 text-sm text-ink-soft">{p.ko}</span>
              </li>
            ))}
          </ul>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-ink-faint">
              막히면 예문·단어 보기
            </summary>
            <ul className="mt-2 space-y-1">
              {patterns
                .flatMap((e) => e.sentences)
                .slice(0, 8)
                .map((s) => (
                  <li key={s.ja}>
                    <RubyText text={s.ja} glossary={glossary} />
                    <span className="ml-2 text-ink-faint">{s.ko}</span>
                  </li>
                ))}
            </ul>
            {words.length > 0 ? (
              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                {words.map((w) => (
                  <span key={w.ja}>
                    <RubyText text={w.ja} reading={w.reading} />
                    <span className="ml-1 text-ink-faint">{w.ko}</span>
                  </span>
                ))}
              </p>
            ) : null}
          </details>
        </section>
      ) : null}

      <ol className="space-y-4">
        {texts.map((t, i) => {
          const s = doc?.sentences[i];
          const corrected = s?.text === t.trim() ? s : undefined;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: 칸 차례가 곧 열쇠다
            <li key={i}>
              <label
                className="block text-sm text-ink-faint"
                htmlFor={`w-${i}`}
              >
                문장 {i + 1}
              </label>
              <textarea
                id={`w-${i}`}
                lang="ja"
                value={t}
                onChange={(e) => onChange(i, e.target.value)}
                rows={2}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="日本語で一文"
                className="mt-1 w-full resize-none rounded-2xl border border-line bg-bg-sunken p-4 text-2xl leading-relaxed outline-none focus:border-accent"
              />
              {corrected?.correction ? (
                <div className="mt-2 rounded-xl bg-accent-soft p-3 text-sm">
                  <p lang="ja" className="text-lg text-accent">
                    {corrected.correction}
                  </p>
                  {corrected.note ? (
                    <p className="mt-1 text-ink-soft">{corrected.note}</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={onSave}
        disabled={save === "saving" || save === "saved"}
        className={cn(
          "w-full rounded-2xl py-4 text-lg font-medium",
          save === "saved"
            ? "bg-bg-raised text-ink-faint"
            : "bg-accent text-white",
        )}
      >
        {save === "saved"
          ? "저장됨"
          : save === "saving"
            ? "저장하는 중…"
            : save === "offline"
              ? "저장 못 함 · 다시 저장"
              : "저장"}
      </button>
      {save === "dirty" || save === "offline" ? (
        <p className="text-center text-xs text-ink-faint">
          저장하기 전 글은 이 폰에 남아 있습니다.
        </p>
      ) : null}
    </div>
  );
}
