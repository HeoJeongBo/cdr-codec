import { type DecodePlan, decodeWithPlan, encodeWithPlan } from "../decode-plan";
import type { CdrWorkerOutcome, CdrWorkerRequest, CdrWorkerResponse } from "./protocol";

export class CdrDispatcher {
  private readonly plans = new Map<number, DecodePlan>();
  private nextPlanId = 1;

  handle(req: CdrWorkerRequest): CdrWorkerOutcome {
    try {
      switch (req.type) {
        case "prepare":
          return this.prepare(req.id, req.plan);
        case "release":
          return this.release(req.id, req.planId);
        case "decodeWithPlan":
          return this.decode(req.id, req.plan, req.buffer);
        case "decodeWithId":
          return this.decode(req.id, this.requirePlan(req.planId), req.buffer);
        case "encodeWithPlan":
          return this.encode(req.id, req.plan, req.value);
        case "encodeWithId":
          return this.encode(req.id, this.requirePlan(req.planId), req.value);
        case "dispose":
          this.plans.clear();
          return { response: { id: req.id, ok: true } };
      }
    } catch (err) {
      return { response: errorResponse(req.id, err) };
    }
  }

  private prepare(id: number, plan: DecodePlan): CdrWorkerOutcome {
    const planId = this.nextPlanId++;
    this.plans.set(planId, plan);
    return { response: { id, ok: true, result: planId } };
  }

  private release(id: number, planId: number): CdrWorkerOutcome {
    this.plans.delete(planId);
    return { response: { id, ok: true } };
  }

  private decode(id: number, plan: DecodePlan, buffer: ArrayBuffer): CdrWorkerOutcome {
    const result = decodeWithPlan(plan, new Uint8Array(buffer));
    return { response: { id, ok: true, result } };
  }

  private encode(id: number, plan: DecodePlan, value: unknown): CdrWorkerOutcome {
    const buffer = encodeWithPlan(plan, value);
    return {
      response: { id, ok: true, result: buffer },
      transfer: [buffer],
    };
  }

  private requirePlan(planId: number): DecodePlan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Unknown planId: ${planId}`);
    }
    return plan;
  }
}

function errorResponse(id: number, err: unknown): CdrWorkerResponse {
  const message = err instanceof Error ? err.message : String(err);
  return { id, ok: false, error: message };
}
