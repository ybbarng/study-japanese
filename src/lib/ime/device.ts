// 입력기 안내: 접속한 기기를 userAgent로 짐작해 그 기기 안내를 먼저 펼친다.

export type Device = "android" | "windows" | "mac" | "ios";

export function guessDevice(userAgent: string): Device | null {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Windows/i.test(userAgent)) return "windows";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "mac";
  return null;
}
