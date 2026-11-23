// 형태소 분석기 사전(node_modules/kuromoji/dict/*.dat.gz)을 public/kuromoji-dict/로 복사한다.
// 관리자 브라우저가 노래를 저장할 때 이 파일을 받아 가사를 분석한다(src/lib/songs/browser-analyzer.ts).
// 복사본은 git에 넣지 않는다(.gitignore). `pnpm dev`·`pnpm build`가 먼저 부르므로 Docker 이미지와 CI에도 들어간다.
import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const repo = path.join(import.meta.dirname, "..");
const from = path.join(repo, "node_modules", "kuromoji", "dict");
const to = path.join(repo, "public", "kuromoji-dict");

const files = readdirSync(from).filter((f) => f.endsWith(".dat.gz"));
if (files.length === 0) {
  console.error(`사전 파일이 없습니다: ${from} (pnpm install을 먼저)`);
  process.exit(1);
}
mkdirSync(to, { recursive: true });
let copied = 0;
for (const file of files) {
  const src = path.join(from, file);
  const dest = path.join(to, file);
  let same = false;
  try {
    same = statSync(dest).size === statSync(src).size;
  } catch {
    // 아직 없음
  }
  if (!same) {
    copyFileSync(src, dest);
    copied += 1;
  }
}
console.log(
  `kuromoji 사전 ${files.length}개 → public/kuromoji-dict (새로 복사 ${copied})`,
);
