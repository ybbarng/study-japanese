import { SpeakButton } from "@/components/speech/speak-button";
import { cn } from "@/lib/cn";
import { splitChange } from "@/lib/ilmunta/check";
import type { Question } from "@/lib/ilmunta/question";
import { drillSpeech } from "@/lib/ilmunta/speech";
import { RubyWord } from "./ruby-word";
import { SentenceLine } from "./sentence-card";

/**
 * 답한 뒤: 정답을 읽는 법과 함께 크게, 바뀐 끝을 색으로(飲|む → 飲|んで), 틀렸으면 규칙 한 줄.
 * 책의 활용표보다 나은 점: 내가 지금 틀린 그 동사에서 바뀌는 자리만 짚는다.
 */
export function AnswerFeedback({
  q,
  correct,
  given,
}: {
  q: Question;
  correct: boolean;
  given?: string;
}) {
  const change = splitChange(q.given.kanji, q.answer.kanji);
  const others = q.accepted.slice(1);
  const speech = drillSpeech(q);
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl p-5",
        correct ? "bg-good/10" : "bg-accent-soft",
      )}
      aria-live="polite"
    >
      <p className={cn("font-bold", correct ? "text-good" : "text-accent")}>
        {correct ? "맞았어요" : "다시 보기"}
        {!correct && given ? (
          <span
            lang="ja"
            className="ml-2 font-ja font-normal text-ink-soft line-through"
          >
            {given}
          </span>
        ) : null}
      </p>
      <RubyWord form={q.answer} className="text-4xl" />
      {change.stem && change.to ? (
        <p lang="ja" className="font-ja text-lg text-ink-soft">
          {change.stem}
          <span className="text-ink-faint line-through">{change.from}</span>
          <span className="mx-1 text-ink-faint">→</span>
          {change.stem}
          <span className="font-bold text-accent">{change.to}</span>
        </p>
      ) : null}
      <p className="text-sm">{q.rule}</p>
      {q.sentence ? (
        <div data-testid="drill-filled" className="border-t border-line pt-3">
          <SentenceLine sentence={q.sentence} className="text-xl lg:text-2xl">
            <span className="font-bold text-accent">
              <RubyWord form={q.answer} />
            </span>
          </SentenceLine>
          <p className="text-sm text-ink-soft">{q.sentence.ko}</p>
        </div>
      ) : null}
      {/* 드릴 문장은 교재 소리가 없어 기기 음성으로 읽는다(답한 뒤라 정답을 미리 들려주지 않는다) */}
      <SpeakButton
        {...speech}
        label={q.sentence ? "이 문장 듣기" : "이 꼴 듣기"}
      />
      {others.length > 0 ? (
        <p className="text-sm text-ink-soft">
          이것도 맞아요:{" "}
          <span lang="ja" className="font-ja">
            {others.map((o) => o.kanji).join(" · ")}
          </span>
        </p>
      ) : null}
    </div>
  );
}
