// 일무따 오디오 주소. 교재 자료 폴더 기준 상대 경로를 로그인 뒤 `/media/ilmuta/*` 라우트로 붙인다.

/** `1. 음성 강의/L01.mp3` → `/media/ilmuta/1.%20%EC%9D%8C...%20%EA%B0%95%EC%9D%98/L01.mp3` */
export function ilmutaMediaUrl(file: string): string {
  return `/media/ilmuta/${file.split("/").map(encodeURIComponent).join("/")}`;
}
