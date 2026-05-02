import { Time } from "../builtin_interfaces/time";
import { createCodec } from "../shared/codec";

// rosgraph_msgs/Clock
//   builtin_interfaces/Time clock
export interface Clock {
  clock: Time;
}

export const Clock = createCodec<Clock>("rosgraph_msgs/Clock", {
  type: "struct",
  fields: [{ name: "clock", type: Time.plan }],
});
