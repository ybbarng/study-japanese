"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { GrammarNote } from "@/lib/songs/analysis";
import type { SongLine } from "@/lib/songs/schema";
import { formatLineTime } from "@/lib/songs/timing";
import type { SongWord } from "@/lib/songs/words";
import { GrammarNotes } from "./grammar-notes";
import { LineWords } from "./line-words";

interface Props {
  line: SongLine;
  index: number;
  /** 분석의 낱말(분석이 없거나 이 줄 글이 바뀌었으면 빈 배열, 글만 보인다) */
  words: SongWord[];
  /** 분석의 문법 메모 */
  grammar: readonly GrammarNote[];
  current: boolean;
  /** 반복 구간 안의 줄 */
  inLoop: boolean;
  showReading: boolean;
  /** 가사를 가린 채 듣는 중이고 이 줄은 아직 열지 않았다 */
  covered: boolean;
  onReveal: () => void;
  selectedWord: number;
  onSelectWord: (word: number) => void;
  known: boolean;
  onToggleKnown: () => void;
  /** 관리자만: 이 줄부터 듣기 */
  onPlayFrom?: () => void;
  /** 관리자만: 메모 고치기 */
  onSaveNote?: (note: string) => Promise<boolean>;
}

/** 가사 한 줄: 시작 시각(누르면 그 줄부터), 낱말, 익힘 표시, 메모 */
export function LyricLine({
  line,
  index,
  words,
  grammar,
  current,
  inLoop,
  showReading,
  covered,
  onReveal,
  selectedWord,
  onSelectWord,
  known,
  onToggleKnown,
  onPlayFrom,
  onSaveNote,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(line.note ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!onSaveNote) return;
    setSaving(true);
    const ok = await onSaveNote(draft.trim());
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <li
      data-line={index}
      aria-current={current ? "true" : undefined}
      className={cn(
        "flex gap-3 rounded-2xl px-2 py-2 transition-colors lg:gap-4 lg:px-3",
        current && "bg-accent-soft",
        inLoop && !current && "bg-bg-raised",
      )}
    >
      {onPlayFrom ? (
        <button
          type="button"
          onClick={onPlayFrom}
          disabled={line.start === undefined}
          aria-label={`${index + 1}번째 줄부터 듣기`}
          title={
            line.start === undefined
              ? "박자 맞추기에서 이 줄의 시작을 정하면 눌러 들을 수 있습니다"
              : "이 줄부터 듣기"
          }
          className="mt-2 shrink-0 rounded-lg px-1 py-1 text-left font-mono text-xs whitespace-nowrap text-ink-faint hover:bg-bg-raised disabled:opacity-40"
        >
          ▶ {formatLineTime(line.start)}
        </button>
      ) : (
        <span className="mt-2 w-6 shrink-0 text-right font-mono text-xs text-ink-faint">
          {index + 1}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "font-ja-serif text-2xl lg:text-3xl",
            current ? "text-ink" : known ? "text-ink-soft" : "text-ink",
          )}
        >
          {covered ? (
            <button
              type="button"
              onClick={onReveal}
              className="w-full rounded-lg text-left"
              aria-label={`${index + 1}번째 줄 보기`}
            >
              <span lang="ja" className="blur-md select-none" aria-hidden>
                {line.ja}
              </span>
            </button>
          ) : words.length > 0 ? (
            <LineWords
              words={words}
              showReading={showReading}
              selected={selectedWord}
              onSelect={onSelectWord}
            />
          ) : (
            <span lang="ja">{line.ja}</span>
          )}
        </div>

        {covered ? null : <GrammarNotes notes={grammar} index={index} />}

        {editing ? (
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={1000}
              aria-label={`${index + 1}번째 줄 메모`}
              className="w-full rounded-xl border border-line bg-bg-sunken p-3 text-sm"
            />
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-accent px-3 py-1 text-white disabled:opacity-60"
              >
                {saving ? "저장 중…" : "메모 저장"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(line.note ?? "");
                  setEditing(false);
                }}
                className="rounded-lg px-3 py-1 text-ink-soft hover:bg-bg-raised"
              >
                그만두기
              </button>
            </div>
          </div>
        ) : line.note ? (
          <p className="mt-1 text-sm whitespace-pre-line text-ink-soft">
            {line.note}
          </p>
        ) : null}
      </div>

      <div className="mt-1 flex shrink-0 flex-col items-end gap-1">
        <button
          type="button"
          onClick={onToggleKnown}
          aria-pressed={known}
          aria-label={`${index + 1}번째 줄 익힘`}
          title="이 줄을 익혔으면 표시"
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full border text-sm",
            known
              ? "border-good bg-good/15 text-good"
              : "border-line text-ink-faint hover:bg-bg-raised",
          )}
        >
          ✓
        </button>
        {onSaveNote && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg px-1.5 py-0.5 text-xs text-ink-faint hover:bg-bg-raised"
          >
            메모
          </button>
        ) : null}
      </div>
    </li>
  );
}
