import type { Ilmunta, Ilmuta } from "@/lib/textbook/schema";
import type { Book } from "./urls";

// 운영 화면 HTML과 교재 JSON에서 점검할 대상(미디어 파일·강 번호·노래 주소 이름)을 뽑는다.
// 교재 글은 다루지 않고 파일 경로·번호만 꺼낸다.

const MEDIA_EXT = /\.(mp3|m4a|pdf)$/i;

/**
 * Next가 HTML에 심는 RSC 조각(`self.__next_f.push([1,"…"])`)의 문자열을 풀어 이어 붙인다.
 * 화면이 받은 교재 데이터(강마다 파일 경로)는 이 안에 JSON 꼴로 들어 있다.
 */
export function rscText(html: string): string {
  const parts: string[] = [];
  for (const m of html.matchAll(
    /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g,
  )) {
    try {
      parts.push(JSON.parse(m[1]) as string);
    } catch {
      // 풀리지 않는 조각은 건너뛴다
    }
  }
  return parts.join("");
}

/** 화면 HTML에 실린 미디어 파일 경로(`"file":"…mp3"`) 목록. 중복 없이, 나온 차례대로 */
export function mediaFilesInHtml(html: string): string[] {
  const text = rscText(html);
  const files = new Set<string>();
  for (const m of text.matchAll(/"file":("(?:[^"\\]|\\.)*")/g)) {
    let file: string;
    try {
      file = JSON.parse(m[1]) as string;
    } catch {
      continue;
    }
    if (MEDIA_EXT.test(file)) files.add(file);
  }
  return [...files];
}

/** 책 목록 화면에서 강 화면 주소(`/ilmuta/3`)의 번호들. 중복 없이 작은 차례 */
export function lessonNumbersInHtml(html: string, book: Book): number[] {
  const nos = new Set<number>();
  for (const m of html.matchAll(new RegExp(`href="/${book}/(\\d+)"`, "g"))) {
    nos.add(Number(m[1]));
  }
  return [...nos].sort((a, b) => a - b);
}

const SONG_PAGES_NOT_SLUG = new Set(["new"]);

/** 노래 목록 화면에서 노래 주소 이름(`/songs/<slug>`). 넣기 화면(new)·고치기 화면은 뺀다 */
export function songSlugsInHtml(html: string): string[] {
  const slugs = new Set<string>();
  for (const m of html.matchAll(/href="\/songs\/([a-z0-9-]+)"/g)) {
    if (!SONG_PAGES_NOT_SLUG.has(m[1])) slugs.add(m[1]);
  }
  return [...slugs];
}

export interface MediaRef {
  book: Book;
  file: string;
}

/** 일무따 교재 JSON의 모든 오디오: 강의·예문·부록 */
export function ilmutaMedia(data: Pick<Ilmuta, "lessons" | "extras">) {
  const refs: MediaRef[] = [];
  for (const l of data.lessons) {
    refs.push({ book: "ilmuta", file: l.lecture.file });
    for (const e of l.examples) refs.push({ book: "ilmuta", file: e.file });
  }
  for (const x of data.extras) refs.push({ book: "ilmuta", file: x.file });
  return refs;
}

/** 일문따 교재 JSON의 모든 오디오: 과마다 강의 여러 개·예문 */
export function ilmuntaMedia(data: Pick<Ilmunta, "lessons">) {
  const refs: MediaRef[] = [];
  for (const l of data.lessons) {
    for (const a of l.lectures) refs.push({ book: "ilmunta", file: a.file });
    for (const e of l.examples) refs.push({ book: "ilmunta", file: e.file });
  }
  return refs;
}

/** 같은 책·같은 파일은 한 번만 */
export function uniqueMedia(refs: readonly MediaRef[]): MediaRef[] {
  const seen = new Set<string>();
  return refs.filter((r) => {
    const key = `${r.book}/${r.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 자막 표본: 앞·가운데·끝에서 하나씩. 로컬 자막 목록이 없을 때(CI) 화면에서 얻은 항목으로
 * 몇 개만 확인한다. 정해진 차례라 돌릴 때마다 같은 표본이다.
 */
export function sampleItems<T>(items: readonly T[], count = 3): T[] {
  if (items.length <= count) return [...items];
  if (count <= 1) return items.slice(0, Math.max(count, 0));
  const picked = new Set<number>();
  for (let i = 0; i < count; i++) {
    picked.add(Math.round((i * (items.length - 1)) / (count - 1)));
  }
  return [...picked].map((i) => items[i]);
}
