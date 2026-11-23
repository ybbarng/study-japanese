"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { typedKind } from "@/lib/ime/japanese";

const VERDICT = {
  empty: { text: "입력기를 일본어로 바꾸고 nihongo를 쳐 보세요", ok: false },
  japanese: { text: "입력기 준비됨 — 일본어가 들어옵니다", ok: true },
  latin: {
    text: "로마자 그대로 들어옵니다. 입력기를 일본어로 바꿨는지 확인해 보세요",
    ok: false,
  },
  other: {
    text: "한국어로 들어옵니다. 일본어 입력기로 바꿔 보세요",
    ok: false,
  },
} as const;

/** 입력기가 켜졌는지 시험해 보는 칸. 가나·한자가 들어오면 준비됨 */
export function ImeTester() {
  const [text, setText] = useState("");
  const verdict = VERDICT[typedKind(text)];
  return (
    <section className="rounded-2xl bg-bg-raised px-4 py-4">
      <h2 className="text-lg font-medium">시험해 보기</h2>
      <p className="mt-1 text-sm text-ink-soft">
        <span className="font-mono">nihongo</span>를 치면 にほんご로 바뀌고,
        스페이스를 누르면 日本語 같은 한자 후보가 나옵니다. Enter로 확정합니다.
      </p>
      <input
        lang="ja"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="여기에 쳐 보기"
        aria-label="입력기 시험 칸"
        className="mt-3 w-full rounded-2xl border border-line bg-bg-sunken px-4 py-3 font-ja text-2xl outline-none focus:border-accent"
      />
      <p
        role="status"
        className={cn(
          "mt-2 text-sm",
          verdict.ok ? "font-bold text-good" : "text-ink-soft",
        )}
      >
        {verdict.text}
      </p>
    </section>
  );
}
