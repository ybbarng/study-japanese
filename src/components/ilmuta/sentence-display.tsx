"use client";

import { useState } from "react";
import { TapSentence } from "@/components/word-tap/tap-sentence";
import { WordTapHint } from "@/components/word-tap/word-tap-hint";
import { cn } from "@/lib/cn";
import type { Glossary } from "@/lib/ilmuta/ruby";
import type { Sentence } from "@/lib/textbook/schema";
import { RubyText } from "./ruby-text";
import { type Toggle, ToggleChips } from "./toggle-chips";

export interface Display {
  ja: boolean;
  reading: boolean;
  ko: boolean;
}

/**
 * 일본어·읽는 법·뜻 스위치와 문장마다 "눌러서 보기".
 * 일본어를 끄면 뜻만 보고 일본어를 떠올리는 연습, 뜻을 끄면 듣고 뜻을 떠올리는 연습이 된다.
 */
export function useSentenceDisplay() {
  const [display, setDisplay] = useState<Display>({
    ja: true,
    reading: true,
    ko: true,
  });
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const toggles: Toggle[] = [
    { id: "ja", label: "일본어", on: display.ja },
    { id: "reading", label: "읽는 법", on: display.reading },
    { id: "ko", label: "뜻", on: display.ko },
  ];
  const chips = (
    <div className="space-y-2">
      <ToggleChips
        toggles={toggles}
        onChange={(id, on) => {
          setDisplay((d) => ({ ...d, [id]: on }));
          setRevealed(new Set());
        }}
      />
      <WordTapHint />
    </div>
  );
  return {
    display,
    chips,
    isRevealed: (key: string) => revealed.has(key),
    reveal: (key: string) => setRevealed((s) => new Set(s).add(key)),
  };
}

interface Props {
  sentence: Sentence;
  glossary: Glossary;
  display: Display;
  revealed: boolean;
  onReveal: () => void;
  size?: "lg" | "md";
}

/** 문장 하나. 가린 부분은 눌러서 연다 */
export function SentenceView({
  sentence,
  glossary,
  display,
  revealed,
  onReveal,
  size = "lg",
}: Props) {
  const showJa = display.ja || revealed;
  const showKo = display.ko || revealed;
  const hidden = !showJa || !showKo;
  const jaClass = cn(
    "block leading-loose",
    // PC에서는 넓이를 살려 한 단계 크게(책보다 큰 글자로 읽는 법까지)
    size === "lg" ? "text-2xl lg:text-3xl" : "text-xl lg:text-2xl",
  );
  const plainJa = (
    <RubyText
      text={sentence.ja}
      glossary={glossary}
      showReading={display.reading}
      className={jaClass}
    />
  );
  const body = (
    <>
      {showJa ? (
        // 가린 문장(단추 안)에서는 낱말을 누르지 않는다. 다 보일 때만 낱말마다 누른다
        hidden ? (
          plainJa
        ) : (
          <TapSentence
            ja={sentence.ja}
            showReading={display.reading}
            className={jaClass}
            fallback={plainJa}
          />
        )
      ) : (
        <span className="block text-2xl tracking-widest text-ink-faint">
          ・・・
        </span>
      )}
      {showKo ? (
        <span className="block text-ink-soft lg:text-lg">{sentence.ko}</span>
      ) : (
        <span className="block text-sm text-ink-faint">뜻은?</span>
      )}
    </>
  );
  if (!hidden) return <div>{body}</div>;
  return (
    <button
      type="button"
      onClick={onReveal}
      className="block w-full text-left"
      aria-label="가린 부분 보기"
    >
      {body}
    </button>
  );
}
