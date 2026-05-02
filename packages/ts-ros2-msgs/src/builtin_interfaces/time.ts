import { createCodec } from "../shared/codec";

// builtin_interfaces/Time
//   int32 sec
//   uint32 nanosec
export interface Time {
  sec: number;
  nanosec: number;
}

export const Time = createCodec<Time>("builtin_interfaces/Time", {
  type: "struct",
  fields: [
    { name: "sec", type: { type: "int32" } },
    { name: "nanosec", type: { type: "uint32" } },
  ],
});
