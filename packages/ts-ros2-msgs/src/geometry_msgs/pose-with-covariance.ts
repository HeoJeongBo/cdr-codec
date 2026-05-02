import { createCodec } from "../shared/codec";
import { Pose } from "./pose";

// geometry_msgs/PoseWithCovariance
//   geometry_msgs/Pose pose
//   float64[36] covariance
export interface PoseWithCovariance {
  pose: Pose;
  covariance: number[];
}

export const PoseWithCovariance = createCodec<PoseWithCovariance>(
  "geometry_msgs/PoseWithCovariance",
  {
    type: "struct",
    fields: [
      { name: "pose", type: Pose.plan },
      {
        name: "covariance",
        type: { type: "fixed-array", length: 36, element: { type: "float64" } },
      },
    ],
  },
);
