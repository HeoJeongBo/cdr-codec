export type BagFormat = "mcap" | "db3";

const MCAP_MAGIC = [0x89, 0x4d, 0x43, 0x41, 0x50, 0x30, 0x0d, 0x0a] as const;
const SQLITE_MAGIC_STR = "SQLite format 3";

/**
 * Sniff the first 16 bytes of a bag blob to identify its format. Throws on
 * anything other than MCAP / SQLite — the caller surfaces it as a clear
 * "unrecognized format" error.
 */
export async function detectFormat(blob: Blob): Promise<BagFormat> {
  const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());

  if (head.length >= MCAP_MAGIC.length && MCAP_MAGIC.every((b, i) => head[i] === b)) {
    return "mcap";
  }

  if (head.length >= SQLITE_MAGIC_STR.length) {
    let isSqlite = true;
    for (let i = 0; i < SQLITE_MAGIC_STR.length; i++) {
      if (head[i] !== SQLITE_MAGIC_STR.charCodeAt(i)) {
        isSqlite = false;
        break;
      }
    }
    if (isSqlite) return "db3";
  }

  throw new Error("Unrecognized bag format — expected MCAP or SQLite (.db3) magic bytes");
}
