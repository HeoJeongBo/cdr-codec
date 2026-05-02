import { afterEach, describe, expect, it, vi } from "vitest";
import { currentBagTime, delayMsFor, sleepWithAbort, startTimeline } from "../timeline";

describe("startTimeline", () => {
  it("captures wall start, bag start, and speed", () => {
    const now = () => 1_000;
    const t = startTimeline(500_000_000n, 2, now);
    expect(t).toEqual({ wallStartMs: 1_000, bagStartNs: 500_000_000n, speed: 2 });
  });
});

describe("delayMsFor", () => {
  it("returns time until a future bag instant at 1× speed", () => {
    const wallNow = { value: 0 };
    const t = startTimeline(0n, 1, () => wallNow.value);
    // bagTime 100ms (= 100_000_000 ns) in the future, no wall elapsed
    expect(delayMsFor(t, 100_000_000n, () => 0)).toBe(100);
  });

  it("scales delay by speed (2× speed halves the wait)", () => {
    const t = startTimeline(0n, 2, () => 0);
    expect(delayMsFor(t, 100_000_000n, () => 0)).toBe(50);
  });

  it("0.5× speed doubles the wait", () => {
    const t = startTimeline(0n, 0.5, () => 0);
    expect(delayMsFor(t, 100_000_000n, () => 0)).toBe(200);
  });

  it("clamps negative delays to 0 (event already due)", () => {
    const t = startTimeline(0n, 1, () => 0);
    // bagTime in the past relative to wall: +100ms wall, but 0 bag elapsed asked
    expect(delayMsFor(t, 0n, () => 100)).toBe(0);
  });

  it("subtracts elapsed wall time", () => {
    const t = startTimeline(0n, 1, () => 0);
    // 100ms bag target, but 30ms wall already elapsed → 70ms remaining
    expect(delayMsFor(t, 100_000_000n, () => 30)).toBe(70);
  });
});

describe("currentBagTime", () => {
  it("returns bagStartNs when no wall time has elapsed", () => {
    const t = startTimeline(1_000n, 1, () => 0);
    expect(currentBagTime(t, () => 0)).toBe(1_000n);
  });

  it("advances bag time linearly with wall at 1× speed", () => {
    const t = startTimeline(0n, 1, () => 0);
    // 50ms wall elapsed = 50_000_000ns bag elapsed
    expect(currentBagTime(t, () => 50)).toBe(50_000_000n);
  });

  it("advances bag time twice as fast at 2× speed", () => {
    const t = startTimeline(0n, 2, () => 0);
    expect(currentBagTime(t, () => 50)).toBe(100_000_000n);
  });
});

describe("sleepWithAbort", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves after the requested duration when not aborted", async () => {
    vi.useFakeTimers();
    const ctrl = new AbortController();
    const promise = sleepWithAbort(100, ctrl.signal);
    let resolved = false;
    promise.then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(50);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(60);
    expect(resolved).toBe(true);
  });

  it("rejects immediately if the signal is already aborted", async () => {
    const ctrl = new AbortController();
    ctrl.abort(new Error("already done"));
    await expect(sleepWithAbort(100, ctrl.signal)).rejects.toThrow("already done");
  });

  it("rejects when the signal fires during the sleep", async () => {
    const ctrl = new AbortController();
    const promise = sleepWithAbort(100, ctrl.signal);
    const assertion = expect(promise).rejects.toThrow("paused");
    ctrl.abort(new Error("paused"));
    await assertion;
  });
});
