// 강 화면은 단계별 화면이 아니라 이어지는 한 장이다. 지금 읽고 있는 구역(단계 표에 표시할 것)을 정한다.

/**
 * 각 구역 머리의 화면 위치(위에서부터의 거리, 문서 차례)와 기준선(위에 붙은 것 아래쯤)으로
 * 지금 구역의 차례를 정한다. 기준선을 넘어선 마지막 구역, 하나도 없으면 첫 구역.
 * 끝까지 내려 더 굴릴 수 없으면 마지막 구역(짧은 끝 구역도 고를 수 있게).
 */
export function currentSection(
  tops: number[],
  line: number,
  atBottom = false,
): number {
  if (tops.length === 0) return -1;
  if (atBottom) return tops.length - 1;
  let found = 0;
  tops.forEach((top, i) => {
    if (top <= line) found = i;
  });
  return found;
}
