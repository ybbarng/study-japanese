// ffmpeg 없이 만드는 무음 mp3. MPEG-1 Layer III, 32kbps, 44.1kHz, 모노 프레임을 이어 붙인다.
// 프레임 머리 뒤를 0으로 채우면(사이드 정보의 길이가 0) 디코더는 소리 없는 프레임으로 읽는다.

const SAMPLE_RATE = 44_100;
const SAMPLES_PER_FRAME = 1152;
const BITRATE = 32_000;
/** 144 × 비트레이트 ÷ 표본율(패딩 없음) = 104바이트 */
const FRAME_BYTES = Math.floor((144 * BITRATE) / SAMPLE_RATE);
/** 동기 11비트 · MPEG-1 · Layer III · CRC 없음 | 32kbps · 44.1kHz · 패딩 없음 | 모노 */
const HEADER = [0xff, 0xfb, 0x10, 0xc0];

export function silentMp3(seconds: number): Uint8Array {
  const frames = Math.ceil((seconds * SAMPLE_RATE) / SAMPLES_PER_FRAME);
  const out = new Uint8Array(frames * FRAME_BYTES);
  for (let i = 0; i < frames; i++) out.set(HEADER, i * FRAME_BYTES);
  return out;
}
