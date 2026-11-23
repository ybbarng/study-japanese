"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Question, SentenceView } from "@/lib/ilmunta/question";
import { RubyText } from "./ruby-text";
import { RubyWord } from "./ruby-word";

/**
 * 문장 빈칸 문제: 짧은 일본어 문장 속 빈칸에 기본형(見る→ ＿)을 두고 문맥에 맞는 꼴을 쓰게 한다.
 * 시제·정중함·부정은 문장(昨日, 先生、, あまり)이 알려 주고, 한국어 뜻은 눌러야 보인다.
 * 부르는 쪽이 문제마다 `key`를 바꿔 뜻 가리개를 다시 닫는다. 정답을 채운 문장은 답한 뒤 피드백이 보인다.
 */
export function SentenceCard({
  q,
  sentence,
}: {
  q: Question;
  sentence: SentenceView;
}) {
  const [showKo, setShowKo] = useState(false);
  return (
    <div className="flex flex-col gap-4 py-2">
      <span className="text-xs text-ink-faint">{q.givenTag}</span>
      <SentenceLine sentence={sentence}>
        <span
          data-testid="drill-blank"
          className="mx-1 inline-flex items-baseline gap-1 rounded-xl border-2 border-dashed border-accent px-2"
        >
          <RubyWord form={q.given} className="text-[0.8em]" />
          <span className="text-[0.7em] text-accent" aria-hidden>
            →
          </span>
          <span className="inline-block w-[1.5em]" />
        </span>
      </SentenceLine>
      <p className="text-sm text-ink-soft">
        <span lang="ja" className="font-ja">
          {q.given.kanji}
        </span>
        : {q.given.ko}
      </p>
      <button
        type="button"
        onClick={() => setShowKo((v) => !v)}
        aria-expanded={showKo}
        className={cn(
          "rounded-2xl border border-line px-4 py-3 text-left",
          showKo ? "bg-bg-raised" : "text-ink-faint",
        )}
      >
        {showKo ? sentence.ko : "뜻 보기"}
      </button>
    </div>
  );
}

/** 문장 한 줄. 가운데(children)에 빈칸이나 정답이 들어간다 */
export function SentenceLine({
  sentence,
  children,
  className,
}: {
  sentence: SentenceView;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      lang="ja"
      className={cn(
        "font-ja text-2xl leading-[2.4] lg:text-4xl lg:leading-[2.2]",
        className,
      )}
    >
      <RubyText src={sentence.before} />
      {children}
      <RubyText src={sentence.after} />
    </p>
  );
}
