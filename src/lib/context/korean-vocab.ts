// 사람이 쓴 바른 한국어 글(소책자 뜻·낱말 뜻)에 어떤 말이 나오는지 묻는 작은 낱말장. 화면을 모르는 순수 함수다.
// 같은 뜻을 두 번 받아 적은 글이 낱말 하나만 다를 때, 한쪽만 바른 글에 나오면 그쪽이 맞춤법에 맞는 말이다
// (점심/잠심). 받아쓰기는 같은 오타를 되풀이하므로 자막 글은 재료로 쓰지 않는다.

export interface KoreanVocab {
  /** 바른 글에 이 말이 낱말 머리로 나오나(띄어쓰기는 무시하지 않는다) */
  has(word: string): boolean;
}

/** 견줄 꼴: 괄호 설명과 부호를 빼고 띄어쓰기는 하나로 */
function vocabForm(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\([^)]*\)/gu, " ")
    .replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ0-9\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function buildKoreanVocab(lines: Iterable<string>): KoreanVocab {
  const text = ` ${[...lines].map(vocabForm).join(" \n ")} `;
  return {
    has(word: string) {
      const w = vocabForm(word);
      return w !== "" && text.includes(` ${w}`);
    },
  };
}
