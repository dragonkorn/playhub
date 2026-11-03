/** N16: how long a reveal must be held. */
export const HOLD_MS = 1000;

/** From 0 to 1 while held. `startedAt` is null when not held. */
export const holdProgress = (startedAt: number | null, now: number) => (startedAt === null ? 0 : Math.min(1, (now - startedAt) / HOLD_MS));

export const holdDone = (startedAt: number | null, now: number) => startedAt !== null && now - startedAt >= HOLD_MS;
