import { createCodec } from "../shared/codec";
import { Quaternion } from "./quaternion";
import { Vector3 } from "./vector3";

// geometry_msgs/Transform
//   geometry_msgs/Vector3 translation
//   geometry_msgs/Quaternion rotation
export interface Transform {
  translation: Vector3;
  rotation: Quaternion;
}

export const Transform = createCodec<Transform>("geometry_msgs/Transform", {
  type: "struct",
  fields: [
    { name: "translation", type: Vector3.plan },
    { name: "rotation", type: Quaternion.plan },
  ],
});
