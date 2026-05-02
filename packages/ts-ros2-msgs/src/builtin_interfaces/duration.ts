import { createCodec } from "../shared/codec";

// builtin_interfaces/Duration
//   int32 sec
//   uint32 nanosec
export interface Duration {
  sec: number;
  nanosec: number;
}

export const Duration = createCodec<Duration>("builtin_interfaces/Duration", {
  type: "struct",
  fields: [
    { name: "sec", type: { type: "int32" } },
    { name: "nanosec", type: { type: "uint32" } },
  ],
});
