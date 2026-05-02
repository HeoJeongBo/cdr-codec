import { describe, expect, it, vi } from "vitest";
import { type DecodePlan, encodeWithPlan } from "../../decode-plan";
import {
  CdrDispatcher,
  CdrWorkerClient,
  type CdrWorkerLike,
  type CdrWorkerRequest,
  type CdrWorkerResponse,
} from "../index";

const POSE_PLAN: DecodePlan = {
  type: "struct",
  fields: [
    { name: "x", type: { type: "float64" } },
    { name: "y", type: { type: "float64" } },
  ],
};

class FakeWorker implements CdrWorkerLike {
  postMessage = vi.fn<(msg: CdrWorkerRequest, transfer?: Transferable[]) => void>();
  terminate = vi.fn();
  private listeners = new Set<EventListenerOrEventListenerObject>();

  addEventListener(_type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.delete(listener);
  }

  emit(data: CdrWorkerResponse): void {
    const event = { data } as MessageEvent<CdrWorkerResponse>;
    for (const listener of this.listeners) {
      if (typeof listener === "function") {
        (listener as (e: MessageEvent<CdrWorkerResponse>) => void)(event);
      } else {
        listener.handleEvent(event as unknown as Event);
      }
    }
  }
}

class DispatcherBackedWorker implements CdrWorkerLike {
  private readonly dispatcher = new CdrDispatcher();
  private listeners = new Set<EventListenerOrEventListenerObject>();
  postMessage = vi.fn((request: CdrWorkerRequest, _transfer?: Transferable[]): void => {
    const outcome = this.dispatcher.handle(request);
    queueMicrotask(() => {
      const event = { data: outcome.response } as MessageEvent<CdrWorkerResponse>;
      for (const listener of this.listeners) {
        if (typeof listener === "function") {
          (listener as (e: MessageEvent<CdrWorkerResponse>) => void)(event);
        } else {
          listener.handleEvent(event as unknown as Event);
        }
      }
    });
  });
  terminate = vi.fn();
  addEventListener(_type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.add(listener);
  }
  removeEventListener(_type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.delete(listener);
  }
}

describe("CdrWorkerClient end-to-end (dispatcher-backed fake worker)", () => {
  it("preparePlan + decodeWithId + releasePlan + encodeWithId", async () => {
    const worker = new DispatcherBackedWorker();
    const client = new CdrWorkerClient(() => worker);

    const planId = await client.preparePlan(POSE_PLAN);
    expect(planId).toBe(1);

    const buffer = encodeWithPlan(POSE_PLAN, { x: 1, y: 2 });
    const decoded = await client.decodeWithId(planId, buffer);
    expect(decoded).toEqual({ x: 1, y: 2 });

    const encoded = (await client.encodeWithId(planId, { x: 3, y: 4 })) as ArrayBuffer;
    expect(encoded).toBeInstanceOf(ArrayBuffer);

    await client.releasePlan(planId);

    client.dispose();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("decode (inline plan) and encode (inline plan)", async () => {
    const worker = new DispatcherBackedWorker();
    const client = new CdrWorkerClient(() => worker);
    const buffer = encodeWithPlan(POSE_PLAN, { x: 7, y: 8 });
    const decoded = await client.decode(POSE_PLAN, buffer);
    expect(decoded).toEqual({ x: 7, y: 8 });
    const re = (await client.encode(POSE_PLAN, { x: 7, y: 8 })) as ArrayBuffer;
    expect(re).toBeInstanceOf(ArrayBuffer);
    client.dispose();
  });

  it("decode and decodeWithId can opt out of buffer transfer", async () => {
    const worker = new DispatcherBackedWorker();
    const client = new CdrWorkerClient(() => worker);
    const buffer = encodeWithPlan(POSE_PLAN, { x: 1, y: 2 });
    await client.decode(POSE_PLAN, buffer, false);
    expect(worker.postMessage).toHaveBeenLastCalledWith(expect.any(Object));
    const planId = await client.preparePlan(POSE_PLAN);
    await client.decodeWithId(planId, buffer, false);
    expect(worker.postMessage).toHaveBeenLastCalledWith(expect.any(Object));
    client.dispose();
  });

  it("rejects with the error message on dispatcher failure", async () => {
    const worker = new DispatcherBackedWorker();
    const client = new CdrWorkerClient(() => worker);
    await expect(client.decodeWithId(999, new ArrayBuffer(8))).rejects.toThrow(
      /Unknown planId/,
    );
    client.dispose();
  });
});

describe("CdrWorkerClient unit-level (FakeWorker)", () => {
  it("ignores responses with unknown id", async () => {
    const worker = new FakeWorker();
    const client = new CdrWorkerClient(() => worker);
    const promise = client.preparePlan(POSE_PLAN);
    worker.emit({ id: 999, ok: true, result: 42 });
    worker.emit({ id: 1, ok: true, result: 7 });
    await expect(promise).resolves.toBe(7);
    client.dispose();
  });

  it("dispose rejects in-flight calls and is idempotent", async () => {
    const worker = new FakeWorker();
    const client = new CdrWorkerClient(() => worker);
    const inflight = client.preparePlan(POSE_PLAN);
    client.dispose();
    await expect(inflight).rejects.toThrow(/disposed/);
    client.dispose();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("post-dispose calls reject", async () => {
    const worker = new FakeWorker();
    const client = new CdrWorkerClient(() => worker);
    client.dispose();
    await expect(client.preparePlan(POSE_PLAN)).rejects.toThrow(/disposed/);
  });
});
