"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Form } from "@/lib/ilmunta/conjugate";
import { romajiToKana } from "@/lib/kana/text";
import { RubyWord } from "./ruby-word";

/**
 * 일본어 입력기로 치거나, 로마자로 치면 가나로 바꿔 보여 준다.
 * 답한 뒤(`locked`)에도 입력칸을 그대로 두어 휴대폰 자판이 닫히지 않게 하고,
 * 그때 Enter(확인)를 누르면 `onNext`로 다음 문제로 넘어간다.
 */
export function TypeAnswer({
  onSubmit,
  locked,
  onNext,
}: {
  onSubmit: (text: string) => void;
  locked?: boolean;
  onNext?: () => void;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const romaji = /^[a-zA-Z' -]+$/.test(text.trim());
  const submit = () => {
    if (locked) {
      onNext?.();
      return;
    }
    if (!text.trim()) return;
    onSubmit(text);
    setText("");
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <input
          ref={ref}
          lang="ja"
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={locked}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="ひらがな · 漢字 · romaji"
          aria-label="답"
          className="min-w-0 flex-1 rounded-2xl border border-line bg-bg-sunken px-4 py-3 font-ja text-2xl outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={locked ? !onNext : !text.trim()}
          className="rounded-2xl bg-accent px-5 font-bold whitespace-nowrap text-white disabled:opacity-40"
        >
          {locked ? "다음" : "확인"}
        </button>
      </div>
      <p lang="ja" className="h-6 px-1 font-ja text-lg text-ink-soft">
        {romaji ? romajiToKana(text.trim(), "hira") : ""}
      </p>
    </form>
  );
}

/** 틀린 뒤 규칙을 읽고 넘기는 단추. 나타나면 초점을 받아 Enter로도 넘긴다 */
export function NextButton({ onClick }: { onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-accent py-4 text-lg font-bold text-white"
    >
      다음
    </button>
  );
}

/** 보기 가운데 고르기 */
export function ChooseAnswer({
  choices,
  onPick,
  disabled,
  picked,
  correct,
}: {
  choices: Form[];
  onPick: (choice: Form) => void;
  disabled?: boolean;
  /** 고른 보기(답한 뒤 표시용) */
  picked?: Form | null;
  /** 정답(답한 뒤 표시용) */
  correct?: Form | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {choices.map((c) => {
        const isAnswer = correct && c.reading === correct.reading;
        const isPicked = picked && c.reading === picked.reading;
        return (
          <button
            key={c.reading}
            type="button"
            disabled={disabled}
            onClick={() => onPick(c)}
            className={cn(
              "rounded-2xl border border-line bg-bg-raised px-4 py-3 text-left text-2xl active:bg-bg-sunken",
              isAnswer && "border-good bg-good/15",
              isPicked && !isAnswer && "border-accent bg-accent-soft",
            )}
          >
            <RubyWord form={c} showRuby={false} />
          </button>
        );
      })}
    </div>
  );
}
