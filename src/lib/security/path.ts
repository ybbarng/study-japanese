/** 주소 경로의 %인코딩이 풀리는지(깨진 %E0%A4%A 같은 것은 false) */
export function isDecodablePath(pathname: string): boolean {
  try {
    decodeURIComponent(pathname);
    return true;
  } catch {
    return false;
  }
}
