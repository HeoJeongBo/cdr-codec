import { TransformStamped } from "../geometry_msgs/transform-stamped";
import { createCodec } from "../shared/codec";

// tf2_msgs/TFMessage
//   geometry_msgs/TransformStamped[] transforms
export interface TFMessage {
  transforms: TransformStamped[];
}

export const TFMessage = createCodec<TFMessage>("tf2_msgs/TFMessage", {
  type: "struct",
  fields: [
    { name: "transforms", type: { type: "sequence", element: TransformStamped.plan } },
  ],
});
