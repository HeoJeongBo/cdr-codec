import { createCodec } from "../shared/codec";

// std_msgs/ColorRGBA
//   float32 r
//   float32 g
//   float32 b
//   float32 a
export interface ColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const ColorRGBA = createCodec<ColorRGBA>("std_msgs/ColorRGBA", {
  type: "struct",
  fields: [
    { name: "r", type: { type: "float32" } },
    { name: "g", type: { type: "float32" } },
    { name: "b", type: { type: "float32" } },
    { name: "a", type: { type: "float32" } },
  ],
});
