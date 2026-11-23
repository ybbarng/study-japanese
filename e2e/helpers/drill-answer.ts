import { SKILLS } from "@/lib/ilmunta/curriculum";
import { makeQuestion, type Question } from "@/lib/ilmunta/question";
import { seededRng } from "@/lib/ilmunta/random";

// 드릴은 문제를 무작위로 낸다. 화면에 보인 문제 글로 답을 찾으려고, 드릴과 같은 문제 만들기 함수로
// 나올 수 있는 문제를 미리 모두 만들어 둔다. 기술마다 씨앗 1000개면 모든 문제(약 5천 개)가 다 나온다.
const SEEDS_PER_SKILL = 1000;

let all: Question[] | null = null;

function allQuestions(): Question[] {
  if (all) return all;
  const byId = new Map<string, Question>();
  for (const skill of SKILLS)
    for (let seed = 1; seed <= SEEDS_PER_SKILL; seed++) {
      const q = makeQuestion(skill, seededRng(seed));
      byId.set(`${q.id}|${q.target.label}`, q);
    }
  all = [...byId.values()];
  return all;
}

/** 문제 카드에 보인 글(읽는 법 루비는 뺀다) */
export interface CardText {
  givenTag: string;
  given: string;
  givenKo: string;
  target: string;
  targetKo: string;
}

/**
 * 문제 카드에 보인 낱말·꼴 이름으로 정답 읽는 법을 찾는다.
 * 같은 글로 보이는 문제의 정답이 여럿으로 갈리면 던진다(시험을 고쳐야 하므로).
 */
export function answerFor(card: CardText): string {
  const matches = allQuestions().filter(
    (q) =>
      q.givenTag === card.givenTag &&
      q.given.kanji === card.given &&
      q.given.ko === card.givenKo &&
      q.target.label === card.target &&
      q.target.ko === card.targetKo,
  );
  const readings = new Set(matches.map((q) => q.answer.reading));
  if (readings.size !== 1)
    throw new Error(
      `문제 글로 답을 하나로 정하지 못함(${readings.size}개): ${JSON.stringify(card)}`,
    );
  return [...readings][0];
}
