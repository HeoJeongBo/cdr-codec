import { describe, expect, it } from "vitest";
import { type DecodePlan, encodeWithPlan } from "../../decode-plan";
import { CdrDispatcher } from "../index";

const POSE_PLAN: DecodePlan = {
  type: "struct",
  fields: [
    { name: "x", type: { type: "float64" } },
    { name: "y", type: { type: "float64" } },
  ],
};

describe("CdrDispatcher", () => {
  it("decodeWithPlan returns parsed result", () => {
    const dispatcher = new CdrDispatcher();
    const buffer = encodeWithPlan(POSE_PLAN, { x: 1, y: 2 });
    const outcome = dispatcher.handle({
      id: 1,
      type: "decodeWithPlan",
      plan: POSE_PLAN,
      buffer,
    });
    expect(outcome.response).toMatchObject({
      id: 1,
      ok: true,
      result: { x: 1, y: 2 },
    });
  });

  it("encodeWithPlan returns ArrayBuffer with transfer", () => {
    const dispatcher = new CdrDispatcher();
    const outcome = dispatcher.handle({
      id: 2,
      type: "encodeWithPlan",
      plan: POSE_PLAN,
      value: { x: 1, y: 2 },
    });
    expect(outcome.response.ok).toBe(true);
    const buffer = (outcome.response as { result: ArrayBuffer }).result;
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(outcome.transfer).toEqual([buffer]);
  });

  it("prepare → decodeWithId → release lifecycle", () => {
    const dispatcher = new CdrDispatcher();
    const prepared = dispatcher.handle({ id: 1, type: "prepare", plan: POSE_PLAN });
    expect(prepared.response.ok).toBe(true);
    const planId = (prepared.response as { result: number }).result;

    const buffer = encodeWithPlan(POSE_PLAN, { x: 3, y: 4 });
    const decoded = dispatcher.handle({
      id: 2,
      type: "decodeWithId",
      planId,
      buffer,
    });
    expect(decoded.response).toMatchObject({
      ok: true,
      result: { x: 3, y: 4 },
    });

    const released = dispatcher.handle({ id: 3, type: "release", planId });
    expect(released.response).toEqual({ id: 3, ok: true });

    const stale = dispatcher.handle({
      id: 4,
      type: "decodeWithId",
      planId,
      buffer: encodeWithPlan(POSE_PLAN, { x: 0, y: 0 }),
    });
    expect(stale.response).toMatchObject({
      ok: false,
      error: expect.stringContaining("Unknown planId"),
    });
  });

  it("encodeWithId reuses prepared plan", () => {
    const dispatcher = new CdrDispatcher();
    const prepared = dispatcher.handle({ id: 1, type: "prepare", plan: POSE_PLAN });
    const planId = (prepared.response as { result: number }).result;
    const outcome = dispatcher.handle({
      id: 2,
      type: "encodeWithId",
      planId,
      value: { x: 5, y: 6 },
    });
    expect(outcome.response.ok).toBe(true);
    expect(outcome.transfer).toBeDefined();
  });

  it("encodeWithId fails for unknown planId", () => {
    const dispatcher = new CdrDispatcher();
    const outcome = dispatcher.handle({
      id: 1,
      type: "encodeWithId",
      planId: 999,
      value: { x: 0, y: 0 },
    });
    expect(outcome.response).toMatchObject({
      ok: false,
      error: expect.stringContaining("Unknown planId"),
    });
  });

  it("dispose clears all plans", () => {
    const dispatcher = new CdrDispatcher();
    const prepared = dispatcher.handle({ id: 1, type: "prepare", plan: POSE_PLAN });
    const planId = (prepared.response as { result: number }).result;
    const disposed = dispatcher.handle({ id: 2, type: "dispose" });
    expect(disposed.response).toEqual({ id: 2, ok: true });
    const stale = dispatcher.handle({
      id: 3,
      type: "decodeWithId",
      planId,
      buffer: encodeWithPlan(POSE_PLAN, { x: 0, y: 0 }),
    });
    expect(stale.response).toMatchObject({ ok: false });
  });

  it("captures Error.message from internal failures", () => {
    const dispatcher = new CdrDispatcher();
    const tooSmall = new ArrayBuffer(2);
    const outcome = dispatcher.handle({
      id: 1,
      type: "decodeWithPlan",
      plan: POSE_PLAN,
      buffer: tooSmall,
    });
    expect(outcome.response).toMatchObject({
      ok: false,
      error: expect.stringContaining("too small"),
    });
  });

  it("error path stringifies non-Error throws", () => {
    const dispatcher = new CdrDispatcher();
    const proto = Object.getPrototypeOf(dispatcher) as {
      [k: string]: (...args: unknown[]) => unknown;
    };
    const orig = proto.requirePlan;
    proto.requirePlan = () => {
      throw "string-error";
    };
    try {
      const outcome = dispatcher.handle({
        id: 1,
        type: "decodeWithId",
        planId: 1,
        buffer: new ArrayBuffer(8),
      });
      expect(outcome.response).toMatchObject({ ok: false, error: "string-error" });
    } finally {
      proto.requirePlan = orig;
    }
  });
});
