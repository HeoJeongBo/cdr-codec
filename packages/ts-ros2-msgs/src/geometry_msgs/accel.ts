import { createCodec } from "../shared/codec";
import { Vector3 } from "./vector3";

// geometry_msgs/Accel
//   geometry_msgs/Vector3 linear
//   geometry_msgs/Vector3 angular
export interface Accel {
  linear: Vector3;
  angular: Vector3;
}

export const Accel = createCodec<Accel>("geometry_msgs/Accel", {
  type: "struct",
  fields: [
    { name: "linear", type: Vector3.plan },
    { name: "angular", type: Vector3.plan },
  ],
});
