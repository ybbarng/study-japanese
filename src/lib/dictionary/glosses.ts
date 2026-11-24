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

/** 뜻 끝에 붙은 괄호(「쓰다(사용하다)」). 앞에 붙은 괄호(「(바로)옆」)는 대상·범위 설명이다 */
const TRAILING_PAREN = /\s*[(（]([^()（）]*)[)）]\s*$/;

/**
 * 뜻 끝 괄호 속이 다른 말 하나(쉼표 없음)면 그 뜻의 다른 말로 본다(「나(남자, 거친 말)」은 설명).
 * 괄호뿐인 조각은 없다
 */
function synonymOf(piece: string): string | null {
  const m = piece.match(TRAILING_PAREN);
  if (!m || m.index === 0 || /[,，]/.test(m[1])) return null;
  const inner = m[1].replace(/\s+/g, "");
  return inner !== "" ? inner : null;
}

/** 같은 뜻 말인가: 글자가 같거나 한쪽이 「~하다」만 더 붙었다(거주 · 거주하다) */
function sameWord(a: string, b: string): boolean {
  return a === b || `${a}하다` === b || `${b}하다` === a;
}

/**
 * 모은 차례대로 뜻을 합친다. 첫 뜻이 대표 뜻이고, 뒤의 뜻은 앞에서 나오지 않은 조각만 남긴다.
 * 괄호 설명 속 말과 다른 조각이 같으면 하나로 본다: 뒤 조각이 앞 괄호 속 말이면 빼고,
 * 뒤 조각의 괄호 속 말이 앞 조각이면 그 괄호를 뗀다.
 * 예: ["나(여자)", "저", "나", "저, 나"] → ["나(여자)", "저"],
 *     ["쓰다(사용하다)", "사용하다"] → ["쓰다(사용하다)"], ["자동차, 차(자동차)"] → ["자동차, 차"]
 */
export function mergeGlosses(raw: readonly string[], max: number): string[] {
  const seen: string[] = [];
  const has = (word: string) => seen.some((s) => sameWord(s, word));
  const out: string[] = [];
  for (const gloss of raw) {
    const pieces = splitPieces(gloss);
    const fresh: string[] = [];
    let changed = false;
    for (const piece of pieces) {
      const core = glossCore(piece);
      if (core === "" || has(core)) continue;
      // 끝 괄호 속 말이 이미 나온 뜻이면 그 괄호를 뗀다
      const synonym = synonymOf(piece);
      const kept =
        synonym && has(synonym)
          ? piece.replace(TRAILING_PAREN, "").trim()
          : piece;
      if (kept !== piece) changed = true;
      seen.push(core);
      if (synonym && kept === piece) seen.push(synonym);
      fresh.push(kept);
    }
    if (fresh.length === 0) continue;
    // 조각이 모두 새것이고 고친 것이 없으면 원래 글 그대로(띄어쓰기·쉼표 모양을 지킨다)
    out.push(
      fresh.length === pieces.length && !changed
        ? gloss.trim()
        : fresh.join(", "),
    );
    if (out.length >= max) break;
  }
  return out;
}
