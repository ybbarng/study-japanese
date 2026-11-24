import { hasKanji } from "@/lib/ilmuta/ruby";
import { hasAudio, SOUND_BY_ID, type SoundKind } from "@/lib/kana/data";
import { tokenize } from "@/lib/kana/text";

// 글자 하나를 누르면 보일 정보: 무슨 글자인지(히라가나·가타카나·한자), 탁음·요음·촉음 같은 표시,
// 소리 파일 id(가나 레슨의 /media/kana/<id>.mp3), 한글 근사치, 한글로는 정확히 못 적는 소리인지.
// 한글 근사치만 믿고 틀린 소리로 굳지 않게, 정확히 못 적는 소리에는 까닭을 함께 붙인다.

export type CharScript = "hira" | "kata" | "kanji" | "other";

/** 글자에 붙는 표시. 기본 글자(청음)는 표시가 없다 */
export type CharMark =
  | "dakuten" // 탁음(゛)
  | "handakuten" // 반탁음(゜)
  | "yoon" // 요음(작은 ゃゅょ와 합친 한 소리)
  | "extended" // 외래어 조합(ファ 등)
  | "sokuon" // 촉음(작은 っ)
  | "chouon" // 장음(ー)
  | "hatsuon" // 발음(ん)
  | "small"; // 혼자 떨어진 작은 글자

export const MARK_LABEL: Record<CharMark, string> = {
  dakuten: "탁음",
  handakuten: "반탁음",
  yoon: "요음",
  extended: "외래어 조합",
  sokuon: "촉음",
  chouon: "장음",
  hatsuon: "발음(ん)",
  small: "작은 글자",
};

/** 표시마다 한 줄 풀이(처음 보는 사람이 읽는다) */
export const MARK_EXPLAIN: Record<CharMark, string> = {
  dakuten: "오른쪽 위 점 두 개(゛)는 목을 울리는 흐린 소리로 바꾼다.",
  handakuten: "오른쪽 위 동그라미(゜)는 は행을 ㅍ 소리로 바꾼다.",
  yoon: "작은 ゃ·ゅ·ょ가 앞 글자와 합쳐 한 박자로 읽힌다.",
  extended: "외래어 소리를 적으려고 작은 글자를 붙인 조합이다.",
  sokuon: "작은 っ는 소리가 없고, 다음 소리 앞에서 한 박자 멈춘다.",
  chouon: "ー는 앞 모음을 한 박자 더 늘인다.",
  hatsuon: "ん은 혼자서 한 박자를 가진다.",
  small: "작은 글자는 앞 글자와 합쳐 읽는다.",
};

const SCRIPT_LABEL: Record<CharScript, string> = {
  hira: "히라가나",
  kata: "가타카나",
  kanji: "한자",
  other: "기호",
};

export function scriptLabel(script: CharScript): string {
  return SCRIPT_LABEL[script];
}

const Z_SOUND =
  "목을 울리는 z 소리라 한글 ㅈ과 다르다. 한글로는 정확히 못 적음.";
const F_SOUND =
  "f 소리는 한글에 없다. 윗니를 아랫입술에 대지 않고 두 입술 사이로 바람을 낸다. 한글로는 정확히 못 적음.";

/** 한글로 정확히 적을 수 없는 소리와 그 까닭(소리 id → 까닭) */
const INEXACT: Record<string, string> = {
  tsu: "혀끝을 윗잇몸에 댔다 떼며 내는 ts 소리. '쓰'와 '츠' 사이라 한글로는 정확히 못 적음.",
  zu: `'즈'로 적지만 ${Z_SOUND}`,
  du: `ず와 같은 소리. ${Z_SOUND}`,
  za: Z_SOUND,
  ze: Z_SOUND,
  zo: Z_SOUND,
  fu: "두 입술 사이로 바람을 내는 소리. 'ㅎ'도 'f'도 아니라 '후'로는 정확히 못 적음.",
  n: "뒤에 오는 소리에 따라 ㄴ·ㅁ·ㅇ처럼 바뀌고, 받침과 달리 혼자 한 박자를 가진다. 한글로는 정확히 못 적음.",
  fa: F_SOUND,
  fi: F_SOUND,
  fe: F_SOUND,
  fo: F_SOUND,
};

const MARK_INEXACT: Partial<Record<CharMark, string>> = {
  sokuon:
    "다음 자음을 미리 막고 한 박자 쉰다. 받침처럼 적지만 그 한 박자 길이는 한글로 못 적음.",
  chouon: "앞 모음을 한 박자 늘인다. 한글로는 길이를 못 적음.",
};

const KIND_MARK: Partial<Record<SoundKind, CharMark>> = {
  dakuten: "dakuten",
  handakuten: "handakuten",
  yoon: "yoon",
  extended: "extended",
};

export interface CharInfo {
  /** 글자(요음·외래어 조합은 두 글자) */
  text: string;
  script: CharScript;
  /** 가나 소리 id(SOUNDS). 한자·기호는 없다 */
  soundId?: string;
  romaji?: string;
  /** 한글 근사치. 촉음·장음은 소리 대신 하는 일을 적는다 */
  ko?: string;
  marks: CharMark[];
  /** 한글로는 정확히 못 적는 소리면 그 까닭 */
  inexact?: string;
  /** 가나 레슨의 소리 파일이 있는지(기본·탁음·반탁음만 있다) */
  audio: boolean;
}

const HIRA = /^[ぁ-ゟ]+$/;
const KATA = /^[゠-ヿ]+$/;
const SMALL = new Set([..."ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ"]);

function scriptOfText(text: string): CharScript {
  if (HIRA.test(text)) return "hira";
  if (KATA.test(text)) return "kata";
  if (hasKanji(text)) return "kanji";
  return "other";
}

/** 글을 누를 글자 단위(요음·외래어 조합은 두 글자 한 단위)로 나눠 글자마다 정보를 붙인다 */
export function charInfos(text: string): CharInfo[] {
  return tokenize(text).map((unit): CharInfo => {
    const script = scriptOfText(unit.text);
    if (unit.mark) {
      const mark: CharMark = unit.mark;
      return {
        text: unit.text,
        script,
        ko: mark === "sokuon" ? "(한 박자 멈춤)" : "(앞 모음 늘임)",
        marks: [mark],
        inexact: MARK_INEXACT[mark],
        audio: false,
      };
    }
    const sound = unit.soundId ? SOUND_BY_ID.get(unit.soundId) : undefined;
    if (!sound)
      return {
        text: unit.text,
        script,
        marks: SMALL.has(unit.text) ? ["small"] : [],
        audio: false,
      };
    const marks: CharMark[] = [];
    const kindMark = KIND_MARK[sound.kind];
    if (kindMark) marks.push(kindMark);
    if (sound.id === "n") marks.push("hatsuon");
    return {
      text: unit.text,
      script,
      soundId: sound.id,
      romaji: sound.romaji,
      ko: sound.ko,
      marks,
      inexact: INEXACT[sound.id],
      audio: hasAudio(sound.id),
    };
  });
}

/** 눌러 볼 만한 글자인지(가나·한자. 문장 부호·공백은 누르지 않는다) */
export function isTappableChar(info: Pick<CharInfo, "script">): boolean {
  return info.script !== "other";
}

/** 조사로 쓰일 때 글자와 다르게 읽는 것 */
const PARTICLE_READING: Record<string, string> = {
  は: "와",
  へ: "에",
};

/**
 * 조사 は·へ·を의 읽는 법 알림. 글자 소리(하·헤)와 달라 초급자가 가장 많이 틀린다.
 * 조사가 아니면 null
 */
export function particleNote(surface: string, pos?: string): string | null {
  if (pos !== "助詞") return null;
  const ko = PARTICLE_READING[surface];
  if (!ko) return null;
  return `조사로 쓰일 때는 '${ko}'로 읽는다.`;
}
