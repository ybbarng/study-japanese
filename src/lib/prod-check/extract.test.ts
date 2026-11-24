import { describe, expect, it } from "vitest";
import {
  ilmuntaMedia,
  ilmutaMedia,
  lessonNumbersInHtml,
  mediaFilesInHtml,
  rscText,
  sampleItems,
  songSlugsInHtml,
  uniqueMedia,
} from "./extract";

/** Next가 심는 꼴 그대로: RSC 문자열을 JS 문자열 리터럴로 감싸 push한다 */
function rscScript(payload: string): string {
  return `<script>self.__next_f.push([1,${JSON.stringify(payload)}])</script>`;
}

/** 강 화면 HTML 흉내. 교재 글 대신 모양만 같은 가짜 문장을 쓴다 */
function lessonHtml(files: string[]): string {
  const lesson = {
    no: 1,
    title: "가짜 제목",
    lecture: { file: files[0], durationSec: 1 },
    examples: files.slice(1).map((file, i) => ({
      id: `01-${i + 1}`,
      file,
      durationSec: 1,
      sentences: [{ ja: "ダミー文。", ko: "가짜 문장." }],
    })),
  };
  const payload = `5:["$","div",null,{"lesson":${JSON.stringify(lesson)}}]\n`;
  // 실제 HTML처럼 조각이 여러 개로 나뉘어 들어온다
  const mid = Math.floor(payload.length / 2);
  return `<html><body>${rscScript(payload.slice(0, mid))}${rscScript(payload.slice(mid))}</body></html>`;
}

describe("화면 HTML에서 뽑기", () => {
  it("rscText는 나뉜 RSC 조각을 풀어 하나로 잇는다", () => {
    const html = rscScript('a:{"x":"가"}') + rscScript('\n{"y":"\\"q\\""}');
    expect(rscText(html)).toBe('a:{"x":"가"}\n{"y":"\\"q\\""}');
  });

  it("강 화면에 실린 강의·예문 파일 경로를 차례대로 뽑는다(한글 폴더 포함)", () => {
    const html = lessonHtml([
      "1. 음성 강의/L01.mp3",
      "2. 예문 mp3/01-1.mp3",
      "2. 예문 mp3/01-2.mp3",
    ]);
    expect(mediaFilesInHtml(html)).toEqual([
      "1. 음성 강의/L01.mp3",
      "2. 예문 mp3/01-1.mp3",
      "2. 예문 mp3/01-2.mp3",
    ]);
  });

  it("대문자 확장자(.MP3)도 미디어로 보고, 같은 파일은 한 번만 뽑는다", () => {
    const html = lessonHtml([
      "강의 mp3/L01-01.MP3",
      "예문 mp3/01-1.MP3",
      "예문 mp3/01-1.MP3",
    ]);
    expect(mediaFilesInHtml(html)).toEqual([
      "강의 mp3/L01-01.MP3",
      "예문 mp3/01-1.MP3",
    ]);
  });

  it("미디어가 아닌 file 값은 뺀다", () => {
    const html = rscScript('{"file":"notes.txt"},{"file":"a/b.pdf"}');
    expect(mediaFilesInHtml(html)).toEqual(["a/b.pdf"]);
  });

  it("RSC 조각이 없으면 빈 목록이다(뽑는 방식이 깨진 것을 점검이 알아챈다)", () => {
    expect(mediaFilesInHtml("<html><body>없음</body></html>")).toEqual([]);
  });

  it("책 목록 화면에서 그 책의 강 번호만 작은 차례로 뽑는다", () => {
    const html =
      '<a href="/ilmunta/2"></a><a href="/ilmunta/drill"></a>' +
      '<a href="/ilmunta/1"></a><a href="/ilmunta/test/4"></a>' +
      '<a href="/ilmunta/1"></a><a href="/ilmuta/9"></a>';
    expect(lessonNumbersInHtml(html, "ilmunta")).toEqual([1, 2]);
  });

  it("노래 목록에서 주소 이름만 뽑고 넣기 화면은 뺀다", () => {
    const html =
      '<a href="/songs/lemon"></a><a href="/songs/new"></a>' +
      '<a href="/songs/lemon"></a><a href="/songs/blue-sky"></a>';
    expect(songSlugsInHtml(html)).toEqual(["lemon", "blue-sky"]);
  });
});

describe("교재 JSON에서 뽑기", () => {
  const example = (file: string) => ({
    id: "01-1",
    file,
    durationSec: 1,
    kind: "dialogue" as const,
    sentences: [],
  });

  it("일무따는 강의·예문·부록 파일을 모두 낸다", () => {
    const refs = ilmutaMedia({
      lessons: [
        {
          no: 1,
          title: "",
          lecture: { file: "1. 음성 강의/L01.mp3", durationSec: 1 },
          examples: [example("2. 예문 mp3/01-1.mp3")],
        },
      ],
      extras: [{ file: "3. 부록/x.mp3", title: "부록", durationSec: 1 }],
    });
    expect(refs.map((r) => `${r.book}:${r.file}`)).toEqual([
      "ilmuta:1. 음성 강의/L01.mp3",
      "ilmuta:2. 예문 mp3/01-1.mp3",
      "ilmuta:3. 부록/x.mp3",
    ]);
  });

  it("일문따는 과마다 강의 여러 개와 예문을 낸다", () => {
    const refs = ilmuntaMedia({
      lessons: [
        {
          no: 1,
          title: "",
          lectures: [
            { file: "강의 mp3/L01-01.MP3", durationSec: 1 },
            { file: "강의 mp3/L01-02.MP3", durationSec: 1 },
          ],
          examples: [example("예문 mp3/01-1.MP3")],
        },
      ],
    });
    expect(refs.map((r) => r.file)).toEqual([
      "강의 mp3/L01-01.MP3",
      "강의 mp3/L01-02.MP3",
      "예문 mp3/01-1.MP3",
    ]);
  });

  it("uniqueMedia는 같은 책의 같은 파일만 합치고 다른 책은 남긴다", () => {
    expect(
      uniqueMedia([
        { book: "ilmuta", file: "a.mp3" },
        { book: "ilmuta", file: "a.mp3" },
        { book: "ilmunta", file: "a.mp3" },
      ]),
    ).toEqual([
      { book: "ilmuta", file: "a.mp3" },
      { book: "ilmunta", file: "a.mp3" },
    ]);
  });
});

describe("sampleItems", () => {
  it("앞·가운데·끝을 고른다", () => {
    expect(sampleItems(["a", "b", "c", "d", "e"])).toEqual(["a", "c", "e"]);
  });

  it("개수보다 적으면 모두 돌려준다", () => {
    expect(sampleItems(["a", "b"])).toEqual(["a", "b"]);
  });
});
