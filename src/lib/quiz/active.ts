// 화면에 확인 문제 묶음이 여럿일 때 숫자 키·Enter를 받을 묶음 하나를 고른다(DOM을 모르는 순수 함수).

export interface QuizBox {
  top: number;
  bottom: number;
  /** 초점이 이 묶음 안에 있다 */
  focused: boolean;
  /** 아직 풀 문제가 남았다 */
  open: boolean;
}

/**
 * 초점이 든 묶음이 있으면 그것, 없으면 화면에 보이는(위에 붙은 재생기 아래 띠와 겹치는) 풀 문제가 남은
 * 묶음 가운데 맨 위의 것. 없으면 -1
 */
export function activeQuiz(
  boxes: readonly QuizBox[],
  view: { height: number; coveredTop: number },
): number {
  const focused = boxes.findIndex((b) => b.focused);
  if (focused >= 0) return focused;
  return boxes.findIndex(
    (b) =>
      b.open && b.bottom > view.coveredTop + 24 && b.top < view.height - 24,
  );
}
