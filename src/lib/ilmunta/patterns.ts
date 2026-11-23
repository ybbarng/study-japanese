import {
  type Conjugation,
  conjugate,
  type Form,
  masuStem,
  type Verb,
  type VerbFormId,
} from "./conjugate";

/**
 * 활용형에 이어 붙는 문형(일반 문법). 활용 엔진으로 꼴을 만든 뒤 꼬리를 붙인다.
 * 뜻은 세션이 한국어로 적었다(교재 글을 옮기지 않음).
 */
export interface Pattern {
  id: string;
  lesson: number;
  /** 문형 머리(예: ～ないでください) */
  label: string;
  ko: string;
  /** 어느 활용형에 붙는지(규칙 설명용) */
  base: VerbFormId | "stem";
  /** 이 동사에 써도 자연스러운지 */
  fits?: (v: Verb) => boolean;
  build: (v: Verb) => Conjugation;
}

function attach(f: Form, cut: number, tail: string): Conjugation {
  return {
    kanji: f.kanji.slice(0, f.kanji.length - cut) + tail,
    reading: f.reading.slice(0, f.reading.length - cut) + tail,
    alternatives: [],
  };
}

const on =
  (base: VerbFormId, cut: number, tail: string) =>
  (v: Verb): Conjugation =>
    attach(conjugate(v, base), cut, tail);

const onStem =
  (tail: string, prefix = "") =>
  (v: Verb): Conjugation => {
    const s = masuStem(v);
    return attach(
      { kanji: prefix + s.kanji, reading: prefix + s.reading },
      0,
      tail,
    );
  };

/** お～になる·お～する에 자연스럽게 쓰는 동사(1·2그룹 고유어 중 따로 높임말이 없는 것) */
const O_HONORIFIC = new Set([
  "書く",
  "読む",
  "待つ",
  "帰る",
  "使う",
  "話す",
  "呼ぶ",
  "休む",
  "歩く",
  "乗る",
  "作る",
  "選ぶ",
  "決める",
  "調べる",
  "忘れる",
  "始める",
  "借りる",
  "降りる",
]);
const O_HUMBLE = new Set([
  "待つ",
  "送る",
  "持つ",
  "借りる",
  "話す",
  "返す",
  "貸す",
  "呼ぶ",
  "調べる",
  "手伝う",
]);

const notKuruOrIku = (v: Verb) => v.group !== "kuru" && v.dict !== "行く";

export const PATTERNS: readonly Pattern[] = [
  {
    id: "naideKudasai",
    lesson: 45,
    label: "～ないでください",
    ko: "~하지 마세요",
    base: "nai",
    build: on("nai", 0, "でください"),
  },
  {
    id: "nakereba",
    lesson: 45,
    label: "～なければならない",
    ko: "~해야 한다",
    base: "nai",
    build: on("nai", 1, "ければならない"),
  },
  {
    id: "nakutemoii",
    lesson: 45,
    label: "～なくてもいい",
    ko: "~하지 않아도 된다",
    base: "nai",
    build: on("nai", 1, "くてもいい"),
  },
  {
    id: "tai",
    lesson: 46,
    label: "～たい",
    ko: "~하고 싶다",
    base: "stem",
    build: onStem("たい"),
  },
  {
    id: "nagara",
    lesson: 46,
    label: "～ながら",
    ko: "~하면서",
    base: "stem",
    build: onStem("ながら"),
  },
  {
    id: "yasui",
    lesson: 46,
    label: "～やすい",
    ko: "~하기 쉽다",
    base: "stem",
    build: onStem("やすい"),
  },
  {
    id: "nikui",
    lesson: 46,
    label: "～にくい",
    ko: "~하기 어렵다",
    base: "stem",
    build: onStem("にくい"),
  },
  {
    id: "sugiru",
    lesson: 46,
    label: "～すぎる",
    ko: "너무 ~하다",
    base: "stem",
    build: onStem("すぎる"),
  },
  {
    id: "niIku",
    lesson: 46,
    label: "～に行く",
    ko: "~하러 가다",
    base: "stem",
    fits: notKuruOrIku,
    build: onStem("に行く"),
  },
  {
    id: "kotogadekiru",
    lesson: 47,
    label: "～ことができる",
    ko: "~할 수 있다",
    base: "dict",
    build: on("dict", 0, "ことができる"),
  },
  {
    id: "maeni",
    lesson: 47,
    label: "～前に",
    ko: "~하기 전에",
    base: "dict",
    build: on("dict", 0, "前に"),
  },
  {
    id: "youtoomou",
    lesson: 48,
    label: "～(よ)うと思う",
    ko: "~하려고 한다",
    base: "volitional",
    build: on("volitional", 0, "と思う"),
  },
  {
    id: "teiru",
    lesson: 49,
    label: "～ている",
    ko: "~하고 있다",
    base: "te",
    build: on("te", 0, "いる"),
  },
  {
    id: "tekudasai",
    lesson: 49,
    label: "～てください",
    ko: "~해 주세요",
    base: "te",
    build: on("te", 0, "ください"),
  },
  {
    id: "teshimau",
    lesson: 49,
    label: "～てしまう",
    ko: "~해 버리다",
    base: "te",
    build: on("te", 0, "しまう"),
  },
  {
    id: "temoii",
    lesson: 49,
    label: "～てもいい",
    ko: "~해도 된다",
    base: "te",
    build: on("te", 0, "もいい"),
  },
  {
    id: "tewaikenai",
    lesson: 49,
    label: "～てはいけない",
    ko: "~하면 안 된다",
    base: "te",
    build: on("te", 0, "はいけない"),
  },
  {
    id: "temiru",
    lesson: 49,
    label: "～てみる",
    ko: "~해 보다",
    base: "te",
    build: on("te", 0, "みる"),
  },
  {
    id: "takotogaaru",
    lesson: 50,
    label: "～たことがある",
    ko: "~한 적이 있다",
    base: "ta",
    build: on("ta", 0, "ことがある"),
  },
  {
    id: "tahougaii",
    lesson: 50,
    label: "～たほうがいい",
    ko: "~하는 편이 좋다",
    base: "ta",
    build: on("ta", 0, "ほうがいい"),
  },
  {
    id: "tari",
    lesson: 50,
    label: "～たり",
    ko: "~하기도 하고",
    base: "ta",
    build: on("ta", 0, "り"),
  },
  {
    id: "to",
    lesson: 55,
    label: "～と(가정)",
    ko: "~하면(언제나)",
    base: "dict",
    build: on("dict", 0, "と"),
  },
  {
    id: "nara",
    lesson: 55,
    label: "～なら(가정)",
    ko: "~할 거라면",
    base: "dict",
    build: on("dict", 0, "なら"),
  },
  {
    id: "oNinaru",
    lesson: 56,
    label: "お～になる(존경)",
    ko: "~하시다",
    base: "stem",
    fits: (v) => O_HONORIFIC.has(v.dict),
    build: onStem("になる", "お"),
  },
  {
    id: "oSuru",
    lesson: 56,
    label: "お～する(겸양)",
    ko: "(제가) ~해 드리다",
    base: "stem",
    fits: (v) => O_HUMBLE.has(v.dict),
    build: onStem("する", "お"),
  },
];

export const PATTERN_BY_ID: ReadonlyMap<string, Pattern> = new Map(
  PATTERNS.map((p) => [p.id, p]),
);

const BASE_LABEL: Record<Pattern["base"], string> = {
  stem: "ます형(ます를 뗀 꼴)",
  dict: "사전형",
  nai: "ない형",
  te: "て형",
  ta: "た형",
  volitional: "의지형",
  nakatta: "なかった형",
  masu: "ます형",
  masen: "ません",
  mashita: "ました",
  masendeshita: "ませんでした",
  tara: "たら형",
  potential: "가능형",
  passive: "수동형",
  causative: "사역형",
  causativePassive: "사역수동형",
  ba: "ば형",
  imperative: "명령형",
  prohibitive: "금지형",
};

/** 규칙 한 줄: 어느 활용형에 무엇을 붙이는지 */
export function patternRule(p: Pattern): string {
  // 붙는 꼬리는 본보기 동사(待つ)로 만들어 본 꼴에서 바탕 활용형을 뺀 나머지다
  const sample: Verb = {
    dict: "待つ",
    reading: "まつ",
    group: "godan",
    ko: "",
  };
  const built = p.build(sample).kanji;
  const base =
    p.base === "stem"
      ? masuStem(sample).kanji
      : conjugate(sample, p.base).kanji;
  if (p.id === "oNinaru" || p.id === "oSuru")
    return `お + ${BASE_LABEL.stem} + ${built.slice(base.length + 1)}`;
  if (built.startsWith(base))
    return `${BASE_LABEL[p.base]} + ${built.slice(base.length)}`;
  // ない형의 い를 바꾸는 문형(なければ·なくても)
  const head = base.slice(0, -1);
  return `${BASE_LABEL[p.base]}에서 い를 빼고 ${built.slice(head.length)}`;
}
