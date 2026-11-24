/**
 * 가나 획 수. 획의 모양·방향 데이터(KanjiVG 등)는 아직 들이지 않아서, 쓰기 채점은 획 수와
 * 본보기 글자 모양과의 겹침(write-check.ts)으로 한다.
 *
 * 손으로 쓸 때 획 수가 둘로 갈리는 글자는 둘 다 받는다(き 3·4, さ 2·3, そ 1·2, り 1·2).
 * 탁점(゛)은 2획, 반탁점(゜)은 1획을 더한다. 작은 글자(ゃ·ッ 등)는 큰 글자와 같다.
 */

// biome-ignore format: 오십음도 차례로 두어야 빠진 글자가 보인다
const BASIC: Record<string, number | number[]> = {
  あ: 3, い: 2, う: 2, え: 2, お: 3,
  か: 3, き: [4, 3], く: 1, け: 3, こ: 2,
  さ: [3, 2], し: 1, す: 2, せ: 3, そ: [1, 2],
  た: 4, ち: 2, つ: 1, て: 1, と: 2,
  な: 4, に: 3, ぬ: 2, ね: 2, の: 1,
  は: 3, ひ: 1, ふ: 4, へ: 1, ほ: 4,
  ま: 3, み: 2, む: 3, め: 2, も: 3,
  や: 3, ゆ: 2, よ: 2,
  ら: 2, り: [2, 1], る: 1, れ: 2, ろ: 1,
  わ: 2, を: 3, ん: 1,
  ア: 2, イ: 2, ウ: 3, エ: 3, オ: 3,
  カ: 2, キ: 3, ク: 2, ケ: 3, コ: 2,
  サ: 3, シ: 3, ス: 2, セ: 2, ソ: 2,
  タ: 3, チ: 3, ツ: 3, テ: 3, ト: 2,
  ナ: 2, ニ: 2, ヌ: 2, ネ: 4, ノ: 1,
  ハ: 2, ヒ: 2, フ: 1, ヘ: 1, ホ: 4,
  マ: 2, ミ: 3, ム: 2, メ: 2, モ: 3,
  ヤ: 2, ユ: 2, ヨ: 3,
  ラ: 2, リ: 2, ル: 2, レ: 1, ロ: 3,
  ワ: 2, ヲ: 3, ン: 2,
};

// biome-ignore format: 모음·반모음 차례로 둔다
const SMALL_TO_BIG: Record<string, string> = {
  ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お",
  ゃ: "や", ゅ: "ゆ", ょ: "よ", っ: "つ", ゎ: "わ",
  ァ: "ア", ィ: "イ", ゥ: "ウ", ェ: "エ", ォ: "オ",
  ャ: "ヤ", ュ: "ユ", ョ: "ヨ", ッ: "ツ", ヮ: "ワ",
};

/** 글자 하나의 획 수 후보. 모르는 글자면 빈 배열 */
function countsOfChar(ch: string): number[] {
  // 탁점·반탁점이 붙은 글자는 NFD로 나누면 바탕 글자 + 결합 부호가 된다
  const [base, mark] = [...ch.normalize("NFD")];
  const big = SMALL_TO_BIG[base] ?? base;
  const raw = BASIC[big];
  if (raw === undefined) return [];
  const extra = mark === "゙" ? 2 : mark === "゚" ? 1 : 0;
  return (Array.isArray(raw) ? raw : [raw]).map((n) => n + extra);
}

/**
 * 글자(요음처럼 두 글자일 수도 있다)를 쓰는 데 드는 획 수 후보. 첫 값이 교과서 획 수다.
 * 모르는 글자가 섞여 있으면 빈 배열(그때는 획 수를 따지지 않는다).
 */
export function strokeCounts(text: string): number[] {
  let sums = [0];
  for (const ch of text) {
    const counts = countsOfChar(ch);
    if (counts.length === 0) return [];
    sums = sums.flatMap((s) => counts.map((c) => s + c));
  }
  return [...new Set(sums)];
}
