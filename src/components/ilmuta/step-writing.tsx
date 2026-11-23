"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import {
  draftKey,
  initialTexts,
  parseDraft,
  toWritingDoc,
} from "@/lib/ilmuta/writing-draft";
import type { WritingDoc } from "@/lib/store/writings";
import type { StepProps } from "./lesson-types";
import { WritingReference } from "./writing-reference";

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
  const { lesson } = data;
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
      {/* PC에서는 같은 참고가 오른쪽 곁칸에 펼쳐져 있다 */}
      <div className="lg:hidden">
        <WritingReference data={data} layout="fold" />
      </div>
      <p className="hidden text-sm text-ink-soft lg:block">
        오른쪽 문형을 보며 실제 키보드로 써 보세요. 일본어 입력기로 쳐도 되고,
        세션이 읽고 고쳐 줍니다.
      </p>

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
                onKeyDown={(e) => {
                  // PC: Ctrl·Cmd+Enter로 저장(입력기 변환 중 Enter는 변환 확정이라 건드리지 않는다)
                  if (
                    e.key === "Enter" &&
                    (e.metaKey || e.ctrlKey) &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    if (save === "dirty" || save === "offline") void onSave();
                  }
                }}
                rows={2}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="日本語で一文"
                className="mt-1 w-full resize-none rounded-2xl border border-line bg-bg-sunken p-4 text-2xl leading-relaxed outline-none focus:border-accent lg:min-h-28 lg:resize-y lg:p-5 lg:text-3xl"
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
          저장하기 전 글은 이 기기에 남아 있습니다.
        </p>
      ) : null}
      <p className="hidden text-center text-xs text-ink-faint lg:block">
        <kbd className="font-mono">Ctrl</kbd>·<kbd className="font-mono">⌘</kbd>
        +<kbd className="font-mono">Enter</kbd>로 저장
      </p>
    </div>
  );
}
