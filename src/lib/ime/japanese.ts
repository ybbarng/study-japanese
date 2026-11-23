// 시험 입력칸에 일본어가 들어왔는지 본다. 입력기가 켜져 있으면 가나·한자가 들어온다.

const KANA = /[ぁ-ゖァ-ヺーｦ-ﾝ]/;
const KANJI = /[一-鿿㐀-䶿々]/;

export type TypedKind =
  | "empty"
  | "japanese" // 가나나 한자가 들어옴: 입력기 준비됨
  | "latin" // 로마자만: 입력기가 영문 상태
  | "other"; // 한글 등

export function typedKind(text: string): TypedKind {
  const t = text.trim();
  if (t === "") return "empty";
  if (KANA.test(t) || KANJI.test(t)) return "japanese";
  if (/^[\x20-\x7e]+$/.test(t)) return "latin";
  return "other";
}
