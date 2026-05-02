import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";
import { Pose } from "./pose";

// geometry_msgs/PoseStamped
//   std_msgs/Header header
//   geometry_msgs/Pose pose
export interface PoseStamped {
  header: Header;
  pose: Pose;
}

export const PoseStamped = createCodec<PoseStamped>("geometry_msgs/PoseStamped", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "pose", type: Pose.plan },
  ],
});
