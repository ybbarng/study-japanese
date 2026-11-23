// 사이트의 학습 기록을 받아 저장소 study/progress/에 둔다. 세션이 계획·점검·버즈 인증에 읽는다.
// 쓰기: STUDY_URL=https://study-ja.byb.kr STUDY_PASSWORD=... pnpm progress:pull
// 암호를 주지 않으면 .env.local의 SITE_PASSWORD로 로컬 서버(http://localhost:3457)에서 받는다.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const base = process.env.STUDY_URL ?? "http://localhost:3457";

function localPassword(): string | undefined {
  try {
    const line = readFileSync(path.join(root, ".env.local"), "utf8")
      .split("\n")
      .find((l) => l.startsWith("SITE_PASSWORD="));
    return line?.slice("SITE_PASSWORD=".length);
  } catch {
    return undefined;
  }
}

const password = process.env.STUDY_PASSWORD ?? localPassword();
if (!password) {
  console.error(
    "암호가 없습니다: STUDY_PASSWORD를 주거나 .env.local에 SITE_PASSWORD를 두세요.",
  );
  process.exit(1);
}

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

const res = await fetch(`${base}/api/export`, {
  headers: { cookie: cookie.split(";")[0] },
});
if (!res.ok) {
  console.error(`기록 받기 실패 (HTTP ${res.status})`);
  process.exit(1);
}
const data = (await res.json()) as {
  states: { key: string }[];
  listenEvents: { book: string; listenedSec: number; completed: boolean }[];
};

const outDir = path.join(root, "study", "progress");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, "export.json"),
  `${JSON.stringify(data, null, 2)}\n`,
);

const byBook = new Map<
  string,
  { plays: number; completed: number; hours: number }
>();
for (const e of data.listenEvents) {
  const b = byBook.get(e.book) ?? { plays: 0, completed: 0, hours: 0 };
  b.plays += 1;
  b.completed += e.completed ? 1 : 0;
  b.hours += e.listenedSec / 3600;
  byBook.set(e.book, b);
}
console.log(
  `받음: 상태 문서 ${data.states.length}개, 들은 기록 ${data.listenEvents.length}줄 → study/progress/export.json`,
);
for (const [book, b] of byBook) {
  console.log(
    `  ${book}: 재생 ${b.plays}번, 끝까지 ${b.completed}번, ${b.hours.toFixed(1)}시간`,
  );
}
