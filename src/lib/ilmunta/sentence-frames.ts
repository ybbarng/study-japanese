import type { AdjFormId, AdjKind } from "./adjective";
import type { VerbFormId } from "./conjugate";
import type { KoForm } from "./korean";
import type { SceneId } from "./sentence-words";

/**
 * 문장 빈칸 문제의 틀. 세션이 직접 지은 짧은 예문이다(교재 문장을 옮기지 않음).
 *
 * 일본어(`ja`) 자리 표시:
 * - `{pre}`·`{post}` 낱말이 가진 앞뒤 구절, `{_}` 빈칸, `{word}` 빈칸 낱말의 사전형(다시 한번 쓸 때)
 * 한국어(`ko`) 자리 표시:
 * - `{pre}`·`{post}` 낱말의 한국어 구절, `{v}` 빈칸 낱말을 `koForm` 꼴로, `{w:꼴}` 같은 명사를 그 꼴로
 *
 * 시제·정중함·부정은 문장이 알려 준다:
 * - 정중체 틀은 「先生、」「～でしたが」처럼 정중한 말이 함께 있고, 보통체 틀은 「ねえ、」「～だけど」가 있다.
 * - 부정 틀은 あまり나 뒤 문장(「弟が医者です」)이 알려 준다. 과거 틀은 昨日·前は·昔가 알려 준다.
 */
export type Frame = {
  id: string;
  scene: SceneId;
  ja: string;
  ko: string;
  koForm: KoForm;
} & (
  | { kind: "verb"; form: VerbFormId }
  | {
      kind: "adj";
      form: AdjFormId;
      adjKinds: readonly AdjKind[];
      /** 이 느낌의 낱말만 받는다(te형 틀) */
      tone?: "good" | "bad";
    }
);

const verb = (
  id: string,
  form: VerbFormId,
  scene: SceneId,
  ja: string,
  ko: string,
  koForm: KoForm,
): Frame => ({ id, kind: "verb", form, scene, ja, ko, koForm });

const ADJ: readonly AdjKind[] = ["i", "na"];
const adj = (
  id: string,
  form: AdjFormId,
  ja: string,
  ko: string,
  koForm: KoForm,
  more: { scene?: SceneId; tone?: "good" | "bad" } = {},
): Frame => ({
  id,
  kind: "adj",
  form,
  adjKinds: ADJ,
  scene: more.scene ?? "quality",
  ja,
  ko,
  koForm,
  ...(more.tone ? { tone: more.tone } : {}),
});
const noun = (
  id: string,
  form: AdjFormId,
  ja: string,
  ko: string,
  koForm: KoForm,
): Frame => ({
  id,
  kind: "adj",
  form,
  adjKinds: ["noun"],
  scene: "job",
  ja,
  ko,
  koForm,
});

const SENSEI = "[先生|せんせい]、";
const MAE = "[前|まえ]は";
const BUSY = "[忙|いそが]し";

export const FRAMES: readonly Frame[] = [
  // ── 동사: 정중체 ──
  verb(
    "masu-sensei",
    "masu",
    "daily",
    `${SENSEI}[私|わたし]は[毎日|まいにち]{pre}{_}。`,
    "선생님, 저는 매일 {pre} {v}.",
    "polite",
  ),
  verb(
    "masu-tomorrow",
    "masu",
    "daily",
    "[明日|あした]は[時間|じかん]がありますから、{pre}{_}。",
    "내일은 시간이 있으니까 {pre} {v}.",
    "polite",
  ),
  verb(
    "masen-busy",
    "masen",
    "daily",
    `[最近|さいきん]は${BUSY}いですから、あまり{pre}{_}。`,
    "요즘은 바빠서 별로 {pre} {v}.",
    "negPolite",
  ),
  verb(
    "mashita-rain",
    "mashita",
    "daily",
    "[昨日|きのう]は[雨|あめ]でしたが、{pre}{_}。",
    "어제는 비가 왔지만 {pre} {v}.",
    "pastPolite",
  ),
  verb(
    "mashita-sensei",
    "mashita",
    "daily",
    `${SENSEI}[昨日|きのう]、{pre}{_}。`,
    "선생님, 어제 {pre} {v}.",
    "pastPolite",
  ),
  verb(
    "masendeshita-busy",
    "masendeshita",
    "daily",
    `[昨日|きのう]は${BUSY}かったですから、あまり{pre}{_}。`,
    "어제는 바빠서 별로 {pre} {v}.",
    "pastNegPolite",
  ),
  // ── 동사: 보통체 ──
  verb(
    "dict-nee",
    "dict",
    "daily",
    "ねえ、[私|わたし]は[毎日|まいにち]{pre}{_}よ。",
    "있잖아, 나는 매일 {pre} {v}.",
    "plain",
  ),
  verb(
    "nai-busy",
    "nai",
    "daily",
    `[最近|さいきん]は${BUSY}いから、あまり{pre}{_}。`,
    "요즘은 바빠서 별로 {pre} {v}.",
    "neg",
  ),
  verb(
    "nai-nee",
    "nai",
    "daily",
    "ねえ、[私|わたし]は[休|やす]みの[日|ひ]、あまり{pre}{_}よ。",
    "있잖아, 나는 쉬는 날에 별로 {pre} {v}.",
    "neg",
  ),
  verb(
    "ta-rain",
    "ta",
    "daily",
    "[昨日|きのう]は[雨|あめ]だったけど、{pre}{_}。",
    "어제는 비가 왔지만 {pre} {v}.",
    "past",
  ),
  verb(
    "ta-nee",
    "ta",
    "daily",
    "ねえ、[昨日|きのう]、{pre}{_}よ。",
    "있잖아, 어제 {pre} {v}.",
    "past",
  ),
  verb(
    "nakatta-busy",
    "nakatta",
    "daily",
    `[昨日|きのう]は${BUSY}かったから、あまり{pre}{_}。`,
    "어제는 바빠서 별로 {pre} {v}.",
    "pastNeg",
  ),
  // ── て형·たら·ば ──
  verb(
    "te-request",
    "te",
    "request",
    "すみません、{pre}{_}ください。",
    "죄송하지만 {pre} {v} 주세요.",
    "aeo",
  ),
  verb(
    "te-before-out",
    "te",
    "beforeOut",
    "{pre}{_}から、[出|で]かけます。",
    "{pre} {v} 나서 나갑니다.",
    "go",
  ),
  verb(
    "tara-call",
    "tara",
    "whenDone",
    "{pre}{_}、[電話|でんわ]してください。",
    "{pre} {v} 전화해 주세요.",
    "myeon",
  ),
  verb(
    "ba-practice",
    "ba",
    "practice",
    "[毎日|まいにち]{pre}{_}、[上手|じょうず]になります。",
    "매일 {pre} {v} 잘하게 됩니다.",
    "myeon",
  ),
  // ── 가능·수동·사역 ──
  verb(
    "potential-now",
    "potential",
    "canDo",
    "[私|わたし]はもう{pre}{_}。",
    "나는 이제 {pre} {v} 있다.",
    "lsu",
  ),
  verb(
    "passive-annoyed",
    "passive",
    "annoyed",
    "{pre}{_}のは[嫌|いや]です。",
    "{pre} {v} 건 싫습니다.",
    "neun",
  ),
  verb(
    "causative-mom",
    "causative",
    "momMakes",
    "[母|はは]はいつも[私|わたし]に{pre}{_}。",
    "엄마는 늘 나에게 {pre} {v} 한다.",
    "ge",
  ),
  verb(
    "causative-teacher",
    "causative",
    "teacherMakes",
    "[先生|せんせい]は[学生|がくせい]に{pre}{_}。",
    "선생님은 학생에게 {pre} {v} 한다.",
    "ge",
  ),
  verb(
    "causative-passive-mom",
    "causativePassive",
    "momMakes",
    "[母|はは]に{pre}{_}のは[嫌|いや]です。",
    "엄마가 억지로 {pre} {v} 하는 건 싫습니다.",
    "ge",
  ),
  verb(
    "causative-passive-teacher",
    "causativePassive",
    "teacherMakes",
    "[先生|せんせい]に{pre}{_}のは[大変|たいへん]です。",
    "선생님이 억지로 {pre} {v} 하는 건 힘듭니다.",
    "ge",
  ),
  // ── 의지·명령·금지 ──
  verb(
    "volitional-together",
    "volitional",
    "together",
    "[一緒|いっしょ]に{pre}{_}。",
    "같이 {pre} {v}.",
    "ja",
  ),
  verb(
    "imperative-hurry",
    "imperative",
    "hurry",
    "[早|はや]く{pre}{_}！",
    "빨리 {pre} {v}!",
    "imp",
  ),
  verb(
    "prohibitive-danger",
    "prohibitive",
    "forbidden",
    "[危|あぶ]ないから、{pre}{_}。",
    "위험하니까 {pre} {v}.",
    "jima",
  ),

  // ── い·な형용사 ──
  adj(
    "adj-plain",
    "plain",
    "ねえ、{pre}とても{_}よ。",
    "있잖아, {pre} 아주 {v}.",
    "plain",
  ),
  adj(
    "adj-plain-neg",
    "plainNeg",
    "ねえ、{pre}あまり{_}よ。",
    "있잖아, {pre} 별로 {v}.",
    "neg",
  ),
  adj(
    "adj-plain-past",
    "plainPast",
    `ねえ、{pre}${MAE}とても{_}よ。`,
    "있잖아, {pre} 전에는 아주 {v}.",
    "past",
  ),
  adj(
    "adj-plain-past-neg",
    "plainPastNeg",
    `ねえ、{pre}${MAE}あまり{_}よ。`,
    "있잖아, {pre} 전에는 별로 {v}.",
    "pastNeg",
  ),
  adj(
    "adj-polite",
    "polite",
    `${SENSEI}{pre}とても{_}。`,
    "선생님, {pre} 아주 {v}.",
    "polite",
  ),
  adj(
    "adj-polite-neg",
    "politeNeg",
    `${SENSEI}{pre}あまり{_}。`,
    "선생님, {pre} 별로 {v}.",
    "negPolite",
  ),
  adj(
    "adj-polite-past",
    "politePast",
    `${SENSEI}{pre}${MAE}とても{_}。`,
    "선생님, {pre} 전에는 아주 {v}.",
    "pastPolite",
  ),
  adj(
    "adj-polite-past-neg",
    "politePastNeg",
    `${SENSEI}{pre}${MAE}あまり{_}。`,
    "선생님, {pre} 전에는 별로 {v}.",
    "pastNegPolite",
  ),
  adj(
    "adj-te-good",
    "te",
    "{pre}{_}、うれしいです。",
    "{pre} {v} 기쁩니다.",
    "eoseo",
    { tone: "good" },
  ),
  adj(
    "adj-te-bad",
    "te",
    "{pre}{_}、[大変|たいへん]です。",
    "{pre} {v} 힘듭니다.",
    "eoseo",
    { tone: "bad" },
  ),
  adj(
    "adj-adverb",
    "adverb",
    "もう[少|すこ]し{pre}{_}{post}ください。",
    "조금 더 {pre} {v} {post}.",
    "ge",
    { scene: "manner" },
  ),
  adj(
    "adj-naru",
    "naru",
    "これから、{pre}もっと{_}でしょう。",
    "앞으로 {pre} 더 {v} 거예요.",
    "jil",
  ),

  // ── 명사 ──
  noun(
    "noun-plain",
    "plain",
    "ねえ、[兄|あに]は{_}よ。",
    "있잖아, 형은 {v}.",
    "plain",
  ),
  noun(
    "noun-plain-neg",
    "plainNeg",
    "ねえ、[兄|あに]は{_}よ。[弟|おとうと]が{word}だよ。",
    "있잖아, 형은 {v}. 남동생이 {w:plain}.",
    "neg",
  ),
  noun(
    "noun-plain-past",
    "plainPast",
    "ねえ、[父|ちち]は[昔|むかし]{_}よ。",
    "있잖아, 아버지는 옛날에 {v}.",
    "past",
  ),
  noun(
    "noun-plain-past-neg",
    "plainPastNeg",
    "ねえ、[父|ちち]は[昔|むかし]{_}よ。[母|はは]が{word}だったよ。",
    "있잖아, 아버지는 옛날에 {v}. 엄마가 {w:past}.",
    "pastNeg",
  ),
  noun(
    "noun-polite",
    "polite",
    "はじめまして。[私|わたし]は{_}。",
    "처음 뵙겠습니다. 저는 {v}.",
    "polite",
  ),
  noun(
    "noun-polite-neg",
    "politeNeg",
    "すみません、[私|わたし]は{_}。[兄|あに]が{word}です。",
    "죄송하지만 저는 {v}. 형이 {w:polite}.",
    "negPolite",
  ),
  noun(
    "noun-polite-past",
    "politePast",
    `${SENSEI}[父|ちち]は[昔|むかし]{_}。`,
    "선생님, 아버지는 옛날에 {v}.",
    "pastPolite",
  ),
  noun(
    "noun-polite-past-neg",
    "politePastNeg",
    `${SENSEI}[父|ちち]は[昔|むかし]{_}。[母|はは]が{word}でした。`,
    "선생님, 아버지는 옛날에 {v}. 엄마가 {w:pastPolite}.",
    "pastNegPolite",
  ),
  noun(
    "noun-te",
    "te",
    "[兄|あに]は{_}、[二十五歳|にじゅうごさい]です。",
    "형은 {v} 스물다섯 살입니다.",
    "go",
  ),
  noun(
    "noun-naru",
    "naru",
    "[弟|おとうと]は[来年|らいねん]{_}。",
    "남동생은 내년에 {v}.",
    "naru",
  ),
];
