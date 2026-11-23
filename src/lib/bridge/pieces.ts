import { type Glossary, hasKanji, rubySegments } from "@/lib/ilmuta/ruby";
import type { Script } from "@/lib/kana/data";
import { type Mark, tokenize } from "@/lib/kana/text";

// 교재 문장을 "누를 수 있는 글자 조각"으로 나눈다. 가나 한 박(요음은 두 글자 한 박),
// 촉음·장음 표시, 읽는 법(후리가나)이 붙은 한자 낱말, 문장 부호로.

export type Piece =
  | { kind: "kana"; text: string; soundId: string; script: Script }
  | { kind: "mark"; text: string; mark: Mark; script: Script }
  /** 한자 낱말. units는 읽는 법(후리가나)을 나눈 조각 */
  | { kind: "kanji"; text: string; reading: string; units: Piece[] }
  | { kind: "punct"; text: string }
  /** 읽는 법을 모르는 한자, 로마자·숫자 같은 아직 배우지 않은 글자 */
  | { kind: "unknown"; text: string };

const PUNCT = /^[\s。、．，,.！？!?・「」『』（）()…〜～：:；;]$/u;
const HIRA = /^[ぁ-ゖ]/;
const KATA = /^[ァ-ヺ]/;

function scriptOfUnit(text: string, prev: Script | null): Script {
  if (HIRA.test(text)) return "hira";
  if (KATA.test(text)) return "kata";
  // ー처럼 어느 쪽 글자인지 모양으로 알 수 없는 표시는 앞 글자를 따른다
  return prev ?? (text === "っ" ? "hira" : "kata");
}

/** 가나만 든 글을 조각으로. 가나·표시가 아닌 글자는 부호나 모르는 글자로 남긴다. */
export function kanaPieces(text: string): Piece[] {
  const out: Piece[] = [];
  let prev: Script | null = null;
  for (const u of tokenize(text)) {
    if (u.soundId) {
      const script = scriptOfUnit(u.text, prev);
      out.push({ kind: "kana", text: u.text, soundId: u.soundId, script });
      prev = script;
    } else if (u.mark) {
      const script =
        u.text === "っ" ? "hira" : u.text === "ッ" ? "kata" : (prev ?? "kata");
      out.push({ kind: "mark", text: u.text, mark: u.mark, script });
    } else if (PUNCT.test(u.text)) {
      out.push({ kind: "punct", text: u.text });
    } else {
      out.push({ kind: "unknown", text: u.text });
    }
  }
  return out;
}

/**
 * 문장을 조각으로. 한자 낱말은 사전(그 강까지 배운 낱말)에 읽는 법이 있으면 후리가나 조각,
 * 없으면 모르는 글자로 남긴다.
 */
export function sentencePieces(ja: string, glossary: Glossary): Piece[] {
  const out: Piece[] = [];
  for (const seg of rubySegments(ja, glossary)) {
    if (seg.reading && hasKanji(seg.text)) {
      out.push({
        kind: "kanji",
        text: seg.text,
        reading: seg.reading,
        units: kanaPieces(seg.reading),
      });
    } else {
      out.push(...kanaPieces(seg.text));
    }
  }
  return out;
}
