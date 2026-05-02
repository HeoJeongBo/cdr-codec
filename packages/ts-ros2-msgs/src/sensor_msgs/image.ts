import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";

// sensor_msgs/Image
//   std_msgs/Header header
//   uint32 height
//   uint32 width
//   string encoding
//   uint8 is_bigendian
//   uint32 step
//   uint8[] data
export interface Image {
  header: Header;
  height: number;
  width: number;
  encoding: string;
  is_bigendian: number;
  step: number;
  data: number[];
}

export const Image = createCodec<Image>("sensor_msgs/Image", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "height", type: { type: "uint32" } },
    { name: "width", type: { type: "uint32" } },
    { name: "encoding", type: { type: "string" } },
    { name: "is_bigendian", type: { type: "uint8" } },
    { name: "step", type: { type: "uint32" } },
    { name: "data", type: { type: "sequence", element: { type: "uint8" } } },
  ],
});
