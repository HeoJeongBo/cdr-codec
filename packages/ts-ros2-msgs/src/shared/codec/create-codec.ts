import { type DecodePlan, decodeWithPlan, encodeWithPlan } from "@heojeongbo/cdr-codec";

export interface RosMessageCodec<T> {
  /** Fully qualified ROS message name, e.g. "geometry_msgs/Twist". */
  readonly name: string;
  /** Underlying CDR DecodePlan — usable with `decodeWithPlan` / the worker. */
  readonly plan: DecodePlan;
  /** Encode a value to CDR_LE-wrapped bytes. */
  encode(value: T): ArrayBuffer;
  /** Decode CDR-wrapped bytes back to the typed value. */
  decode(buffer: ArrayBufferView): T;
}

export function createCodec<T>(name: string, plan: DecodePlan): RosMessageCodec<T> {
  return {
    name,
    plan,
    encode: (value) => encodeWithPlan(plan, value),
    decode: (buffer) => decodeWithPlan(plan, buffer) as T,
  };
}
