import { romajiToKana } from "@/lib/kana/text";
import { normalizeJa } from "./match";
import { hangulPhones, kanaPhones, phoneSimilarity } from "./phonetic";

// 강사의 한국어 말을 whisper가 일본어 줄(가타카나)로 받아 적은 곳을 찾는다. 화면을 모르는 순수 함수다.
// 초급자는 "지금 일본어" 칸에 뜬 글을 일본어로 믿으므로, 한국어 말을 옮긴 가타카나 줄은 내주지 않는다.
// 한국어 말은 가나로 옮기면 히라가나 없이 가타카나만 이어지는 일이 많다(워밍업 → ワーミングアップ).
// 진짜 가타카나 외래어(カーテン·テレビ)는 교재 낱말로 덮이면 남긴다.

export interface MisheardSegment {
  text: string;
  lang: "ko" | "ja";
}

/** 비교에서 뺄 글자: 공백·부호·기호·장음 기호 */
const NOT_CORE = /[\s\p{P}\p{S}ー]/gu;
const KATAKANA_ONLY = /^[ァ-ヺ]+$/u;

/**
 * 교재 오디오가 단계마다 한국어로 읽는 이름표를 가타카나로 받아 적은 모양.
 * 워밍업(ワーミングアップ·ウォーミングアップ), 회화·회화로 다지기(フェイファー·フェファロータジキ).
 */
const KOREAN_LABELS = [/^(?:ワ|ウォ)ミングアップ$/u, /^フェ[イェ]?[ファバワ]/u];

/** 이만큼 긴 가타카나 줄은 교재 낱말로 덮이지 않으면 한국어 말로 본다(가나 수, 장음 뺌) */
const LONG_KATAKANA = 7;
/** 앞뒤가 모두 한국어 줄일 때 한국어 말로 볼 가나 수 */
const BETWEEN_KOREAN = 4;
/** 앞뒤 한국어 줄의 한 토막과 소리가 이만큼 닮으면 그 말을 받아 적은 것으로 본다 */
const ECHO_SIMILARITY = 0.7;
const ECHO_MIN_PHONES = 4;
/** 앞뒤 몇 구간까지 한국어 줄을 견주나 */
const ECHO_NEAR = 2;

/** 가타카나만 남긴 알맹이. 히라가나·한자 등이 섞이면 null */
function katakanaCore(text: string): string | null {
  const core = text.replace(NOT_CORE, "");
  return KATAKANA_ONLY.test(core) ? core : null;
}

/** 비교용 글(히라가나)이 아는 낱말(두 글자 이상)로 빈틈없이 덮이나 */
export function coveredByWords(plain: string, known: Set<string>): boolean {
  const chars = [...plain];
  const ok: boolean[] = [true];
  for (let i = 1; i <= chars.length; i++) {
    ok[i] = false;
    for (let j = Math.max(0, i - 12); j <= i - 2 && !ok[i]; j++)
      if (ok[j] && known.has(chars.slice(j, i).join(""))) ok[i] = true;
  }
  return ok[chars.length];
}

/** 한국어 글 속 한글 토막(띄어쓰기 무시) 가운데 소리가 가장 닮은 것의 닮은 정도 */
function bestEcho(phones: string, korean: string): number {
  const syllables = [...korean.replace(/[^가-힣]/g, "")];
  let best = 0;
  for (let i = 0; i < syllables.length; i++)
    for (let n = 1; n <= 10 && i + n <= syllables.length; n++) {
      const score = phoneSimilarity(
        phones,
        hangulPhones(syllables.slice(i, i + n).join("")),
      );
      if (score > best) best = score;
    }
  return best;
}

/**
 * 한국어 말을 가타카나로 받아 적은 일본어 줄의 차례.
 * 가타카나뿐이고 아는 낱말로 덮이지 않는 줄 가운데
 * ① 단계 이름표 모양 ② 가나 7자 이상 ③ 앞뒤 한국어 줄의 한 토막과 소리가 닮음 ④ 앞뒤가 모두 한국어 줄이고 4자 이상
 * ⑤ 파일 첫 줄이고 뒤가 한국어 줄. (잡음 줄을 거른 뒤의 차례로 본다)
 * known은 가나로만 적는 교재 낱말의 비교용 글(normalizeJa, 장음 기호 뺌. card-sources의 knownWordForms).
 */
export function misheardKoreanIndexes(
  segments: MisheardSegment[],
  known: Set<string>,
): Set<number> {
  const out = new Set<number>();
  segments.forEach((seg, i) => {
    if (seg.lang !== "ja") return;
    const core = katakanaCore(seg.text);
    if (!core || coveredByWords(normalizeJa(core), known)) return;
    const length = [...core].length;
    const prev = segments[i - 1];
    const next = segments[i + 1];
    const phones = kanaPhones(core);
    const echo =
      phones.length >= ECHO_MIN_PHONES &&
      segments
        .slice(Math.max(0, i - ECHO_NEAR), i + ECHO_NEAR + 1)
        .some(
          (s) => s.lang === "ko" && bestEcho(phones, s.text) >= ECHO_SIMILARITY,
        );
    if (
      KOREAN_LABELS.some((re) => re.test(core)) ||
      // 일본어 줄 사이(장문 읽기 등)의 긴 가타카나는 외래어를 잇달아 읽은 것일 수 있다
      (length >= LONG_KATAKANA &&
        !(prev?.lang === "ja" && next?.lang === "ja")) ||
      echo ||
      (length >= BETWEEN_KOREAN &&
        prev?.lang === "ko" &&
        next?.lang === "ko") ||
      // 파일 첫 줄 뒤에 한국어가 이어지면 머리말(책·과 이름)을 한국어로 읽은 것이다
      (i === 0 && next?.lang === "ko")
    )
      out.add(i);
  });
  return out;
}

/** 가나(히라가나·가타카나)만 남긴 알맹이. 한자·한글 등이 섞이면 null */
function kanaCore(text: string): string | null {
  const core = text.replace(NOT_CORE, "");
  return /^[ぁ-ゖァ-ヺ]+$/u.test(core) ? core : null;
}

/** 일본어 문장에 흔한 조사·어미(한 글자 조사와 짧은 어미). 줄이 일본어로 설명되는지 잴 때 쓴다 */
const GRAMMAR_PIECES = [
  ..."はがをにでともかよねへやの",
  "です",
  "でした",
  "ます",
  "ません",
  "ました",
  "じゃない",
  "ない",
  "なかった",
  "だった",
  "だ",
  "た",
  "て",
  "から",
  "まで",
  "けど",
  "けれど",
  "ので",
  "のに",
  "しか",
  "だけ",
  "ばかり",
  "ほど",
  "くらい",
  "ぐらい",
  "より",
  "など",
  "って",
  "という",
  "とか",
  "なければ",
  "なくては",
  "なくて",
  "ければ",
  "れば",
  "たら",
  "ても",
  "ては",
  "ながら",
  "こと",
  "もの",
  "ところ",
  "はず",
  "ため",
  "よう",
  "らしい",
  "みたい",
  "うん",
  "ううん",
  "はい",
  "いいえ",
  "ええ",
  "そう",
  "こう",
  "ああ",
  "どう",
  "じゃ",
  "じゃあ",
  "さあ",
];

/**
 * 비교용 글(히라가나)에서 아는 낱말(두 글자 이상)과 조사·어미로 덮이는 글자의 비율(0~1).
 * 한 글자 조사(が·の·を…)는 아무 가나 줄에나 흔해서, 바로 앞이 두 글자 이상 조각으로 덮였을 때만 센다.
 * 덮는 글자 수가 가장 많게 고른다.
 */
export function japaneseShare(plain: string, known: Set<string>): number {
  const chars = [...plain];
  if (chars.length === 0) return 0;
  const pieces = new Set([...known, ...GRAMMAR_PIECES]);
  // best[i]: i글자까지 덮은 수. multi[i]: 그 최선이 두 글자 이상 조각으로 끝나는지
  const best: number[] = [0];
  const multi: boolean[] = [false];
  for (let i = 1; i <= chars.length; i++) {
    best[i] = best[i - 1];
    multi[i] = false;
    for (let j = Math.max(0, i - 12); j < i; j++) {
      const piece = chars.slice(j, i).join("");
      if (!pieces.has(piece)) continue;
      const long = i - j >= 2;
      if (!long && !multi[j]) continue;
      const score = best[j] + (i - j);
      if (score > best[i] || (score === best[i] && long)) {
        best[i] = score;
        multi[i] = long;
      }
    }
  }
  return best[chars.length] / chars.length;
}

/**
 * 강사의 한국어 어미·낱말을 가나로 옮긴 조각(비교용 히라가나). 일본어에는 거의 나오지 않는다.
 * ~거예요(がてよ·がでよ)·~거죠(がでしょ)·~해요(へよ)·~라고 하(らごは)·~는(ぬん)·사람(さらみ)·
 * 붙여(ぷち·ぶち)·~하게(はげて)·~죠(줄 끝 ちょ)·~예요(でよ)·~잖고요(じゃっこ) 등.
 * 일무따·일문따 예문 mp3 전체에서 걸리지 않는 것만 골랐다(ひょん·ちょ 하나는 회화의 한국인 이름
 * ヒョンジン·チョン에, でよ 뒤 く는 「病院でよく」에 걸려 뺐다).
 */
const KOREAN_TELLS =
  /がてよ|がでよ|かてよ|がてご|がてしょ|がでしょ|がてくよ|へよ|へっそ|はげ(?:て|はだ)|らご(?:は|へ)|ぬん|さらみ|ぴょん|ぷち|ぶち|ぶっち|ぱっき|ちょ$|ますよくよ|いっちょ|でよ(?![くう])|っこよ|じゃっこ|ちょそ|えよ$|でしじゃ|まんち|いしょ$|わいちょ/u;

/** 히라가나가 섞인 줄을 한국어 말로 볼 최소 가나 수와, 일본어로 설명되는 비율의 상한 */
const KOREAN_KANA_MIN = 5;
const KOREAN_KANA_SHARE = 0.5;

/**
 * 가나를 하나씩 늘어놓은 줄(「あ」「い」「う」, う단 글자들)인가. 가나 강의는 오십음도의 한 단·한 행을
 * 읽어 주므로 모든 글자의 모음이나 자음이 같거나, 낱자 가나를 따옴표로 둘 넘게 묶는다.
 */
function isKanaList(text: string, core: string): boolean {
  if ((text.match(/「[ぁ-ゖァ-ヺ]」/gu)?.length ?? 0) >= 2) return true;
  const phones = [...core].map((c) => kanaPhones(c)).filter((p) => p !== "");
  if (phones.length < 3) return false;
  // 같은 행 글자가 넷 넘게 이어지면(が행을 읽음) 줄 전체가 아니어도 가나 목록이다
  let run = 1;
  for (let i = 1; i < phones.length; i++) {
    run = phones[i].slice(0, -1) === phones[i - 1].slice(0, -1) ? run + 1 : 1;
    if (run >= 4) return true;
  }
  const vowels = new Set(phones.map((p) => p.at(-1)));
  const consonants = new Set(phones.map((p) => p.slice(0, -1)));
  return vowels.size === 1 || consonants.size === 1;
}

/**
 * 한국어 말을 히라가나(가타카나 섞임)로 받아 적은 일본어 줄의 차례(0강의 「くらめ、さがの…」 같은 줄).
 * 진짜 일본어 대답도 앞뒤가 한국어 설명인 일이 많아(드릴의 「うん、～の」) 더 좁게 본다.
 * 가나만 있고, 앞뒤 두 줄씩이 모두 한국어(강사가 한국어로 이어 말하는 중)이고,
 * 아는 낱말·조사·어미로 덮이는 글자가 절반이 안 되는 줄만.
 */
export function koreanKanaIndexes(
  segments: MisheardSegment[],
  known: Set<string>,
): Set<number> {
  const out = new Set<number>();
  const isKo = (j: number) => !segments[j] || segments[j].lang === "ko";
  segments.forEach((seg, i) => {
    if (seg.lang !== "ja") return;
    if (KOREAN_TELLS.test(normalizeJa(seg.text))) {
      out.add(i);
      return;
    }
    const core = kanaCore(seg.text);
    if (!core || [...core].length < KOREAN_KANA_MIN) return;
    if (isKanaList(seg.text, core)) return;
    if (![i - 2, i - 1, i + 1, i + 2].every(isKo)) return;
    if (japaneseShare(normalizeJa(core), known) >= KOREAN_KANA_SHARE) return;
    out.add(i);
  });
  return out;
}

/** 한국어 말을 가나로 받아 적은 일본어 줄을 뺀 구간들(원래 차례는 그대로) */
export function withoutMisheardKorean<T extends MisheardSegment>(
  segments: T[],
  known: Set<string>,
  {
    kanaLines = false,
    kanaKnown = known,
  }: {
    /** 히라가나 줄까지 볼지(koreanKanaIndexes) */
    kanaLines?: boolean;
    /** 히라가나 줄이 일본어로 설명되는지 잴 때 쓸 낱말(활용형까지 넣는다) */
    kanaKnown?: Set<string>;
  } = {},
): T[] {
  const drop = new Set([
    ...misheardKoreanIndexes(segments, known),
    ...(kanaLines ? koreanKanaIndexes(segments, kanaKnown) : []),
  ]);
  return drop.size === 0 ? segments : segments.filter((_, i) => !drop.has(i));
}

/**
 * 한글이 두 글자 넘게 이어 섞인 일본어 줄(「…라는 단어를」)은 강사의 한국어 설명이다.
 * 한국어 줄로 돌린다(일본어 칸에 크게 보이지 않게).
 */
export function isKoreanMixed(text: string): boolean {
  return /[가-힣]{2,}/u.test(text);
}

/** 한글 자음 낱자 → 소리 갈래(phonetic.ts 자모열의 첫 글자. 모음으로 시작하면 "") */
const JAMO_CLASS: Record<string, string> = {
  ㄱ: "K",
  ㄲ: "K",
  ㅋ: "K",
  ㄴ: "n",
  ㄷ: "T",
  ㄸ: "T",
  ㅌ: "T",
  ㄹ: "r",
  ㅁ: "m",
  ㅂ: "P",
  ㅃ: "P",
  ㅍ: "P",
  ㅅ: "S",
  ㅆ: "S",
  ㅈ: "S",
  ㅉ: "S",
  ㅊ: "S",
  ㅇ: "",
  ㅎ: "h",
};
const LONE_JAMO = /[ㄱ-ㅎ](?!의\s*발음)/gu;

function kanaClass(kana: string): string {
  const first = kanaPhones(kana)[0] ?? "";
  return /[aiueo]/.test(first) ? "" : first;
}

/** 그 강에서 다루는 조사: 일본어(は)와 그에 해당하는 한국어(은·는) */
export interface LessonParticles {
  ja: string[];
  ko: string[];
}

/** 받침에 따라 바뀌는 한국어 조사의 짝 */
const KO_PARTICLE_PAIR: Record<string, string> = {
  는: "은",
  은: "는",
  가: "이",
  이: "가",
  를: "을",
  을: "를",
  와: "과",
  과: "와",
};
const AFTER_BATCHIM_FORMS = new Set(["은", "이", "을", "과"]);

/**
 * 문형 틀(～は～。 / ~는 ~야.)에서 빈칸 바로 뒤의 조사. 일본어는 가나 한 글자, 한국어는 한 글자와 그 짝.
 */
export function particlesOfFrames(
  frames: { ja: string; ko: string }[],
): LessonParticles {
  const ja = new Set<string>();
  const ko = new Set<string>();
  for (const f of frames) {
    // 틀의 첫 빈칸 뒤 조사끼리 짝짓는다(~가 아니야의 가는 は의 짝이 아니다)
    const jm = f.ja.match(/[～~]([ぁ-ゖ])(?=[～~])/u);
    const km = f.ko.match(/[～~]([가-힣])(?=\s)/u);
    if (!jm || !km) continue;
    ja.add(jm[1]);
    const pair = KO_PARTICLE_PAIR[km[1]];
    if (!pair) continue;
    // 받침 있는 말 뒤 꼴을 앞에(은, 는)
    const order = AFTER_BATCHIM_FORMS.has(km[1])
      ? [km[1], pair]
      : [pair, km[1]];
    for (const p of order) ko.add(p);
  }
  return { ja: [...ja], ko: [...ko] };
}

/**
 * 한국어 줄 속에 남은 한글 낱자(가나·조사 소리를 글자로 옮기지 못한 자리)를 채운 글. 낱자가 없으면 null.
 * ① 끝소리를 말하는 줄(「ㄱ, ㄱ로 끝나는」): 「끝나」 앞 낱자만 hints(그 강이 다루는 가나) 가운데
 *    소리 갈래가 맞는 것으로 차례대로 채운다.
 * ② 조사 이름을 대는 줄(「ㄴ, ㄴ에 해당되는 조사는 일본어로 ㄱ라고」): 「일본어로」 뒤 낱자는 그 강의
 *    일본어 조사로, 앞 낱자 목록은 그 강의 한국어 조사로(같은 것이 잇따르면 한 번만) 채운다.
 * ③ 「ㅂ니다」처럼 한국어 어미를 적은 곳(낱자 바로 뒤 「니다」)은 ㅂ으로 바로잡는다.
 * 채울 것이 없는 낱자는 "…"로 가린다. 한글 자모 자체를 설명하는 곳(ㅈ의 발음)은 남긴다.
 */
export function fillJamo(
  text: string,
  hints: string[],
  particles: LessonParticles = { ja: [], ko: [] },
): string | null {
  if (!LONE_JAMO.test(text)) return null;
  LONE_JAMO.lastIndex = 0;
  let out = text.replace(/[ㄱ-ㅎ](?=니다)/gu, "ㅂ");
  if (/조사/u.test(out) && (particles.ja.length || particles.ko.length)) {
    const at = out.search(/일본어로/u);
    const before = at < 0 ? out : out.slice(0, at);
    const after = at < 0 ? "" : out.slice(at);
    // 낱자를 쉼표로 늘어놓은 목록은 한국어 조사 목록 하나로
    const koList = particles.ko.join(", ");
    const filledBefore = koList
      ? before.replace(/[ㄱ-ㅎ](?:\s*,\s*[ㄱ-ㅎ])*/gu, koList)
      : before;
    let n = 0;
    const filledAfter = after.replace(/[ㄱ-ㅎ]/gu, (j) =>
      n < particles.ja.length ? particles.ja[n++] : j,
    );
    out = filledBefore + filledAfter;
  } else if (/끝나/u.test(out)) {
    const at = out.search(/끝나/u);
    let next = 0;
    out =
      out.slice(0, at).replace(LONE_JAMO, (jamo) => {
        for (let k = next; k < hints.length; k++)
          if (kanaClass(hints[k]) === JAMO_CLASS[jamo]) {
            next = k + 1;
            return hints[k];
          }
        return jamo;
      }) + out.slice(at);
  }
  return out.replace(/[ㄱ-ㅎ](?!의\s*발음)(?!니다)/gu, "…");
}

const LATIN_TOKEN = /[A-Za-z]+(?:-[A-Za-z]+)*/gu;

/**
 * 로마자 한 토막을 가나로. 가나로 다 바뀌지 않으면(영어 낱말) null.
 * 모음 한 글자 마디(-e·i)는 한국어 조사(에·이)를 적은 것일 수 있어 바꾸지 않는다(null).
 */
function romajiKana(token: string): string | null {
  const pieces = token.split("-").filter((p) => p !== "");
  if (pieces.some((p) => /^[aiueo]$/iu.test(p))) return null;
  const kana = pieces.map((p) => romajiToKana(p, "hira", true)).join("");
  return /^[ぁ-ゖー]+$/u.test(kana) ? kana : null;
}

/**
 * 한국어 줄에 로마자로 적힌 일본어(조사 'no', 'desu-ka', 'ikanai')를 가나로 바꾼 글.
 * 로마자가 없거나, 가나로 다 바뀌지 않는 토막(yes·TV 같은 영어)이 하나라도 있으면 null(줄 전체를 그대로 둔다).
 */
export function kanaForRomaji(text: string): string | null {
  const tokens = text.match(LATIN_TOKEN);
  if (!tokens) return null;
  if (tokens.some((t) => romajiKana(t) === null)) return null;
  return text.replace(LATIN_TOKEN, (t) => romajiKana(t) ?? t);
}

/** 강 부제에 적힌 가나 하나짜리 낱말들(「끝소리가 く, ぐ와 う…」 → く·ぐ·う) */
export function kanaHints(subtitle: string | undefined): string[] {
  return [...(subtitle ?? "").matchAll(/(?<![ぁ-ゖ])[ぁ-ゖ](?![ぁ-ゖ])/gu)].map(
    (m) => m[0],
  );
}

/**
 * 강사가 문형을 설명할 때 쓰는 한국어 자리 말(누구누구·뭐뭐)을 가나로 받아 적은 줄(ぬぐぬぐの…)을
 * 들린 대로 한국어 자리 말로 돌린 글. ぬぐ가 없는 줄은 일본어일 수 있어 null(もも는 桃일 수도 있다).
 * momoIsPlaceholder면(일문따: 桃가 나오지 않고 강사가 「뭐뭐ない」처럼 문형을 말한다) もも만 있어도 돌린다.
 */
export function placeholderText(
  text: string,
  momoIsPlaceholder = false,
): string | null {
  // 가타카나 モモ는 어느 책에서나 자리 말이다(桃를 가타카나로 적지 않는다)
  const momo = momoIsPlaceholder ? /もも|モモ|桃/u : /モモ/u;
  if (!/ぬぐ/u.test(text) && !momo.test(text)) return null;
  return text
    .replace(/(?:ぬぐ)+/gu, "누구누구")
    .replace(
      momoIsPlaceholder
        ? /(?:もも|モモ|桃)(?:も|モ)*/gu
        : /(?:もも|モモ)(?:も|モ)*/gu,
      "뭐뭐",
    );
}
