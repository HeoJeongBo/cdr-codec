/**
 * Wall-clock timeline math for replaying a bag at a chosen speed.
 *
 * A `Timeline` snapshots the moment playback was anchored: when wall-clock
 * `wallStartMs` happened, the bag clock was at `bagStartNs`. Speed is the
 * playback multiplier (1.0 = real-time, 2.0 = 2× faster, 0.5 = half speed).
 *
 * `delayMsFor` answers "how long do I sleep before this `bagTime` should fire?"
 * `currentBagTime` is the inverse — "right now (wall), where are we in the bag?"
 *
 * Pure functions; pass a `now` clock to make tests deterministic.
 */

export interface Timeline {
  readonly wallStartMs: number;
  readonly bagStartNs: bigint;
  readonly speed: number;
}

export function startTimeline(
  bagStartNs: bigint,
  speed: number,
  now: () => number = Date.now,
): Timeline {
  return { wallStartMs: now(), bagStartNs, speed };
}

export function delayMsFor(
  timeline: Timeline,
  bagTime: bigint,
  now: () => number = Date.now,
): number {
  const elapsedBagMs = Number(bagTime - timeline.bagStartNs) / 1_000_000 / timeline.speed;
  const targetWallMs = timeline.wallStartMs + elapsedBagMs;
  const delay = targetWallMs - now();
  return delay > 0 ? delay : 0;
}

export function currentBagTime(timeline: Timeline, now: () => number = Date.now): bigint {
  const elapsedWallMs = now() - timeline.wallStartMs;
  const elapsedBagNs = BigInt(Math.floor(elapsedWallMs * timeline.speed * 1_000_000));
  return timeline.bagStartNs + elapsedBagNs;
}

/**
 * Sleep for `ms` milliseconds, but reject with the signal's reason if the
 * `AbortSignal` fires first. Used to make the playback loop interruptible by
 * pause / seek / dispose.
 */
export function sleepWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new Error("aborted"));
      return;
    }
    const onAbort = () => {
      clearTimeout(id);
      reject(signal.reason ?? new Error("aborted"));
    };
    const id = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
