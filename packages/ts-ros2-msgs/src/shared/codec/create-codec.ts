import {
  type DecodePlan,
  decodeWithPlan,
  encodeWithPlan,
  schemaId,
} from "@heojeongbo/cdr-codec";

export interface RosMessageCodec<T> {
  /** Fully qualified ROS message name, e.g. "geometry_msgs/Twist". */
  readonly name: string;
  /** Underlying CDR DecodePlan — usable with `decodeWithPlan` / the worker. */
  readonly plan: DecodePlan;
  /**
   * Deterministic string that uniquely identifies this schema's structure.
   * Use this to verify schema compatibility between publisher and subscriber.
   */
  readonly schemaId: string;
  /** Encode a value to CDR_LE-wrapped bytes. */
  encode(value: T): ArrayBuffer;
  /** Decode CDR-wrapped bytes back to the typed value. */
  decode(buffer: ArrayBufferView): T;
}

/**
 * Build a typed codec for a ROS 2 message. The returned object is just a value
 * created in your code — it is not registered with the library, so you can
 * define any number of custom messages without touching this package.
 *
 * @example Composing a custom message that reuses a built-in:
 * ```ts
 * import { createCodec } from "@heojeongbo/ts-ros2-msgs";
 * import { Header } from "@heojeongbo/ts-ros2-msgs/std_msgs";
 *
 * interface RobotStatus {
 *   header: Header;
 *   battery_pct: number;
 * }
 *
 * export const RobotStatus = createCodec<RobotStatus>("my_pkg/RobotStatus", {
 *   type: "struct",
 *   fields: [
 *     { name: "header", type: Header.plan },
 *     { name: "battery_pct", type: { type: "float32" } },
 *   ],
 * });
 * ```
 *
 * @example A standalone custom message with no built-in references:
 * ```ts
 * interface MotorState { name: string; target_position: number }
 * interface MotorCmd { motors: MotorState[]; emergency_stop: boolean }
 *
 * export const MotorCmd = createCodec<MotorCmd>("my_pkg/MotorCmd", {
 *   type: "struct",
 *   fields: [
 *     {
 *       name: "motors",
 *       type: {
 *         type: "sequence",
 *         element: {
 *           type: "struct",
 *           fields: [
 *             { name: "name", type: { type: "string" } },
 *             { name: "target_position", type: { type: "float64" } },
 *           ],
 *         },
 *       },
 *     },
 *     { name: "emergency_stop", type: { type: "boolean" } },
 *   ],
 * });
 * ```
 */
export function createCodec<T>(name: string, plan: DecodePlan): RosMessageCodec<T> {
  return {
    name,
    plan,
    schemaId: schemaId(plan),
    encode: (value) => encodeWithPlan(plan, value),
    decode: (buffer) => decodeWithPlan(plan, buffer) as T,
  };
}
