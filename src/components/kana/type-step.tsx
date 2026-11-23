"use client";

import { useEffect, useRef, useState } from "react";
import type { Word } from "@/lib/kana/lessons";
import {
  kanaToRomaji,
  romajiToKana,
  sameKana,
  scriptOf,
} from "@/lib/kana/text";
import s from "./kana.module.css";
import { cn, Glyph, PrimaryButton, SecondaryButton } from "./ui";

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

/**
 * 보여 준 낱말을 쳐 본다. 일본어 입력기(로마자 입력)로 쳐도 되고,
 * 입력기가 없으면 영문 자판이나 화면 로마자 버튼으로 쳐도 가나로 바꿔 준다.
 */
export function TypeStep({
  words,
  onDone,
  onProgress,
}: {
  words: Word[];
  onDone: () => void;
  onProgress: (f: number) => void;
}) {
  const [i, setI] = useState(0);
  const [raw, setRaw] = useState("");
  const [keypad, setKeypad] = useState(false);
  const [state, setState] = useState<"typing" | "right" | "wrong">("typing");
  const [hint, setHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const word = words[i];
  const script = scriptOf(word.kana);

  useEffect(() => onProgress(i / words.length), [i, words.length, onProgress]);

  const preview = romajiToKana(raw, script);
  const finalText = romajiToKana(raw, script, true);

  const advance = () => {
    if (i + 1 >= words.length) {
      onDone();
      return;
    }
    setI(i + 1);
    setRaw("");
    setHint(false);
    setState("typing");
  };

  const check = () => {
    if (sameKana(finalText, word.kana)) {
      setState("right");
      setTimeout(advance, 800);
    } else {
      setState("wrong");
    }
  };

  const press = (k: string) => {
    setState("typing");
    if (k === "⌫") setRaw((r) => r.slice(0, -1));
    else setRaw((r) => r + k);
  };

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-sm text-ink-soft">
        보이는 낱말을 쳐 보세요
      </p>
      <div
        key={i}
        className={cn(
          "flex flex-col items-center gap-2 py-6",
          s.enter,
          state === "right" && s.pop,
        )}
      >
        <Glyph className="text-6xl">{word.kana}</Glyph>
        <p className="text-ink-soft">{word.meaning}</p>
        <button
          type="button"
          onClick={() => setHint(true)}
          className="h-6 text-sm text-ink-faint"
        >
          {hint ? (
            <span className="font-mono text-ink-soft">
              {kanaToRomaji(word.kana, true)}
            </span>
          ) : (
            "칠 철자 보기"
          )}
        </button>
      </div>

      <div
        className={cn(
          "rounded-2xl border-2 bg-bg-sunken px-4 py-3",
          state === "wrong"
            ? cn("border-accent", s.shake)
            : state === "right"
              ? "border-good"
              : "border-line",
        )}
      >
        <input
          ref={inputRef}
          lang="ja"
          value={raw}
          readOnly={keypad}
          inputMode={keypad ? "none" : "text"}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => {
            setRaw(e.target.value);
            setState("typing");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) check();
          }}
          placeholder="여기에 입력"
          className="w-full bg-transparent text-2xl outline-none placeholder:text-ink-faint"
          aria-label="입력 칸"
        />
        {/[a-z]/i.test(raw) && (
          <p lang="ja" className="pt-1 text-xl text-accent">
            {preview}
          </p>
        )}
      </div>
      <p className="h-6 pt-1 text-sm text-accent">
        {state === "wrong" && "다시 한번 확인해 보세요"}
        {state === "right" && <span className="text-good">맞았어요!</span>}
      </p>

      {keypad && (
        <div className="flex flex-col gap-1.5 pt-1">
          {[...KEY_ROWS, "-⌫"].map((row) => (
            <div key={row} className="flex justify-center gap-1.5">
              {[...row].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => press(k)}
                  className={cn(
                    "h-11 flex-1 rounded-lg bg-bg-raised font-mono text-lg active:bg-accent-soft",
                    (k === "⌫" || k === "-") && "max-w-24",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <button
          type="button"
          onClick={() => {
            setKeypad(!keypad);
            if (keypad) inputRef.current?.focus();
          }}
          className="text-sm text-ink-soft underline"
        >
          {keypad ? "폰 자판으로 치기" : "입력기가 없어요 · 화면 로마자 버튼"}
        </button>
        <div className="flex gap-3">
          <SecondaryButton className="w-28 shrink-0" onClick={advance}>
            넘기기
          </SecondaryButton>
          <PrimaryButton onClick={check} disabled={raw.trim() === ""}>
            확인
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
