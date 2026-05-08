import { type DecompressHandlers, McapIndexedReader } from "@mcap/core";
import { normalizeSchemaName } from "../schema";
import type {
  BagSourceReader,
  ChannelInfo,
  RawMessage,
  ReadMessagesOptions,
} from "./types";

async function builtInDecompressHandlers(): Promise<DecompressHandlers> {
  // Pure-JS zstd via fzstd — no WASM, browser-friendly. lz4/bz2 are not
  // built-in (no good pure-JS option that matches MCAP's block format
  // out-of-the-box); callers can plug their own handlers via
  // `BagPlayerOptions.decompressHandlers`.
  const { decompress } = await import("fzstd");
  return {
    zstd: (buffer, decompressedSize) => {
      const out = new Uint8Array(Number(decompressedSize));
      const written = decompress(buffer, out);
      return written.length === out.length ? out : written;
    },
  };
}

export async function openMcapSource(
  blob: Blob,
  userHandlers?: DecompressHandlers,
): Promise<BagSourceReader> {
  const { BlobReadable } = await import("@mcap/browser");
  const readable = new BlobReadable(blob);
  const builtIn = await builtInDecompressHandlers();
  const reader = await McapIndexedReader.Initialize({
    readable,
    decompressHandlers: { ...builtIn, ...(userHandlers ?? {}) },
  });

  const channels = new Map<number, ChannelInfo>();
  const counts = new Map<number, number>();
  const counts0 = reader.statistics?.channelMessageCounts;

  for (const [channelId, channel] of reader.channelsById) {
    const schema = reader.schemasById.get(channel.schemaId);
    const schemaName = normalizeSchemaName(schema?.name ?? "");
    channels.set(channelId, {
      topic: channel.topic,
      schemaName,
      messageEncoding: channel.messageEncoding,
    });
    const c = counts0?.get(channelId);
    counts.set(channelId, c != null ? Number(c) : 0);
  }

  const startTime = reader.statistics?.messageStartTime ?? 0n;
  const endTime = reader.statistics?.messageEndTime ?? 0n;

  return {
    startTime,
    endTime,
    channels,
    messageCounts: counts,
    async *readMessages(options: ReadMessagesOptions = {}) {
      const iter = reader.readMessages({ startTime: options.startTime });
      for await (const record of iter) {
        const msg: RawMessage = {
          channelId: record.channelId,
          logTime: record.logTime,
          publishTime: record.publishTime,
          sequence: record.sequence,
          data: record.data,
        };
        yield msg;
      }
    },
    close() {
      // McapIndexedReader has no explicit close; the readable releases on GC.
    },
  };
}
