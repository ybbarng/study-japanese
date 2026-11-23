/**
 * 가나 데이터. 소리(Sound) 하나에 히라가나·가타카나 글자가 짝으로 붙는다.
 * 외래어 조합(ファ 등)은 가타카나만 있다.
 *
 * - id: 소리마다 고유. 오디오 파일 이름(`/media/kana/<id>.mp3`)과 카드 id에 쓴다.
 * - romaji: 헵번식. じ/ぢ(ji), ず/づ(zu)는 같은 소리라 겹친다. を는 입력기에서 wo로 치지만 소리는 o.
 * - ko: 한글로 적은 소리(배우는 사람이 읽기 쉬운 쪽으로 적었다. か는 '카').
 */

export type Script = "hira" | "kata";

export type SoundKind =
  | "basic" // 기본 46자
  | "dakuten" // 탁음(゛)
  | "handakuten" // 반탁음(゜)
  | "yoon" // 요음(きゃ 등)
  | "extended"; // 외래어 조합(ファ 등, 가타카나만)

export interface Sound {
  id: string;
  romaji: string;
  ko: string;
  /** 로마자 입력기에서 칠 수 있는 철자들. 첫 번째가 기본. */
  input: string[];
  kind: SoundKind;
  /** 50음도의 행(あ행이면 "a"). 표를 그릴 때 쓴다. */
  row: string;
  hira?: string;
  kata?: string;
}

function s(
  id: string,
  hira: string | undefined,
  kata: string | undefined,
  romaji: string,
  ko: string,
  kind: SoundKind,
  row: string,
  input: string[] = [romaji],
): Sound {
  const sound: Sound = { id, romaji, ko, input, kind, row };
  if (hira) sound.hira = hira;
  if (kata) sound.kata = kata;
  return sound;
}

const b = (
  id: string,
  hira: string,
  kata: string,
  ko: string,
  row: string,
  input?: string[],
) => s(id, hira, kata, id, ko, "basic", row, input);

export const BASIC: Sound[] = [
  b("a", "あ", "ア", "아", "a"),
  b("i", "い", "イ", "이", "a"),
  b("u", "う", "ウ", "우", "a"),
  b("e", "え", "エ", "에", "a"),
  b("o", "お", "オ", "오", "a"),
  b("ka", "か", "カ", "카", "k"),
  b("ki", "き", "キ", "키", "k"),
  b("ku", "く", "ク", "쿠", "k"),
  b("ke", "け", "ケ", "케", "k"),
  b("ko", "こ", "コ", "코", "k"),
  b("sa", "さ", "サ", "사", "s"),
  b("shi", "し", "シ", "시", "s", ["shi", "si"]),
  b("su", "す", "ス", "스", "s"),
  b("se", "せ", "セ", "세", "s"),
  b("so", "そ", "ソ", "소", "s"),
  b("ta", "た", "タ", "타", "t"),
  b("chi", "ち", "チ", "치", "t", ["chi", "ti"]),
  b("tsu", "つ", "ツ", "쓰", "t", ["tsu", "tu"]),
  b("te", "て", "テ", "테", "t"),
  b("to", "と", "ト", "토", "t"),
  b("na", "な", "ナ", "나", "n"),
  b("ni", "に", "ニ", "니", "n"),
  b("nu", "ぬ", "ヌ", "누", "n"),
  b("ne", "ね", "ネ", "네", "n"),
  b("no", "の", "ノ", "노", "n"),
  b("ha", "は", "ハ", "하", "h"),
  b("hi", "ひ", "ヒ", "히", "h"),
  b("fu", "ふ", "フ", "후", "h", ["fu", "hu"]),
  b("he", "へ", "ヘ", "헤", "h"),
  b("ho", "ほ", "ホ", "호", "h"),
  b("ma", "ま", "マ", "마", "m"),
  b("mi", "み", "ミ", "미", "m"),
  b("mu", "む", "ム", "무", "m"),
  b("me", "め", "メ", "메", "m"),
  b("mo", "も", "モ", "모", "m"),
  b("ya", "や", "ヤ", "야", "y"),
  b("yu", "ゆ", "ユ", "유", "y"),
  b("yo", "よ", "ヨ", "요", "y"),
  b("ra", "ら", "ラ", "라", "r"),
  b("ri", "り", "リ", "리", "r"),
  b("ru", "る", "ル", "루", "r"),
  b("re", "れ", "レ", "레", "r"),
  b("ro", "ろ", "ロ", "로", "r"),
  b("wa", "わ", "ワ", "와", "w"),
  s("wo", "を", "ヲ", "o", "오", "basic", "w", ["wo"]),
  b("n", "ん", "ン", "응", "n-final", ["nn", "n"]),
];

const d = (
  id: string,
  hira: string,
  kata: string,
  romaji: string,
  ko: string,
  row: string,
  kind: SoundKind = "dakuten",
  input?: string[],
) => s(id, hira, kata, romaji, ko, kind, row, input);

export const DAKUTEN: Sound[] = [
  d("ga", "が", "ガ", "ga", "가", "g"),
  d("gi", "ぎ", "ギ", "gi", "기", "g"),
  d("gu", "ぐ", "グ", "gu", "구", "g"),
  d("ge", "げ", "ゲ", "ge", "게", "g"),
  d("go", "ご", "ゴ", "go", "고", "g"),
  d("za", "ざ", "ザ", "za", "자", "z"),
  d("ji", "じ", "ジ", "ji", "지", "z", "dakuten", ["ji", "zi"]),
  d("zu", "ず", "ズ", "zu", "즈", "z"),
  d("ze", "ぜ", "ゼ", "ze", "제", "z"),
  d("zo", "ぞ", "ゾ", "zo", "조", "z"),
  d("da", "だ", "ダ", "da", "다", "d"),
  d("di", "ぢ", "ヂ", "ji", "지", "d", "dakuten", ["di"]),
  d("du", "づ", "ヅ", "zu", "즈", "d", "dakuten", ["du"]),
  d("de", "で", "デ", "de", "데", "d"),
  d("do", "ど", "ド", "do", "도", "d"),
  d("ba", "ば", "バ", "ba", "바", "b"),
  d("bi", "び", "ビ", "bi", "비", "b"),
  d("bu", "ぶ", "ブ", "bu", "부", "b"),
  d("be", "べ", "ベ", "be", "베", "b"),
  d("bo", "ぼ", "ボ", "bo", "보", "b"),
  d("pa", "ぱ", "パ", "pa", "파", "p", "handakuten"),
  d("pi", "ぴ", "ピ", "pi", "피", "p", "handakuten"),
  d("pu", "ぷ", "プ", "pu", "푸", "p", "handakuten"),
  d("pe", "ぺ", "ペ", "pe", "페", "p", "handakuten"),
  d("po", "ぽ", "ポ", "po", "포", "p", "handakuten"),
];

const y = (
  id: string,
  hira: string,
  kata: string,
  ko: string,
  row: string,
  input: string[] = [id],
) => s(id, hira, kata, id, ko, "yoon", row, input);

export const YOON: Sound[] = [
  y("kya", "きゃ", "キャ", "캬", "k"),
  y("kyu", "きゅ", "キュ", "큐", "k"),
  y("kyo", "きょ", "キョ", "쿄", "k"),
  y("sha", "しゃ", "シャ", "샤", "s", ["sha", "sya"]),
  y("shu", "しゅ", "シュ", "슈", "s", ["shu", "syu"]),
  y("sho", "しょ", "ショ", "쇼", "s", ["sho", "syo"]),
  y("cha", "ちゃ", "チャ", "챠", "t", ["cha", "tya"]),
  y("chu", "ちゅ", "チュ", "츄", "t", ["chu", "tyu"]),
  y("cho", "ちょ", "チョ", "쵸", "t", ["cho", "tyo"]),
  y("nya", "にゃ", "ニャ", "냐", "n"),
  y("nyu", "にゅ", "ニュ", "뉴", "n"),
  y("nyo", "にょ", "ニョ", "뇨", "n"),
  y("hya", "ひゃ", "ヒャ", "햐", "h"),
  y("hyu", "ひゅ", "ヒュ", "휴", "h"),
  y("hyo", "ひょ", "ヒョ", "효", "h"),
  y("mya", "みゃ", "ミャ", "먀", "m"),
  y("myu", "みゅ", "ミュ", "뮤", "m"),
  y("myo", "みょ", "ミョ", "묘", "m"),
  y("rya", "りゃ", "リャ", "랴", "r"),
  y("ryu", "りゅ", "リュ", "류", "r"),
  y("ryo", "りょ", "リョ", "료", "r"),
  y("gya", "ぎゃ", "ギャ", "갸", "g"),
  y("gyu", "ぎゅ", "ギュ", "규", "g"),
  y("gyo", "ぎょ", "ギョ", "교", "g"),
  y("ja", "じゃ", "ジャ", "쟈", "z", ["ja", "jya", "zya"]),
  y("ju", "じゅ", "ジュ", "쥬", "z", ["ju", "jyu", "zyu"]),
  y("jo", "じょ", "ジョ", "죠", "z", ["jo", "jyo", "zyo"]),
  y("bya", "びゃ", "ビャ", "뱌", "b"),
  y("byu", "びゅ", "ビュ", "뷰", "b"),
  y("byo", "びょ", "ビョ", "뵤", "b"),
  y("pya", "ぴゃ", "ピャ", "퍄", "p"),
  y("pyu", "ぴゅ", "ピュ", "퓨", "p"),
  y("pyo", "ぴょ", "ピョ", "표", "p"),
];

const x = (
  id: string,
  kata: string,
  romaji: string,
  ko: string,
  input: string[] = [romaji],
) => s(id, undefined, kata, romaji, ko, "extended", "x", input);

/** 외래어에 자주 나오는 가타카나 조합 */
export const EXTENDED: Sound[] = [
  x("fa", "ファ", "fa", "f파"),
  x("fi", "フィ", "fi", "f피"),
  x("fe", "フェ", "fe", "f페"),
  x("fo", "フォ", "fo", "f포"),
  x("ti", "ティ", "ti", "티", ["thi"]),
  x("dhi", "ディ", "di", "디", ["dhi"]),
  x("wi", "ウィ", "wi", "위"),
  x("we", "ウェ", "we", "웨"),
  x("she", "シェ", "she", "셰"),
  x("je", "ジェ", "je", "j제"),
  x("che", "チェ", "che", "체"),
];

export const SOUNDS: Sound[] = [...BASIC, ...DAKUTEN, ...YOON, ...EXTENDED];

export const SOUND_BY_ID: ReadonlyMap<string, Sound> = new Map(
  SOUNDS.map((x) => [x.id, x]),
);

export function getSound(id: string): Sound {
  const found = SOUND_BY_ID.get(id);
  if (!found) throw new Error(`없는 가나 소리: ${id}`);
  return found;
}

/** 같은 소리라 로마자·한글 표기가 겹쳐도 되는 짝 */
export const HOMOPHONES: [string, string][] = [
  ["ji", "di"],
  ["zu", "du"],
  ["o", "wo"],
];

/** 같은 소리인지(4지선다 오답 고를 때 빼려고 쓴다) */
export function sameSound(a: string, b: string): boolean {
  if (a === b) return true;
  return HOMOPHONES.some(
    ([p, q]) => (p === a && q === b) || (p === b && q === a),
  );
}

// ─── 카드 ───────────────────────────────────────────────

/** 글자 하나 = 카드 하나. "hira:ka", "kata:fa" 꼴. */
export type CardId = `${Script}:${string}`;

export function cardId(script: Script, soundId: string): CardId {
  return `${script}:${soundId}`;
}

export function parseCardId(id: CardId): { script: Script; soundId: string } {
  const [script, soundId] = id.split(":") as [Script, string];
  return { script, soundId };
}

export function cardChar(id: CardId): string {
  const { script, soundId } = parseCardId(id);
  const sound = getSound(soundId);
  const ch = script === "hira" ? sound.hira : sound.kata;
  if (!ch) throw new Error(`글자 없음: ${id}`);
  return ch;
}

/** 모든 카드 id(글자가 있는 것만) */
export const ALL_CARD_IDS: CardId[] = [
  ...SOUNDS.filter((x) => x.hira).map((x) => cardId("hira", x.id)),
  ...SOUNDS.filter((x) => x.kata).map((x) => cardId("kata", x.id)),
];

/** 헷갈리기 쉬운 글자 짝. 오답 보기로 먼저 쓰고, 소개 화면에서 알려 준다. */
export const CONFUSABLE: [CardId, CardId][] = [
  ["hira:sa", "hira:chi"],
  ["hira:sa", "hira:ki"],
  ["hira:nu", "hira:me"],
  ["hira:ne", "hira:re"],
  ["hira:re", "hira:wa"],
  ["hira:ne", "hira:wa"],
  ["hira:ha", "hira:ho"],
  ["hira:i", "hira:ri"],
  ["hira:ru", "hira:ro"],
  ["hira:a", "hira:o"],
  ["hira:ta", "hira:na"],
  ["hira:ku", "hira:he"],
  ["kata:shi", "kata:tsu"],
  ["kata:so", "kata:n"],
  ["kata:ku", "kata:ta"],
  ["kata:u", "kata:wa"],
  ["kata:su", "kata:nu"],
  ["kata:ko", "kata:yu"],
  ["kata:chi", "kata:te"],
  ["kata:a", "kata:ma"],
  ["kata:no", "kata:me"],
  ["kata:fu", "kata:wa"],
];

export function confusablesOf(id: CardId): CardId[] {
  const out: CardId[] = [];
  for (const [p, q] of CONFUSABLE) {
    if (p === id) out.push(q);
    else if (q === id) out.push(p);
  }
  return out;
}

// ─── 50음도 표 ──────────────────────────────────────────

/** 진도 지도용 표. null은 빈칸(や행의 い 자리 등). */
export const GOJUON_GRID: (string | null)[][] = [
  ["a", "i", "u", "e", "o"],
  ["ka", "ki", "ku", "ke", "ko"],
  ["sa", "shi", "su", "se", "so"],
  ["ta", "chi", "tsu", "te", "to"],
  ["na", "ni", "nu", "ne", "no"],
  ["ha", "hi", "fu", "he", "ho"],
  ["ma", "mi", "mu", "me", "mo"],
  ["ya", null, "yu", null, "yo"],
  ["ra", "ri", "ru", "re", "ro"],
  ["wa", null, null, null, "wo"],
  ["n", null, null, null, null],
];

export const DAKUTEN_GRID: string[][] = [
  ["ga", "gi", "gu", "ge", "go"],
  ["za", "ji", "zu", "ze", "zo"],
  ["da", "di", "du", "de", "do"],
  ["ba", "bi", "bu", "be", "bo"],
  ["pa", "pi", "pu", "pe", "po"],
];

export const YOON_GRID: string[][] = [
  ["kya", "kyu", "kyo"],
  ["sha", "shu", "sho"],
  ["cha", "chu", "cho"],
  ["nya", "nyu", "nyo"],
  ["hya", "hyu", "hyo"],
  ["mya", "myu", "myo"],
  ["rya", "ryu", "ryo"],
  ["gya", "gyu", "gyo"],
  ["ja", "ju", "jo"],
  ["bya", "byu", "byo"],
  ["pya", "pyu", "pyo"],
];

/** 오디오가 있을 수 있는 소리(교재 가나표는 기본·탁음·반탁음만 읽는다) */
export function hasAudio(soundId: string): boolean {
  const k = SOUND_BY_ID.get(soundId)?.kind;
  return k === "basic" || k === "dakuten" || k === "handakuten";
}

export function audioUrl(soundId: string): string {
  return `/media/kana/${soundId}.mp3`;
}
