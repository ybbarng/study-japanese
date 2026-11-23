// 로그인 대입 막기: 사이트 전체에서 짧은 시간에 실패가 몰리면 한동안 모든 로그인 시도를 거절한다.
// 사용자는 한 명이고 로그인 쿠키가 180일 가서, 잠겨도 이미 로그인된 기기는 영향이 없다(proxy는 쿠키만 본다).
// IP로 나누지 않는다: 공격자는 IP를 쉽게 바꾸고, 정상 사용자는 공유 IP 뒤에 있을 수 있다.

export interface LockoutPolicy {
  windowMs: number;
  maxFailures: number;
  lockMs: number;
}

export const DEFAULT_POLICY: LockoutPolicy = {
  windowMs: 60_000,
  maxFailures: 10,
  lockMs: 10 * 60_000,
};

export interface LockoutState {
  failures: number[];
  lockedUntil: number;
}

export function newLockout(): LockoutState {
  return { failures: [], lockedUntil: 0 };
}

/** 지금 잠겨 있으면 풀리는 시각, 아니면 null */
export function lockedUntil(state: LockoutState, now: number): number | null {
  return state.lockedUntil > now ? state.lockedUntil : null;
}

/** 실패 하나를 더한다. 창 안 실패가 상한을 넘으면 잠근다 */
export function recordFailure(
  state: LockoutState,
  now: number,
  policy: LockoutPolicy = DEFAULT_POLICY,
): LockoutState {
  const failures = [
    ...state.failures.filter((t) => now - t < policy.windowMs),
    now,
  ];
  const lock = failures.length > policy.maxFailures;
  return {
    failures: lock ? [] : failures,
    lockedUntil: lock ? now + policy.lockMs : state.lockedUntil,
  };
}

/** 프로세스 하나가 함께 쓰는 상태(서버는 컨테이너 하나). 재시작하면 풀린다 */
let shared = newLockout();

export const loginLockout = {
  lockedUntil: (now: number) => lockedUntil(shared, now),
  fail: (now: number) => {
    shared = recordFailure(shared, now);
  },
  /** 시험용 */
  reset: () => {
    shared = newLockout();
  },
};
