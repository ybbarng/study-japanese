import path from "node:path";
import kuromoji from "kuromoji";
import { type RawToken, type Tokenize, toSongToken } from "./tokens";

// 형태소 분석기(kuromoji + IPA 사전). 노래를 저장할 때만 서버에서 띄운다.
// 사전을 읽는 데 0.2초쯤, 띄워 두면 메모리를 수백 MB 쓴다. 그래서 처음 쓸 때 띄우고,
// 한동안 쓰지 않으면 놓아 메모리를 돌려준다(관리자가 가끔 노래를 고칠 때만 쓰이므로).
// 사전 폴더는 이미지에 함께 담는다(next.config.ts outputFileTracingIncludes).

const IDLE_MS = 2 * 60 * 1000;

function dictDir(): string {
  return (
    process.env.KUROMOJI_DICT_DIR ??
    path.join(process.cwd(), "node_modules", "kuromoji", "dict")
  );
}

let loading: Promise<Tokenize> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function keepAlive() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    loading = null;
    idleTimer = null;
  }, IDLE_MS);
  idleTimer.unref?.();
}

function build(): Promise<Tokenize> {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: dictDir() }).build((err, tokenizer) => {
      if (err) return reject(err);
      resolve((text) =>
        tokenizer.tokenize(text).map((t) => toSongToken(t as RawToken)),
      );
    });
  });
}

/** 분석기를 돌려준다(처음이면 사전을 읽어 띄운다) */
export function loadTokenizer(): Promise<Tokenize> {
  if (!loading) {
    loading = build().catch((err) => {
      loading = null;
      throw err;
    });
  }
  keepAlive();
  return loading;
}
