import { createCodec } from "../shared/codec";

// geometry_msgs/Vector3
//   float64 x
//   float64 y
//   float64 z
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export const Vector3 = createCodec<Vector3>("geometry_msgs/Vector3", {
  type: "struct",
  fields: [
    { name: "x", type: { type: "float64" } },
    { name: "y", type: { type: "float64" } },
    { name: "z", type: { type: "float64" } },
  ],
});
