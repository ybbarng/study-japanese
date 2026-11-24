/**
 * 운영 전수 점검. 사람이 써 보기 전에 운영 사이트가 실제로 내주는지 GET으로만 확인한다.
 *
 *   pnpm check:prod [--url https://study-ja.byb.kr] [--wait-sha <커밋>] [--wait-timeout 600]
 *
 * 왜: 교재 오디오가 운영에서 모두 404였는데 아무 시험도 못 잡았다(맥에서 올린 한글 파일 이름이
 * NFD로 남고 주소는 NFC, 배포 전 E2E는 영문 가짜 데이터). 그래서 운영 주소를 직접 부른다.
 *
 * 확인하는 것(실패한 것만 줄마다 찍고, 하나라도 있으면 끝 코드 1):
 * - 화면: /, /kana, /ilmuta, /ilmunta, 모든 강 화면(/ilmuta/<n>, /ilmunta/<n>), /songs, /songs/<slug>가
 *   넘겨주기 없이 200 HTML인지
 * - 교재 미디어: Range: bytes=0-0으로 받아 206(또는 200)과 audio/*(PDF는 application/pdf)인지.
 *   출처를 설정에서 닫아 두었으면(/api/settings의 closedSources) 방문자에게 403인지. 동시에 8개까지
 * - 가나 소리: src/lib/kana/data.ts의 소리 중 오디오가 있는 것 전부
 * - 자막: /api/transcripts/<book>/<item>이 200이고 segments가 비어 있지 않은지
 * - 노래 오디오: 로그인 전용이라 방문자에게 403인지만(받지 않는다)
 *
 * 미디어 목록을 어디서 얻나(판단): 저장소는 공개이고 교재에서 뽑은 글(content/textbook)은 git 밖이라
 * CI에는 없다. 그런데 강 화면 HTML에 화면이 받은 교재 데이터(파일 경로)가 실려 있어서, 책 목록 화면의
 * 강 링크를 따라 모든 강 화면을 받고 거기서 파일 경로를 뽑으면 CI에서도 화면이 보여 주는 미디어
 * 전부를 확인할 수 있다. 로컬에 content/textbook/*.json이 있으면 그 목록(부록 extras 포함)도 합친다.
 * 화면에서 미디어를 하나도 못 뽑으면 뽑는 방식이 깨진 것이므로 실패로 센다.
 * 자막은 로컬에 content/transcripts/<book>/가 있으면 그 전부, 없으면(CI) 화면에서 얻은 항목 중
 * 책마다 앞·가운데·끝 표본만 본다(자막은 하나가 커서 수백 개를 매번 받지 않는다).
 *
 * --wait-sha를 주면 /api/version이 그 커밋을 보일 때까지 기다린 뒤 점검한다(배포 워크플로가 쓴다).
 *
 * 출력에는 교재 글·가사를 찍지 않는다. 주소(파일 이름)·상태 코드만 찍는다. 운영에는 GET만 보낸다.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { ILMUNTA_PDFS } from "@/lib/ilmunta/media";
import { audioUrl, hasAudio, SOUNDS } from "@/lib/kana/data";
import {
  ilmuntaMedia,
  ilmutaMedia,
  lessonNumbersInHtml,
  type MediaRef,
  mediaFilesInHtml,
  sampleItems,
  songSlugsInHtml,
  uniqueMedia,
} from "@/lib/prod-check/extract";
import {
  judgeAdminOnly,
  judgeMedia,
  judgePage,
  judgeTranscript,
  mapLimit,
  type Verdict,
} from "@/lib/prod-check/judge";
import {
  type Book,
  bookMediaUrl,
  hasNonAscii,
  itemOfFile,
  joinUrl,
  readablePath,
  transcriptUrl,
} from "@/lib/prod-check/urls";
import { songAudioUrl } from "@/lib/songs/track";
import { sourceOfBook, sourceOfMedia } from "@/lib/sources/registry";
import { contentDir } from "@/lib/textbook/load";
import { ilmuntaSchema, ilmutaSchema } from "@/lib/textbook/schema";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "https://study-ja.byb.kr" },
    "wait-sha": { type: "string" },
    "wait-timeout": { type: "string", default: "600" },
    concurrency: { type: "string", default: "8" },
  },
});

const BASE = values.url;
const CONCURRENCY = Math.max(1, Number(values.concurrency) || 8);
const BOOKS: Book[] = ["ilmuta", "ilmunta"];
const FIXED_PAGES = [
  "/",
  "/kana",
  "/ilmuta",
  "/ilmuta/0",
  "/ilmuta/1",
  "/ilmunta",
  "/ilmunta/1",
  "/songs",
];

let checked = 0;
let closedCount = 0;
const failures: string[] = [];

function record(kind: string, url: string, verdict: Verdict) {
  checked++;
  if (!verdict.ok) {
    const line = `실패 [${kind}] ${verdict.reason} ${readablePath(url)}`;
    failures.push(line);
    console.log(line);
  } else if ("closed" in verdict) {
    closedCount++;
  }
}

/** 네트워크 오류는 한 번 더 시도한다. 상태 코드는 그대로 돌려준다 */
async function get(
  pathname: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  const url = joinUrl(BASE, pathname);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetch(url, {
        method: "GET",
        headers: { "User-Agent": "study-ja-check-prod", ...headers },
        redirect: "manual",
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function networkFailure(kind: string, url: string, err: unknown) {
  record(kind, url, {
    ok: false,
    reason: `요청 실패(${err instanceof Error ? err.name : "오류"})`,
  });
}

async function waitForSha(expected: string, timeoutSec: number) {
  const deadline = Date.now() + timeoutSec * 1000;
  let live: string | null = null;
  while (Date.now() < deadline) {
    try {
      const res = await get("/api/version");
      if (res.ok) {
        live = ((await res.json()) as { sha?: string | null }).sha ?? null;
        if (live === expected) {
          console.log(`운영에 ${expected.slice(0, 7)}이 떴다.`);
          return;
        }
      } else {
        await res.body?.cancel();
      }
    } catch {
      // 재시작 중이면 잠깐 못 받는다. 다시 본다
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  console.log(
    `실패 [배포] ${timeoutSec}초 안에 ${expected.slice(0, 7)}이 뜨지 않음(운영: ${live ? live.slice(0, 7) : "모름"})`,
  );
  process.exit(1);
}

async function readClosedSources(): Promise<Set<string>> {
  try {
    const res = await get("/api/settings");
    if (!res.ok) {
      await res.body?.cancel();
      record("설정", "/api/settings", {
        ok: false,
        reason: String(res.status),
      });
      return new Set();
    }
    const body = (await res.json()) as { closedSources?: unknown };
    checked++;
    return new Set(
      Array.isArray(body.closedSources)
        ? body.closedSources.filter((s): s is string => typeof s === "string")
        : [],
    );
  } catch (err) {
    networkFailure("설정", "/api/settings", err);
    return new Set();
  }
}

/** 화면을 받아 판정하고 HTML을 돌려준다(판정 실패면 null) */
async function checkPage(pathname: string): Promise<string | null> {
  try {
    const res = await get(pathname);
    const verdict = judgePage({
      status: res.status,
      contentType: res.headers.get("content-type"),
    });
    record("화면", pathname, verdict);
    if (!verdict.ok) {
      await res.body?.cancel();
      return null;
    }
    return await res.text();
  } catch (err) {
    networkFailure("화면", pathname, err);
    return null;
  }
}

function localJson(file: string): unknown | null {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

/** 로컬 교재 JSON의 미디어(없으면 빈 목록) */
function localTextbookMedia(dir: string): MediaRef[] {
  const refs: MediaRef[] = [];
  const ilmuta = localJson(path.join(dir, "textbook", "ilmuta.json"));
  if (ilmuta) refs.push(...ilmutaMedia(ilmutaSchema.parse(ilmuta)));
  const ilmunta = localJson(path.join(dir, "textbook", "ilmunta.json"));
  if (ilmunta) refs.push(...ilmuntaMedia(ilmuntaSchema.parse(ilmunta)));
  return refs;
}

/** 로컬 자막 항목(`content/transcripts/<book>/<item>.json`). 폴더가 없으면 null */
function localTranscriptItems(dir: string, book: Book): string[] | null {
  const folder = path.join(dir, "transcripts", book);
  if (!existsSync(folder)) return null;
  return readdirSync(folder)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length))
    .sort();
}

async function main() {
  console.log(`운영 점검: ${BASE}`);
  if (values["wait-sha"])
    await waitForSha(values["wait-sha"], Number(values["wait-timeout"]) || 600);

  const closed = await readClosedSources();
  const isOpen = (sourceId: string | undefined) =>
    sourceId !== undefined && !closed.has(sourceId);

  // 1) 고정 화면
  const html = new Map<string, string>();
  for (const p of FIXED_PAGES) {
    const body = await checkPage(p);
    if (body) html.set(p, body);
  }

  // 2) 모든 강 화면 → 화면에 실린 미디어
  const fromHtml: MediaRef[] = [];
  for (const book of BOOKS) {
    const index = html.get(`/${book}`);
    const nos = index ? lessonNumbersInHtml(index, book) : [];
    if (index && nos.length === 0)
      record("화면", `/${book}`, { ok: false, reason: "강 링크를 못 찾음" });
    const lessonPages = nos.map((n) => `/${book}/${n}`);
    const bodies = await mapLimit(lessonPages, CONCURRENCY, (p) =>
      html.has(p) ? Promise.resolve(html.get(p) ?? null) : checkPage(p),
    );
    let found = 0;
    for (const body of bodies) {
      if (!body) continue;
      for (const file of mediaFilesInHtml(body)) {
        fromHtml.push({ book, file });
        found++;
      }
    }
    if (nos.length > 0 && found === 0)
      record("미디어", `/${book}/*`, {
        ok: false,
        reason: "강 화면에서 미디어 경로를 하나도 못 뽑음",
      });
  }

  // 3) 로컬 교재가 있으면 합친다
  const dir = contentDir();
  const fromLocal = localTextbookMedia(dir);
  const textbook = uniqueMedia([...fromHtml, ...fromLocal]);
  const htmlKeys = new Set(fromHtml.map((r) => `${r.book}/${r.file}`));
  const localOnly = fromLocal.filter(
    (r) => !htmlKeys.has(`${r.book}/${r.file}`),
  ).length;
  console.log(
    `교재 미디어 ${textbook.length}개(화면에서 ${uniqueMedia(fromHtml).length}개, ${
      fromLocal.length > 0
        ? `로컬 교재에만 있는 것 ${localOnly}개`
        : "로컬 교재 없음 — 화면 기준"
    })`,
  );

  // 4) 미디어 확인: 교재 + 일문따 PDF + 가나 소리
  const media: { url: string; pdf: boolean }[] = [
    ...textbook.map((r) => ({
      url: bookMediaUrl(r.book, r.file),
      pdf: /\.pdf$/i.test(r.file),
    })),
    ...ILMUNTA_PDFS.map((p) => ({
      url: bookMediaUrl("ilmunta", p.file),
      pdf: true,
    })),
    ...SOUNDS.filter((s) => hasAudio(s.id)).map((s) => ({
      url: audioUrl(s.id),
      pdf: false,
    })),
  ];
  const nonAscii = textbook.filter((r) => hasNonAscii(r.file)).length;
  console.log(
    `미디어 ${media.length}개 확인(한글 등 ASCII 밖 경로 교재 ${nonAscii}개 포함)`,
  );
  await mapLimit(media, CONCURRENCY, async ({ url, pdf }) => {
    const first = decodeURIComponent(url.split("/")[2] ?? "");
    const open = isOpen(sourceOfMedia(first)?.id);
    try {
      const res = await get(url, { Range: "bytes=0-0" });
      await res.arrayBuffer();
      record(
        "미디어",
        url,
        judgeMedia(
          { status: res.status, contentType: res.headers.get("content-type") },
          { open, pdf },
        ),
      );
    } catch (err) {
      networkFailure("미디어", url, err);
    }
  });

  // 5) 자막
  for (const book of BOOKS) {
    const local = localTranscriptItems(dir, book);
    const items =
      local ??
      sampleItems([
        ...new Set(
          fromHtml
            .filter((r) => r.book === book)
            .map((r) => itemOfFile(r.file)),
        ),
      ]);
    console.log(
      `자막 ${book} ${items.length}개 확인(${local ? "로컬 자막 전부" : "화면에서 뽑은 표본"})`,
    );
    const open = isOpen(sourceOfBook(book)?.id);
    await mapLimit(items, CONCURRENCY, async (item) => {
      const url = transcriptUrl(book, item);
      try {
        const res = await get(url);
        const body = res.status === 200 ? await res.json() : await res.text();
        record("자막", url, judgeTranscript(res.status, body, { open }));
      } catch (err) {
        networkFailure("자막", url, err);
      }
    });
  }

  // 6) 노래 화면과 노래 오디오(방문자 403)
  const songsHtml = html.get("/songs");
  const slugs = songsHtml ? songSlugsInHtml(songsHtml) : [];
  for (const slug of slugs) {
    await checkPage(`/songs/${slug}`);
    // 방문자에게는 파일 이름이 보이지 않는다. 노래 폴더는 출처 목록에 없어 파일 이름과 상관없이 403이어야 한다
    const url = songAudioUrl(`${slug}.mp3`);
    try {
      const res = await get(url, { Range: "bytes=0-0" });
      await res.body?.cancel();
      record(
        "노래",
        url,
        judgeAdminOnly({
          status: res.status,
          contentType: res.headers.get("content-type"),
        }),
      );
    } catch (err) {
      networkFailure("노래", url, err);
    }
  }

  console.log(
    `\n확인 ${checked}건, 실패 ${failures.length}건${
      closedCount > 0 ? `, 닫힌 출처라 403으로 확인한 것 ${closedCount}건` : ""
    }`,
  );
  if (failures.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
