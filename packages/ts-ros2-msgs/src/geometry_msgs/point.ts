import { createCodec } from "../shared/codec";

// geometry_msgs/Point
//   float64 x
//   float64 y
//   float64 z
export interface Point {
  x: number;
  y: number;
  z: number;
}

export const Point = createCodec<Point>("geometry_msgs/Point", {
  type: "struct",
  fields: [
    { name: "x", type: { type: "float64" } },
    { name: "y", type: { type: "float64" } },
    { name: "z", type: { type: "float64" } },
  ],
});
