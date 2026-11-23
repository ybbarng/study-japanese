import { describe, expect, it } from "vitest";
import {
  acceptedForms,
  conjugate,
  isGodanException,
  masuStem,
  type Verb,
  type VerbFormId,
  type VerbGroup,
} from "./conjugate";

const v = (dict: string, reading: string, group: VerbGroup): Verb => ({
  dict,
  reading,
  group,
  ko: "",
});

const nomu = v("飲む", "のむ", "godan");
const taberu = v("食べる", "たべる", "ichidan");
const miru = v("見る", "みる", "ichidan");
const suru = v("する", "する", "suru");
const benkyou = v("勉強する", "べんきょうする", "suru");
const kuru = v("来る", "くる", "kuru");
const kuruKana = v("くる", "くる", "kuru");
const motteKuru = v("持って来る", "もってくる", "kuru");

/** [한자 표기, 읽기] */
const pair = (verb: Verb, form: VerbFormId) => {
  const c = conjugate(verb, form);
  return [c.kanji, c.reading];
};

describe("1그룹 飲む의 모든 활용형", () => {
  it.each<[VerbFormId, string, string]>([
    ["dict", "飲む", "のむ"],
    ["nai", "飲まない", "のまない"],
    ["nakatta", "飲まなかった", "のまなかった"],
    ["masu", "飲みます", "のみます"],
    ["masen", "飲みません", "のみません"],
    ["mashita", "飲みました", "のみました"],
    ["masendeshita", "飲みませんでした", "のみませんでした"],
    ["te", "飲んで", "のんで"],
    ["ta", "飲んだ", "のんだ"],
    ["tara", "飲んだら", "のんだら"],
    ["potential", "飲める", "のめる"],
    ["passive", "飲まれる", "のまれる"],
    ["causative", "飲ませる", "のませる"],
    ["causativePassive", "飲ませられる", "のませられる"],
    ["volitional", "飲もう", "のもう"],
    ["ba", "飲めば", "のめば"],
    ["imperative", "飲め", "のめ"],
    ["prohibitive", "飲むな", "のむな"],
  ])("%s는 %s(%s)", (form, kanji, reading) => {
    expect(pair(nomu, form)).toEqual([kanji, reading]);
  });
});

describe("2그룹 食べる의 모든 활용형", () => {
  it.each<[VerbFormId, string, string]>([
    ["dict", "食べる", "たべる"],
    ["nai", "食べない", "たべない"],
    ["nakatta", "食べなかった", "たべなかった"],
    ["masu", "食べます", "たべます"],
    ["masen", "食べません", "たべません"],
    ["mashita", "食べました", "たべました"],
    ["masendeshita", "食べませんでした", "たべませんでした"],
    ["te", "食べて", "たべて"],
    ["ta", "食べた", "たべた"],
    ["tara", "食べたら", "たべたら"],
    ["potential", "食べられる", "たべられる"],
    ["passive", "食べられる", "たべられる"],
    ["causative", "食べさせる", "たべさせる"],
    ["causativePassive", "食べさせられる", "たべさせられる"],
    ["volitional", "食べよう", "たべよう"],
    ["ba", "食べれば", "たべれば"],
    ["imperative", "食べろ", "たべろ"],
    ["prohibitive", "食べるな", "たべるな"],
  ])("%s는 %s(%s)", (form, kanji, reading) => {
    expect(pair(taberu, form)).toEqual([kanji, reading]);
  });

  it("い단 + る인 見る도 る만 떼고 붙인다", () => {
    expect(pair(miru, "nai")).toEqual(["見ない", "みない"]);
    expect(pair(miru, "te")).toEqual(["見て", "みて"]);
    expect(pair(miru, "imperative")).toEqual(["見ろ", "みろ"]);
  });
});

describe("3그룹 する의 모든 활용형", () => {
  it.each<[VerbFormId, string]>([
    ["dict", "する"],
    ["nai", "しない"],
    ["nakatta", "しなかった"],
    ["masu", "します"],
    ["masen", "しません"],
    ["mashita", "しました"],
    ["masendeshita", "しませんでした"],
    ["te", "して"],
    ["ta", "した"],
    ["tara", "したら"],
    ["potential", "できる"],
    ["passive", "される"],
    ["causative", "させる"],
    ["causativePassive", "させられる"],
    ["volitional", "しよう"],
    ["ba", "すれば"],
    ["imperative", "しろ"],
    ["prohibitive", "するな"],
  ])("%s는 %s", (form, reading) => {
    expect(pair(suru, form)).toEqual([reading, reading]);
  });

  it("勉強する는 する 부분만 바뀐다", () => {
    expect(pair(benkyou, "nai")).toEqual(["勉強しない", "べんきょうしない"]);
    expect(pair(benkyou, "potential")).toEqual([
      "勉強できる",
      "べんきょうできる",
    ]);
    expect(pair(benkyou, "causativePassive")).toEqual([
      "勉強させられる",
      "べんきょうさせられる",
    ]);
  });

  it("する의 명령형은 しろ이고 せよ도 맞는 답이다", () => {
    expect(
      acceptedForms(conjugate(suru, "imperative")).map((f) => f.reading),
    ).toEqual(["しろ", "せよ"]);
  });
});

describe("3그룹 来る의 모든 활용형", () => {
  it.each<[VerbFormId, string, string]>([
    ["dict", "来る", "くる"],
    ["nai", "来ない", "こない"],
    ["nakatta", "来なかった", "こなかった"],
    ["masu", "来ます", "きます"],
    ["masen", "来ません", "きません"],
    ["mashita", "来ました", "きました"],
    ["masendeshita", "来ませんでした", "きませんでした"],
    ["te", "来て", "きて"],
    ["ta", "来た", "きた"],
    ["tara", "来たら", "きたら"],
    ["potential", "来られる", "こられる"],
    ["passive", "来られる", "こられる"],
    ["causative", "来させる", "こさせる"],
    ["causativePassive", "来させられる", "こさせられる"],
    ["volitional", "来よう", "こよう"],
    ["ba", "来れば", "くれば"],
    ["imperative", "来い", "こい"],
    ["prohibitive", "来るな", "くるな"],
  ])("%s는 %s(%s)", (form, kanji, reading) => {
    expect(pair(kuru, form)).toEqual([kanji, reading]);
  });

  it("가나로 쓴 くる는 한자 표기도 가나로 바뀐다", () => {
    expect(pair(kuruKana, "nai")).toEqual(["こない", "こない"]);
    expect(pair(kuruKana, "masu")).toEqual(["きます", "きます"]);
  });

  it("持って来る는 끝의 来る만 바뀐다", () => {
    expect(pair(motteKuru, "nai")).toEqual(["持って来ない", "もってこない"]);
    expect(pair(motteKuru, "te")).toEqual(["持って来て", "もってきて"]);
  });
});

describe("1그룹 て·た형의 소리 바뀜(音便)", () => {
  it.each<[string, string, string, string]>([
    ["会う", "あう", "会って", "会った"],
    ["待つ", "まつ", "待って", "待った"],
    ["乗る", "のる", "乗って", "乗った"],
    ["読む", "よむ", "読んで", "読んだ"],
    ["遊ぶ", "あそぶ", "遊んで", "遊んだ"],
    ["死ぬ", "しぬ", "死んで", "死んだ"],
    ["書く", "かく", "書いて", "書いた"],
    ["泳ぐ", "およぐ", "泳いで", "泳いだ"],
    ["話す", "はなす", "話して", "話した"],
  ])("%s는 て형 %s, た형 %s", (dict, reading, te, ta) => {
    const verb = v(dict, reading, "godan");
    expect(conjugate(verb, "te").kanji).toBe(te);
    expect(conjugate(verb, "ta").kanji).toBe(ta);
  });

  it("行く는 く로 끝나도 って·った가 된다", () => {
    const iku = v("行く", "いく", "godan");
    expect(pair(iku, "te")).toEqual(["行って", "いって"]);
    expect(pair(iku, "ta")).toEqual(["行った", "いった"]);
    expect(pair(iku, "tara")).toEqual(["行ったら", "いったら"]);
  });

  it("行く의 て·た형 밖의 활용은 보통 く 동사와 같다", () => {
    const iku = v("行く", "いく", "godan");
    expect(pair(iku, "nai")).toEqual(["行かない", "いかない"]);
    expect(pair(iku, "masu")).toEqual(["行きます", "いきます"]);
  });

  it("行く로 끝나는 말(出て行く)도 って가 된다", () => {
    expect(pair(v("出て行く", "でていく", "godan"), "te")).toEqual([
      "出て行って",
      "でていって",
    ]);
  });

  it("行く가 아닌 く 동사(聞く)는 いて가 된다", () => {
    expect(pair(v("聞く", "きく", "godan"), "te")).toEqual([
      "聞いて",
      "きいて",
    ]);
  });
});

describe("1그룹 끝 글자별 あ단·え단·お단", () => {
  it("う로 끝나면 ない형에서 あ가 아니라 わ가 된다", () => {
    expect(pair(v("買う", "かう", "godan"), "nai")).toEqual([
      "買わない",
      "かわない",
    ]);
    expect(pair(v("買う", "かう", "godan"), "passive")).toEqual([
      "買われる",
      "かわれる",
    ]);
  });

  it.each<[string, string, string, string, string]>([
    ["書く", "かく", "書かない", "書ける", "書こう"],
    ["急ぐ", "いそぐ", "急がない", "急げる", "急ごう"],
    ["話す", "はなす", "話さない", "話せる", "話そう"],
    ["待つ", "まつ", "待たない", "待てる", "待とう"],
    ["死ぬ", "しぬ", "死なない", "死ねる", "死のう"],
    ["呼ぶ", "よぶ", "呼ばない", "呼べる", "呼ぼう"],
    ["作る", "つくる", "作らない", "作れる", "作ろう"],
  ])("%s: ない형 %s, 가능형 %s, 의지형 %s", (dict, reading, nai, pot, vol) => {
    const verb = v(dict, reading, "godan");
    expect(conjugate(verb, "nai").kanji).toBe(nai);
    expect(conjugate(verb, "potential").kanji).toBe(pot);
    expect(conjugate(verb, "volitional").kanji).toBe(vol);
  });

  it("ある의 ない형은 ない다", () => {
    const aru = v("ある", "ある", "godan");
    expect(pair(aru, "nai")).toEqual(["ない", "ない"]);
    expect(pair(aru, "nakatta")).toEqual(["なかった", "なかった"]);
    expect(pair(aru, "masu")).toEqual(["あります", "あります"]);
  });
});

describe("2그룹처럼 생긴 1그룹 동사(예외)", () => {
  it.each<[string, string, string, string, string]>([
    ["帰る", "かえる", "帰らない", "帰って", "帰ります"],
    ["入る", "はいる", "入らない", "入って", "入ります"],
    ["走る", "はしる", "走らない", "走って", "走ります"],
    ["知る", "しる", "知らない", "知って", "知ります"],
    ["要る", "いる", "要らない", "要って", "要ります"],
    ["切る", "きる", "切らない", "切って", "切ります"],
  ])("%s는 1그룹으로 활용한다: %s·%s·%s", (dict, reading, nai, te, masu) => {
    const verb = v(dict, reading, "godan");
    expect(conjugate(verb, "nai").kanji).toBe(nai);
    expect(conjugate(verb, "te").kanji).toBe(te);
    expect(conjugate(verb, "masu").kanji).toBe(masu);
  });

  it("예외 동사를 알아본다", () => {
    expect(isGodanException(v("帰る", "かえる", "godan"))).toBe(true);
    expect(isGodanException(v("知る", "しる", "godan"))).toBe(true);
    expect(isGodanException(v("乗る", "のる", "godan"))).toBe(false);
    expect(isGodanException(v("作る", "つくる", "godan"))).toBe(false);
    expect(isGodanException(taberu)).toBe(false);
  });

  it("같은 읽기 きる도 갈래에 따라 다르게 활용한다(切る 1그룹·着る 2그룹)", () => {
    expect(pair(v("切る", "きる", "godan"), "te")).toEqual([
      "切って",
      "きって",
    ]);
    expect(pair(v("着る", "きる", "ichidan"), "te")).toEqual(["着て", "きて"]);
  });
});

describe("사역수동형의 줄인 꼴", () => {
  const readings = (verb: Verb) =>
    acceptedForms(conjugate(verb, "causativePassive")).map((f) => f.reading);

  it("す로 끝나지 않는 1그룹은 긴 꼴과 줄인 꼴 둘 다 맞는 답이다", () => {
    expect(readings(nomu)).toEqual(["のませられる", "のまされる"]);
    expect(readings(v("待つ", "まつ", "godan"))).toEqual([
      "またせられる",
      "またされる",
    ]);
  });

  it("す로 끝나는 1그룹(話す)은 긴 꼴만 맞는 답이다", () => {
    expect(readings(v("話す", "はなす", "godan"))).toEqual(["はなさせられる"]);
  });

  it("2·3그룹은 줄인 꼴이 없다", () => {
    expect(readings(taberu)).toEqual(["たべさせられる"]);
    expect(readings(suru)).toEqual(["させられる"]);
    expect(readings(kuru)).toEqual(["こさせられる"]);
  });
});

describe("가능형의 정의", () => {
  it("2그룹 가능형은 られる만 맞는 답이다(ら를 뺀 꼴은 넣지 않는다)", () => {
    expect(
      acceptedForms(conjugate(taberu, "potential")).map((f) => f.reading),
    ).toEqual(["たべられる"]);
  });
});

describe("masuStem", () => {
  it("ます를 뗀 꼴을 만든다", () => {
    expect(masuStem(nomu)).toEqual({ kanji: "飲み", reading: "のみ" });
    expect(masuStem(taberu)).toEqual({ kanji: "食べ", reading: "たべ" });
    expect(masuStem(benkyou)).toEqual({
      kanji: "勉強し",
      reading: "べんきょうし",
    });
    expect(masuStem(kuru)).toEqual({ kanji: "来", reading: "き" });
  });
});
