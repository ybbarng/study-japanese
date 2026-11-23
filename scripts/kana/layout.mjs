import { join } from "node:path";
import { fileURLToPath } from "node:url";

// 일무따 특별 부록 A01-1(히라가나 청음표) 오디오의 읽는 순서.
// 행마다 글자를 하나씩 읽은 뒤, 같은 행을 이어서 한 번 더 읽는다.
// 행 사이·탁음·반탁음 앞에는 한국어 안내가 들어간다.

export const ROWS = [
  { kana: "あいうえお", ids: ["a", "i", "u", "e", "o"] },
  { kana: "かきくけこ", ids: ["ka", "ki", "ku", "ke", "ko"] },
  { kana: "さしすせそ", ids: ["sa", "shi", "su", "se", "so"] },
  { kana: "たちつてと", ids: ["ta", "chi", "tsu", "te", "to"] },
  { kana: "なにぬねの", ids: ["na", "ni", "nu", "ne", "no"] },
  { kana: "はひふへほ", ids: ["ha", "hi", "fu", "he", "ho"] },
  { kana: "まみむめも", ids: ["ma", "mi", "mu", "me", "mo"] },
  { kana: "やゆよ", ids: ["ya", "yu", "yo"] },
  { kana: "らりるれろ", ids: ["ra", "ri", "ru", "re", "ro"] },
  { kana: "わをん", ids: ["wa", "wo", "n"] },
  { kana: "がぎぐげご", ids: ["ga", "gi", "gu", "ge", "go"] },
  { kana: "ざじずぜぞ", ids: ["za", "ji", "zu", "ze", "zo"] },
  { kana: "だぢづでど", ids: ["da", "di", "du", "de", "do"] },
  { kana: "ばびぶべぼ", ids: ["ba", "bi", "bu", "be", "bo"] },
  { kana: "ぱぴぷぺぽ", ids: ["pa", "pi", "pu", "pe", "po"] },
];

// 받아쓰기 확인 때 같은 소리로 보는 글자(ぢ=じ, づ=ず, を=お).
export const SAME_SOUND = { ぢ: "じ", づ: "ず", を: "お" };

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

export const DEFAULT_SOURCE = join(
  REPO_ROOT,
  "media/ilmuta/3. 특별 부록/A01-1.mp3",
);
export const DEFAULT_OUT_DIR = join(REPO_ROOT, "media/kana");
export const SEGMENTS_FILE = fileURLToPath(
  new URL("./segments.json", import.meta.url),
);
