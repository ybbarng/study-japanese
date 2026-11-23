import { ROMAJI_TIPS } from "./guides";

/** 로마자로 칠 때 자주 헷갈리는 것 */
export function RomajiTable() {
  return (
    <section className="rounded-2xl bg-bg-raised px-4 py-4">
      <h2 className="text-lg font-medium">로마자로 칠 때 헷갈리는 것</h2>
      <table className="mt-3 w-full text-left">
        <thead className="text-sm text-ink-faint">
          <tr>
            <th className="pb-2 font-normal">글자</th>
            <th className="pb-2 font-normal">치는 법</th>
          </tr>
        </thead>
        <tbody>
          {ROMAJI_TIPS.map((t) => (
            <tr key={t.kana} className="border-t border-line align-top">
              <td
                lang="ja"
                className="py-2 pr-3 font-ja text-2xl whitespace-nowrap"
              >
                {t.kana}
              </td>
              <td className="py-2">
                <span className="font-mono">{t.keys}</span>
                {t.note ? (
                  <span className="block text-sm text-ink-soft">{t.note}</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
