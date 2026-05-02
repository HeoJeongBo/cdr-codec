import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";
import { Twist } from "./twist";

// geometry_msgs/TwistStamped
//   std_msgs/Header header
//   geometry_msgs/Twist twist
export interface TwistStamped {
  header: Header;
  twist: Twist;
}

export const TwistStamped = createCodec<TwistStamped>("geometry_msgs/TwistStamped", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "twist", type: Twist.plan },
  ],
});
