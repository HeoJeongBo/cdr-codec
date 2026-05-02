import { Time } from "../builtin_interfaces/time";
import { createCodec } from "../shared/codec";
import { UUID } from "../unique_identifier_msgs/uuid";

// action_msgs/GoalInfo
//   unique_identifier_msgs/UUID goal_id
//   builtin_interfaces/Time stamp
export interface GoalInfo {
  goal_id: UUID;
  stamp: Time;
}

export const GoalInfo = createCodec<GoalInfo>("action_msgs/GoalInfo", {
  type: "struct",
  fields: [
    { name: "goal_id", type: UUID.plan },
    { name: "stamp", type: Time.plan },
  ],
});
