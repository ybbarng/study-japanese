import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { writeFakeSong } from "./fixtures/song";
import { writeFakeTextbook } from "./fixtures/textbook";

// E2E용 서버: 가짜 교재·무음 mp3·빈 DB 자리를 만들고, 빌드해 둔 앱을 띄운다.
// playwright.config.ts의 webServer가 부른다.
// 폴더는 git 밖(test-results/)에 두고 띄울 때마다 비운다. Playwright가 서버를 강제로 끄면
// 꺼질 때 지우는 처리가 돌지 않아서다.
// 로그인 값은 playwright.config.ts가 시험 값으로 넘긴다(.env.local을 읽지 않는다).

const port = process.env.E2E_PORT ?? "3471";
const repo = path.join(import.meta.dirname, "..");
// 폰·PC 프로젝트가 서버(와 DB)를 따로 쓰도록 포트마다 폴더를 나눈다
const root = path.join(repo, "test-results", `e2e-server-${port}`);
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
const contentDir = path.join(root, "content");
const mediaDir = path.join(root, "media");
const dataDir = path.join(root, "data");
writeFakeTextbook(contentDir, mediaDir);
writeFakeSong(mediaDir, contentDir);

const nextBin = path.join(repo, "node_modules", ".bin", "next");
const child = spawn(nextBin, ["start", "--port", port], {
  stdio: "inherit",
  env: {
    ...process.env,
    CONTENT_DIR: contentDir,
    MEDIA_DIR: mediaDir,
    DATA_DIR: dataDir,
    // 첫 화면을 날짜별로 시험하려고 ?now=를 받게 한다(운영에서는 받지 않는다)
    ALLOW_NOW_PARAM: "1",
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
