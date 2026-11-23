import { lessonLabel } from "@/lib/ilmuta/labels";
import {
  naverDictUrl,
  posLabel,
  type SongWord,
  wordReading,
  wordRuby,
} from "@/lib/songs/words";
import { Ruby } from "./line-words";

interface Props {
  word: SongWord | null;
  /** 일무따에서 배운 강(모르면 null) */
  learnedNo: number | null;
}

/**
 * 고른 낱말 설명: 이 노래에서의 뜻(세션 분석), 읽는 법·기본형·품사, 일무따에서 배웠는지,
 * 더 자세한 뜻은 네이버 사전으로.
 */
export function WordDetail({ word, learnedNo }: Props) {
  if (!word)
    return (
      <p className="text-sm leading-relaxed text-ink-faint">
        가사의 낱말을 누르면 여기에 이 노래에서의 뜻과 읽는 법·기본형·품사가
        나오고, 사전에서 바로 찾아볼 수 있습니다.
      </p>
    );
  const reading = wordReading(word);
  return (
    <section aria-label="낱말 설명" className="flex flex-col gap-3">
      <p lang="ja" className="font-ja-serif text-4xl leading-[1.8] text-accent">
        <Ruby segments={wordRuby(word)} showReading />
      </p>
      {word.gloss ? <p className="text-lg font-medium">{word.gloss}</p> : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {reading !== word.surface ? (
          <>
            <dt className="text-ink-faint">읽는 법</dt>
            <dd lang="ja">{reading}</dd>
          </>
        ) : null}
        <dt className="text-ink-faint">기본형</dt>
        <dd lang="ja">{word.base}</dd>
        {word.pos ? (
          <>
            <dt className="text-ink-faint">품사</dt>
            <dd>{posLabel(word.pos)}</dd>
          </>
        ) : null}
      </dl>
      {learnedNo !== null ? (
        <p className="w-fit rounded-full bg-good/15 px-3 py-1 text-sm text-good">
          일무따 {lessonLabel(learnedNo)}에서 배움
        </p>
      ) : null}
      <a
        href={naverDictUrl(word.base)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-fit rounded-xl border border-line px-4 py-2 text-sm hover:bg-bg-raised"
      >
        네이버 사전에서 뜻 보기 ↗
      </a>
    </section>
  );
}
