import { createCodec } from "../shared/codec";

// lifecycle_msgs/State
//   uint8 PRIMARY_STATE_UNKNOWN       = 0
//   uint8 PRIMARY_STATE_UNCONFIGURED  = 1
//   uint8 PRIMARY_STATE_INACTIVE      = 2
//   uint8 PRIMARY_STATE_ACTIVE        = 3
//   uint8 PRIMARY_STATE_FINALIZED     = 4
//   uint8 TRANSITION_STATE_CONFIGURING     = 10
//   uint8 TRANSITION_STATE_CLEANINGUP      = 11
//   uint8 TRANSITION_STATE_SHUTTINGDOWN    = 12
//   uint8 TRANSITION_STATE_ACTIVATING      = 13
//   uint8 TRANSITION_STATE_DEACTIVATING    = 14
//   uint8 TRANSITION_STATE_ERRORPROCESSING = 15
//   uint8  id
//   string label
export const LIFECYCLE_STATE = {
  PRIMARY_STATE_UNKNOWN: 0,
  PRIMARY_STATE_UNCONFIGURED: 1,
  PRIMARY_STATE_INACTIVE: 2,
  PRIMARY_STATE_ACTIVE: 3,
  PRIMARY_STATE_FINALIZED: 4,
  TRANSITION_STATE_CONFIGURING: 10,
  TRANSITION_STATE_CLEANINGUP: 11,
  TRANSITION_STATE_SHUTTINGDOWN: 12,
  TRANSITION_STATE_ACTIVATING: 13,
  TRANSITION_STATE_DEACTIVATING: 14,
  TRANSITION_STATE_ERRORPROCESSING: 15,
} as const;

export interface State {
  id: number;
  label: string;
}

export const State = createCodec<State>("lifecycle_msgs/State", {
  type: "struct",
  fields: [
    { name: "id", type: { type: "uint8" } },
    { name: "label", type: { type: "string" } },
  ],
});
