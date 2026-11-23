// 따라 말하기 간격 동안 틀 무음 WAV. 소리가 나는 동안에는 안드로이드가 화면이 꺼져도
// 페이지를 멈추지 않으므로, setTimeout 대신 무음을 재생해 간격을 잰다.
// 8kHz·8bit·모노라 1초에 8KB.

const RATE = 8000;

export function silenceWav(seconds: number): Uint8Array<ArrayBuffer> {
  const samples = Math.max(1, Math.round(seconds * RATE));
  const buf = new Uint8Array(new ArrayBuffer(44 + samples));
  const view = new DataView(buf.buffer);
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) buf[offset + i] = s.charCodeAt(i);
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt 크기
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 모노
  view.setUint32(24, RATE, true);
  view.setUint32(28, RATE, true); // 초당 바이트
  view.setUint16(32, 1, true); // 블록 크기
  view.setUint16(34, 8, true); // 8bit
  ascii(36, "data");
  view.setUint32(40, samples, true);
  buf.fill(128, 44); // 8bit PCM의 무음은 128
  return buf;
}
