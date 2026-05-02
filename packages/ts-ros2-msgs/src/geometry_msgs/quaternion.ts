import { createCodec } from "../shared/codec";

// geometry_msgs/Quaternion
//   float64 x
//   float64 y
//   float64 z
//   float64 w
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export const Quaternion = createCodec<Quaternion>("geometry_msgs/Quaternion", {
  type: "struct",
  fields: [
    { name: "x", type: { type: "float64" } },
    { name: "y", type: { type: "float64" } },
    { name: "z", type: { type: "float64" } },
    { name: "w", type: { type: "float64" } },
  ],
});
