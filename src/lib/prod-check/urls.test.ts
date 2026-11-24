import { describe, expect, it } from "vitest";
import {
  bookMediaUrl,
  hasNonAscii,
  itemOfFile,
  joinUrl,
  readablePath,
  transcriptUrl,
} from "./urls";

describe("bookMediaUrl", () => {
  it("한글 폴더 이름을 경로 조각마다 퍼센트 인코딩하고 슬래시는 남긴다", () => {
    expect(bookMediaUrl("ilmuta", "1. 음성 강의/L01.mp3")).toBe(
      "/media/ilmuta/1.%20%EC%9D%8C%EC%84%B1%20%EA%B0%95%EC%9D%98/L01.mp3",
    );
  });

  it("일문따는 /media/ilmunta 아래로 붙인다", () => {
    expect(bookMediaUrl("ilmunta", "예문 mp3/01-1.MP3")).toBe(
      "/media/ilmunta/%EC%98%88%EB%AC%B8%20mp3/01-1.MP3",
    );
  });

  it("NFC로 쓴 한글은 NFC 바이트로 인코딩해, 서버가 NFC 이름부터 찾게 한다", () => {
    const nfc = "음성".normalize("NFC");
    const nfd = "음성".normalize("NFD");
    expect(bookMediaUrl("ilmuta", `${nfc}/a.mp3`)).toBe(
      "/media/ilmuta/%EC%9D%8C%EC%84%B1/a.mp3",
    );
    // 같은 글자라도 NFD로 들어오면 주소가 달라진다(운영 404의 원인이던 차이)
    expect(bookMediaUrl("ilmuta", `${nfd}/a.mp3`)).not.toBe(
      bookMediaUrl("ilmuta", `${nfc}/a.mp3`),
    );
  });
});

describe("itemOfFile", () => {
  it("폴더와 확장자를 뺀 파일 이름을 항목 이름으로 쓴다", () => {
    expect(itemOfFile("1. 음성 강의/L01.mp3")).toBe("L01");
    expect(itemOfFile("강의 mp3/L01-02.MP3")).toBe("L01-02");
    expect(itemOfFile("01-4-1.mp3")).toBe("01-4-1");
  });
});

describe("transcriptUrl", () => {
  it("책과 항목으로 자막 API 주소를 만든다", () => {
    expect(transcriptUrl("ilmunta", "L01-02")).toBe(
      "/api/transcripts/ilmunta/L01-02",
    );
  });
});

describe("readablePath", () => {
  it("출력용으로 인코딩을 풀어 파일 이름이 읽히게 한다", () => {
    expect(readablePath("/media/ilmuta/1.%20%EC%9D%8C%EC%84%B1/L01.mp3")).toBe(
      "/media/ilmuta/1. 음성/L01.mp3",
    );
  });

  it("풀 수 없는 주소는 그대로 돌려준다", () => {
    expect(readablePath("/media/%E0%A4%A")).toBe("/media/%E0%A4%A");
  });
});

describe("hasNonAscii", () => {
  it("한글이 든 경로만 참이다", () => {
    expect(hasNonAscii("1. 음성 강의/L01.mp3")).toBe(true);
    expect(hasNonAscii("kana/a.mp3")).toBe(false);
  });
});

describe("joinUrl", () => {
  it("끝 슬래시가 있든 없든 한 번만 이어 붙인다", () => {
    expect(joinUrl("https://x.test/", "/a")).toBe("https://x.test/a");
    expect(joinUrl("https://x.test", "a")).toBe("https://x.test/a");
  });
});
