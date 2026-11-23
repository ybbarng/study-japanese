/** 한자 표기와 읽기를 맞대어, 한자 덩어리마다 읽는 법을 단다. */
export interface RubyPart {
  text: string;
  /** 한자 덩어리면 그 읽기. 가나면 비움 */
  ruby?: string;
}

const KANA = /[ぁ-ゖァ-ヺー]/;

const toHira = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 飲んで / のんで → [飲(の), んで]
 * 맞대지 못하면 통째로 읽기를 단다.
 */
export function furigana(kanji: string, reading: string): RubyPart[] {
  if (kanji === reading) return [{ text: kanji }];
  const runs: { text: string; kana: boolean }[] = [];
  for (const ch of kanji) {
    const kana = KANA.test(ch);
    const last = runs.at(-1);
    if (last && last.kana === kana) last.text += ch;
    else runs.push({ text: ch, kana });
  }
  const pattern = runs
    .map((r) => (r.kana ? escapeRegExp(toHira(r.text)) : "(.+?)"))
    .join("");
  const m = new RegExp(`^${pattern}$`).exec(reading);
  if (!m) return [{ text: kanji, ruby: reading }];
  let g = 1;
  return runs.map((r) =>
    r.kana ? { text: r.text } : { text: r.text, ruby: m[g++] },
  );
}
