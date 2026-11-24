import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { silentMp3 } from "./silent-mp3";

// E2E용 가짜 교재. 교재 글을 옮기지 않고 모양만 같은 짧은 문장을 쓴다(docs/standing-rules.md "저작권").
// 실제 교재처럼 content/textbook/*.json과 media/<책>/<파일>을 만든다.

/** 강의·예문 mp3 길이(초). 들은 기록은 1초 넘게 들어야 남고, 90% 넘게 들으면 끝까지 들은 것이다 */
export const AUDIO_SECONDS = 3;

/**
 * 3강 강의만 길게 둔다. PC 시험이 단축키로 5초씩 옮기고 자막 줄을 눌러 그 자리로 가 보려면
 * 끝나기 전에 여유가 있어야 해서다(다른 시험은 3초짜리로 기록이 끝까지 남는지 본다).
 */
export const LONG_LECTURE = { no: 3, seconds: 40 } as const;

/** 3강 강의의 가짜 자막. 교재 글이 아니라 모양만 같은 줄이다 */
export const LONG_LECTURE_CUES = [
  { start: 0, end: 8, text: "시험 강의 첫 줄입니다.", lang: "ko" },
  { start: 10, end: 18, text: "テストのぶんです。", lang: "ja" },
  { start: 20, end: 28, text: "시험 강의 셋째 줄입니다.", lang: "ko" },
  { start: 30, end: 38, text: "もういちどテスト。", lang: "ja" },
] as const;

/**
 * 0강 강의: 실제 0강처럼 일본어가 드물다. 첫머리에 짝 없는 일본어 줄 하나가 나온 뒤
 * 한국어 설명만 오래 이어진다(지금 칸이 그 일본어 줄을 오래 붙들지 않는지 본다).
 * 그 줄은 실제 강의의 일본어 줄처럼 한자를 섞는다. 앞뒤가 한국어이고 교재 낱말로 설명되지 않는
 * 가나만의 줄은 강사의 한국어 말을 받아 적은 것으로 보고 서버가 거른다(misheard.ts koreanKanaIndexes).
 */
export const TALK_LECTURE = { no: 0, seconds: 80 } as const;
export const TALK_LECTURE_CUES = [
  { start: 0, end: 4, text: "시험 오리엔테이션 첫 줄입니다.", lang: "ko" },
  { start: 5, end: 7, text: "テストの音。", lang: "ja" },
  ...Array.from({ length: 18 }, (_, i) => ({
    start: 8 + i * 4,
    end: 11.5 + i * 4,
    text: `시험 설명 ${i + 1}번째 줄입니다.`,
    lang: "ko" as const,
  })),
];

/**
 * 3강 소책자에만 둔 가짜 회화 문장. 자막 둘째 줄과 문장부호만 달라, 서버가 그 줄에 이 문장 카드를 붙인다.
 * 넷째 줄은 짝이 없어 받아 적은 자막만 보인다.
 */
export const LONG_LECTURE_BOOKLET = {
  ja: "テストのぶんです",
  ko: "시험 문장입니다.",
} as const;

/**
 * 3강 문형 예문(03-3)의 가짜 자막. 실제 예문 mp3처럼 한국어 안내 → 일본어 문장이 이어지고,
 * 일본어 줄은 소책자 문장과 같아 서버가 카드를 붙인다. 화면이 지금 문장을 따라가는지 볼 수 있게
 * 이 예문만 mp3를 길게 둔다.
 */
export const FOLLOW_EXAMPLE = { id: "03-3", seconds: 16 } as const;
export const FOLLOW_EXAMPLE_CUES = [
  { start: 0, end: 2, text: "시험 문형 안내입니다.", lang: "ko" },
  { start: 3, end: 5, text: "山は山だ。", lang: "ja" },
  { start: 9, end: 11, text: "山のうえ。", lang: "ja" },
] as const;

/**
 * 일문따 2과: 문법 예문(02-1) 자막이 "일본어 → 뜻 → 같은 일본어"를 되풀이하고, 첫 강의(L02-01) 자막의
 * 일본어 줄이 그 문장이라 서버가 받아 적은 글 출처 카드를 붙인다. 강의는 자리를 옮겨 볼 수 있게 길게 둔다.
 * 실제 예문처럼 한자를 섞는다(가나만이고 교재 낱말로 설명되지 않으면 한국어 말로 보고 걸러진다).
 */
export const ILMUNTA_PAIR_LESSON = { no: 2, seconds: 40 } as const;
export const ILMUNTA_PAIR = {
  ja: "テストの例文です。",
  ko: "시험 예문입니다.",
} as const;

/**
 * 교정 파일(docs/transcript-review.md) 시험: 같은 강의 뒤쪽의 잘못 받아 적은 일본어 줄을 Claude가 고쳐
 * 소리로 확인했다(정상 카드로 올라간다). 그다음 줄은 한국어 말을 가나로 적은 줄이라 한국어 글로 돌린다
 */
export const REVIEWED_LINE = {
  start: 22,
  end: 26,
  original: "テストの朝ご飯を食べるう",
  corrected: "テストの朝ご飯を食べる。",
  reading: "てすとのあさごはんをたべる",
  ko: "시험 아침밥을 먹는다.",
} as const;
export const REVIEW_NOISE_LINE = {
  start: 28,
  end: 31,
  original: "名は無二だよ",
  korean: "시험 한국어 설명입니다.",
} as const;

export const ILMUNTA_LECTURE_CUES = [
  { start: 0, end: 4, text: "시험 문법 강의 첫 줄입니다.", lang: "ko" },
  { start: 6, end: 12, text: "テストの例文です", lang: "ja" },
  { start: 14, end: 18, text: "시험 문법 강의 셋째 줄입니다.", lang: "ko" },
  { start: 19, end: 21, text: "시험 문법 강의 넷째 줄입니다.", lang: "ko" },
  {
    start: REVIEWED_LINE.start,
    end: REVIEWED_LINE.end,
    text: REVIEWED_LINE.original,
    lang: "ja",
  },
  {
    start: REVIEW_NOISE_LINE.start,
    end: REVIEW_NOISE_LINE.end,
    text: REVIEW_NOISE_LINE.original,
    lang: "ja",
  },
  { start: 33, end: 37, text: "시험 문법 강의 끝 줄입니다.", lang: "ko" },
] as const;

/** 위 두 줄의 교정 파일(content/transcripts-review/ilmunta/L02-01.json) */
const ILMUNTA_LECTURE_REVIEW = {
  method: "e2e 가짜 교정",
  threshold: 0.85,
  lines: [
    {
      start: REVIEWED_LINE.start,
      end: REVIEWED_LINE.end,
      original: REVIEWED_LINE.original,
      corrected: REVIEWED_LINE.corrected,
      reading: REVIEWED_LINE.reading,
      ko: REVIEWED_LINE.ko,
      confidence: "high",
      kind: "japanese",
      audioVerified: true,
      audio: { simPlain: 0.95, simOriginal: 0.7, spellingOnly: false },
      why: "가짜 까닭",
    },
    {
      start: REVIEW_NOISE_LINE.start,
      end: REVIEW_NOISE_LINE.end,
      original: REVIEW_NOISE_LINE.original,
      corrected: REVIEW_NOISE_LINE.korean,
      reading: "",
      ko: "",
      confidence: "high",
      kind: "korean-noise",
      audioVerified: false,
      audio: null,
    },
  ],
};
/**
 * 일문따 읽기 글(-2): 소책자에 원문이 없어 받아 적은 줄에 낱말 칩만 붙는다.
 * 食べる는 드릴 낱말(세션이 고른 기초 동사)이라 활용한 꼴(食べました)로도 칩이 된다
 */
export const ILMUNTA_READING = {
  line: "朝はパンを食べました",
  chip: "食べる",
  gloss: "먹다",
} as const;
const ILMUNTA_READING_CUES = [
  { start: 0.2, end: 2.8, text: ILMUNTA_READING.line, lang: "ja" },
] as const;
const ILMUNTA_EXAMPLE_CUES = [
  { start: 0, end: 0.8, text: ILMUNTA_PAIR.ja, lang: "ja" },
  { start: 1, end: 1.8, text: ILMUNTA_PAIR.ko, lang: "ko" },
  { start: 2, end: 2.8, text: ILMUNTA_PAIR.ja, lang: "ja" },
] as const;

/**
 * 2강은 구역 끝 확인 문제를 시험하려고 낱말·문형을 여럿 둔다(다른 강은 낱말이 하나뿐이라 보기를 못 만들어
 * 문제가 나오지 않는다). 단어 예문(02-2)의 가짜 자막은 낱말마다 일본어 줄이 하나씩이라 소리 구간이 생긴다.
 */
export const QUIZ_LESSON = 2;
export const QUIZ_WORDS = [
  { ja: "川", ko: "강", reading: "かわ" },
  { ja: "空", ko: "하늘", reading: "そら" },
  { ja: "花", ko: "꽃", reading: "はな" },
  { ja: "海", ko: "바다", reading: "うみ" },
  { ja: "ねこ", ko: "고양이" },
] as const;
const QUIZ_PATTERNS = {
  patterns: [
    { no: 1, ja: "～は～だ。", ko: "~는 ~이다." },
    { no: 2, ja: "～も～だ。", ko: "~도 ~이다." },
    { no: 3, ja: "～の前に[まえに]", ko: "~전에" },
  ],
  sentences: [
    { ja: "川は空だ。", ko: "강은 하늘이다.", pattern: 1 },
    { ja: "海は空だ。", ko: "바다는 하늘이다.", pattern: 1 },
    { ja: "花も花だ。", ko: "꽃도 꽃이다.", pattern: 2 },
    { ja: "ねこもねこだ。", ko: "고양이도 고양이다.", pattern: 2 },
    { ja: "川の前に花。", ko: "강 앞에 꽃.", pattern: 3 },
    // 다른 강과 같이 가나 첫 읽기에 골리는 문장(kana-bridge·desktop-keys 시험이 강마다 하나씩 본다)
    { ja: "山のうえ。", ko: "산 위.", pattern: 1 },
  ],
};
const QUIZ_WORD_CUES = QUIZ_WORDS.map((w, i) => ({
  start: i * 0.5,
  end: i * 0.5 + 0.4,
  text: w.ja,
  lang: "ja",
}));

const ILMUTA_LESSONS = [0, 1, 2, 3];
/** 5과는 활용을 다루지 않는 과(과 끝 확인 문제가 쓰임(조사)·낱말 문제로 나온다) */
export const ILMUNTA_WORDS_ONLY_LESSON = 5;
const ILMUNTA_LESSONS = [1, 2, ILMUNTA_WORDS_ONLY_LESSON];

function nn(no: number): string {
  return String(no).padStart(2, "0");
}

function ilmutaLesson(no: number) {
  const n = nn(no);
  const example = (id: string, kind: string, extra: object = {}) => ({
    id,
    file: `2. 예문 mp3/${id}.mp3`,
    durationSec: AUDIO_SECONDS,
    kind,
    sentences: [],
    ...extra,
  });
  return {
    no,
    title: no === 0 ? "" : `テスト${no}だ。`,
    titleKo: no === 0 ? undefined : `시험 ${no}이다.`,
    register: "casual",
    lecture: {
      file: `1. 음성 강의/L${n}.mp3`,
      durationSec:
        no === LONG_LECTURE.no
          ? LONG_LECTURE.seconds
          : no === TALK_LECTURE.no
            ? TALK_LECTURE.seconds
            : AUDIO_SECONDS,
    },
    examples:
      no === 0
        ? []
        : [
            example(`${n}-1`, "dialogue", {
              sentences: [
                { ja: "やあ、テスト。", ko: "안녕, 시험.", speaker: "A" },
                { ja: "うん、テスト。", ko: "응, 시험.", speaker: "B" },
                ...(no === LONG_LECTURE.no
                  ? [{ ...LONG_LECTURE_BOOKLET, speaker: "A" }]
                  : []),
              ],
            }),
            example(`${n}-2`, "words", {
              sentences:
                no === QUIZ_LESSON
                  ? QUIZ_WORDS
                  : [{ ja: "山", ko: "산", reading: "やま" }],
            }),
            example(
              `${n}-3`,
              "patterns",
              no === QUIZ_LESSON
                ? QUIZ_PATTERNS
                : {
                    patterns: [{ no: 1, ja: "～は～だ。", ko: "~는 ~이다." }],
                    sentences: [
                      { ja: "山は山だ。", ko: "산은 산이다.", pattern: 1 },
                      // 히라가나 기본 글자와 후리가나만으로 읽히는 문장(가나 첫 읽기에 골린다)
                      { ja: "山のうえ。", ko: "산 위.", pattern: 1 },
                    ],
                  },
            ),
          ],
  };
}

function ilmuntaLesson(no: number) {
  const n = nn(no);
  return {
    no,
    title: `시험 문법 ${no}`,
    lectures: [
      {
        file: `강의 mp3/L${n}-01.MP3`,
        durationSec:
          no === ILMUNTA_PAIR_LESSON.no
            ? ILMUNTA_PAIR_LESSON.seconds
            : AUDIO_SECONDS,
      },
      { file: `강의 mp3/L${n}-02.MP3`, durationSec: AUDIO_SECONDS },
    ],
    examples: [
      {
        id: `${n}-1`,
        file: `예문 mp3/${n}-1.mp3`,
        durationSec: AUDIO_SECONDS,
        kind: "grammarExamples",
        sentences: [],
      },
      ...(no === ILMUNTA_PAIR_LESSON.no
        ? [
            {
              id: `${n}-2`,
              file: `예문 mp3/${n}-2.mp3`,
              durationSec: AUDIO_SECONDS,
              kind: "reading",
              sentences: [],
            },
          ]
        : []),
    ],
  };
}

export function writeFakeTextbook(contentDir: string, mediaDir: string) {
  const ilmuta = {
    book: "ilmuta",
    lessons: ILMUTA_LESSONS.map(ilmutaLesson),
    extras: [],
  };
  const ilmunta = {
    book: "ilmunta",
    lessons: ILMUNTA_LESSONS.map(ilmuntaLesson),
  };
  mkdirSync(path.join(contentDir, "textbook"), { recursive: true });
  writeFileSync(
    path.join(contentDir, "textbook", "ilmuta.json"),
    JSON.stringify(ilmuta),
  );
  writeFileSync(
    path.join(contentDir, "textbook", "ilmunta.json"),
    JSON.stringify(ilmunta),
  );

  const longItem = `L${nn(LONG_LECTURE.no)}`;
  mkdirSync(path.join(contentDir, "transcripts", "ilmuta"), {
    recursive: true,
  });
  writeFileSync(
    path.join(contentDir, "transcripts", "ilmuta", `${longItem}.json`),
    JSON.stringify({
      book: "ilmuta",
      item: longItem,
      kind: "lecture",
      durationSec: LONG_LECTURE.seconds,
      segments: LONG_LECTURE_CUES,
    }),
  );

  const talkItem = `L${nn(TALK_LECTURE.no)}`;
  writeFileSync(
    path.join(contentDir, "transcripts", "ilmuta", `${talkItem}.json`),
    JSON.stringify({
      book: "ilmuta",
      item: talkItem,
      kind: "lecture",
      durationSec: TALK_LECTURE.seconds,
      segments: TALK_LECTURE_CUES,
    }),
  );

  writeFileSync(
    path.join(contentDir, "transcripts", "ilmuta", `${FOLLOW_EXAMPLE.id}.json`),
    JSON.stringify({
      book: "ilmuta",
      item: FOLLOW_EXAMPLE.id,
      kind: "example",
      durationSec: FOLLOW_EXAMPLE.seconds,
      segments: FOLLOW_EXAMPLE_CUES,
    }),
  );

  const quizWords = `${nn(QUIZ_LESSON)}-2`;
  writeFileSync(
    path.join(contentDir, "transcripts", "ilmuta", `${quizWords}.json`),
    JSON.stringify({
      book: "ilmuta",
      item: quizWords,
      kind: "example",
      durationSec: AUDIO_SECONDS,
      segments: QUIZ_WORD_CUES,
    }),
  );

  const pn = nn(ILMUNTA_PAIR_LESSON.no);
  const pairLecture = `L${pn}-01`;
  mkdirSync(path.join(contentDir, "transcripts", "ilmunta"), {
    recursive: true,
  });
  for (const [item, kind, durationSec, segments] of [
    [pairLecture, "lecture", ILMUNTA_PAIR_LESSON.seconds, ILMUNTA_LECTURE_CUES],
    [`${pn}-1`, "example", AUDIO_SECONDS, ILMUNTA_EXAMPLE_CUES],
    [`${pn}-2`, "example", AUDIO_SECONDS, ILMUNTA_READING_CUES],
  ] as const)
    writeFileSync(
      path.join(contentDir, "transcripts", "ilmunta", `${item}.json`),
      JSON.stringify({ book: "ilmunta", item, kind, durationSec, segments }),
    );
  mkdirSync(path.join(contentDir, "transcripts-review", "ilmunta"), {
    recursive: true,
  });
  writeFileSync(
    path.join(
      contentDir,
      "transcripts-review",
      "ilmunta",
      `${pairLecture}.json`,
    ),
    JSON.stringify({
      book: "ilmunta",
      item: pairLecture,
      ...ILMUNTA_LECTURE_REVIEW,
    }),
  );

  const mp3 = silentMp3(AUDIO_SECONDS);
  const longMp3 = silentMp3(LONG_LECTURE.seconds);
  const pairMp3 = silentMp3(ILMUNTA_PAIR_LESSON.seconds);
  const followMp3 = silentMp3(FOLLOW_EXAMPLE.seconds);
  const talkMp3 = silentMp3(TALK_LECTURE.seconds);
  const followFile = `${FOLLOW_EXAMPLE.id}.mp3`;
  const files = [
    ...ilmuta.lessons.flatMap((l) => [
      ["ilmuta", l.lecture.file],
      ...l.examples.map((e) => ["ilmuta", e.file]),
    ]),
    ...ilmunta.lessons.flatMap((l) => [
      ...l.lectures.map((x) => ["ilmunta", x.file]),
      ...l.examples.map((e) => ["ilmunta", e.file]),
    ]),
  ];
  for (const [book, file] of files) {
    const target = path.join(mediaDir, book, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(
      target,
      file.endsWith(`${longItem}.mp3`) && book === "ilmuta"
        ? longMp3
        : file.endsWith(`${pairLecture}.MP3`) && book === "ilmunta"
          ? pairMp3
          : file.endsWith(`/${followFile}`) && book === "ilmuta"
            ? followMp3
            : file.endsWith(`/${talkItem}.mp3`) && book === "ilmuta"
              ? talkMp3
              : mp3,
    );
  }
}
