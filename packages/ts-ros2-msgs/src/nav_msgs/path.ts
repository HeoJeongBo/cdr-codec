import { PoseStamped } from "../geometry_msgs/pose-stamped";
import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";

// nav_msgs/Path
//   std_msgs/Header header
//   geometry_msgs/PoseStamped[] poses
export interface Path {
  header: Header;
  poses: PoseStamped[];
}

export const Path = createCodec<Path>("nav_msgs/Path", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "poses", type: { type: "sequence", element: PoseStamped.plan } },
  ],
});
