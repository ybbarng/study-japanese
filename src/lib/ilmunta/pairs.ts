import type { Form } from "./conjugate";

/**
 * 짝으로 외우는 것들(일반 문법 지식, 세션이 고름):
 * 자동사·타동사 짝, 특별한 높임말 동사, 있다(ある·いる).
 */

export interface TransitivePair {
  intransitive: Form & { ko: string };
  transitive: Form & { ko: string };
}

const t = (
  ik: string,
  ir: string,
  iko: string,
  tk: string,
  tr: string,
  tko: string,
): TransitivePair => ({
  intransitive: { kanji: ik, reading: ir, ko: iko },
  transitive: { kanji: tk, reading: tr, ko: tko },
});

export const TRANSITIVE_PAIRS: readonly TransitivePair[] = [
  t("開く", "あく", "열리다", "開ける", "あける", "열다"),
  t("閉まる", "しまる", "닫히다", "閉める", "しめる", "닫다"),
  t("始まる", "はじまる", "시작되다", "始める", "はじめる", "시작하다"),
  t("終わる", "おわる", "끝나다", "終える", "おえる", "끝내다"),
  t("付く", "つく", "켜지다, 붙다", "付ける", "つける", "켜다, 붙이다"),
  t("消える", "きえる", "꺼지다", "消す", "けす", "끄다"),
  t("入る", "はいる", "들어가다", "入れる", "いれる", "넣다"),
  t("出る", "でる", "나가다", "出す", "だす", "내다"),
  t("落ちる", "おちる", "떨어지다", "落とす", "おとす", "떨어뜨리다"),
  t("壊れる", "こわれる", "부서지다", "壊す", "こわす", "부수다"),
  t("決まる", "きまる", "정해지다", "決める", "きめる", "정하다"),
  t("止まる", "とまる", "멈추다", "止める", "とめる", "세우다"),
  t("変わる", "かわる", "바뀌다", "変える", "かえる", "바꾸다"),
  t("集まる", "あつまる", "모이다", "集める", "あつめる", "모으다"),
  t("起きる", "おきる", "일어나다", "起こす", "おこす", "깨우다"),
  t("並ぶ", "ならぶ", "줄 서다", "並べる", "ならべる", "늘어놓다"),
  t("割れる", "われる", "깨지다", "割る", "わる", "깨다"),
  t("上がる", "あがる", "오르다", "上げる", "あげる", "올리다"),
  t("下がる", "さがる", "내려가다", "下げる", "さげる", "내리다"),
  t("続く", "つづく", "계속되다", "続ける", "つづける", "계속하다"),
];

export interface HonorificVerb {
  plain: Form & { ko: string };
  /** 존경어(상대를 높임). 없으면 비움 */
  honorific?: Form;
  /** 겸양어(나를 낮춤). 없으면 비움 */
  humble?: Form;
}

const f = (kanji: string, reading: string): Form => ({ kanji, reading });

export const HONORIFIC_VERBS: readonly HonorificVerb[] = [
  {
    plain: { ...f("行く", "いく"), ko: "가다" },
    honorific: f("いらっしゃる", "いらっしゃる"),
    humble: f("参る", "まいる"),
  },
  {
    plain: { ...f("来る", "くる"), ko: "오다" },
    honorific: f("いらっしゃる", "いらっしゃる"),
    humble: f("参る", "まいる"),
  },
  {
    plain: { ...f("いる", "いる"), ko: "있다" },
    honorific: f("いらっしゃる", "いらっしゃる"),
    humble: f("おる", "おる"),
  },
  {
    plain: { ...f("言う", "いう"), ko: "말하다" },
    honorific: f("おっしゃる", "おっしゃる"),
    humble: f("申す", "もうす"),
  },
  {
    plain: { ...f("食べる", "たべる"), ko: "먹다" },
    honorific: f("召し上がる", "めしあがる"),
    humble: f("いただく", "いただく"),
  },
  {
    plain: { ...f("見る", "みる"), ko: "보다" },
    honorific: f("ご覧になる", "ごらんになる"),
    humble: f("拝見する", "はいけんする"),
  },
  {
    plain: { ...f("する", "する"), ko: "하다" },
    honorific: f("なさる", "なさる"),
    humble: f("いたす", "いたす"),
  },
  {
    plain: { ...f("知っている", "しっている"), ko: "알고 있다" },
    honorific: f("ご存じだ", "ごぞんじだ"),
    humble: f("存じている", "ぞんじている"),
  },
  {
    plain: { ...f("会う", "あう"), ko: "만나다" },
    humble: f("お目にかかる", "おめにかかる"),
  },
  {
    plain: { ...f("もらう", "もらう"), ko: "받다" },
    humble: f("いただく", "いただく"),
  },
  {
    plain: { ...f("くれる", "くれる"), ko: "(남이 나에게) 주다" },
    honorific: f("くださる", "くださる"),
  },
  {
    plain: { ...f("あげる", "あげる"), ko: "(내가 남에게) 주다" },
    humble: f("差し上げる", "さしあげる"),
  },
  {
    plain: { ...f("寝る", "ねる"), ko: "자다" },
    honorific: f("お休みになる", "おやすみになる"),
  },
];

/** 있다: 살아 있는 것은 いる(います), 아니면 ある(あります) */
export const EXIST_FORMS = {
  alive: f("います", "います"),
  thing: f("あります", "あります"),
} as const;
