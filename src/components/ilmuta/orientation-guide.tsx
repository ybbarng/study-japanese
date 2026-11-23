// 0강(오리엔테이션) 화면: 강의 하나뿐이라 비어 보이는 자리에 이 공부의 흐름과 화면 쓰는 법을 짧게.

const FLOW = [
  {
    mark: "耳",
    title: "강의 듣기",
    when: "평일 · 걸으며",
    body: "폰으로 강의를 틀고 걸으며 듣습니다. 끝나면 그 강 예문이 이어서 나와요.",
  },
  {
    mark: "口",
    title: "따라 말하기",
    when: "평일 · 걸으며",
    body: "예문을 듣고 소리 내어 따라 합니다. 녹음해서 원래 소리와 견줘 볼 수도 있어요.",
  },
  {
    mark: "手",
    title: "문장 3개 쓰기",
    when: "주말 · 앉아서",
    body: "그 강 문형으로 내 이야기를 세 문장 씁니다. 주말 첫 화면에 밀린 강이 먼저 떠요.",
  },
];

const HOWTO = [
  {
    title: "재생 막대",
    body: "아래에 뜨는 막대를 누르면 재생 화면이 펼쳐집니다. 다른 화면으로 가도, 화면을 꺼도 계속 나오고 잠금 화면에서 멈추고 넘길 수 있어요.",
  },
  {
    title: "자막 누르면 다시 듣기",
    body: "강의 아래 자막 줄을 누르면 그 자리부터 다시 들려줍니다. 놓친 일본어를 바로 되감을 때 씁니다.",
  },
  {
    title: "받아 두기",
    body: "위 “받기”를 누르면 이 강 소리를 폰에 받아 둡니다. 데이터가 없는 곳에서도 들을 수 있어요.",
  },
  {
    title: "뜻 가리기",
    body: "단어·예문 화면에서 일본어·읽는 법·뜻 단추로 보일 것을 고릅니다. 뜻을 가리고 먼저 떠올려 보세요.",
  },
];

/** 이 공부가 흘러가는 방식과 화면 사용법 */
export function OrientationGuide() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="flow-title">
        <h2 id="flow-title" className="text-sm text-ink-faint">
          한 강은 이렇게 흐릅니다
        </h2>
        <ol className="mt-2 space-y-2">
          {FLOW.map((f, i) => (
            <li
              key={f.title}
              className="flex gap-4 rounded-2xl bg-bg-raised p-4"
            >
              <span
                lang="ja"
                aria-hidden
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/15 font-ja-serif text-2xl text-accent"
              >
                {f.mark}
              </span>
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span className="font-bold">
                    {i + 1}. {f.title}
                  </span>
                  <span className="text-xs text-ink-faint">{f.when}</span>
                </span>
                <span className="mt-1 block text-sm text-ink-soft">
                  {f.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-2xl border border-line px-4 py-3 text-sm text-ink-soft">
          끝까지 들은 강의·예문은 저절로 기록됩니다. 이 들은 기록이 버즈챌린지
          인증 자료가 돼요.
        </p>
      </section>

      <section aria-labelledby="howto-title">
        <h2 id="howto-title" className="text-sm text-ink-faint">
          화면 쓰는 법
        </h2>
        <div className="mt-2 overflow-hidden rounded-2xl bg-bg-raised">
          {HOWTO.map((h, i) => (
            <details
              key={h.title}
              className={i > 0 ? "border-t border-line" : undefined}
            >
              <summary className="cursor-pointer px-4 py-3 font-medium">
                {h.title}
              </summary>
              <p className="px-4 pb-4 text-sm text-ink-soft">{h.body}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
