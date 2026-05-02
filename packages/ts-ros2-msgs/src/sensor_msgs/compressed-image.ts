import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";

// sensor_msgs/CompressedImage
//   std_msgs/Header header
//   string format
//   uint8[] data
export interface CompressedImage {
  header: Header;
  format: string;
  data: number[];
}

export const CompressedImage = createCodec<CompressedImage>(
  "sensor_msgs/CompressedImage",
  {
    type: "struct",
    fields: [
      { name: "header", type: Header.plan },
      { name: "format", type: { type: "string" } },
      { name: "data", type: { type: "sequence", element: { type: "uint8" } } },
    ],
  },
);
