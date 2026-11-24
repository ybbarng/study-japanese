import { type CacheLike, type Inspection, inspectFiles } from "./download";
import { type FileKind, type OfflinePack, packFiles } from "./pack";

// 묶음 하나가 폰에 얼마나 남아 있는지: 강 화면·오디오·자막·그림을 갈래별 캐시에서 센다.

/**
 * 갈래별 캐시에서 묶음의 파일을 센다. 서버가 자막·그림까지 채우지 않은 묶음(full이 아님)은
 * 아직 모르는 파일이 남았으므로 하나를 덜 받은 것으로 센다. 예전에 오디오만 받아 둔 강이
 * "일부만 받음 · 이어 받기"로 보여 자막·그림을 마저 받게 한다.
 */
export async function inspectPack(
  pack: OfflinePack,
  cacheOf: (kind: FileKind) => Promise<CacheLike>,
): Promise<PackInspection> {
  let present = 0;
  let total = 0;
  let bytes = 0;
  let audioPresent = 0;
  for (const group of packFiles(pack)) {
    if (group.urls.length === 0) continue;
    const seen = await inspectFiles(group.urls, await cacheOf(group.kind));
    present += seen.present;
    total += seen.total;
    bytes += seen.bytes;
    if (group.kind === "audio") audioPresent = seen.present;
  }
  if (!pack.full) total += 1;
  return { present, total, bytes, audioPresent };
}

export interface PackInspection extends Inspection {
  /**
   * 받아 둔 오디오 수. 화면·그림은 둘러보기만 해도 service worker가 캐시에 담으므로,
   * 받은 적이 있는지는 오디오로 본다(0이면 "받기")
   */
  audioPresent: number;
}

/** 상태를 볼 묶음: 서버가 다 채워 저장해 둔 묶음이 있으면 그것, 없으면 화면이 만든 묶음 */
export function effectivePack(
  pack: OfflinePack,
  saved: OfflinePack | undefined,
): OfflinePack {
  return saved?.full ? saved : pack;
}
