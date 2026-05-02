import type { DecodePlan } from "../decode-plan";

export type CdrWorkerRequest =
  | { readonly id: number; readonly type: "prepare"; readonly plan: DecodePlan }
  | { readonly id: number; readonly type: "release"; readonly planId: number }
  | {
      readonly id: number;
      readonly type: "decodeWithPlan";
      readonly plan: DecodePlan;
      readonly buffer: ArrayBuffer;
    }
  | {
      readonly id: number;
      readonly type: "decodeWithId";
      readonly planId: number;
      readonly buffer: ArrayBuffer;
    }
  | {
      readonly id: number;
      readonly type: "encodeWithPlan";
      readonly plan: DecodePlan;
      readonly value: unknown;
    }
  | {
      readonly id: number;
      readonly type: "encodeWithId";
      readonly planId: number;
      readonly value: unknown;
    }
  | { readonly id: number; readonly type: "dispose" };

export type CdrWorkerResponse =
  | { readonly id: number; readonly ok: true; readonly result?: unknown }
  | { readonly id: number; readonly ok: false; readonly error: string };

export interface CdrWorkerOutcome {
  readonly response: CdrWorkerResponse;
  readonly transfer?: readonly ArrayBuffer[];
}
