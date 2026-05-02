import { Quaternion } from "../geometry_msgs/quaternion";
import { Vector3 } from "../geometry_msgs/vector3";
import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";

// sensor_msgs/Imu
//   std_msgs/Header header
//   geometry_msgs/Quaternion orientation
//   float64[9] orientation_covariance
//   geometry_msgs/Vector3 angular_velocity
//   float64[9] angular_velocity_covariance
//   geometry_msgs/Vector3 linear_acceleration
//   float64[9] linear_acceleration_covariance
export interface Imu {
  header: Header;
  orientation: Quaternion;
  orientation_covariance: number[];
  angular_velocity: Vector3;
  angular_velocity_covariance: number[];
  linear_acceleration: Vector3;
  linear_acceleration_covariance: number[];
}

export const Imu = createCodec<Imu>("sensor_msgs/Imu", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "orientation", type: Quaternion.plan },
    {
      name: "orientation_covariance",
      type: { type: "fixed-array", length: 9, element: { type: "float64" } },
    },
    { name: "angular_velocity", type: Vector3.plan },
    {
      name: "angular_velocity_covariance",
      type: { type: "fixed-array", length: 9, element: { type: "float64" } },
    },
    { name: "linear_acceleration", type: Vector3.plan },
    {
      name: "linear_acceleration_covariance",
      type: { type: "fixed-array", length: 9, element: { type: "float64" } },
    },
  ],
});
