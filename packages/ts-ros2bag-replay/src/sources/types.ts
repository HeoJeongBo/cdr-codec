/**
 * Internal abstraction over the two supported on-disk formats (MCAP, ROS 2
 * `.db3`). `BagPlayer` consumes a `BagSourceReader`; format-specific code lives
 * in `mcap-source.ts` / `db3-source.ts`.
 */

export interface ChannelInfo {
  readonly topic: string;
  readonly schemaName: string;
}

export interface RawMessage {
  readonly channelId: number;
  readonly logTime: bigint;
  readonly publishTime: bigint;
  readonly sequence: number;
  readonly data: Uint8Array;
}

export interface ReadMessagesOptions {
  readonly startTime?: bigint;
}

export interface BagSourceReader {
  readonly startTime: bigint;
  readonly endTime: bigint;
  readonly channels: ReadonlyMap<number, ChannelInfo>;
  readonly messageCounts: ReadonlyMap<number, number>;
  readMessages(options?: ReadMessagesOptions): AsyncIterable<RawMessage>;
  close(): Promise<void> | void;
}
