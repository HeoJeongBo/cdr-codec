import type { RosMessageCodec } from "@heojeongbo/ts-ros2-msgs";
import { type DecompressHandlers, McapIndexedReader } from "@mcap/core";
import type { CodecRegistry } from "./codecs";
import { normalizeSchemaName } from "./schema";
import {
  currentBagTime,
  delayMsFor,
  sleepWithAbort,
  startTimeline,
  type Timeline,
} from "./timeline";

/**
 * Source the bag bytes can come from. In the browser, drop-in a `File` or
 * `Blob`. In Node, `ArrayBuffer` / `Uint8Array` work — `BagPlayer.open` wraps
 * them in a `Blob` since the runtime ships one.
 */
export type BagSource = Blob | ArrayBuffer | Uint8Array;

export type UnknownSchemaPolicy =
  | "skip"
  | "warn"
  | ((info: { schemaName: string; topic: string }) => void);

export interface BagPlayerOptions {
  readonly source: BagSource;
  readonly codecs?: CodecRegistry;
  readonly speed?: number;
  readonly unknownSchema?: UnknownSchemaPolicy;
  /**
   * Extra handlers for compressed MCAP chunks. `zstd` is built-in (pure-JS via
   * `fzstd`); pass extras here for `lz4` / `bz2` if your bag uses them. User
   * handlers override the built-ins for the same key.
   */
  readonly decompressHandlers?: DecompressHandlers;
  /**
   * Called when the playback loop fails (e.g. a compressed chunk uses an
   * algorithm we don't have a handler for). Receives the error; player state
   * is reset to paused before the callback fires so subscribers can recover.
   */
  readonly onError?: (err: Error) => void;
}

export interface TopicInfo {
  readonly name: string;
  readonly schemaName: string;
  readonly messageCount: number;
  readonly hasCodec: boolean;
}

export interface BagEvent<T = unknown> {
  readonly topic: string;
  readonly schemaName: string;
  readonly message: T;
  readonly logTime: bigint;
  readonly publishTime: bigint;
  readonly sequence: number;
}

export type BagHandler<T> = (message: T, event: BagEvent<T>) => void;

interface Subscription<T = unknown> {
  readonly topic: string;
  readonly codec?: RosMessageCodec<T>;
  readonly handler: BagHandler<T>;
}

interface ChannelMeta {
  readonly topic: string;
  readonly schemaName: string;
}

type IndexedReader = McapIndexedReader;

interface McapRecord {
  readonly channelId: number;
  readonly logTime: bigint;
  readonly publishTime: bigint;
  readonly sequence: number;
  readonly data: Uint8Array;
}

function sourceToBlob(source: BagSource): Blob {
  if (source instanceof Blob) return source;
  if (source instanceof ArrayBuffer) return new Blob([source]);
  if (source instanceof Uint8Array) {
    // Copy into a fresh ArrayBuffer to satisfy `BlobPart` typing (which
    // disallows `SharedArrayBuffer`-backed views) and to detach from any
    // shared buffer the caller may reuse.
    const copy = new ArrayBuffer(source.byteLength);
    new Uint8Array(copy).set(source);
    return new Blob([copy]);
  }
  throw new TypeError("BagPlayer.open: unsupported source type");
}

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

async function openReader(
  blob: Blob,
  userHandlers?: DecompressHandlers,
): Promise<IndexedReader> {
  const { BlobReadable } = await import("@mcap/browser");
  const readable = new BlobReadable(blob);
  const builtIn = await builtInDecompressHandlers();
  return McapIndexedReader.Initialize({
    readable,
    decompressHandlers: { ...builtIn, ...(userHandlers ?? {}) },
  });
}

export class BagPlayer {
  readonly topics: readonly TopicInfo[];
  readonly startTime: bigint;
  readonly endTime: bigint;

  private readonly reader: IndexedReader;
  private readonly channels: ReadonlyMap<number, ChannelMeta>;
  private readonly codecs?: CodecRegistry;
  private readonly unknownPolicy: UnknownSchemaPolicy;
  private readonly onError?: (err: Error) => void;
  private readonly warnedUnknown = new Set<string>();
  private readonly subscriptions = new Set<Subscription>();

  private _speed: number;
  private _playing = false;
  private _disposed = false;
  private timeline: Timeline | null = null;
  private cursorNs: bigint;
  private currentRun: AbortController | null = null;

  private constructor(
    reader: IndexedReader,
    channels: ReadonlyMap<number, ChannelMeta>,
    topics: readonly TopicInfo[],
    startTime: bigint,
    endTime: bigint,
    options: BagPlayerOptions,
  ) {
    this.reader = reader;
    this.channels = channels;
    this.topics = topics;
    this.startTime = startTime;
    this.endTime = endTime;
    this.cursorNs = startTime;
    this.codecs = options.codecs;
    this.unknownPolicy = options.unknownSchema ?? "warn";
    this.onError = options.onError;
    this._speed = options.speed ?? 1;
  }

  static async open(options: BagPlayerOptions): Promise<BagPlayer> {
    const reader = await openReader(
      sourceToBlob(options.source),
      options.decompressHandlers,
    );

    const channels = new Map<number, ChannelMeta>();
    const topics: TopicInfo[] = [];
    const counts = reader.statistics?.channelMessageCounts;

    for (const [channelId, channel] of reader.channelsById) {
      const schema = reader.schemasById.get(channel.schemaId);
      const rawSchemaName = schema?.name ?? "";
      const schemaName = normalizeSchemaName(rawSchemaName);
      channels.set(channelId, { topic: channel.topic, schemaName });
      const count = counts?.get(channelId);
      topics.push({
        name: channel.topic,
        schemaName,
        messageCount: count != null ? Number(count) : 0,
        hasCodec: options.codecs?.has(schemaName) ?? false,
      });
    }

    const startTime = reader.statistics?.messageStartTime ?? 0n;
    const endTime = reader.statistics?.messageEndTime ?? 0n;

    return new BagPlayer(reader, channels, topics, startTime, endTime, options);
  }

  get currentTime(): bigint {
    if (this.timeline && this._playing) {
      return currentBagTime(this.timeline);
    }
    return this.cursorNs;
  }

  get speed(): number {
    return this._speed;
  }

  get playing(): boolean {
    return this._playing;
  }

  play(): void {
    this.assertNotDisposed();
    if (this._playing) return;
    if (this.cursorNs >= this.endTime) return;
    this._playing = true;
    this.timeline = startTimeline(this.cursorNs, this._speed);
    const ctrl = new AbortController();
    this.currentRun = ctrl;
    void this.runLoop(ctrl.signal);
  }

  pause(): void {
    if (!this._playing) return;
    if (this.timeline) {
      this.cursorNs = currentBagTime(this.timeline);
    }
    this._playing = false;
    this.timeline = null;
    this.currentRun?.abort(new Error("paused"));
    this.currentRun = null;
  }

  seek(time: bigint): void {
    this.assertNotDisposed();
    const clamped =
      time < this.startTime ? this.startTime : time > this.endTime ? this.endTime : time;
    const wasPlaying = this._playing;
    if (wasPlaying) this.pause();
    this.cursorNs = clamped;
    if (wasPlaying) this.play();
  }

  setSpeed(rate: number): void {
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new RangeError("speed must be a positive finite number");
    }
    const wasPlaying = this._playing;
    if (wasPlaying) this.pause();
    this._speed = rate;
    if (wasPlaying) this.play();
  }

  subscribe<T = unknown>(topic: string, handler: BagHandler<T>): () => void {
    return this.addSubscription({ topic, handler: handler as BagHandler<unknown> });
  }

  subscribeWith<T>(
    codec: RosMessageCodec<T>,
    topic: string,
    handler: BagHandler<T>,
  ): () => void {
    return this.addSubscription({
      topic,
      codec: codec as RosMessageCodec<unknown>,
      handler: handler as BagHandler<unknown>,
    });
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._playing = false;
    this.timeline = null;
    this.currentRun?.abort(new Error("disposed"));
    this.currentRun = null;
    this.subscriptions.clear();
  }

  private addSubscription(sub: Subscription): () => void {
    this.assertNotDisposed();
    this.subscriptions.add(sub);
    return () => {
      this.subscriptions.delete(sub);
    };
  }

  private assertNotDisposed(): void {
    if (this._disposed) {
      throw new Error("BagPlayer has been disposed");
    }
  }

  private async runLoop(signal: AbortSignal): Promise<void> {
    const startNs = this.cursorNs;
    try {
      const iter = this.reader.readMessages({ startTime: startNs });
      for await (const record of iter as AsyncIterable<McapRecord>) {
        if (signal.aborted) return;
        if (this.timeline) {
          const delay = delayMsFor(this.timeline, record.logTime);
          if (delay > 0) await sleepWithAbort(delay, signal);
        }
        if (signal.aborted) return;
        this.cursorNs = record.logTime;
        this.dispatch(record);
      }
      // reached end of bag
      this._playing = false;
      this.timeline = null;
      this.cursorNs = this.endTime;
      this.currentRun = null;
    } catch (err) {
      if (signal.aborted) return;
      // Reset to a paused-at-current state so the UI can recover.
      this._playing = false;
      this.timeline = null;
      this.currentRun = null;
      this.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private dispatch(record: McapRecord): void {
    const channel = this.channels.get(record.channelId);
    if (!channel) return;

    let dispatched = false;
    let decoded: unknown;
    let decodedCodec: RosMessageCodec<unknown> | undefined;

    for (const sub of this.subscriptions) {
      if (sub.topic !== channel.topic) continue;
      const codec = sub.codec ?? this.codecs?.get(channel.schemaName);
      if (!codec) {
        this.notifyUnknown(channel);
        continue;
      }
      if (codec !== decodedCodec) {
        try {
          decoded = codec.decode(record.data);
          decodedCodec = codec;
        } catch {
          continue;
        }
      }
      sub.handler(decoded, {
        topic: channel.topic,
        schemaName: channel.schemaName,
        message: decoded,
        logTime: record.logTime,
        publishTime: record.publishTime,
        sequence: record.sequence,
      });
      dispatched = true;
    }

    void dispatched;
  }

  private notifyUnknown(channel: ChannelMeta): void {
    if (this.unknownPolicy === "skip") return;
    if (typeof this.unknownPolicy === "function") {
      this.unknownPolicy({ schemaName: channel.schemaName, topic: channel.topic });
      return;
    }
    if (this.warnedUnknown.has(channel.schemaName)) return;
    this.warnedUnknown.add(channel.schemaName);
    // biome-ignore lint/suspicious/noConsole: opt-in warn policy
    console.warn(
      `[ts-ros2bag-replay] no codec for schema "${channel.schemaName}" (topic "${channel.topic}") — messages will be skipped`,
    );
  }
}
