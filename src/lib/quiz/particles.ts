import { conjugate } from "@/lib/ilmunta/conjugate";
import { furigana } from "@/lib/ilmunta/furigana";
import { koPredicate } from "@/lib/ilmunta/korean";
import { type Rng, shuffle } from "@/lib/ilmunta/random";
import { rubyPlain } from "@/lib/ilmunta/ruby-text";
import {
  SCENES,
  type SceneId,
  type SceneWord,
} from "@/lib/ilmunta/sentence-words";
import { VERB_BY_DICT } from "@/lib/ilmunta/verbs";
import { ADJECTIVES } from "@/lib/ilmunta/words";
import { arrange, QUESTIONS_PER_SECTION } from "./pick";
import type { ChoiceQuestion } from "./types";

// 일문따 과 끝 확인 문제 가운데 "쓰임" 문제: 빈칸에 알맞은 조사 고르기.
// 문장은 드릴 문장 틀의 장면 낱말(sentence-words.ts, 세션이 지은 구절)에서 만든다. 교재 문장을 옮기지 않는다.
// 한국어 조사와 일본어 조사가 어긋나는 곳(전철을 타다 → 電車に乗る, 고양이를 좋아하다 → 猫が好き)이 핵심이다.

export type Particle = "を" | "に" | "で" | "が";
const PARTICLES: readonly Particle[] = ["を", "に", "で", "が"];

const ROLE: Record<Particle, string> = {
  を: "~을/를: 동작을 받는 것",
  に: "~에/에게: 가는 곳·닿는 곳·대상",
  で: "~에서/~로: 하는 곳·수단",
  が: "~이/가: 주어, 好き·上手 같은 말의 대상",
};

/** 문장을 만들 장면. 피해 수동·부사형·직업 장면은 조사가 둘 이상 맞을 수 있어 뺀다 */
const VERB_SCENES: readonly SceneId[] = [
  "daily",
  "request",
  "beforeOut",
  "whenDone",
  "practice",
  "canDo",
  "momMakes",
  "teacherMakes",
  "together",
  "hurry",
  "forbidden",
];

/** 지나가는 곳에도 を를 쓰는 움직임 동사(公園を走る·公園で走る 둘 다 맞다) */
const PATH_VERBS = new Set(["走る", "歩く", "散歩する", "泳ぐ"]);

export interface ParticleItem {
  dict: string;
  /** 빈칸 앞(`[漢字|かな]` 표기) */
  before: string;
  /** 빈칸 뒤 정중체 서술어(표기) */
  after: string;
  answer: Particle;
  ko: string;
  /** 한국어 조사로 옮기면 다른 일본어 조사가 되는 곳(헷갈리기 쉬운 곳) */
  koDiffers: boolean;
  /** 이 문장에서 답이 될 수도 있어 보기에서 뺄 조사 */
  alsoFits: Particle[];
}

const mark = (kanji: string, reading: string) =>
  furigana(kanji, reading)
    .map((p) => (p.ruby ? `[${p.text}|${p.ruby}]` : p.text))
    .join("");

/** 한국어 구절 끝 조사가 보통 옮겨지는 일본어 조사 */
export function koParticleToJa(koPre: string): Particle | null {
  const last = koPre.trim().split(/\s+/).at(-1) ?? "";
  if (/에서$|로$/.test(last)) return "で";
  if (/에게$|에$/.test(last)) return "に";
  if (/[을를]$/.test(last)) return "を";
  if (/[이가]$/.test(last)) return "が";
  return null;
}

function itemOf(w: SceneWord, after: string): ParticleItem | null {
  // まで(～까지)는 で로 끝나 보여도 다른 조사다
  if (w.pre.endsWith("まで")) return null;
  const m = /^(.*[^\s、])(を|に|で|が)$/.exec(w.pre);
  if (!m) return null;
  const answer = m[2] as Particle;
  const koMapped = koParticleToJa(w.koPre);
  // 「日本語を話す」(일본어로 말하다)처럼 한국어 조사대로 옮겨도 맞는 문장은 답이 둘이라 뺀다
  if (answer === "を" && koMapped === "で") return null;
  const alsoFits = new Set<Particle>();
  if (PATH_VERBS.has(w.dict)) {
    if (answer === "を") alsoFits.add("で");
    if (answer === "で") alsoFits.add("を");
  }
  // 「日本語で説明する」에 を를 넣어도 문장은 된다(일본어를 설명하다). 뜻은 달라도 보기에서 뺀다
  if (answer === "で" && /로$/.test(w.koPre)) alsoFits.add("を");
  // 「仕事を終わる」도 입말에서는 쓴다
  if (w.dict === "終わる") alsoFits.add("を");
  return {
    dict: w.dict,
    before: m[1],
    after,
    answer,
    ko: `${w.koPre} ${koPredicate(w.ko, "polite", "verb")}.`
      .replace(/\s+/g, " ")
      .trim(),
    koDiffers: koMapped !== null && koMapped !== answer,
    alsoFits: [...alsoFits],
  };
}

/** 장면 낱말에서 만들 수 있는 조사 문장 전부(같은 구절·낱말은 한 번) */
export function particleItems(): ParticleItem[] {
  const out: ParticleItem[] = [];
  const seen = new Set<string>();
  const push = (it: ParticleItem | null) => {
    if (!it) return;
    const key = `${it.before}|${it.dict}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(it);
  };
  for (const scene of VERB_SCENES)
    for (const w of SCENES[scene]) {
      const verb = VERB_BY_DICT.get(w.dict);
      if (!verb) continue;
      const f = conjugate(verb, "masu");
      push(itemOf(w, `${mark(f.kanji, f.reading)}。`));
    }
  // 한국어로는 동사인 な형용사(好き → 좋아하다): 대상에 が를 쓴다
  for (const w of SCENES.quality) {
    if (!w.koVerb) continue;
    const adj = ADJECTIVES.find((a) => a.dict === w.dict);
    if (!adj) continue;
    push(itemOf(w, `${mark(adj.dict, adj.reading)}です。`));
  }
  return out;
}

/** 이 과에서 조사 문제를 낼 문장. 5과는 が를 쓰는 な형용사, 26·27과는 조사 전부 */
export function particleTargets(
  lesson: number,
  items: readonly ParticleItem[] = particleItems(),
): ParticleItem[] {
  if (lesson === 5)
    return items.filter((it) => it.answer === "が" && it.koDiffers);
  if (lesson === 26) return [...items];
  // 헷갈리기 쉬운 조사: 한국어 조사와 어긋나는 문장만
  if (lesson === 27) return items.filter((it) => it.koDiffers);
  return [];
}

export function particleQuestion(
  it: ParticleItem,
  lesson: number,
  rng: Rng,
): ChoiceQuestion {
  const wrong = PARTICLES.filter(
    (p) => p !== it.answer && !it.alsoFits.includes(p),
  );
  const why = it.koDiffers
    ? `한국어로는 다른 조사를 쓰지만 일본어는 「${it.answer}」를 쓴다. ${ROLE[it.answer]}`
    : `「${it.answer}」 ${ROLE[it.answer]}`;
  return {
    type: "choice",
    key: `ilmunta${lesson}:p:${it.dict}:${rubyPlain(it.before)}`,
    lesson,
    section: "drill",
    prompt: {
      kind: "blank",
      before: it.before,
      after: it.after,
      ko: it.ko,
      markup: true,
      ask: "빈칸에 알맞은 조사는?",
    },
    ...arrange(
      { label: it.answer, ja: true },
      wrong.map((p) => ({ label: p, ja: true, note: `${p} = ${ROLE[p]}` })),
      rng,
    ),
    explain: why,
    reveal: {
      ja: rubyPlain(`${it.before}${it.answer}${it.after}`),
      ko: it.ko,
    },
  };
}

/** 이 과의 쓰임 문제(조사 고르기). 다루지 않는 과면 빈 배열 */
export function particleQuestions(
  lesson: number,
  rng: Rng,
  count = QUESTIONS_PER_SECTION,
): ChoiceQuestion[] {
  const out: ChoiceQuestion[] = [];
  const used = new Set<string>();
  for (const it of shuffle(particleTargets(lesson), rng)) {
    if (out.length >= count) break;
    if (used.has(it.dict)) continue;
    used.add(it.dict);
    out.push(particleQuestion(it, lesson, rng));
  }
  return out;
}
