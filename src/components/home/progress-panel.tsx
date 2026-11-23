import type { MonthQuota } from "@/lib/today/schedule";

interface Props {
  kana: { learned: number; total: number };
  ilmuta: number | null;
  /** 2분기부터 보인다 */
  ilmunta: number | null;
  quota: MonthQuota | null;
  month: number;
}

function Stat({
  label,
  value,
  of,
}: {
  label: string;
  value: number;
  of: string;
}) {
  return (
    <div className="rounded-2xl bg-bg-raised p-3 lg:p-5">
      <span className="block text-xs text-ink-soft lg:text-sm">{label}</span>
      <span className="mt-1 block text-xl font-bold lg:text-3xl">
        {value}
        <span className="text-sm font-normal text-ink-faint"> / {of}</span>
      </span>
    </div>
  );
}

function goalText(q: MonthQuota, month: number): string {
  const book = q.goal.book === "ilmuta" ? "일무따" : "일문따";
  const unit = q.goal.book === "ilmuta" ? "강" : "과";
  const range = `${q.goal.from}~${q.goal.to}${unit}`;
  if (q.remaining === 0)
    return `${month}월 목표 ${book} ${range}을 다 마쳤어요`;
  return `${month}월 목표 ${book} ${range} · 남은 ${q.daysLeft}일, 하루 ${q.perDay}${unit}씩이면 됩니다`;
}

/** 지금 어디까지: 가나 글자, 일무따 강, 일문따 과, 이번 달 목표 */
export function ProgressPanel({ kana, ilmuta, ilmunta, quota, month }: Props) {
  return (
    <section aria-label="지금 어디까지">
      <h2 className="pb-2 text-sm text-ink-faint">지금 어디까지</h2>
      {/* PC: 숫자 칸과 이번 달 목표를 한 줄에 나란히 */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-3">
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
          <Stat label="가나 글자" value={kana.learned} of={`${kana.total}`} />
          {ilmuta !== null ? (
            <Stat label="일무따" value={ilmuta} of="60강" />
          ) : null}
          {ilmunta !== null ? (
            <Stat label="일문따" value={ilmunta} of="56과" />
          ) : null}
        </div>
        {quota ? (
          <div className="mt-2 rounded-2xl bg-bg-raised p-4 lg:mt-0 lg:p-5">
            <p className="text-sm lg:text-base">{goalText(quota, month)}</p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-bg-sunken"
              role="progressbar"
              aria-label="이번 달 목표"
              aria-valuemin={0}
              aria-valuemax={quota.total}
              aria-valuenow={quota.done}
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${Math.round((quota.done / quota.total) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-ink-faint">
              {quota.done} / {quota.total}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
