import { skillsOfLesson } from "@/lib/ilmunta/curriculum";
import { type Question as DrillQuestion, wordOf } from "@/lib/ilmunta/question";
import type { Rng } from "@/lib/ilmunta/random";
import { rubyPlain } from "@/lib/ilmunta/ruby-text";
import { makeDrillQuestion } from "@/lib/ilmunta/sentence";
import { pickSkill } from "@/lib/ilmunta/weakness";
import type { CardState } from "@/lib/kana/srs";
import { QUESTIONS_PER_SECTION } from "./pick";
import type { ChoiceQuestion } from "./types";

// 일문따 과 화면 끝의 확인 문제. 일문따는 소책자 예문 글이 없어, 그 과에서 다루는 활용을
// 활용 드릴과 같은 문장 빈칸 문제로 낸다(기록도 드릴의 간격 반복 기술 기록에 그대로 쌓인다).

/** 드릴 문제를 확인 문제 꼴로. 빈칸 앞뒤 글은 `[漢字|かな]` 표기 그대로 둔다(화면이 후리가나로 그린다) */
export function fromDrill(q: DrillQuestion, lesson: number): ChoiceQuestion {
  const answer = q.choices.findIndex((c) => c.reading === q.answer.reading);
  const options = q.choices.map((c) => ({
    label: c.kanji,
    ja: true,
    reading: c.reading,
  }));
  return {
    type: "choice",
    key: `L${lesson}:d:${q.id}`,
    lesson,
    section: "drill",
    prompt: q.sentence
      ? {
          kind: "blank",
          before: q.sentence.before,
          after: q.sentence.after,
          ko: q.sentence.ko,
          markup: true,
          // 시제·정중함은 문장이 알려 주므로 만들 꼴 이름은 보이지 않는다(드릴과 같다)
          ask: `빈칸에 알맞은 ${q.given.kanji}(${q.given.ko})의 꼴은?`,
        }
      : {
          kind: "word",
          word: { ja: q.given.kanji, reading: q.given.reading },
          ask: `${q.givenTag} → ${q.target.label}(${q.target.ko})`,
        },
    options,
    answer: Math.max(answer, 0),
    explain: q.rule,
    reveal: q.sentence
      ? {
          ja: rubyPlain(
            `${q.sentence.before}${q.answer.kanji}${q.sentence.after}`,
          ),
          ko: q.sentence.ko,
        }
      : undefined,
  };
}

/** 이 과 활용으로 확인 문제 몇 개. 복습할 때가 된·약한 기술을 먼저(드릴과 같은 고르기) */
export function drillQuizQuestions(
  lesson: number,
  states: Readonly<Record<string, CardState>>,
  rng: Rng,
  now: number,
  count = QUESTIONS_PER_SECTION,
): { questions: ChoiceQuestion[]; skillOf: Map<string, string> } {
  const skills = skillsOfLesson(lesson);
  const questions: ChoiceQuestion[] = [];
  const skillOf = new Map<string, string>();
  let prev: DrillQuestion | undefined;
  for (let i = 0; i < count && skills.length > 0; i++) {
    const skill = pickSkill(skills, states, now, rng, prev?.skillKey);
    const q = makeDrillQuestion(
      skill,
      "sentence",
      rng,
      prev ? wordOf(prev.id) : undefined,
      lesson,
    );
    if (q.choices.length < 2) continue;
    const c = fromDrill(q, lesson);
    if (questions.some((x) => x.key === c.key)) continue;
    questions.push(c);
    skillOf.set(c.key, q.skillKey);
    prev = q;
  }
  return { questions, skillOf };
}
