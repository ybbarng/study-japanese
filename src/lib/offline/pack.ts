import { lessonTracks } from "@/lib/ilmunta/tracks";
import { lessonLabel } from "@/lib/ilmuta/labels";
import { lessonQueue } from "@/lib/ilmuta/tracks";
import type { IlmuntaLesson, IlmutaLesson } from "@/lib/textbook/schema";

// 받아 둘 묶음 하나 = 강(과) 하나. 오디오 주소는 재생기 대기열과 같은 함수로 만들어
// 재생기가 부르는 주소와 캐시에 넣는 주소가 어긋나지 않게 한다.

export type OfflineBook = "ilmuta" | "ilmunta";

export interface OfflinePack {
  /** `ilmuta-3`, `ilmunta-12` */
  id: string;
  book: OfflineBook;
  no: number;
  /** 목록에 보일 이름(예: `3강 テスト3。`) */
  title: string;
  /** 이 강 화면. 끊겼을 때도 열리게 함께 받아 둔다 */
  pageUrl: string;
  /** 강의·예문 mp3 주소(재생 순서) */
  audioUrls: string[];
}

export const BOOK_LABEL: Record<OfflineBook, string> = {
  ilmuta: "일무따",
  ilmunta: "일문따",
};

/** 여러 강이 함께 쓰는 화면. 강을 받을 때 새로 담고, 강을 지워도 남긴다 */
export const SHARED_PAGES: Record<OfflineBook, string[]> = {
  ilmuta: ["/", "/ilmuta", "/offline"],
  ilmunta: ["/", "/ilmunta", "/offline"],
};

export function packId(book: OfflineBook, no: number): string {
  return `${book}-${no}`;
}

export function ilmutaPack(lesson: IlmutaLesson): OfflinePack {
  const label = lessonLabel(lesson.no);
  return {
    id: packId("ilmuta", lesson.no),
    book: "ilmuta",
    no: lesson.no,
    title: lesson.title ? `${label} ${lesson.title}` : label,
    pageUrl: `/ilmuta/${lesson.no}`,
    audioUrls: unique(lessonQueue(lesson).map((t) => t.src)),
  };
}

export function ilmuntaPack(lesson: IlmuntaLesson): OfflinePack {
  const label = `${lesson.no}과`;
  return {
    id: packId("ilmunta", lesson.no),
    book: "ilmunta",
    no: lesson.no,
    title: lesson.title ? `${label} ${lesson.title}` : label,
    pageUrl: `/ilmunta/${lesson.no}`,
    audioUrls: unique(lessonTracks(lesson).map((t) => t.src)),
  };
}

function unique(list: string[]): string[] {
  return [...new Set(list)];
}

/** 이 묶음을 지울 때 캐시에서 지울 주소: 남아 있는 다른 묶음이 쓰는 주소는 남긴다 */
export function urlsToRemove(
  pack: OfflinePack,
  others: readonly OfflinePack[],
): string[] {
  const kept = new Set(
    others
      .filter((o) => o.id !== pack.id)
      .flatMap((o) => [...o.audioUrls, o.pageUrl]),
  );
  return [...pack.audioUrls, pack.pageUrl].filter((u) => !kept.has(u));
}
