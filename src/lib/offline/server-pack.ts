import { loadContextTranscript } from "@/lib/context/server";
import { cardPictureIds, transcriptApiUrl } from "@/lib/context/transcript-api";
import { lessonTracks } from "@/lib/ilmunta/tracks";
import { lessonQueue } from "@/lib/ilmuta/tracks";
import { pictureOf, sceneOf, wordPictureSrc } from "@/lib/pictures";
import type { Book, ScenePart } from "@/lib/pictures/types";
import type { Track } from "@/lib/player/queue";
import type { IlmuntaLesson, IlmutaLesson } from "@/lib/textbook/schema";
import { loadIlmutaWordTap } from "@/lib/word-tap/server";
import type { WordTapData } from "@/lib/word-tap/types";
import { ilmuntaPack, ilmutaPack, type OfflinePack } from "./pack";

// 서버가 받아 둘 묶음을 다 채운다: 강 화면이 아는 오디오·화면에 더해, 자막이 있는 트랙의 자막 API 주소와
// 그 강에서 보일 그림 파일(낱말 단계·회화 낱말·낱말 정보 창·자막 카드·장면)을 넣는다.
// 받기를 누를 때(/offline/pack/…)와 자동 받기(/offline/upcoming)가 부른다. 강 화면을 그릴 때는 부르지 않는다
// (자막마다 카드를 맞추는 일이 있어 화면을 늦추지 않게).

type CanSee = (book: string) => boolean;

const SCENE_PARTS: ScenePart[] = ["conversation", "reading"];

/** 낱말들에 붙는 그린 그림 파일, 자막 카드의 그림 id, 장면 그림을 주소로 모은다(그림 문자는 파일이 없다) */
export function pictureUrlsOf(
  words: readonly string[],
  cardIds: readonly string[],
  scene: { book: Book; no: number },
): string[] {
  const urls = new Set<string>();
  for (const ja of words) {
    const p = pictureOf(ja);
    if (p?.kind === "svg") urls.add(p.src);
  }
  for (const id of cardIds) urls.add(wordPictureSrc(id));
  for (const part of SCENE_PARTS) {
    const s = sceneOf(scene.book, scene.no, part);
    if (s) urls.add(s.src);
  }
  return [...urls];
}

/** 낱말 누르기 자료에 나오는 낱말(기본형, 없으면 보이는 꼴). 낱말 정보 창이 이 낱말로 그림을 찾는다 */
export function wordTapWords(wordTap: WordTapData): string[] {
  const out = new Set<string>();
  for (const s of Object.values(wordTap.analyses))
    for (const t of s.tokens) if (!t.plain) out.add(t.base ?? t.surface);
  return [...out];
}

function complete(
  base: OfflinePack,
  tracks: readonly Track[],
  words: readonly string[],
  canSee: CanSee,
  dir?: string,
): OfflinePack {
  const dataUrls: string[] = [];
  const cardIds: string[] = [];
  for (const t of tracks) {
    const transcript = loadContextTranscript(t.book, t.item, canSee, dir);
    if (!transcript) continue;
    dataUrls.push(transcriptApiUrl(t.book, t.item));
    cardIds.push(...cardPictureIds(transcript));
  }
  return {
    ...base,
    dataUrls: [...new Set(dataUrls)],
    pictureUrls: pictureUrlsOf(words, cardIds, {
      book: base.book,
      no: base.no,
    }),
    full: true,
  };
}

export function fullIlmutaPack(
  lesson: IlmutaLesson,
  lessons: readonly IlmutaLesson[],
  canSee: CanSee,
  dir?: string,
): OfflinePack {
  // 출처를 닫아 방문자에게 교재 글을 보이지 않으면 낱말 그림도 보이지 않는다(장면만)
  const words = canSee("ilmuta")
    ? [
        ...lesson.examples.flatMap((e) => e.sentences.map((s) => s.ja)),
        ...(lesson.conversationWords ?? []).map((w) => w.ja),
        ...wordTapWords(loadIlmutaWordTap(lessons, lesson, dir)),
      ]
    : [];
  return complete(ilmutaPack(lesson), lessonQueue(lesson), words, canSee, dir);
}

export function fullIlmuntaPack(
  lesson: IlmuntaLesson,
  canSee: CanSee,
  dir?: string,
): OfflinePack {
  return complete(ilmuntaPack(lesson), lessonTracks(lesson), [], canSee, dir);
}
