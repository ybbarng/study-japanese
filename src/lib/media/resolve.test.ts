import { describe, expect, it } from "vitest";
import { parseRange, resolveMediaPath } from "./resolve";

const MEDIA = "/srv/media";

describe("resolveMediaPath", () => {
  it("교재 예문 mp3를 MEDIA_DIR 안 경로로 바꾼다", () => {
    expect(
      resolveMediaPath(MEDIA, ["ilmuta", "2. 예문 mp3", "01-1.mp3"]),
    ).toEqual({
      absolutePath: "/srv/media/ilmuta/2. 예문 mp3/01-1.mp3",
      contentType: "audio/mpeg",
    });
  });

  it("대문자 확장자(일문따 .MP3)도 받는다", () => {
    expect(
      resolveMediaPath(MEDIA, ["ilmunta", "강의 mp3", "L01-01.MP3"])
        ?.contentType,
    ).toBe("audio/mpeg");
  });

  it.each([
    [["..", "etc", "passwd.mp3"]],
    [["ilmuta", "..", "..", "x.mp3"]],
    [["ilmuta/../../x.mp3"]],
    [[]],
  ])("폴더 밖으로 나가는 %j는 거절한다", (segments) => {
    expect(resolveMediaPath(MEDIA, segments)).toBeNull();
  });

  it("오디오·PDF가 아닌 파일은 거절한다", () => {
    expect(resolveMediaPath(MEDIA, ["ilmunta", "2_단어_색인.xlsx"])).toBeNull();
  });
});

describe("parseRange", () => {
  const SIZE = 1000;

  it("헤더가 없으면 전체를 보낸다", () => {
    expect(parseRange(null, SIZE)).toBeNull();
  });

  it("<audio>가 처음 보내는 bytes=0-은 끝까지", () => {
    expect(parseRange("bytes=0-", SIZE)).toEqual({ start: 0, end: 999 });
  });

  it("끝을 넘는 범위는 파일 끝에서 자른다", () => {
    expect(parseRange("bytes=900-5000", SIZE)).toEqual({
      start: 900,
      end: 999,
    });
  });

  it("bytes=-100은 마지막 100바이트", () => {
    expect(parseRange("bytes=-100", SIZE)).toEqual({ start: 900, end: 999 });
  });

  it("파일 크기를 넘는 시작은 invalid", () => {
    expect(parseRange("bytes=1000-", SIZE)).toBe("invalid");
  });
});
