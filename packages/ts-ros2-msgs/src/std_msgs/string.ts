import { createCodec } from "../shared/codec";

// std_msgs/String
//   string data
export interface StringMsg {
  data: string;
}

export const StringMsg = createCodec<StringMsg>("std_msgs/String", {
  type: "struct",
  fields: [{ name: "data", type: { type: "string" } }],
});
