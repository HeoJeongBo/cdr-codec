import type { Database } from "sql.js";
import { normalizeSchemaName } from "../schema";
import type {
  BagSourceReader,
  ChannelInfo,
  RawMessage,
  ReadMessagesOptions,
} from "./types";

export interface Db3OpenOptions {
  /**
   * Forwarded to sql.js's `initSqlJs({ locateFile })`. Use this in browser
   * bundlers to point sql.js at the right `.wasm` URL.
   *
   * @example with Vite
   *   import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
   *   await BagPlayer.open({ source: file, sqlJsLocateFile: () => sqlWasmUrl });
   */
  readonly locateFile?: (filename: string) => string;
}

interface TopicRow {
  id: number;
  name: string;
  type: string;
}

function bytesFromBlob(blob: Blob): Promise<Uint8Array> {
  return blob.arrayBuffer().then((b) => new Uint8Array(b));
}

function tableExists(db: Database, name: string): boolean {
  const row = db.exec("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", [
    name,
  ]);
  return row.length > 0 && row[0].values.length > 0;
}

const STARTING_TIME_RE = /starting_time:\s*\n\s*nanoseconds_since_epoch:\s*(-?\d+)/;
const DURATION_RE = /duration:\s*\n\s*nanoseconds:\s*(-?\d+)/;

function parseEmbeddedMetadata(
  db: Database,
): { startTime: bigint; endTime: bigint } | null {
  if (!tableExists(db, "metadata")) return null;
  try {
    const res = db.exec("SELECT metadata FROM metadata LIMIT 1");
    const yaml = res[0]?.values[0]?.[0] as string | undefined;
    if (!yaml) return null;
    const startMatch = yaml.match(STARTING_TIME_RE);
    const durMatch = yaml.match(DURATION_RE);
    if (!startMatch || !durMatch) return null;
    const start = BigInt(startMatch[1]);
    const end = start + BigInt(durMatch[1]);
    return { startTime: start, endTime: end };
  } catch {
    return null;
  }
}

function readTimeRangeFromMessages(db: Database): {
  startTime: bigint;
  endTime: bigint;
} {
  // CAST to TEXT to preserve 64-bit precision — JS Number can't represent
  // ns-since-epoch (~1.7e18) exactly.
  const res = db.exec(
    "SELECT CAST(MIN(timestamp) AS TEXT), CAST(MAX(timestamp) AS TEXT) FROM messages",
  );
  const row = res[0]?.values[0];
  if (!row || row[0] == null || row[1] == null) {
    return { startTime: 0n, endTime: 0n };
  }
  return {
    startTime: BigInt(row[0] as string),
    endTime: BigInt(row[1] as string),
  };
}

export async function openDb3Source(
  blob: Blob,
  options: Db3OpenOptions = {},
): Promise<BagSourceReader> {
  const initSqlJsModule = await import("sql.js");
  const initSqlJs = initSqlJsModule.default;
  const SQL = await initSqlJs(
    options.locateFile ? { locateFile: options.locateFile } : undefined,
  );
  const bytes = await bytesFromBlob(blob);
  const db = new SQL.Database(bytes);

  if (!tableExists(db, "topics") || !tableExists(db, "messages")) {
    db.close();
    throw new Error(
      "SQLite file is not a rosbag2 db3 (missing `topics` / `messages` tables)",
    );
  }

  // Channels.
  const channels = new Map<number, ChannelInfo>();
  const messageCounts = new Map<number, number>();
  const topicRes = db.exec("SELECT id, name, type FROM topics");
  if (topicRes.length > 0) {
    for (const row of topicRes[0].values) {
      const t: TopicRow = {
        id: row[0] as number,
        name: row[1] as string,
        type: row[2] as string,
      };
      channels.set(t.id, {
        topic: t.name,
        schemaName: normalizeSchemaName(t.type),
      });
      messageCounts.set(t.id, 0);
    }
  }

  // Counts per channel.
  const countRes = db.exec("SELECT topic_id, COUNT(*) FROM messages GROUP BY topic_id");
  if (countRes.length > 0) {
    for (const row of countRes[0].values) {
      messageCounts.set(row[0] as number, row[1] as number);
    }
  }

  // Time range — embedded metadata first, fall back to MIN/MAX.
  const range = parseEmbeddedMetadata(db) ?? readTimeRangeFromMessages(db);

  return {
    startTime: range.startTime,
    endTime: range.endTime,
    channels,
    messageCounts,
    async *readMessages(opts: ReadMessagesOptions = {}) {
      const sql =
        opts.startTime != null
          ? "SELECT topic_id, CAST(timestamp AS TEXT), data FROM messages WHERE timestamp >= ? ORDER BY timestamp"
          : "SELECT topic_id, CAST(timestamp AS TEXT), data FROM messages ORDER BY timestamp";
      // BindParams takes Number for INTEGER comparisons; JS Number drift here
      // is at most ~512ns at epoch-nanosecond scale, well below seek
      // granularity. The *output* timestamp is reconstructed via CAST AS TEXT
      // so playback uses exact bigints.
      const stmt =
        opts.startTime != null
          ? db.prepare(sql, [Number(opts.startTime)])
          : db.prepare(sql);
      try {
        let seq = 0;
        while (stmt.step()) {
          const row = stmt.get();
          const channelId = row[0] as number;
          const timestamp = BigInt(row[1] as string);
          const data = row[2] as Uint8Array;
          const msg: RawMessage = {
            channelId,
            logTime: timestamp,
            publishTime: timestamp,
            sequence: seq++,
            data,
          };
          yield msg;
        }
      } finally {
        stmt.free();
      }
    },
    close() {
      db.close();
    },
  };
}
