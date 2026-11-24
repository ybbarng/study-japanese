// service worker(public/sw.js)와 함께 쓰는 캐시 이름. sw.js 맨 위 상수와 같아야 한다
// (cache-names.test.ts가 두 파일을 맞대 본다).

/** 받아 둔 강 오디오. sw.js가 여기서 꺼내 Range 요청까지 잘라 준다 */
export const AUDIO_CACHE = "sj-audio-v1";
/** 화면 HTML. sw.js가 네트워크가 끊기면 여기서 준다 */
export const PAGE_CACHE = "sj-pages-v1";
/** 빌드 파일(/_next/static/*) */
export const STATIC_CACHE = "sj-static-v1";
/** 낱말·장면 그림(/pictures/*). sw.js가 받아 둔 것을 먼저 준다 */
export const PICTURE_CACHE = "sj-pictures-v1";
/** 받아 둔 강의 자막 API 응답(/api/transcripts/*). sw.js가 네트워크가 끊기면 여기서 준다 */
export const DATA_CACHE = "sj-data-v1";
