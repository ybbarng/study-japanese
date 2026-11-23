import {
  ADJ_FORM_INFO,
  ADJ_FORMS,
  ADJ_KIND_LABEL,
  type Adjective,
  adjFormApplies,
  adjRuleFor,
  conjugateAdj,
} from "./adjective";
import {
  acceptedForms,
  BASIC_FORMS,
  conjugate,
  type Form,
  type Verb,
  type VerbFormId,
} from "./conjugate";
import type { Skill } from "./curriculum";
import { GROUP_LABEL, VERB_FORM_INFO } from "./forms";
import { EXIST_FORMS, HONORIFIC_VERBS, TRANSITIVE_PAIRS } from "./pairs";
import { PATTERN_BY_ID, PATTERNS, patternRule } from "./patterns";
import { pick, type Rng, shuffle } from "./random";
import { ruleFor } from "./rules";
import { VERBS, verbsOf } from "./verbs";
import { wordsOf } from "./words";

/** 문제 하나: 주어진 꼴을 보고 목표 꼴을 만든다 */
export interface Question {
  /** 기술 + 낱말(같은 문제를 알아보는 데 쓴다) */
  id: string;
  skillKey: string;
  /** 문제로 보여 주는 낱말 */
  given: Form & { ko: string };
  /** 주어진 꼴의 이름과 갈래(예: "사전형 · 1그룹") */
  givenTag: string;
  /** 만들 꼴 이름(예: "て형")과 뜻 */
  target: { label: string; ko: string };
  answer: Form;
  accepted: Form[];
  /** 틀렸을 때 보여 줄 규칙 한 줄 */
  rule: string;
  /** 고르기 보기(정답 포함, 섞음). 2~4개 */
  choices: Form[];
}

const sameForm = (a: Form, b: Form) => a.reading === b.reading;

/** 정답과 겹치지 않는 헷갈릴 만한 보기를 골라 정답과 섞는다 */
function withChoices(
  answer: Form,
  accepted: Form[],
  candidates: Form[],
  rng: Rng,
  size = 4,
): Form[] {
  const wrong: Form[] = [];
  for (const c of shuffle(candidates, rng)) {
    if (!c.reading || accepted.some((a) => sameForm(a, c))) continue;
    if (wrong.some((w) => sameForm(w, c))) continue;
    wrong.push(c);
    if (wrong.length >= size - 1) break;
  }
  return shuffle([answer, ...wrong], rng);
}

function plain(c: Form): Form {
  return { kanji: c.kanji, reading: c.reading };
}

/** 동사 활용에서 흔히 하는 실수: 갈래를 잘못 본 꼴, 소리 바뀜을 잘못 붙인 꼴, 다른 활용형 */
function verbDistractors(v: Verb, form: VerbFormId): Form[] {
  const out: Form[] = [];
  const asGroup = (group: Verb["group"]) => {
    try {
      out.push(plain(conjugate({ ...v, group }, form)));
    } catch {
      // 그 갈래로는 만들 수 없는 꼴
    }
  };
  if (v.group === "godan") asGroup("ichidan");
  if (v.group === "ichidan") asGroup("godan");
  if (v.group === "kuru" || v.group === "suru") asGroup("ichidan");
  if (form === "te" || form === "ta" || form === "tara") {
    const tail =
      form === "te"
        ? ["って", "んで", "いて", "して"]
        : ["った", "んだ", "いた", "した"];
    const stem = conjugate(v, "dict");
    for (const t of tail)
      out.push({
        kanji: stem.kanji.slice(0, -1) + t + (form === "tara" ? "ら" : ""),
        reading: stem.reading.slice(0, -1) + t + (form === "tara" ? "ら" : ""),
      });
  }
  const near: Partial<Record<VerbFormId, VerbFormId[]>> = {
    passive: ["causative", "potential", "causativePassive"],
    causative: ["passive", "causativePassive"],
    causativePassive: ["causative", "passive"],
    potential: ["passive", "ba"],
    ba: ["potential", "imperative"],
    imperative: ["ba", "volitional"],
    volitional: ["imperative"],
    nai: ["nakatta", "masen"],
    nakatta: ["nai", "masendeshita"],
    masen: ["masendeshita", "nai"],
    masendeshita: ["masen", "nakatta"],
    mashita: ["masu", "ta"],
    masu: ["mashita", "dict"],
    dict: ["masu", "prohibitive"],
    prohibitive: ["dict", "imperative"],
  };
  for (const f of near[form] ?? []) out.push(plain(conjugate(v, f)));
  return out;
}

function verbQuestion(
  skill: Extract<Skill, { kind: "verb" }>,
  rng: Rng,
  avoid?: string,
): Question {
  const pool = verbsOf(skill.group).filter(
    (v) => !v.basicOnly || BASIC_FORMS.has(skill.form),
  );
  const v = pickAvoiding(pool, rng, (x) => x.dict, avoid);
  // 사전형을 물을 때는 ます형을 보여 준다
  const givenForm: VerbFormId = skill.form === "dict" ? "masu" : "dict";
  const given = conjugate(v, givenForm);
  const c = conjugate(v, skill.form);
  const accepted = acceptedForms(c);
  return {
    id: `${skill.key}|${v.dict}`,
    skillKey: skill.key,
    given: { kanji: given.kanji, reading: given.reading, ko: v.ko },
    givenTag: `${VERB_FORM_INFO[givenForm].label} · ${GROUP_LABEL[v.group]}`,
    target: VERB_FORM_INFO[skill.form],
    answer: plain(c),
    accepted,
    rule: ruleFor(v, skill.form),
    choices: withChoices(
      plain(c),
      accepted,
      verbDistractors(v, skill.form),
      rng,
    ),
  };
}

function adjQuestion(
  skill: Extract<Skill, { kind: "adj" }>,
  rng: Rng,
  avoid?: string,
): Question {
  const a = pickAvoiding(wordsOf(skill.adjKind), rng, (x) => x.dict, avoid);
  const c = conjugateAdj(a, skill.form);
  const accepted = acceptedForms(c);
  const candidates: Form[] = [];
  for (const other of ["i", "na"] as const)
    if (other !== a.kind && adjFormApplies(other, skill.form))
      candidates.push(
        plain(conjugateAdj({ ...a, kind: other } as Adjective, skill.form)),
      );
  for (const f of ADJ_FORMS)
    if (f !== skill.form && adjFormApplies(a.kind, f))
      candidates.push(plain(conjugateAdj(a, f)));
  return {
    id: `${skill.key}|${a.dict}`,
    skillKey: skill.key,
    given: { kanji: a.dict, reading: a.reading, ko: a.ko },
    givenTag: ADJ_KIND_LABEL[a.kind],
    target: ADJ_FORM_INFO[skill.form],
    answer: plain(c),
    accepted,
    rule: adjRuleFor(a, skill.form),
    choices: withChoices(plain(c), accepted, candidates, rng),
  };
}

function patternQuestion(
  skill: Extract<Skill, { kind: "pattern" }>,
  rng: Rng,
  avoid?: string,
): Question {
  const p = PATTERN_BY_ID.get(skill.patternId);
  if (!p) throw new Error(`없는 문형: ${skill.patternId}`);
  const pool = VERBS.filter((v) => !v.basicOnly && (p.fits?.(v) ?? true));
  const v = pickAvoiding(pool, rng, (x) => x.dict, avoid);
  const c = p.build(v);
  const candidates: Form[] = [];
  // 갈래를 잘못 보고 붙인 꼴
  for (const group of ["godan", "ichidan"] as const)
    if (group !== v.group) candidates.push(plain(p.build({ ...v, group })));
  // 같은 과의 다른 문형(뜻을 헷갈리기 쉬운 것), 모자라면 다른 문형
  const others = PATTERNS.filter((o) => o.id !== p.id && (o.fits?.(v) ?? true));
  const sameLesson = others.filter((o) => o.lesson === p.lesson);
  for (const o of sameLesson.length >= 2 ? sameLesson : others)
    candidates.push(plain(o.build(v)));
  return {
    id: `${skill.key}|${v.dict}`,
    skillKey: skill.key,
    given: { kanji: v.dict, reading: v.reading, ko: v.ko },
    givenTag: `사전형 · ${GROUP_LABEL[v.group]}`,
    target: { label: p.label, ko: p.ko },
    answer: plain(c),
    accepted: [plain(c)],
    rule: patternRule(p),
    choices: withChoices(plain(c), [plain(c)], candidates, rng),
  };
}

function transitiveQuestion(
  skill: Extract<Skill, { kind: "transitive" }>,
  rng: Rng,
  avoid?: string,
): Question {
  const pair = pickAvoiding(
    TRANSITIVE_PAIRS,
    rng,
    (x) => x.intransitive.kanji,
    avoid,
  );
  const toTr = skill.direction === "toTransitive";
  const from = toTr ? pair.intransitive : pair.transitive;
  const to = toTr ? pair.transitive : pair.intransitive;
  const others = TRANSITIVE_PAIRS.filter((p) => p !== pair).map((p) =>
    plain(toTr ? p.transitive : p.intransitive),
  );
  return {
    id: `${skill.key}|${pair.intransitive.kanji}`,
    skillKey: skill.key,
    given: { kanji: from.kanji, reading: from.reading, ko: from.ko },
    givenTag: toTr ? "자동사" : "타동사",
    target: { label: toTr ? "타동사 짝" : "자동사 짝", ko: to.ko },
    answer: plain(to),
    accepted: [plain(to)],
    rule: `${pair.intransitive.kanji}(${pair.intransitive.ko}) ↔ ${pair.transitive.kanji}(${pair.transitive.ko})`,
    choices: withChoices(
      plain(to),
      [plain(to)],
      [plain(from), ...others.slice(0, 6)],
      rng,
    ),
  };
}

function keigoQuestion(
  skill: Extract<Skill, { kind: "keigo" }>,
  rng: Rng,
  avoid?: string,
): Question {
  const pool = HONORIFIC_VERBS.filter((h) => h[skill.which]);
  const h = pickAvoiding(pool, rng, (x) => x.plain.kanji, avoid);
  const answer = h[skill.which] as Form;
  const other = skill.which === "honorific" ? h.humble : h.honorific;
  const candidates = [
    ...(other ? [other] : []),
    ...HONORIFIC_VERBS.flatMap((x) => [x.honorific, x.humble]).filter(
      (x): x is Form => !!x,
    ),
  ];
  const label = skill.which === "honorific" ? "존경어" : "겸양어";
  return {
    id: `${skill.key}|${h.plain.kanji}`,
    skillKey: skill.key,
    given: { kanji: h.plain.kanji, reading: h.plain.reading, ko: h.plain.ko },
    givenTag: "보통 말",
    target: {
      label,
      ko: skill.which === "honorific" ? "상대를 높이는 말" : "나를 낮추는 말",
    },
    answer: plain(answer),
    accepted: [plain(answer)],
    rule: `${h.plain.kanji}의 ${label}는 ${answer.kanji}${other ? `(${skill.which === "honorific" ? "겸양어" : "존경어"}는 ${other.kanji})` : ""}`,
    choices: withChoices(plain(answer), [plain(answer)], candidates, rng),
  };
}

function existQuestion(skill: Skill, rng: Rng, avoid?: string): Question {
  const n = pickAvoiding(wordsOf("noun"), rng, (x) => x.dict, avoid);
  const answer = n.alive ? EXIST_FORMS.alive : EXIST_FORMS.thing;
  return {
    id: `${skill.key}|${n.dict}`,
    skillKey: skill.key,
    given: {
      kanji: `${n.dict}が`,
      reading: `${n.reading}が`,
      ko: `${n.ko}이(가)`,
    },
    givenTag: "명사",
    target: { label: "있습니다", ko: "ある·いる 중 맞는 쪽" },
    answer,
    accepted: [answer],
    rule: n.alive
      ? "사람·동물처럼 스스로 움직이는 것은 いる(います)"
      : "사물·식물은 ある(あります)",
    choices: [EXIST_FORMS.alive, EXIST_FORMS.thing],
  };
}

/** 같은 낱말이 잇달아 나오지 않게 고른다 */
function pickAvoiding<T>(
  pool: readonly T[],
  rng: Rng,
  keyOf: (x: T) => string,
  avoid?: string,
): T {
  const rest = pool.filter((x) => keyOf(x) !== avoid);
  return pick(rest.length > 0 ? rest : pool, rng);
}

/** 기술 하나로 문제 하나를 만든다. `avoidWord`는 바로 앞 문제의 낱말 */
export function makeQuestion(
  skill: Skill,
  rng: Rng,
  avoidWord?: string,
): Question {
  switch (skill.kind) {
    case "verb":
      return verbQuestion(skill, rng, avoidWord);
    case "adj":
      return adjQuestion(skill, rng, avoidWord);
    case "pattern":
      return patternQuestion(skill, rng, avoidWord);
    case "transitive":
      return transitiveQuestion(skill, rng, avoidWord);
    case "keigo":
      return keigoQuestion(skill, rng, avoidWord);
    case "exist":
      return existQuestion(skill, rng, avoidWord);
  }
}

/** 문제 id에서 낱말 부분 */
export function wordOf(questionId: string): string {
  return questionId.split("|")[1] ?? "";
}
