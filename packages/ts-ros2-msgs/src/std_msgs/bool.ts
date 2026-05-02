import { createCodec } from "../shared/codec";

// std_msgs/Bool
//   bool data
export interface BoolMsg {
  data: boolean;
}

export const BoolMsg = createCodec<BoolMsg>("std_msgs/Bool", {
  type: "struct",
  fields: [{ name: "data", type: { type: "boolean" } }],
});
