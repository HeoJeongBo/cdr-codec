import { createCodec } from "../shared/codec";
import { GoalStatus } from "./goal-status";

// action_msgs/GoalStatusArray
//   action_msgs/GoalStatus[] status_list
export interface GoalStatusArray {
  status_list: GoalStatus[];
}

export const GoalStatusArray = createCodec<GoalStatusArray>(
  "action_msgs/GoalStatusArray",
  {
    type: "struct",
    fields: [
      { name: "status_list", type: { type: "sequence", element: GoalStatus.plan } },
    ],
  },
);
