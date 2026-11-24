/**
 * 교재 두 권의 자료 폴더를 읽어 사이트가 읽을 JSON을 만든다.
 *
 *   pnpm textbook:build [--ilmuta <폴더>] [--ilmunta <폴더>] [--out <폴더>]
 *
 * 폴더는 환경 변수 ILMUTA_DIR·ILMUNTA_DIR·TEXTBOOK_OUT_DIR로도 줄 수 있다.
 * 필요한 도구: pdftotext(poppler), ffprobe(ffmpeg).
 * 자료 폴더는 읽기만 한다. 결과(content/textbook/)는 교재 글이라 git에 넣지 않는다.
 */
import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { parseArgs, promisify } from "node:util";
import {
  parseIlmuntaBookletHeaders,
  parseIlmuntaPreparation,
  parseIlmuntaSchedule,
} from "@/lib/textbook/ilmunta-docs";
import { parseIlmutaBooklet } from "@/lib/textbook/ilmuta-booklet";
import {
  ilmuntaExampleFiles,
  ilmuntaLectureFiles,
  ilmutaExampleFiles,
  ilmutaLectureFiles,
} from "@/lib/textbook/media-files";
import {
  type Example,
  type Ilmunta,
  type Ilmuta,
  ilmuntaSchema,
  ilmutaSchema,
} from "@/lib/textbook/schema";

const run = promisify(execFile);

const { values } = parseArgs({
  options: {
    ilmuta: { type: "string" },
    ilmunta: { type: "string" },
    out: { type: "string" },
  },
});

const ILMUTA_DIR =
  values.ilmuta ??
  process.env.ILMUTA_DIR ??
  path.join(homedir(), "personal/study/japanese/BN003460_total");
const ILMUNTA_DIR =
  values.ilmunta ??
  process.env.ILMUNTA_DIR ??
  path.join(homedir(), "personal/study/japanese/BN003602_total");
const OUT_DIR =
  values.out ??
  process.env.TEXTBOOK_OUT_DIR ??
  path.join(process.cwd(), "content/textbook");

const ILMUTA = {
  lectures: "1. 음성 강의",
  examples: "2. 예문 mp3",
  extras: "3. 특별 부록",
  booklet: "일본어_무따기_완전판_휴대용_소책자_다운로드용.pdf",
};
const ILMUNTA = {
  lectures: "강의 mp3",
  examples: "예문 mp3",
  booklet: "3__핵심정리_소책자.pdf",
  schedule: "4_더_자세한_학습스케줄.pdf",
};

function pdfText(file: string, mode: "-layout" | "-raw"): string {
  return execFileSync("pdftotext", [mode, file, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function audioNames(dir: string): string[] {
  return readdirSync(dir).filter((n) => /\.mp3$/i.test(n));
}

/** 오디오 길이(초). ffprobe를 몇 개씩 나란히 돌린다. */
async function durations(files: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const queue = [...files];
  const worker = async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      const { stdout } = await run("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        file,
      ]);
      const sec = Number.parseFloat(stdout.trim());
      if (!Number.isFinite(sec)) throw new Error(`길이를 읽지 못함: ${file}`);
      out.set(file, Math.round(sec * 1000) / 1000);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return out;
}

type Report = { lines: string[]; exceptions: string[] };

async function buildIlmuta(report: Report): Promise<Ilmuta> {
  const lectureNames = audioNames(path.join(ILMUTA_DIR, ILMUTA.lectures));
  const exampleNames = audioNames(path.join(ILMUTA_DIR, ILMUTA.examples));
  const extraNames = audioNames(path.join(ILMUTA_DIR, ILMUTA.extras)).sort(
    (a, b) => a.localeCompare(b, "en", { numeric: true }),
  );
  const rel = {
    lecture: (n: string) => `${ILMUTA.lectures}/${n}`,
    example: (n: string) => `${ILMUTA.examples}/${n}`,
    extra: (n: string) => `${ILMUTA.extras}/${n}`,
  };
  const all = [
    ...lectureNames.map(rel.lecture),
    ...exampleNames.map(rel.example),
    ...extraNames.map(rel.extra),
  ];
  const dur = await durations(all.map((f) => path.join(ILMUTA_DIR, f)));
  const sec = (f: string) => dur.get(path.join(ILMUTA_DIR, f)) ?? 0;

  const booklet = new Map(
    parseIlmutaBooklet(
      pdfText(path.join(ILMUTA_DIR, ILMUTA.booklet), "-layout"),
    ).map((l) => [l.no, l]),
  );
  const lectures = ilmutaLectureFiles(lectureNames);
  const examples = ilmutaExampleFiles(exampleNames);

  const lessonNos = [...new Set([...lectures.keys(), ...booklet.keys()])].sort(
    (a, b) => a - b,
  );
  const lessons = lessonNos.map((no) => {
    const b = booklet.get(no);
    const lectureName = lectures.get(no);
    if (!lectureName) report.exceptions.push(`일무따 ${no}강: 강의 mp3 없음`);
    for (const issue of b?.issues ?? [])
      report.exceptions.push(`일무따 ${no}강: ${issue}`);
    if (!b?.title)
      report.exceptions.push(`일무따 ${no}강: 제목을 뽑지 못함(빈 값)`);

    const lessonExamples: Example[] = examples
      .filter((e) => e.lesson === no)
      .map((e) => {
        const file = rel.example(e.name);
        const base = { id: e.id, file, durationSec: sec(file), kind: e.kind };
        switch (e.kind) {
          case "words":
            return { ...base, sentences: b?.words ?? [] };
          case "patterns":
            return {
              ...base,
              sentences: b?.patternSentences ?? [],
              patterns: b?.patterns ?? [],
            };
          case "conversationBasic":
          case "conversationAdvanced":
            return { ...base, sentences: b?.conversation ?? [] };
          default:
            return { ...base, sentences: [] };
        }
      });
    for (const e of lessonExamples) {
      if (e.sentences.length === 0)
        report.exceptions.push(`일무따 ${e.id} (${e.kind}): 글 없음`);
    }

    return {
      no,
      title: b?.title ?? "",
      ...(b?.titleKo ? { titleKo: b.titleKo } : {}),
      ...(b?.subtitle ? { subtitle: b.subtitle } : {}),
      ...(b?.register ? { register: b.register } : {}),
      ...(b?.pages ? { pages: b.pages } : {}),
      lecture: {
        file: lectureName ? rel.lecture(lectureName) : "",
        durationSec: lectureName ? sec(rel.lecture(lectureName)) : 0,
      },
      examples: lessonExamples,
      ...(b?.conversationWords.length
        ? { conversationWords: b.conversationWords }
        : {}),
    };
  });

  const extras = extraNames.map((n) => ({
    file: rel.extra(n),
    title: "",
    durationSec: sec(rel.extra(n)),
  }));
  report.exceptions.push(
    `일무따 특별 부록 ${extras.length}개: 제목을 뽑을 자료가 없어 빈 값`,
  );

  const total = [...dur.values()].reduce((a, b) => a + b, 0);
  const exampleCount = lessons.reduce((a, l) => a + l.examples.length, 0);
  const filled = lessons.reduce(
    (a, l) => a + l.examples.filter((e) => e.sentences.length > 0).length,
    0,
  );
  const sentenceCount = lessons.reduce(
    (a, l) => a + l.examples.reduce((s, e) => s + e.sentences.length, 0),
    0,
  );
  report.lines.push(
    `일무따: 강 ${lessons.length}개(강의 mp3 ${lectureNames.length}), 예문 mp3 ${exampleCount}개 중 글 있음 ${filled}개(문장 ${sentenceCount}), 특별 부록 ${extras.length}개, 오디오 ${all.length}개 ${formatDuration(total)}`,
  );
  return ilmutaSchema.parse({ book: "ilmuta", lessons, extras });
}

async function buildIlmunta(report: Report): Promise<Ilmunta> {
  const lectureNames = audioNames(path.join(ILMUNTA_DIR, ILMUNTA.lectures));
  const exampleNames = audioNames(path.join(ILMUNTA_DIR, ILMUNTA.examples));
  const rel = {
    lecture: (n: string) => `${ILMUNTA.lectures}/${n}`,
    example: (n: string) => `${ILMUNTA.examples}/${n}`,
  };
  const all = [
    ...lectureNames.map(rel.lecture),
    ...exampleNames.map(rel.example),
  ];
  const dur = await durations(all.map((f) => path.join(ILMUNTA_DIR, f)));
  const sec = (f: string) => dur.get(path.join(ILMUNTA_DIR, f)) ?? 0;

  const headers = new Map(
    parseIlmuntaBookletHeaders(
      pdfText(path.join(ILMUNTA_DIR, ILMUNTA.booklet), "-layout"),
    ).map((h) => [h.no, h]),
  );
  const schedulePdf = path.join(ILMUNTA_DIR, ILMUNTA.schedule);
  const schedule = parseIlmuntaSchedule(pdfText(schedulePdf, "-raw"));
  const preparation = parseIlmuntaPreparation(pdfText(schedulePdf, "-layout"));
  const lectures = ilmuntaLectureFiles(lectureNames);
  const examples = ilmuntaExampleFiles(exampleNames);

  const lessonNos = [...new Set([...lectures.keys(), ...headers.keys()])].sort(
    (a, b) => a - b,
  );
  const lessons = lessonNos.map((no) => {
    const h = headers.get(no);
    if (!h)
      report.exceptions.push(
        `일문따 ${no}과: 소책자에서 제목·쪽수를 뽑지 못함`,
      );
    const days = schedule.get(no);
    if (!days)
      report.exceptions.push(`일문따 ${no}과: 스케줄 날짜를 뽑지 못함`);
    const lessonLectures = (lectures.get(no) ?? []).map((n) => ({
      file: rel.lecture(n),
      durationSec: sec(rel.lecture(n)),
    }));
    if (lessonLectures.length === 0)
      report.exceptions.push(`일문따 ${no}과: 강의 mp3 없음`);
    const lessonExamples = examples
      .filter((e) => e.lesson === no)
      .map((e) => ({
        id: e.id,
        file: rel.example(e.name),
        durationSec: sec(rel.example(e.name)),
        kind: e.kind,
        sentences: [],
      }));
    const ids = new Set(lessonExamples.map((e) => e.id.split("-")[1]));
    for (const part of ["1", "2"]) {
      if (!ids.has(part))
        report.exceptions.push(
          `일문따 ${String(no).padStart(2, "0")}-${part}: 예문 mp3 없음`,
        );
    }
    return {
      no,
      title: h?.title ?? "",
      ...(h ? { pages: h.pages, bookletPage: h.bookletPage } : {}),
      ...(days ? { scheduleDays: days } : {}),
      lectures: lessonLectures,
      examples: lessonExamples,
    };
  });
  report.exceptions.push(
    `일문따 예문 mp3 ${examples.length}개 전부: 핵심정리 소책자에 예문 글이 없어 sentences가 빈 배열`,
  );
  if (!preparation)
    report.exceptions.push("일문따 준비마당을 스케줄에서 찾지 못함");

  const total = [...dur.values()].reduce((a, b) => a + b, 0);
  report.lines.push(
    `일문따: 과 ${lessons.length}개, 강의 mp3 ${lectureNames.length}개, 예문 mp3 ${examples.length}개, 오디오 ${all.length}개 ${formatDuration(total)}`,
  );
  return ilmuntaSchema.parse({
    book: "ilmunta",
    ...(preparation ? { preparation } : {}),
    lessons,
  });
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}시간 ${m}분 (${Math.round(sec)}초)`;
}

async function main() {
  const report: Report = { lines: [], exceptions: [] };
  const ilmuta = await buildIlmuta(report);
  const ilmunta = await buildIlmunta(report);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    path.join(OUT_DIR, "ilmuta.json"),
    `${JSON.stringify(ilmuta, null, 2)}\n`,
  );
  writeFileSync(
    path.join(OUT_DIR, "ilmunta.json"),
    `${JSON.stringify(ilmunta, null, 2)}\n`,
  );
  console.log(report.lines.join("\n"));
  console.log(`\n예외 ${report.exceptions.length}건:`);
  for (const e of report.exceptions) console.log(`- ${e}`);
  console.log(`\n${OUT_DIR}에 ilmuta.json·ilmunta.json을 썼다.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
