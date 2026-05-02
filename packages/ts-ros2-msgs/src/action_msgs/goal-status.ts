import { createCodec } from "../shared/codec";
import { GoalInfo } from "./goal-info";

// action_msgs/GoalStatus
//   int8 STATUS_UNKNOWN   = 0
//   int8 STATUS_ACCEPTED  = 1
//   int8 STATUS_EXECUTING = 2
//   int8 STATUS_CANCELING = 3
//   int8 STATUS_SUCCEEDED = 4
//   int8 STATUS_CANCELED  = 5
//   int8 STATUS_ABORTED   = 6
//   action_msgs/GoalInfo goal_info
//   int8 status
export const GOAL_STATUS = {
  UNKNOWN: 0,
  ACCEPTED: 1,
  EXECUTING: 2,
  CANCELING: 3,
  SUCCEEDED: 4,
  CANCELED: 5,
  ABORTED: 6,
} as const;

export interface GoalStatus {
  goal_info: GoalInfo;
  status: number;
}

export const GoalStatus = createCodec<GoalStatus>("action_msgs/GoalStatus", {
  type: "struct",
  fields: [
    { name: "goal_info", type: GoalInfo.plan },
    { name: "status", type: { type: "int8" } },
  ],
});
