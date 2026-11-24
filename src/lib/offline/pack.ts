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
  /** 자막 API 주소(자막 카드·확인 문제의 소리 구간). 자막이 있는 트랙만. 서버가 채운다 */
  dataUrls?: string[];
  /** 강 화면·자막 카드·낱말 정보 창에 나오는 그림 파일 주소. 서버가 채운다 */
  pictureUrls?: string[];
  /**
   * 서버가 자막·그림까지 채운 묶음이면 true(server-pack.ts). 강 화면이 만든 묶음은 오디오·화면만 알아서,
   * 받기 전에 서버에 다 채운 묶음을 묻는다(manager.ts)
   */
  full?: boolean;
}

/** 받아 둘 파일의 갈래. 갈래마다 다른 캐시에 넣는다(manager.ts CACHE_OF) */
export type FileKind = "page" | "audio" | "data" | "picture";

export interface FileGroup {
  kind: FileKind;
  urls: string[];
}

/** 묶음이 받아 두는 파일 전체(강 화면·오디오·자막·그림) */
export function packFiles(pack: OfflinePack): FileGroup[] {
  return [
    { kind: "page", urls: [pack.pageUrl] },
    { kind: "audio", urls: pack.audioUrls },
    { kind: "data", urls: pack.dataUrls ?? [] },
    { kind: "picture", urls: pack.pictureUrls ?? [] },
  ];
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

/** 이 묶음을 지울 때 캐시에서 지울 파일(갈래별): 남아 있는 다른 묶음이 쓰는 주소는 남긴다 */
export function filesToRemove(
  pack: OfflinePack,
  others: readonly OfflinePack[],
): FileGroup[] {
  const kept = new Set(
    others
      .filter((o) => o.id !== pack.id)
      .flatMap((o) => packFiles(o).flatMap((g) => g.urls)),
  );
  return packFiles(pack).map((g) => ({
    kind: g.kind,
    urls: g.urls.filter((u) => !kept.has(u)),
  }));
}
