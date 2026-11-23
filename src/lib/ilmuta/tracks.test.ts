import { describe, expect, it } from "vitest";
import { fakeLesson } from "./__fixtures__/lesson";
import { ilmutaMediaUrl } from "./media";
import { lectureItem, lessonQueue, sentenceLine } from "./tracks";

describe("오디오 주소", () => {
  it("경로 조각마다 따로 인코딩하고 사이의 /는 남긴다", () => {
    expect(ilmutaMediaUrl("1. 음성 강의/L01.mp3")).toBe(
      "/media/ilmuta/1.%20%EC%9D%8C%EC%84%B1%20%EA%B0%95%EC%9D%98/L01.mp3",
    );
  });

  it("파일 이름의 #·?도 주소를 끊지 않게 인코딩한다", () => {
    expect(ilmutaMediaUrl("a/b#c?.mp3")).toBe("/media/ilmuta/a/b%23c%3F.mp3");
  });
});

describe("강을 재생 대기열로", () => {
  it("강의 번호는 두 자리로 맞춘다", () => {
    expect(lectureItem(0)).toBe("L00");
    expect(lectureItem(12)).toBe("L12");
  });

  it("강의를 먼저, 예문을 책 차례대로 놓는다", () => {
    const queue = lessonQueue(fakeLesson(1));
    expect(queue.map((t) => [t.item, t.kind])).toEqual([
      ["L01", "lecture"],
      ["01-1", "example"],
      ["01-2", "example"],
      ["01-3", "example"],
      ["01-4-1", "example"],
      ["01-4-2", "example"],
      ["01-5", "example"],
    ]);
  });

  it("예문 제목은 강 번호와 책의 코너 이름이다", () => {
    const queue = lessonQueue(fakeLesson(1));
    expect(queue[2].title).toBe("1강 기본 단어 익히기");
    expect(queue[2].subtitle).toBe("일무따 · テスト1。");
  });

  it("글이 있는 예문만 재생 화면에 띄울 줄을 갖는다", () => {
    const queue = lessonQueue(fakeLesson(1));
    expect(queue[1].lines).toBeUndefined();
    expect(queue[3].lines).toEqual([{ ja: "山は高い。", ko: "산은 높아." }]);
  });

  it("0강은 강의 하나뿐이고 제목은 오리엔테이션이다", () => {
    const queue = lessonQueue(fakeLesson(0));
    expect(queue.map((t) => t.title)).toEqual(["오리엔테이션 강의"]);
  });
});

describe("재생 화면에 띄울 줄", () => {
  it("단어는 읽는 법을 괄호로 붙인다", () => {
    expect(sentenceLine({ ja: "山", ko: "산", reading: "やま" })).toEqual({
      ja: "山（やま）",
      ko: "산",
    });
  });

  it("읽는 법이 글과 같으면 붙이지 않는다", () => {
    expect(sentenceLine({ ja: "うん", ko: "응", reading: "うん" })).toEqual({
      ja: "うん",
      ko: "응",
    });
  });
});
