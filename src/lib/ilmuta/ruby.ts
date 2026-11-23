import type { IlmutaLesson, Sentence } from "@/lib/textbook/schema";

// 후리가나: 소책자는 단어에만 읽는 법을 준다. 그 강까지 배운 단어를 사전으로 삼아
// 문형·회화 문장 속 한자 낱말에도 읽는 법을 단다(배운 낱말만, 모르는 한자는 그대로).

/** 한자가 든 낱말 → 읽는 법 */
export type Glossary = Record<string, string>;

export interface RubySegment {
  text: string;
  reading?: string;
}

const KANJI = /[㐀-鿿豈-﫿々〆]/;
const KANA = /^[぀-ヿ]$/;

export function hasKanji(text: string): boolean {
  return KANJI.test(text);
}

function withReading(s: Sentence): s is Sentence & { reading: string } {
  return !!s.reading && s.reading !== s.ja && hasKanji(s.ja);
}

/** `uptoNo`강까지 단어 코너와 회화 단어에서 읽는 법이 있는 한자 낱말을 모은다 */
export function buildGlossary(
  lessons: IlmutaLesson[],
  uptoNo: number,
): Glossary {
  const out: Glossary = {};
  for (const lesson of lessons) {
    if (lesson.no > uptoNo) continue;
    const words = [
      ...lesson.examples
        .filter((e) => e.kind === "words")
        .flatMap((e) => e.sentences),
      ...(lesson.conversationWords ?? []),
    ];
    for (const w of words) if (withReading(w)) out[w.ja] = w.reading;
  }
  return out;
}

/**
 * 낱말 하나를 읽는 법과 맞춰 나눈다. 앞뒤로 같은 가나(送り仮名)는 루비 밖으로 뺀다.
 * `食べる`/`たべる` → `食べ`가 아니라 `食`(た) + `べる`
 */
export function splitOkurigana(ja: string, reading: string): RubySegment[] {
  let head = 0;
  while (
    head < ja.length &&
    head < reading.length &&
    ja[head] === reading[head] &&
    KANA.test(ja[head])
  )
    head++;
  let tail = 0;
  while (
    tail < ja.length - head &&
    tail < reading.length - head &&
    ja[ja.length - 1 - tail] === reading[reading.length - 1 - tail] &&
    KANA.test(ja[ja.length - 1 - tail])
  )
    tail++;
  const core = ja.slice(head, ja.length - tail);
  const coreReading = reading.slice(head, reading.length - tail);
  const out: RubySegment[] = [];
  if (head > 0) out.push({ text: ja.slice(0, head) });
  if (core)
    out.push(
      coreReading ? { text: core, reading: coreReading } : { text: core },
    );
  if (tail > 0) out.push({ text: ja.slice(ja.length - tail) });
  return out;
}

function pushPlain(out: RubySegment[], text: string) {
  const last = out[out.length - 1];
  if (last && last.reading === undefined) last.text += text;
  else out.push({ text });
}

/** 문장 속에서 사전에 있는 가장 긴 낱말을 앞에서부터 찾아 읽는 법을 단다 */
export function rubySegments(text: string, glossary: Glossary): RubySegment[] {
  const byFirst = new Map<string, string[]>();
  for (const key of Object.keys(glossary)) {
    const list = byFirst.get(key[0]) ?? [];
    list.push(key);
    byFirst.set(key[0], list);
  }
  for (const list of byFirst.values()) list.sort((a, b) => b.length - a.length);

  const out: RubySegment[] = [];
  let i = 0;
  while (i < text.length) {
    const hit = byFirst.get(text[i])?.find((k) => text.startsWith(k, i));
    if (hit) {
      for (const seg of splitOkurigana(hit, glossary[hit])) {
        if (seg.reading) out.push(seg);
        else pushPlain(out, seg.text);
      }
      i += hit.length;
    } else {
      pushPlain(out, text[i]);
      i++;
    }
  }
  return out;
}
