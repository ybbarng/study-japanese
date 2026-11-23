import type { IpadicFeatures } from "kuromoji";
import DictionaryLoader from "kuromoji/src/loader/DictionaryLoader";
import TokenizerClass from "kuromoji/src/Tokenizer";
import { DICT_FILE_COUNT, gunzipIfNeeded } from "./dict-bytes";
import { type Tokenize, toSongToken } from "./tokens";

// 형태소 분석기(kuromoji + IPA 사전)를 관리자 브라우저에서 띄운다.
// 서버에서 돌리면 메모리를 450MB쯤 써서 컨테이너 상한(256MiB)을 넘는다. 노래를 넣는 사람은 관리자뿐이라
// 저장할 때 그 브라우저가 분석해 보낸다. 노래 넣기·고치기 화면만 이 모듈을 동적 import한다
// (방문자 번들에 들어가지 않게, src/components/songs/song-form.tsx).
// 사전은 같은 출처에서 정적 파일로 받는다(public/kuromoji-dict/, scripts/copy-kuromoji-dict.mjs가 빌드 때 복사).

export const DICT_PATH = "/kuromoji-dict/";

export interface DictProgress {
  loaded: number;
  total: number;
}

async function fetchDict(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`사전 파일을 받지 못함(${res.status}): ${url}`);
  return gunzipIfNeeded(new Uint8Array(await res.arrayBuffer()));
}

/** 사전을 받아 분석기를 띄운다. 파일 하나를 받을 때마다 onProgress를 부른다 */
export function loadBrowserTokenizer(
  onProgress?: (p: DictProgress) => void,
): Promise<Tokenize> {
  let loaded = 0;
  const loader = new DictionaryLoader(DICT_PATH);
  // 기본 브라우저 로더(XHR + 자바스크립트 gunzip) 대신: fetch + 브라우저 내장 압축 풀기,
  // 받은 파일 수 알리기, 이미 풀려 온 파일은 다시 풀지 않기
  loader.loadArrayBuffer = (url, callback) => {
    fetchDict(url).then(
      (buffer) => {
        loaded += 1;
        onProgress?.({ loaded, total: DICT_FILE_COUNT });
        callback(null, buffer);
      },
      (err) => callback(err, null),
    );
  };
  return new Promise((resolve, reject) => {
    loader.load((err, dic) => {
      if (err) return reject(err);
      const tokenizer = new TokenizerClass(dic);
      resolve((text) =>
        tokenizer.tokenize(text).map((t: IpadicFeatures) => toSongToken(t)),
      );
    });
  });
}
