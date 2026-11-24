// 아라비아 숫자(7, 30, 119, 1万8000의 8000)를 읽을 수 있는 소리를 모두 늘어놓는다. 화면을 모르는 순수 함수다.
// 문장 읽기(히라가나)에서 숫자 부분을 빼고 남은 가나를 뒤 한자(7時의 時)에 달 때 쓴다(reading-ruby.ts).
// 소리가 여럿인 숫자(7: しち·なな, 4: よん·よ·し, 9: きゅう·く)와 뒤 말에 붙어 줄어드는 꼴
// (1本 いっぽん의 いっ, 10分 じゅっぷん의 じゅっ)을 모두 넣는다. 고르는 일은 부르는 쪽이 한다.
// 날짜의 고유어 읽기(3日 みっか의 みっ)는 日이 か로 읽히는 꼴만 넣는다. 통째로 읽는 말
// (1日 ついたち, 1人 ひとり, 20歳 はたち)은 한자 하나에 읽기를 나눠 달 수 없으니 넣지 않는다.

const ONES: Record<number, string[]> = {
  1: ["いち"],
  2: ["に"],
  3: ["さん"],
  4: ["よん", "よ", "し"],
  5: ["ご"],
  6: ["ろく"],
  7: ["なな", "しち"],
  8: ["はち"],
  9: ["きゅう", "く"],
};

/** 끝자리에서 뒤 말에 붙어 줄어드는 꼴(いっ·ろっ·はっ·じゅっ·ひゃっ) */
const CLIPPED: Record<string, string[]> = {
  いち: ["いっ"],
  ろく: ["ろっ"],
  はち: ["はっ"],
  じゅう: ["じゅっ", "じっ"],
  ひゃく: ["ひゃっ"],
};

/** 날짜(2日~10日)의 고유어 읽기에서 日(か) 앞부분 */
const DAY_NATIVE: Record<number, string[]> = {
  2: ["ふつ"],
  3: ["みっ"],
  4: ["よっ"],
  5: ["いつ"],
  6: ["むい"],
  7: ["なの"],
  8: ["よう"],
  9: ["ここの"],
  10: ["とお"],
};

const HUNDREDS: Record<number, string[]> = {
  1: ["ひゃく"],
  2: ["にひゃく"],
  3: ["さんびゃく"],
  4: ["よんひゃく"],
  5: ["ごひゃく"],
  6: ["ろっぴゃく"],
  7: ["ななひゃく"],
  8: ["はっぴゃく"],
  9: ["きゅうひゃく"],
};

const THOUSANDS: Record<number, string[]> = {
  1: ["せん", "いっせん"],
  2: ["にせん"],
  3: ["さんぜん"],
  4: ["よんせん"],
  5: ["ごせん"],
  6: ["ろくせん"],
  7: ["ななせん"],
  8: ["はっせん"],
  9: ["きゅうせん"],
};

const TENS: Record<number, string[]> = {
  1: ["じゅう"],
  2: ["にじゅう"],
  3: ["さんじゅう"],
  4: ["よんじゅう"],
  5: ["ごじゅう"],
  6: ["ろくじゅう"],
  7: ["ななじゅう", "しちじゅう"],
  8: ["はちじゅう"],
  9: ["きゅうじゅう"],
};

/** 한 자리 숫자를 하나씩 읽는 소리(119 いちいちきゅう, 0 ぜろ·れい·まる) */
const DIGIT_BY_DIGIT: Record<string, string[]> = {
  "0": ["ぜろ", "れい", "まる"],
  "1": ["いち"],
  "2": ["に"],
  "3": ["さん"],
  "4": ["よん"],
  "5": ["ご"],
  "6": ["ろく"],
  "7": ["なな"],
  "8": ["はち"],
  "9": ["きゅう"],
};

const cross = (a: string[], b: string[]) =>
  a.flatMap((x) => b.map((y) => x + y));

/** 끝 조각에 줄어든 꼴을 더한다 */
const withClipped = (parts: string[]) =>
  parts.flatMap((p) => {
    const tail = Object.keys(CLIPPED).find((k) => p.endsWith(k));
    return tail
      ? [p, ...CLIPPED[tail].map((c) => p.slice(0, -tail.length) + c)]
      : [p];
  });

/** 1~9999의 읽기. last면 끝 조각이 줄어든 꼴도 넣는다 */
function belowTenThousand(n: number, last: boolean): string[] {
  const parts: string[][] = [];
  const th = Math.floor(n / 1000);
  const hu = Math.floor(n / 100) % 10;
  const te = Math.floor(n / 10) % 10;
  const on = n % 10;
  if (th) parts.push(THOUSANDS[th]);
  if (hu) parts.push(HUNDREDS[hu]);
  if (te) parts.push(TENS[te]);
  if (on) parts.push(ONES[on]);
  if (last && parts.length) parts.push(withClipped(parts.pop() ?? []));
  return parts.reduce((acc, p) => cross(acc, p), [""]);
}

/** 1~9999_9999의 한자어 읽기 */
function sinoReadings(n: number): string[] {
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  if (man === 0) return belowTenThousand(rest, true);
  const head = cross(belowTenThousand(man, false), ["まん"]);
  return rest ? cross(head, belowTenThousand(rest, true)) : head;
}

/**
 * 숫자 글(아라비아 숫자, 자리 쉼표는 미리 뺀 것)을 읽을 수 있는 소리 전부. 모르는 꼴이면 빈 배열.
 */
export function numberReadings(digits: string): string[] {
  if (!/^[0-9]+$/u.test(digits) || digits.length > 8) return [];
  const out = new Set<string>();
  const n = Number(digits);
  if (n === 0) for (const r of DIGIT_BY_DIGIT["0"]) out.add(r);
  else if (!digits.startsWith("0")) for (const r of sinoReadings(n)) out.add(r);
  for (const r of DAY_NATIVE[n] && !digits.startsWith("0") ? DAY_NATIVE[n] : [])
    out.add(r);
  if (digits.length >= 2 && digits.length <= 4)
    for (const r of [...digits].reduce(
      (acc, d) => cross(acc, DIGIT_BY_DIGIT[d]),
      [""],
    ))
      out.add(r);
  return [...out];
}
