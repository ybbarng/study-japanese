"use client";

import { useState } from "react";
import { playText } from "@/components/kana/audio";
import { useWordVoice } from "@/components/kana/ui";
import { cn } from "@/lib/cn";
import { WORD_VOICE_NOTE } from "@/lib/kana/voice";

/**
 * 교재 소리가 없는 일본어(드릴 문장, 사전 낱말)를 기기 음성 합성으로 읽는 작은 단추.
 * 어떤 소리인지("기계 음성" 또는 글자 소리 잇기)를 곁에 적는다.
 */
export function SpeakButton({
  text,
  kana,
  label = "기계 음성으로 듣기",
  className,
}: {
  /** 보이는 글(한자 섞임). 음성 합성이 읽는다 */
  text: string;
  /** 읽는 법(가나). 음성이 없는 기기에서 글자 소리를 잇는다 */
  kana: string;
  label?: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const voice = useWordVoice(true);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <button
        type="button"
        aria-label={label}
        data-speak={text}
        onClick={async () => {
          setPlaying(true);
          await playText(text, kana);
          setPlaying(false);
        }}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent transition active:scale-95",
          playing && "bg-accent text-white",
        )}
      >
        🔊
      </button>
      <span className="text-xs text-ink-faint">{WORD_VOICE_NOTE[voice]}</span>
    </span>
  );
}
