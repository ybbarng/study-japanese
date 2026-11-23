/**
 * 노래 가사를 사이트에서 받아 content/songs/<slug>.lyrics.json에 둔다. 세션이 분석할 때 읽는다.
 *
 *   pnpm songs:pull <slug> [--url https://study-ja.byb.kr]
 *
 * 주소는 --url이나 환경 변수 SONGS_URL로 바꾼다(기본: 운영). 가사를 공개한 노래는 로그인 없이 받힌다.
 * 공개하지 않은 노래는 STUDY_PASSWORD를 주면 로그인해서 받는다.
 * GET만 보낸다. 결과는 가사라 git에 넣지 않는다(content/songs/는 .gitignore).
 * 화면에 가사를 찍지 않고 줄 수만 알린다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { lineHash } from "@/lib/songs/line-hash";
import { isSlug, type Song } from "@/lib/songs/schema";
import { contentDir } from "@/lib/textbook/load";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { url: { type: "string" } },
});
const slug = positionals[0];
if (!slug || !isSlug(slug)) {
  console.error("쓰기: pnpm songs:pull <slug> [--url <사이트 주소>]");
  process.exit(1);
}
const base = (
  values.url ??
  process.env.SONGS_URL ??
  "https://study-ja.byb.kr"
).replace(/\/$/, "");

async function loginCookie(): Promise<string | undefined> {
  const password = process.env.STUDY_PASSWORD;
  if (!password) return undefined;
  const login = await fetch(`${base}/api/login`, {
    method: "POST",
    body: new URLSearchParams({ password, next: "/" }),
    redirect: "manual",
  });
  const cookie = login.headers
    .getSetCookie()
    .find((c) => c.startsWith("sj_session="));
  if (!cookie) {
    console.error(`로그인 실패 (HTTP ${login.status})`);
    process.exit(1);
  }
  return cookie.split(";")[0];
}

const cookie = await loginCookie();
const res = await fetch(`${base}/api/songs/${slug}`, {
  headers: cookie ? { cookie } : {},
});
if (!res.ok) {
  console.error(
    res.status === 404
      ? `노래가 없거나 가사를 공개하지 않았습니다(${base}). 비공개면 STUDY_PASSWORD를 주세요.`
      : `가사 받기 실패 (HTTP ${res.status})`,
  );
  process.exit(1);
}
const { item } = (await res.json()) as { item: Song };

const dir = path.join(contentDir(), "songs");
mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${slug}.lyrics.json`);
writeFileSync(
  file,
  `${JSON.stringify(
    {
      slug: item.slug,
      title: item.title,
      artist: item.artist,
      pulledAt: new Date().toISOString(),
      // 분석 파일에는 index·hash만 옮겨 적고 ja(가사 글)는 옮기지 않는다(docs/song-analysis.md)
      lines: item.lines.map((l, index) => ({
        index,
        hash: lineHash(l.ja),
        chars: Array.from(l.ja).length,
        ja: l.ja,
      })),
    },
    null,
    2,
  )}\n`,
);
console.log(
  `가사 ${item.lines.length}줄 → ${path.relative(process.cwd(), file)}`,
);
