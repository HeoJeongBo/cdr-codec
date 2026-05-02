import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";

// sensor_msgs/JointState
//   std_msgs/Header header
//   string[] name
//   float64[] position
//   float64[] velocity
//   float64[] effort
export interface JointState {
  header: Header;
  name: string[];
  position: number[];
  velocity: number[];
  effort: number[];
}

export const JointState = createCodec<JointState>("sensor_msgs/JointState", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "name", type: { type: "sequence", element: { type: "string" } } },
    { name: "position", type: { type: "sequence", element: { type: "float64" } } },
    { name: "velocity", type: { type: "sequence", element: { type: "float64" } } },
    { name: "effort", type: { type: "sequence", element: { type: "float64" } } },
  ],
});
