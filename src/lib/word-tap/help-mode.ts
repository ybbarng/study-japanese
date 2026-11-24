// 글자 도움(글자 하나씩 종류·소리·한글 근사치)을 처음부터 펼쳐 둘지, 눌러야 보이게 둘지.
//
// 기준(2027 일정과 가나 레슨을 보고 정했다):
// - 1월에 일무따 0~18강을 하므로 하루 0.6강꼴이다. 5강까지가 첫 열흘 남짓이다.
// - 가나 레슨은 히라가나 9개·가타카나 9개, 하루 한두 개면 첫 열흘 안팎에 끝난다.
//   그 사이(1~5강)에는 글자를 아직 다 못 읽으므로 언제나 펼친다.
// - 6~10강은 가나 레슨을 다 끝냈으면 접고, 덜 끝냈으면 펼친다(가나가 늦어진 사람을 받친다).
// - 11강부터는 접는다. 누르면 언제든 볼 수 있다.

export type HelpMode = "open" | "tap";

/** 이 강까지는 언제나 펼친다 */
export const ALWAYS_OPEN_UNTIL = 5;
/** 이 강까지는 가나 레슨을 다 끝내지 않았으면 펼친다 */
export const OPEN_WHILE_KANA_UNTIL = 10;

/**
 * @param lessonNo 일무따 강 번호
 * @param kanaDone 가나 레슨을 모두 끝냈는지(기기 기록을 아직 못 읽었으면 false로 본다)
 */
export function charHelpMode(lessonNo: number, kanaDone: boolean): HelpMode {
  if (lessonNo <= ALWAYS_OPEN_UNTIL) return "open";
  if (lessonNo <= OPEN_WHILE_KANA_UNTIL && !kanaDone) return "open";
  return "tap";
}
