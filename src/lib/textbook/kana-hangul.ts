/**
 * 히라가나 이름·지명을 한글로 적는다(국립국어원 일본어 표기법을 따른다).
 *
 * 일무따 소책자는 한국어 해석 속 일본 사람 이름·지명을 가나로 인쇄했다. 가나를 아직 못 읽는
 * 초급자에게는 해석이 깨진 것처럼 보이므로, 해석 칸에서는 한글로 바꿔 보인다.
 * 표기법 요점: 어두의 か·た행은 예사소리(가·다), 어중·어말은 거센소리(카·타), つ는 쓰,
 * ん은 받침 ㄴ, っ은 받침 ㅅ, 장음은 적지 않는다(おお·おう·うう).
 */

/** [어두, 어중] 두 꼴이 다른 것은 배열로 둔다 */
type Spell = string | [string, string];

// biome-ignore format: 오십음도 모양으로 두어야 빠진 글자가 보인다
const SYLLABLES: Record<string, Spell> = {
  あ: "아", い: "이", う: "우", え: "에", お: "오",
  か: ["가", "카"], き: ["기", "키"], く: ["구", "쿠"], け: ["게", "케"], こ: ["고", "코"],
  が: "가", ぎ: "기", ぐ: "구", げ: "게", ご: "고",
  さ: "사", し: "시", す: "스", せ: "세", そ: "소",
  ざ: "자", じ: "지", ず: "즈", ぜ: "제", ぞ: "조",
  た: ["다", "타"], ち: ["지", "치"], つ: "쓰", て: ["데", "테"], と: ["도", "토"],
  だ: "다", ぢ: "지", づ: "즈", で: "데", ど: "도",
  な: "나", に: "니", ぬ: "누", ね: "네", の: "노",
  は: "하", ひ: "히", ふ: "후", へ: "헤", ほ: "호",
  ば: "바", び: "비", ぶ: "부", べ: "베", ぼ: "보",
  ぱ: "파", ぴ: "피", ぷ: "푸", ぺ: "페", ぽ: "포",
  ま: "마", み: "미", む: "무", め: "메", も: "모",
  や: "야", ゆ: "유", よ: "요",
  ら: "라", り: "리", る: "루", れ: "레", ろ: "로",
  わ: "와", を: "오",
  きゃ: ["갸", "캬"], きゅ: ["규", "큐"], きょ: ["교", "쿄"],
  ぎゃ: "갸", ぎゅ: "규", ぎょ: "교",
  しゃ: "샤", しゅ: "슈", しょ: "쇼",
  じゃ: "자", じゅ: "주", じょ: "조",
  ちゃ: ["자", "차"], ちゅ: ["주", "추"], ちょ: ["조", "초"],
  にゃ: "냐", にゅ: "뉴", にょ: "뇨",
  ひゃ: "햐", ひゅ: "휴", ひょ: "효",
  びゃ: "뱌", びゅ: "뷰", びょ: "뵤",
  ぴゃ: "퍄", ぴゅ: "퓨", ぴょ: "표",
  みゃ: "먀", みゅ: "뮤", みょ: "묘",
  りゃ: "랴", りゅ: "류", りょ: "료",
};

/** 가나 한 칸이 끝나는 모음(장음을 가리려고) */
function vowelOf(kana: string): string {
  const last = kana[kana.length - 1];
  if (last === "ゃ") return "a";
  if (last === "ゅ") return "u";
  if (last === "ょ") return "o";
  const rows: Record<string, string> = {
    a: "あかがさざただなはばぱまやらわ",
    i: "いきぎしじちぢにひびぴみり",
    u: "うくぐすずつづぬふぶぷむゆる",
    e: "えけげせぜてでねへべぺめれ",
    o: "おこごそぞとどのほぼぽもよろを",
  };
  return Object.keys(rows).find((v) => rows[v].includes(last)) ?? "";
}

const HANGUL_BASE = 0xac00;
const FINAL = { n: 4, s: 19 } as const;

function addFinal(syllable: string, final: number): string {
  const code = syllable.charCodeAt(0) - HANGUL_BASE;
  if (code < 0 || code > 11171 || code % 28 !== 0) return syllable;
  return String.fromCharCode(syllable.charCodeAt(0) + final);
}

/** 히라가나 낱말 하나를 한글로. 표에 없는 글자가 있으면 null */
export function kanaToHangul(kana: string): string | null {
  const out: string[] = [];
  let prevVowel = "";
  for (let i = 0; i < kana.length; ) {
    const two = kana.slice(i, i + 2);
    const one = kana[i];
    if (one === "ん" || one === "っ") {
      if (out.length === 0) return null;
      out[out.length - 1] = addFinal(
        out[out.length - 1],
        one === "ん" ? FINAL.n : FINAL.s,
      );
      prevVowel = "";
      i += 1;
      continue;
    }
    // 장음(おお·おう·うう)은 적지 않는다
    if (
      (one === "う" && (prevVowel === "o" || prevVowel === "u")) ||
      (one === "お" && prevVowel === "o")
    ) {
      prevVowel = "";
      i += 1;
      continue;
    }
    const key = SYLLABLES[two] !== undefined ? two : one;
    const spell = SYLLABLES[key];
    if (spell === undefined) return null;
    out.push(
      typeof spell === "string" ? spell : spell[out.length === 0 ? 0 : 1],
    );
    prevVowel = vowelOf(key);
    i += key.length;
  }
  return out.join("");
}

/**
 * 한국어 해석 속 히라가나 이름·지명(두 글자 이상)을 한글로 바꾼다.
 * 이름은 줄 처음·공백·여는 괄호·쉼표 뒤에서 시작하는 것만 본다. 그래서 `～`·`)` 뒤에 붙은
 * 문법 이야기의 가나(`～ます`, `(な 삭제)です`)는 그대로 둔다. `て형`·`う단`처럼 형·단이 붙은 것,
 * `(どう의 높임말)`처럼 낱말을 설명하는 것도 그대로 둔다.
 */
export function hangulizeKanaNames(ko: string): string {
  return ko.replace(
    /(^|[\s(（,])([ぁ-ゖ]{2,})(?=($|[가-힣\s.,?!)）(（。！？]))/g,
    (whole, before: string, kana: string, _next, offset: number) => {
      const after = ko.slice(offset + whole.length);
      if (/^(형|단)/.test(after)) return whole;
      if (/^의 (높임말|반말|정중)/.test(after)) return whole;
      const hangul = kanaToHangul(kana);
      return hangul ? before + hangul : whole;
    },
  );
}
