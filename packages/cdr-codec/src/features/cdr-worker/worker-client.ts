import type { DecodePlan } from "../decode-plan";
import type { CdrWorkerRequest, CdrWorkerResponse } from "./protocol";

export interface CdrWorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  addEventListener(type: "message", listener: EventListenerOrEventListenerObject): void;
  removeEventListener(
    type: "message",
    listener: EventListenerOrEventListenerObject,
  ): void;
}

export type CdrWorkerFactory = () => CdrWorkerLike;

interface PendingCall {
  readonly resolve: (value: unknown) => void;
  readonly reject: (err: Error) => void;
}

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

type CdrWorkerRequestBody = DistributiveOmit<CdrWorkerRequest, "id">;

export class CdrWorkerClient {
  private readonly worker: CdrWorkerLike;
  private readonly pending = new Map<number, PendingCall>();
  private readonly listener: (event: MessageEvent<CdrWorkerResponse>) => void;
  private nextId = 1;
  private disposed = false;

  constructor(workerFactory: CdrWorkerFactory) {
    this.worker = workerFactory();
    this.listener = (event: MessageEvent<CdrWorkerResponse>) => {
      this.handleResponse(event.data);
    };
    this.worker.addEventListener(
      "message",
      this.listener as EventListenerOrEventListenerObject,
    );
  }

  preparePlan(plan: DecodePlan): Promise<number> {
    return this.send({ type: "prepare", plan }) as Promise<number>;
  }

  releasePlan(planId: number): Promise<void> {
    return this.send({ type: "release", planId }).then(() => undefined);
  }

  decode(plan: DecodePlan, buffer: ArrayBuffer, transferBuffer = true): Promise<unknown> {
    return this.send(
      { type: "decodeWithPlan", plan, buffer },
      transferBuffer ? [buffer] : undefined,
    );
  }

  decodeWithId(
    planId: number,
    buffer: ArrayBuffer,
    transferBuffer = true,
  ): Promise<unknown> {
    return this.send(
      { type: "decodeWithId", planId, buffer },
      transferBuffer ? [buffer] : undefined,
    );
  }

  encode(plan: DecodePlan, value: unknown): Promise<ArrayBuffer> {
    return this.send({ type: "encodeWithPlan", plan, value }) as Promise<ArrayBuffer>;
  }

  encodeWithId(planId: number, value: unknown): Promise<ArrayBuffer> {
    return this.send({ type: "encodeWithId", planId, value }) as Promise<ArrayBuffer>;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.worker.removeEventListener(
      "message",
      this.listener as EventListenerOrEventListenerObject,
    );
    for (const pending of this.pending.values()) {
      pending.reject(new Error("CdrWorkerClient disposed"));
    }
    this.pending.clear();
    this.worker.terminate();
  }

  private handleResponse(msg: CdrWorkerResponse): void {
    const pending = this.pending.get(msg.id);
    if (!pending) {
      return;
    }
    this.pending.delete(msg.id);
    if (msg.ok) {
      pending.resolve(msg.result);
    } else {
      pending.reject(new Error(msg.error));
    }
  }

  private send(
    request: CdrWorkerRequestBody,
    transfer?: ArrayBuffer[],
  ): Promise<unknown> {
    if (this.disposed) {
      return Promise.reject(new Error("CdrWorkerClient disposed"));
    }
    const id = this.nextId++;
    const full = { ...request, id } as CdrWorkerRequest;
    return new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      if (transfer && transfer.length > 0) {
        this.worker.postMessage(full, transfer);
      } else {
        this.worker.postMessage(full);
      }
    });
  }
}
