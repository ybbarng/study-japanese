import { describe, expect, it } from "vitest";
import { slugFromAudioFile, unregisteredAudio } from "./unregistered";

describe("unregisteredAudio", () => {
  it("이미 넣은 노래의 파일은 빼고 남은 파일을 이름 차례로 돌려준다", () => {
    expect(
      unregisteredAudio(
        ["song-b.mp3", "song-a.mp3", "song-c.m4a"],
        [{ audioFile: "song-b.mp3" }],
      ),
    ).toEqual(["song-a.mp3", "song-c.m4a"]);
  });

  it("음원이 아니거나 이름 규칙에 맞지 않는 파일은 뺀다", () => {
    expect(
      unregisteredAudio([".DS_Store", "note.txt", "한글.mp3", "ok.mp3"], []),
    ).toEqual(["ok.mp3"]);
  });
});

describe("slugFromAudioFile", () => {
  it("확장자를 떼고 소문자로 바꾼 이름을 돌려준다", () => {
    expect(slugFromAudioFile("Song-A.mp3")).toBe("song-a");
  });

  it("주소 이름 규칙에 맞지 않으면 빈 글을 돌려준다", () => {
    expect(slugFromAudioFile("my_song.mp3")).toBe("");
  });
});
