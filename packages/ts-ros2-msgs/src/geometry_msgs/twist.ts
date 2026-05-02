import { createCodec } from "../shared/codec";
import { Vector3 } from "./vector3";

// geometry_msgs/Twist
//   geometry_msgs/Vector3 linear
//   geometry_msgs/Vector3 angular
export interface Twist {
  linear: Vector3;
  angular: Vector3;
}

export const Twist = createCodec<Twist>("geometry_msgs/Twist", {
  type: "struct",
  fields: [
    { name: "linear", type: Vector3.plan },
    { name: "angular", type: Vector3.plan },
  ],
});
