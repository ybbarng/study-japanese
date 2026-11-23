import type { Conjugation, Form } from "./conjugate";

/**
 * 명사·な형용사·い형용사의 보통체·정중체와 て형·부사형·なる·さ.
 * - な형용사와 명사는 な·だ 없이 줄기만 적는다(静か, 学生).
 * - いい는 よ로 바뀐다(よくない, よかった). かっこいい처럼 いい로 끝나는 말도 같다.
 * - 부정 정중체는 교재마다 꼴이 둘이다. 하나를 정답으로 두고 다른 꼴도 맞는 답으로 둔다:
 *   い형용사 高くないです(高くありません), な형용사·명사 静かじゃありません(ではありません·じゃないです).
 */

export type AdjKind = "i" | "na" | "noun";

export interface Adjective {
  dict: string;
  reading: string;
  kind: AdjKind;
  ko: string;
  /** 명사: 살아 있는 것(いる로 있다)인지 */
  alive?: boolean;
  /** 드릴에서 쓰기 시작하는 일문따 과(0이나 비움이면 처음부터, word-lessons.ts) */
  lesson?: number;
}

export const ADJ_FORMS = [
  "plain",
  "plainNeg",
  "plainPast",
  "plainPastNeg",
  "polite",
  "politeNeg",
  "politePast",
  "politePastNeg",
  "te",
  "adverb",
  "naru",
  "sa",
] as const;
export type AdjFormId = (typeof ADJ_FORMS)[number];

export const ADJ_FORM_INFO: Record<AdjFormId, { label: string; ko: string }> = {
  plain: { label: "보통체 현재", ko: "~다" },
  plainNeg: { label: "보통체 부정", ko: "~지 않다" },
  plainPast: { label: "보통체 과거", ko: "~었다" },
  plainPastNeg: { label: "보통체 과거 부정", ko: "~지 않았다" },
  polite: { label: "정중체 현재", ko: "~입니다" },
  politeNeg: { label: "정중체 부정", ko: "~지 않습니다" },
  politePast: { label: "정중체 과거", ko: "~었습니다" },
  politePastNeg: { label: "정중체 과거 부정", ko: "~지 않았습니다" },
  te: { label: "て형", ko: "~고, ~어서" },
  adverb: { label: "부사형", ko: "~게" },
  naru: { label: "～なる", ko: "~해지다, ~이 되다" },
  sa: { label: "～さ(명사로)", ko: "~함, ~기" },
};

export const ADJ_KIND_LABEL: Record<AdjKind, string> = {
  i: "い형용사",
  na: "な형용사",
  noun: "명사",
};

/** 이 갈래에 없는 꼴: 명사는 부사형·さ가 없고, さ는 い형용사만 묻는다 */
export function adjFormApplies(kind: AdjKind, form: AdjFormId): boolean {
  if (form === "sa") return kind === "i";
  if (form === "adverb") return kind !== "noun";
  return true;
}

const f = (a: Adjective, tail: string, cut = 0): Form => ({
  kanji: a.dict.slice(0, a.dict.length - cut) + tail,
  reading: a.reading.slice(0, a.reading.length - cut) + tail,
});

const one = (form: Form, alternatives: Form[] = []): Conjugation => ({
  ...form,
  alternatives,
});

/** い형용사의 줄기(い를 뗀 꼴). いい → よ */
function iStem(a: Adjective, tail: string): Form {
  if (a.reading.endsWith("いい") && a.dict.endsWith("いい"))
    return f(a, `よ${tail}`, 2);
  return f(a, tail, 1);
}

export function conjugateAdj(a: Adjective, form: AdjFormId): Conjugation {
  if (!adjFormApplies(a.kind, form))
    throw new Error(`${a.dict}에는 ${form} 꼴이 없음`);
  return a.kind === "i" ? iAdj(a, form) : naAdj(a, form);
}

function iAdj(a: Adjective, form: AdjFormId): Conjugation {
  switch (form) {
    case "plain":
      return one(f(a, ""));
    case "plainNeg":
      return one(iStem(a, "くない"));
    case "plainPast":
      return one(iStem(a, "かった"));
    case "plainPastNeg":
      return one(iStem(a, "くなかった"));
    case "polite":
      return one(f(a, "です"));
    case "politeNeg":
      return one(iStem(a, "くないです"), [iStem(a, "くありません")]);
    case "politePast":
      return one(iStem(a, "かったです"));
    case "politePastNeg":
      return one(iStem(a, "くなかったです"), [iStem(a, "くありませんでした")]);
    case "te":
      return one(iStem(a, "くて"));
    case "adverb":
      return one(iStem(a, "く"));
    case "naru":
      return one(iStem(a, "くなる"));
    case "sa":
      return one(iStem(a, "さ"));
  }
}

/** な형용사와 명사는 だ·です를 붙이는 방식이 같다 */
function naAdj(a: Adjective, form: AdjFormId): Conjugation {
  switch (form) {
    case "plain":
      return one(f(a, "だ"));
    case "plainNeg":
      return one(f(a, "じゃない"), [f(a, "ではない")]);
    case "plainPast":
      return one(f(a, "だった"));
    case "plainPastNeg":
      return one(f(a, "じゃなかった"), [f(a, "ではなかった")]);
    case "polite":
      return one(f(a, "です"));
    case "politeNeg":
      return one(f(a, "じゃありません"), [
        f(a, "ではありません"),
        f(a, "じゃないです"),
      ]);
    case "politePast":
      return one(f(a, "でした"));
    case "politePastNeg":
      return one(f(a, "じゃありませんでした"), [
        f(a, "ではありませんでした"),
        f(a, "じゃなかったです"),
      ]);
    case "te":
      return one(f(a, "で"));
    case "adverb":
      return one(f(a, "に"));
    case "naru":
      return one(f(a, "になる"));
    case "sa":
      return one(f(a, "さ"));
  }
}

/** 틀렸을 때 보여 줄 규칙 한 줄 */
export function adjRuleFor(a: Adjective, form: AdjFormId): string {
  const good = a.kind === "i" && a.reading.endsWith("いい");
  const prefix = good ? "いい는 よ로 바뀐다. " : "";
  if (a.kind === "i") {
    const rule: Record<AdjFormId, string> = {
      plain: "い형용사 보통체는 사전형 그대로",
      plainNeg: "い를 빼고 くない",
      plainPast: "い를 빼고 かった",
      plainPastNeg: "い를 빼고 くなかった",
      polite: "사전형 + です",
      politeNeg: "い를 빼고 くないです(くありません)",
      politePast: "い를 빼고 かったです(～いでした가 아님)",
      politePastNeg: "い를 빼고 くなかったです(くありませんでした)",
      te: "い를 빼고 くて",
      adverb: "い를 빼고 く",
      naru: "い를 빼고 くなる",
      sa: "い를 빼고 さ",
    };
    return prefix + rule[form];
  }
  const who = a.kind === "na" ? "な형용사" : "명사";
  const rule: Record<AdjFormId, string> = {
    plain: `${who} + だ`,
    plainNeg: `${who} + じゃない(ではない)`,
    plainPast: `${who} + だった`,
    plainPastNeg: `${who} + じゃなかった(ではなかった)`,
    polite: `${who} + です`,
    politeNeg: `${who} + じゃありません(ではありません)`,
    politePast: `${who} + でした`,
    politePastNeg: `${who} + じゃありませんでした`,
    te: `${who} + で`,
    adverb: `${who} + に`,
    naru: `${who} + になる`,
    sa: `${who} + さ`,
  };
  return rule[form];
}
