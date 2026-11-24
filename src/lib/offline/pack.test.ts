import { describe, expect, it } from "vitest";
import { fakeLesson } from "@/lib/ilmuta/__fixtures__/lesson";
import { lessonQueue } from "@/lib/ilmuta/tracks";
import type { IlmuntaLesson } from "@/lib/textbook/schema";
import {
  filesToRemove,
  ilmuntaPack,
  ilmutaPack,
  type OfflinePack,
} from "./pack";

function fakeIlmunta(no: number): IlmuntaLesson {
  const nn = String(no).padStart(2, "0");
  return {
    no,
    title: `시험 문법 ${no}`,
    lectures: [
      { file: `강의 mp3/L${nn}-01.MP3`, durationSec: 300 },
      { file: `강의 mp3/L${nn}-02.MP3`, durationSec: 280 },
    ],
    examples: [
      {
        id: `${nn}-1`,
        file: `예문 mp3/${nn}-1.mp3`,
        durationSec: 40,
        kind: "grammarExamples",
        sentences: [],
      },
    ],
  };
}

describe("일무따 강 묶음", () => {
  it("강의와 예문 주소를 재생기 대기열과 같은 순서·같은 주소로 담는다", () => {
    const lesson = fakeLesson(3);
    expect(ilmutaPack(lesson).audioUrls).toEqual(
      lessonQueue(lesson).map((t) => t.src),
    );
  });

  it("강의 주소는 폴더 이름의 한글과 띄어쓰기를 주소 꼴로 바꾼다", () => {
    expect(ilmutaPack(fakeLesson(3)).audioUrls[0]).toBe(
      "/media/ilmuta/1.%20%EC%9D%8C%EC%84%B1%20%EA%B0%95%EC%9D%98/L03.mp3",
    );
  });

  it("이름은 강 번호와 제목, 화면 주소는 강 화면이다", () => {
    const pack = ilmutaPack(fakeLesson(3));
    expect(pack).toMatchObject({
      id: "ilmuta-3",
      title: "3강 テスト3。",
      pageUrl: "/ilmuta/3",
    });
  });

  it("제목이 없는 0강은 이름을 오리엔테이션으로 둔다", () => {
    expect(ilmutaPack(fakeLesson(0)).title).toBe("오리엔테이션");
  });
});

describe("일문따 과 묶음", () => {
  it("강의 여러 개 다음에 예문을 담는다", () => {
    expect(ilmuntaPack(fakeIlmunta(5)).audioUrls).toEqual([
      "/media/ilmunta/%EA%B0%95%EC%9D%98%20mp3/L05-01.MP3",
      "/media/ilmunta/%EA%B0%95%EC%9D%98%20mp3/L05-02.MP3",
      "/media/ilmunta/%EC%98%88%EB%AC%B8%20mp3/05-1.mp3",
    ]);
  });

  it("이름은 과 번호와 제목이다", () => {
    expect(ilmuntaPack(fakeIlmunta(5))).toMatchObject({
      id: "ilmunta-5",
      title: "5과 시험 문법 5",
      pageUrl: "/ilmunta/5",
    });
  });
});

describe("묶음 지울 때 지울 파일", () => {
  const pack = (
    id: string,
    audioUrls: string[],
    pictureUrls: string[] = [],
  ): OfflinePack => ({
    id,
    book: "ilmuta",
    no: 1,
    title: id,
    pageUrl: `/page/${id}`,
    audioUrls,
    dataUrls: [`/api/transcripts/ilmuta/${id}`],
    pictureUrls,
    full: true,
  });
  const urlsOf = (groups: ReturnType<typeof filesToRemove>) =>
    Object.fromEntries(groups.map((g) => [g.kind, g.urls]));

  it("다른 묶음이 함께 쓰는 오디오·그림은 남기고 나머지와 강 화면·자막을 지운다", () => {
    const a = pack(
      "a",
      ["/media/x.mp3", "/media/shared.mp3"],
      ["/pictures/words/m01-cat.svg", "/pictures/words/m01-dog.svg"],
    );
    const b = pack("b", ["/media/shared.mp3"], ["/pictures/words/m01-dog.svg"]);
    expect(urlsOf(filesToRemove(a, [a, b]))).toEqual({
      page: ["/page/a"],
      audio: ["/media/x.mp3"],
      data: ["/api/transcripts/ilmuta/a"],
      picture: ["/pictures/words/m01-cat.svg"],
    });
  });

  it("다른 묶음이 없으면 모두 지운다", () => {
    const a = pack("a", ["/media/x.mp3"]);
    expect(urlsOf(filesToRemove(a, []))).toEqual({
      page: ["/page/a"],
      audio: ["/media/x.mp3"],
      data: ["/api/transcripts/ilmuta/a"],
      picture: [],
    });
  });

  it("예전에 받아 자막·그림 목록이 없는 묶음도 지울 수 있다", () => {
    const old: OfflinePack = {
      id: "old",
      book: "ilmuta",
      no: 2,
      title: "old",
      pageUrl: "/ilmuta/2",
      audioUrls: ["/media/old.mp3"],
    };
    expect(urlsOf(filesToRemove(old, []))).toEqual({
      page: ["/ilmuta/2"],
      audio: ["/media/old.mp3"],
      data: [],
      picture: [],
    });
  });
});
