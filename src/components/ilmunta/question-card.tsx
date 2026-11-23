import type { Question } from "@/lib/ilmunta/question";
import { RubyWord } from "./ruby-word";

/** 문제: 주어진 낱말(읽는 법·뜻)과 만들 꼴 */
export function QuestionCard({ q }: { q: Question }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <span className="text-xs text-ink-faint">{q.givenTag}</span>
      <RubyWord form={q.given} className="text-5xl leading-tight lg:text-7xl" />
      <span className="text-sm text-ink-soft">{q.given.ko}</span>
      <span className="mt-3 text-ink-faint" aria-hidden>
        ↓
      </span>
      <span
        lang="ja"
        className="rounded-full bg-accent-soft px-4 py-1.5 text-xl font-bold text-accent"
      >
        {q.target.label}
      </span>
      <span className="text-sm text-ink-soft">{q.target.ko}</span>
    </div>
  );
}
