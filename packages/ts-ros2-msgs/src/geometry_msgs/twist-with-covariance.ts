import { createCodec } from "../shared/codec";
import { Twist } from "./twist";

// geometry_msgs/TwistWithCovariance
//   geometry_msgs/Twist twist
//   float64[36] covariance
export interface TwistWithCovariance {
  twist: Twist;
  covariance: number[];
}

export const TwistWithCovariance = createCodec<TwistWithCovariance>(
  "geometry_msgs/TwistWithCovariance",
  {
    type: "struct",
    fields: [
      { name: "twist", type: Twist.plan },
      {
        name: "covariance",
        type: { type: "fixed-array", length: 36, element: { type: "float64" } },
      },
    ],
  },
);
