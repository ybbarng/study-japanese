// 문장을 낱말 조각으로 그릴 때, 닫는 문장부호(。、！？」 등)가 줄 머리에 혼자 떨어지지 않게
// 바로 앞 조각과 한 묶음으로 둔다(일본어 줄바꿈 규칙: 닫는 부호는 줄 머리에 두지 않는다).

const CLOSING = /^[、。，．！？!?」』）)】〕…ー～〜]+$/;

/** 조각 차례를 묶음으로 나눈다. 닫는 문장부호 조각은 앞 묶음에 붙는다 */
export function glueGroups(tokens: readonly { surface: string }[]): number[][] {
  const groups: number[][] = [];
  tokens.forEach((t, i) => {
    const last = groups[groups.length - 1];
    if (last && CLOSING.test(t.surface)) last.push(i);
    else groups.push([i]);
  });
  return groups;
}
