/**
 * 동사 활용 엔진. 사전형과 갈래를 받아 활용형을 만든다(순수 함수).
 *
 * 갈래(교재와 같은 이름):
 * - 1그룹(五段, godan): 끝 글자가 あ·い·う·え·お단으로 바뀐다.
 * - 2그룹(一段, ichidan): 끝의 る를 떼고 붙인다.
 * - 3그룹: する(suru)·くる(kuru) 둘뿐이다. 勉強する처럼 する가 붙은 말도 する와 같다.
 *
 * 한자 표기(kanji)와 히라가나 읽기(reading)를 함께 만든다. 끝의 가나는 두 표기가 같으므로
 * 끝을 바꾸는 방식으로 둘 다 만들고, 来る만 읽기가 바뀌어 따로 다룬다.
 *
 * 정의:
 * - 사역수동형은 긴 꼴(飲ませられる)을 정답으로 두고, 1그룹 중 す로 끝나지 않는 동사는
 *   줄인 꼴(飲まされる)도 함께 맞는 답(alternatives)으로 둔다.
 * - 가능형은 표준형(食べられる·来られる)만 둔다. ら를 뺀 꼴(食べれる)은 맞는 답에 넣지 않는다.
 * - する의 가능형은 できる, 명령형은 しろ(せよ도 맞는 답).
 */

export type VerbGroup = "godan" | "ichidan" | "suru" | "kuru";

export interface Verb {
  /** 사전형 한자 표기(예: 飲む). 한자가 없으면 읽기와 같다 */
  dict: string;
  /** 사전형 히라가나 읽기(예: のむ) */
  reading: string;
  group: VerbGroup;
  /** 한국어 뜻 */
  ko: string;
  /** 교재에서 처음 나오는 과(모르면 비움) */
  lesson?: number;
  /** 수동·사역·가능·명령·의지처럼 쓰임이 어색한 활용은 묻지 않는다(ある·わかる 등) */
  basicOnly?: boolean;
}

export interface Form {
  kanji: string;
  reading: string;
}

export interface Conjugation extends Form {
  /** 함께 맞는 답으로 보는 다른 꼴 */
  alternatives: Form[];
}

export const VERB_FORMS = [
  "dict",
  "nai",
  "nakatta",
  "masu",
  "masen",
  "mashita",
  "masendeshita",
  "te",
  "ta",
  "tara",
  "potential",
  "passive",
  "causative",
  "causativePassive",
  "volitional",
  "ba",
  "imperative",
  "prohibitive",
] as const;
export type VerbFormId = (typeof VERB_FORMS)[number];

/** basicOnly 동사에도 묻는 활용형 */
export const BASIC_FORMS: ReadonlySet<VerbFormId> = new Set([
  "dict",
  "nai",
  "nakatta",
  "masu",
  "masen",
  "mashita",
  "masendeshita",
  "te",
  "ta",
  "tara",
  "ba",
]);

/** 1그룹 끝 글자의 단: [あ, い, う, え, お]. う의 あ단은 わ다 */
const GODAN_ROWS: Record<
  string,
  readonly [string, string, string, string, string]
> = {
  う: ["わ", "い", "う", "え", "お"],
  く: ["か", "き", "く", "け", "こ"],
  ぐ: ["が", "ぎ", "ぐ", "げ", "ご"],
  す: ["さ", "し", "す", "せ", "そ"],
  つ: ["た", "ち", "つ", "て", "と"],
  ぬ: ["な", "に", "ぬ", "ね", "の"],
  ぶ: ["ば", "び", "ぶ", "べ", "ぼ"],
  む: ["ま", "み", "む", "め", "も"],
  る: ["ら", "り", "る", "れ", "ろ"],
};

const ROW = { a: 0, i: 1, u: 2, e: 3, o: 4 } as const;

/** 1그룹 て형의 소리 바뀜(音便): 끝 글자 → て·た 앞 꼴 */
const ONBIN: Record<string, { te: string; ta: string }> = {
  う: { te: "って", ta: "った" },
  つ: { te: "って", ta: "った" },
  る: { te: "って", ta: "った" },
  む: { te: "んで", ta: "んだ" },
  ぶ: { te: "んで", ta: "んだ" },
  ぬ: { te: "んで", ta: "んだ" },
  く: { te: "いて", ta: "いた" },
  ぐ: { te: "いで", ta: "いだ" },
  す: { te: "して", ta: "した" },
};

export function lastKana(v: Verb): string {
  return v.reading.slice(-1);
}

/** 行く(と 行く로 끝나는 말)는 て·た형만 っ로 바뀐다 */
export function isIku(v: Verb): boolean {
  return (
    v.group === "godan" && (v.dict.endsWith("行く") || v.reading === "いく")
  );
}

/** ある의 부정은 あらない가 아니라 ない다 */
function isAru(v: Verb): boolean {
  return v.group === "godan" && v.reading === "ある";
}

/** 생김새는 2그룹(い단·え단 + る)인데 1그룹인 동사(帰る·入る·走る·知る 등) */
export function isGodanException(v: Verb): boolean {
  if (v.group !== "godan" || !v.reading.endsWith("る")) return false;
  const before = v.reading.slice(-2, -1);
  return /[いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ]/.test(before);
}

/** 끝 `cut`글자를 떼고 두 표기에 같은 꼬리를 붙인다 */
function swapTail(v: Verb, cut: number, tail: string): Form {
  return {
    kanji: v.dict.slice(0, v.dict.length - cut) + tail,
    reading: v.reading.slice(0, v.reading.length - cut) + tail,
  };
}

/** くる: 읽기는 く·き·こ로 바뀌고, 한자 표기는 来를 그대로 둔다 */
function kuruForm(v: Verb, kanaStem: "く" | "き" | "こ", rest: string): Form {
  const head = v.dict.slice(0, -2);
  const kanjiStem = v.dict.endsWith("来る") ? "来" : kanaStem;
  return {
    kanji: head + kanjiStem + rest,
    reading: v.reading.slice(0, -2) + kanaStem + rest,
  };
}

function godanRow(v: Verb, row: keyof typeof ROW, rest: string): Form {
  const end = lastKana(v);
  const rowKana = GODAN_ROWS[end];
  if (!rowKana) throw new Error(`1그룹 끝 글자가 아님: ${v.dict}`);
  return swapTail(v, 1, rowKana[ROW[row]] + rest);
}

function godanTeTa(v: Verb, which: "te" | "ta"): Form {
  if (isIku(v)) return swapTail(v, 1, which === "te" ? "って" : "った");
  const onbin = ONBIN[lastKana(v)];
  if (!onbin) throw new Error(`1그룹 끝 글자가 아님: ${v.dict}`);
  return swapTail(v, 1, onbin[which]);
}

const one = (f: Form, alternatives: Form[] = []): Conjugation => ({
  ...f,
  alternatives,
});

/** ます형에서 ます를 뗀 꼴(飲み·食べ·し·き) */
export function masuStem(v: Verb): Form {
  switch (v.group) {
    case "godan":
      return godanRow(v, "i", "");
    case "ichidan":
      return swapTail(v, 1, "");
    case "suru":
      return swapTail(v, 2, "し");
    case "kuru":
      return kuruForm(v, "き", "");
  }
}

/** ない형(부정 보통체). ある → ない */
function nai(v: Verb): Form {
  switch (v.group) {
    case "godan":
      return isAru(v) ? swapTail(v, 2, "ない") : godanRow(v, "a", "ない");
    case "ichidan":
      return swapTail(v, 1, "ない");
    case "suru":
      return swapTail(v, 2, "しない");
    case "kuru":
      return kuruForm(v, "こ", "ない");
  }
}

function teTa(v: Verb, which: "te" | "ta"): Form {
  switch (v.group) {
    case "godan":
      return godanTeTa(v, which);
    case "ichidan":
      return swapTail(v, 1, which === "te" ? "て" : "た");
    case "suru":
      return swapTail(v, 2, which === "te" ? "して" : "した");
    case "kuru":
      return kuruForm(v, "き", which === "te" ? "て" : "た");
  }
}

function addTail(f: Form, cut: number, tail: string): Form {
  return {
    kanji: f.kanji.slice(0, f.kanji.length - cut) + tail,
    reading: f.reading.slice(0, f.reading.length - cut) + tail,
  };
}

/** 동사 하나를 활용형 하나로 바꾼다 */
export function conjugate(v: Verb, form: VerbFormId): Conjugation {
  switch (form) {
    case "dict":
      return one({ kanji: v.dict, reading: v.reading });
    case "nai":
      return one(nai(v));
    case "nakatta":
      return one(addTail(nai(v), 1, "かった"));
    case "masu":
      return one(addTail(masuStem(v), 0, "ます"));
    case "masen":
      return one(addTail(masuStem(v), 0, "ません"));
    case "mashita":
      return one(addTail(masuStem(v), 0, "ました"));
    case "masendeshita":
      return one(addTail(masuStem(v), 0, "ませんでした"));
    case "te":
      return one(teTa(v, "te"));
    case "ta":
      return one(teTa(v, "ta"));
    case "tara":
      return one(addTail(teTa(v, "ta"), 0, "ら"));
    case "potential":
      return one(potential(v));
    case "passive":
      return one(passive(v));
    case "causative":
      return one(causative(v));
    case "causativePassive":
      return causativePassive(v);
    case "volitional":
      return one(volitional(v));
    case "ba":
      return one(ba(v));
    case "imperative":
      return imperative(v);
    case "prohibitive":
      return one(addTail({ kanji: v.dict, reading: v.reading }, 0, "な"));
  }
}

function potential(v: Verb): Form {
  switch (v.group) {
    case "godan":
      return godanRow(v, "e", "る");
    case "ichidan":
      return swapTail(v, 1, "られる");
    case "suru":
      return swapTail(v, 2, "できる");
    case "kuru":
      return kuruForm(v, "こ", "られる");
  }
}

function passive(v: Verb): Form {
  switch (v.group) {
    case "godan":
      return godanRow(v, "a", "れる");
    case "ichidan":
      return swapTail(v, 1, "られる");
    case "suru":
      return swapTail(v, 2, "される");
    case "kuru":
      return kuruForm(v, "こ", "られる");
  }
}

function causative(v: Verb): Form {
  switch (v.group) {
    case "godan":
      return godanRow(v, "a", "せる");
    case "ichidan":
      return swapTail(v, 1, "させる");
    case "suru":
      return swapTail(v, 2, "させる");
    case "kuru":
      return kuruForm(v, "こ", "させる");
  }
}

function causativePassive(v: Verb): Conjugation {
  const long = addTail(causative(v), 1, "られる");
  if (v.group === "godan" && lastKana(v) !== "す") {
    return one(long, [godanRow(v, "a", "される")]);
  }
  return one(long);
}

function volitional(v: Verb): Form {
  switch (v.group) {
    case "godan":
      return godanRow(v, "o", "う");
    case "ichidan":
      return swapTail(v, 1, "よう");
    case "suru":
      return swapTail(v, 2, "しよう");
    case "kuru":
      return kuruForm(v, "こ", "よう");
  }
}

function ba(v: Verb): Form {
  switch (v.group) {
    case "godan":
      return godanRow(v, "e", "ば");
    case "ichidan":
      return swapTail(v, 1, "れば");
    case "suru":
      return swapTail(v, 2, "すれば");
    case "kuru":
      return kuruForm(v, "く", "れば");
  }
}

function imperative(v: Verb): Conjugation {
  switch (v.group) {
    case "godan":
      return one(godanRow(v, "e", ""));
    case "ichidan":
      return one(swapTail(v, 1, "ろ"));
    case "suru":
      return one(swapTail(v, 2, "しろ"), [swapTail(v, 2, "せよ")]);
    case "kuru":
      return one(kuruForm(v, "こ", "い"));
  }
}

/** 정답과 함께 맞는 답 전부 */
export function acceptedForms(c: Conjugation): Form[] {
  return [{ kanji: c.kanji, reading: c.reading }, ...c.alternatives];
}
