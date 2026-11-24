// 여러 출처(교재 단어·드릴·예문 분석)에서 모은 짧은 뜻을 겹치지 않게 합친다.
// "나(여자)"·"나"·"저, 나"처럼 괄호 설명·쉼표 차례·띄어쓰기만 다른 뜻은 같은 뜻으로 본다.
// 화면을 모르는 순수 함수다.

/** 괄호 밖 쉼표로 뜻 조각을 나눈다(괄호 안 "남자, 거친 말"은 한 조각) */
function splitPieces(gloss: string): string[] {
  const pieces: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < gloss.length; i++) {
    const c = gloss[i];
    if (c === "(" || c === "（") depth++;
    else if ((c === ")" || c === "）") && depth > 0) depth--;
    else if (depth === 0 && (c === "," || c === "，" || c === ";")) {
      pieces.push(gloss.slice(start, i));
      start = i + 1;
    }
  }
  pieces.push(gloss.slice(start));
  return pieces.map((p) => p.trim()).filter((p) => p !== "");
}

/** 견줄 때 쓰는 알맹이: 괄호 설명과 공백을 뺀 글. 괄호뿐인 뜻("(높이는 말)")은 괄호 안 글 */
export function glossCore(piece: string): string {
  const bare = piece.replace(/[(（][^()（）]*[)）]/g, "").replace(/\s+/g, "");
  return bare !== "" ? bare : piece.replace(/[\s()（）]+/g, "");
}

/**
 * 모은 차례대로 뜻을 합친다. 첫 뜻이 대표 뜻이고, 뒤의 뜻은 앞에서 나오지 않은 조각만 남긴다.
 * 예: ["나(여자)", "저", "나", "저, 나"] → ["나(여자)", "저"]
 */
export function mergeGlosses(raw: readonly string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const gloss of raw) {
    const fresh: string[] = [];
    for (const piece of splitPieces(gloss)) {
      const core = glossCore(piece);
      if (core === "" || seen.has(core)) continue;
      seen.add(core);
      fresh.push(piece);
    }
    if (fresh.length === 0) continue;
    // 조각이 모두 새것이면 원래 글 그대로(띄어쓰기·쉼표 모양을 지킨다)
    out.push(
      fresh.length === splitPieces(gloss).length
        ? gloss.trim()
        : fresh.join(", "),
    );
    if (out.length >= max) break;
  }
  return out;
}
