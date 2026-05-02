import { Time } from "../builtin_interfaces/time";
import { createCodec } from "../shared/codec";

// std_msgs/Header
//   builtin_interfaces/Time stamp
//   string frame_id
export interface Header {
  stamp: Time;
  frame_id: string;
}

export const Header = createCodec<Header>("std_msgs/Header", {
  type: "struct",
  fields: [
    { name: "stamp", type: Time.plan },
    { name: "frame_id", type: { type: "string" } },
  ],
});
