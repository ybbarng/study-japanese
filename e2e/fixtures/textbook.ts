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
 * 3강 소책자에만 둔 가짜 회화 문장. 자막 둘째 줄과 문장부호만 달라, 서버가 그 줄에 이 문장 카드를 붙인다.
 * 넷째 줄은 짝이 없어 받아 적은 자막만 보인다.
 */
export const LONG_LECTURE_BOOKLET = {
  ja: "テストのぶんです",
  ko: "시험 문장입니다.",
} as const;

const ILMUTA_LESSONS = [0, 1, 2, 3];
const ILMUNTA_LESSONS = [1, 2];

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
        no === LONG_LECTURE.no ? LONG_LECTURE.seconds : AUDIO_SECONDS,
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
              sentences: [{ ja: "山", ko: "산", reading: "やま" }],
            }),
            example(`${n}-3`, "patterns", {
              patterns: [{ no: 1, ja: "～は～だ。", ko: "~는 ~이다." }],
              sentences: [
                { ja: "山は山だ。", ko: "산은 산이다.", pattern: 1 },
                // 히라가나 기본 글자와 후리가나만으로 읽히는 문장(가나 첫 읽기에 골린다)
                { ja: "山のうえ。", ko: "산 위.", pattern: 1 },
              ],
            }),
          ],
  };
}

function ilmuntaLesson(no: number) {
  const n = nn(no);
  return {
    no,
    title: `시험 문법 ${no}`,
    lectures: [
      { file: `강의 mp3/L${n}-01.MP3`, durationSec: AUDIO_SECONDS },
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

  const mp3 = silentMp3(AUDIO_SECONDS);
  const longMp3 = silentMp3(LONG_LECTURE.seconds);
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
      file.endsWith(`${longItem}.mp3`) && book === "ilmuta" ? longMp3 : mp3,
    );
  }
}
