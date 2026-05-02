import { createCodec } from "../shared/codec";
import { Point } from "./point";
import { Quaternion } from "./quaternion";

// geometry_msgs/Pose
//   geometry_msgs/Point position
//   geometry_msgs/Quaternion orientation
export interface Pose {
  position: Point;
  orientation: Quaternion;
}

export const Pose = createCodec<Pose>("geometry_msgs/Pose", {
  type: "struct",
  fields: [
    { name: "position", type: Point.plan },
    { name: "orientation", type: Quaternion.plan },
  ],
});
