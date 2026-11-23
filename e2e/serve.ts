import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { writeFakeTextbook } from "./fixtures/textbook";

// E2E용 서버: 임시 폴더에 가짜 교재·무음 mp3·빈 DB 자리를 만들고, 빌드해 둔 앱을 띄운다.
// playwright.config.ts의 webServer가 부른다. 꺼질 때 임시 폴더를 지운다.
// 로그인 값은 playwright.config.ts가 시험 값으로 넘긴다(.env.local을 읽지 않는다).

const port = process.env.E2E_PORT ?? "3471";
const root = mkdtempSync(path.join(tmpdir(), "sj-e2e-"));
const contentDir = path.join(root, "content");
const mediaDir = path.join(root, "media");
const dataDir = path.join(root, "data");
writeFakeTextbook(contentDir, mediaDir);

const nextBin = path.join(
  import.meta.dirname,
  "..",
  "node_modules",
  ".bin",
  "next",
);
const child = spawn(nextBin, ["start", "--port", port], {
  stdio: "inherit",
  env: {
    ...process.env,
    CONTENT_DIR: contentDir,
    MEDIA_DIR: mediaDir,
    DATA_DIR: dataDir,
  },
});

let cleaned = false;
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  rmSync(root, { recursive: true, force: true });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    child.kill(signal);
  });
}
child.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});
