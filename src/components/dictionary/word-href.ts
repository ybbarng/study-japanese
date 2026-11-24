/** 낱말 사전 한 낱말의 주소 */
export function wordHref(id: string): string {
  return `/words/${encodeURIComponent(id)}`;
}
