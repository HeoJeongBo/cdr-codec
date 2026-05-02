import { PoseWithCovariance } from "../geometry_msgs/pose-with-covariance";
import { TwistWithCovariance } from "../geometry_msgs/twist-with-covariance";
import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";

// nav_msgs/Odometry
//   std_msgs/Header header
//   string child_frame_id
//   geometry_msgs/PoseWithCovariance pose
//   geometry_msgs/TwistWithCovariance twist
export interface Odometry {
  header: Header;
  child_frame_id: string;
  pose: PoseWithCovariance;
  twist: TwistWithCovariance;
}

export const Odometry = createCodec<Odometry>("nav_msgs/Odometry", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "child_frame_id", type: { type: "string" } },
    { name: "pose", type: PoseWithCovariance.plan },
    { name: "twist", type: TwistWithCovariance.plan },
  ],
});
