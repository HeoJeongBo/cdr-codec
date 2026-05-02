import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";
import { Transform } from "./transform";

// geometry_msgs/TransformStamped
//   std_msgs/Header header
//   string child_frame_id
//   geometry_msgs/Transform transform
export interface TransformStamped {
  header: Header;
  child_frame_id: string;
  transform: Transform;
}

export const TransformStamped = createCodec<TransformStamped>(
  "geometry_msgs/TransformStamped",
  {
    type: "struct",
    fields: [
      { name: "header", type: Header.plan },
      { name: "child_frame_id", type: { type: "string" } },
      { name: "transform", type: Transform.plan },
    ],
  },
);
