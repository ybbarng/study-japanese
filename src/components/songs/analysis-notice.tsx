interface Props {
  slug: string;
  isAdmin: boolean;
  analyzed: boolean;
  /** 가사가 바뀌어 분석과 맞지 않는 줄 수 */
  staleCount: number;
  /** 분석 파일이 있는데 모양이 틀림 */
  broken: boolean;
}

const box = "rounded-2xl border border-line px-4 py-3 text-sm leading-relaxed";

/**
 * 분석 상태 안내. 분석 전이면 누구에게나 알리고, 관리자에게는 무엇을 하면 되는지 알린다.
 * 가사가 바뀌어 다시 분석할 줄이나 깨진 분석 파일은 관리자에게만 보인다.
 */
export function AnalysisNotice({
  slug,
  isAdmin,
  analyzed,
  staleCount,
  broken,
}: Props) {
  if (broken && isAdmin)
    return (
      <p role="note" className={`${box} border-warn/40 text-warn`}>
        분석 파일(content/songs/{slug}.json)의 모양이 맞지 않아 쓰지 않았습니다.
        세션에서 <code>pnpm songs:check {slug}</code>로 확인하세요.
      </p>
    );
  if (!analyzed)
    return (
      <div role="note" className={`${box} text-ink-soft`}>
        <p>
          아직 분석 전입니다. 분석을 마치면 읽는 법·낱말 뜻·문법 메모가
          나옵니다.
        </p>
        {isAdmin ? (
          <p className="mt-1 text-ink-faint">
            세션에 "이 노래 분석해 줘"라고 하면 됩니다(노래 주소 이름 {slug}).
          </p>
        ) : null}
      </div>
    );
  if (staleCount > 0 && isAdmin)
    return (
      <p role="note" className={`${box} border-warn/40 text-warn`}>
        가사가 바뀌어 {staleCount}줄은 다시 분석해야 합니다. 세션에 "이 노래
        다시 분석해 줘"라고 하면 됩니다.
      </p>
    );
  return null;
}
