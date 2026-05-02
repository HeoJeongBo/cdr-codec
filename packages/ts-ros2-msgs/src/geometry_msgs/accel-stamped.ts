import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";
import { Accel } from "./accel";

// geometry_msgs/AccelStamped
//   std_msgs/Header header
//   geometry_msgs/Accel accel
export interface AccelStamped {
  header: Header;
  accel: Accel;
}

export const AccelStamped = createCodec<AccelStamped>("geometry_msgs/AccelStamped", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "accel", type: Accel.plan },
  ],
});
