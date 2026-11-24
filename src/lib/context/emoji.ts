import { ACTION_EMOJI } from "./pictures/emoji-actions";
import { FOOD_EMOJI } from "./pictures/emoji-food";
import { NATURE_EMOJI } from "./pictures/emoji-nature";
import { PEOPLE_EMOJI } from "./pictures/emoji-people";
import { PLACE_EMOJI } from "./pictures/emoji-places";
import { THING_EMOJI } from "./pictures/emoji-things";

/**
 * 낱말 카드에 붙일 그림 문자. 세션이 직접 지은 표다(낱말 하나와 그림 문자 하나만, 교재 글은 옮기지 않음).
 * 표는 분야마다 `pictures/emoji-*.ts`에 나눠 두고 여기서 합친다.
 *
 * - 키는 낱말의 기본형(사전형). 카드 낱말의 `ja`와 그대로 맞춘다.
 * - 그림만 봐도 뜻이 바로 떠오르는 구체적인 낱말(음식·동물·탈것·날씨·장소·사람·물건·몸·때·느낌·색)만 넣는다.
 *   추상어·문법어·인사말, 뜻이 둘 이상이라 그림이 한쪽만 보이는 낱말(高い·うまい·背 등)은 넣지 않는다.
 * - 나라 이름은 넣지 않는다(윈도에서 국기 그림 문자가 글자 두 개로 보인다).
 * - 다른 낱말 속에 자주 끼는 한 글자(人·日·子·方·うち·目·火·木·足·口·水·月 등)는 낱말 찾기가 잘못 걸릴 때
 *   그림이 뜻을 더 헷갈리게 해서 넣지 않는다.
 */
export const EMOJI: Readonly<Record<string, string>> = {
  ...PEOPLE_EMOJI,
  ...FOOD_EMOJI,
  ...NATURE_EMOJI,
  ...PLACE_EMOJI,
  ...THING_EMOJI,
  ...ACTION_EMOJI,
};

/** 분야별 표(같은 낱말이 두 표에 들어가지 않았는지 시험이 본다) */
export const EMOJI_TABLES: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  people: PEOPLE_EMOJI,
  food: FOOD_EMOJI,
  nature: NATURE_EMOJI,
  places: PLACE_EMOJI,
  things: THING_EMOJI,
  actions: ACTION_EMOJI,
};

/**
 * 표에서 찾아볼 낱말 꼴: 그대로, 그리고 `勉強する`→`勉強`, `静かな`→`静か`처럼 뒤를 뗀 꼴.
 * 뗀 앞부분이 한 글자면 찾지 않는다(`好きな`는 `好き`로 찾지만 `する` 같은 짧은 말은 그대로 둔다).
 */
export function lookupForms(ja: string): string[] {
  const word = ja.trim().replace(/[。、！？!?.,\s]+$/u, "");
  const forms = [word];
  for (const tail of ["する", "な"])
    if (word.endsWith(tail) && [...word].length - tail.length >= 2)
      forms.push(word.slice(0, -tail.length));
  return forms;
}

function pick(table: Readonly<Record<string, string>>, ja: string) {
  for (const form of lookupForms(ja))
    if (Object.hasOwn(table, form)) return table[form];
  return undefined;
}

/** 낱말의 그림 문자. 표에 없으면 undefined */
export function emojiOf(ja: string): string | undefined {
  return pick(EMOJI, ja);
}
