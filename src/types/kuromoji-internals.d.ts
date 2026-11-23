// kuromoji 안쪽 모듈(브라우저 분석기가 사전 받는 법을 직접 정하려고 쓴다, src/lib/songs/browser-analyzer.ts).
// @types/kuromoji는 바깥 함수만 적어 두어 여기서 필요한 만큼만 적는다.

declare module "kuromoji/src/loader/DictionaryLoader" {
  import type { DynamicDictionaries } from "kuromoji";

  type LoadCallback = (err: unknown, buffer: ArrayBuffer | null) => void;

  class DictionaryLoader {
    constructor(dicPath: string);
    /** 파일 하나를 받아 풀린 바이트로 넘긴다. load()가 this 없이 부른다 */
    loadArrayBuffer: (url: string, callback: LoadCallback) => void;
    load(callback: (err: unknown, dic: DynamicDictionaries) => void): void;
  }
  export default DictionaryLoader;
}

declare module "kuromoji/src/Tokenizer" {
  import type {
    DynamicDictionaries,
    IpadicFeatures,
    Tokenizer,
  } from "kuromoji";

  const TokenizerClass: new (
    dic: DynamicDictionaries,
  ) => Tokenizer<IpadicFeatures>;
  export default TokenizerClass;
}
