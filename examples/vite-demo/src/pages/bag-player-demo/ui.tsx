import {
  type BagEvent,
  BagPlayer,
  builtInCodecs,
  type CodecRegistry,
  type TopicInfo,
} from "@heojeongbo/ts-ros2bag-replay";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MUTED = { color: "#8b949e" } as const;

const MAX_LOG = 80;

interface LogEntry {
  readonly id: number;
  readonly topic: string;
  readonly logTime: bigint;
  readonly preview: string;
}

interface PlayerState {
  player: BagPlayer;
  bagStartTime: bigint;
  bagEndTime: bigint;
  topics: readonly TopicInfo[];
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4] as const;

function nsToSec(t: bigint, base: bigint): string {
  const ns = t - base;
  const sec = Number(ns) / 1e9;
  return sec.toFixed(2);
}

function previewMessage(value: unknown): string {
  let str: string;
  try {
    str = JSON.stringify(value, (_, v) =>
      typeof v === "bigint" ? `${v.toString()}n` : v,
    );
  } catch {
    str = String(value);
  }
  return str.length > 200 ? `${str.slice(0, 200)}…` : str;
}

export function BagPlayerDemo() {
  const [codecs, setCodecs] = useState<CodecRegistry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [activeTopics, setActiveTopics] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [scrubTime, setScrubTime] = useState<bigint>(0n);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const logIdRef = useRef(0);
  const subsRef = useRef<Map<string, () => void>>(new Map());
  const tickRef = useRef<number | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Load built-in codecs once.
  useEffect(() => {
    let cancelled = false;
    builtInCodecs()
      .then((c) => {
        if (!cancelled) setCodecs(c);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tick scrubber while playing.
  useEffect(() => {
    if (!playerState || !playing) return;
    const id = window.setInterval(() => {
      setScrubTime(playerState.player.currentTime);
    }, 60);
    tickRef.current = id;
    return () => {
      window.clearInterval(id);
      tickRef.current = null;
    };
  }, [playerState, playing]);

  // Auto-scroll log when new entries arrive.
  useEffect(() => {
    if (!autoScroll) return;
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [log, autoScroll]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      for (const unsub of subsRef.current.values()) unsub();
      subsRef.current.clear();
      playerState?.player.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openFile = useCallback(
    async (file: File) => {
      if (!codecs) return;
      setError(null);
      // Tear down previous instance.
      for (const unsub of subsRef.current.values()) unsub();
      subsRef.current.clear();
      playerState?.player.dispose();
      setPlaying(false);
      setLog([]);
      setActiveTopics(new Set());

      try {
        const player = await BagPlayer.open({
          source: file,
          codecs,
          onError: (err) => {
            setError(`Playback stopped: ${err.message}`);
            setPlaying(false);
          },
        });
        const next: PlayerState = {
          player,
          bagStartTime: player.startTime,
          bagEndTime: player.endTime,
          topics: player.topics,
        };
        setPlayerState(next);
        setScrubTime(player.startTime);
        setSpeed(player.speed);
        // Auto-select up to 4 decodable topics.
        const decodable = player.topics
          .filter((t) => t.hasCodec)
          .slice(0, 4)
          .map((t) => t.name);
        const initial = new Set(decodable);
        setActiveTopics(initial);
        setupSubscriptions(player, initial);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [codecs, playerState],
  );

  const setupSubscriptions = useCallback(
    (player: BagPlayer, topics: ReadonlySet<string>) => {
      // Drop existing.
      for (const [topic, unsub] of subsRef.current) {
        if (!topics.has(topic)) {
          unsub();
          subsRef.current.delete(topic);
        }
      }
      // Add new.
      for (const topic of topics) {
        if (subsRef.current.has(topic)) continue;
        const unsub = player.subscribe(topic, (msg, ev: BagEvent) => {
          const id = ++logIdRef.current;
          const entry: LogEntry = {
            id,
            topic: ev.topic,
            logTime: ev.logTime,
            preview: previewMessage(msg),
          };
          setLog((prev) => {
            const next = prev.length >= MAX_LOG ? prev.slice(-MAX_LOG + 1) : prev;
            return [...next, entry];
          });
        });
        subsRef.current.set(topic, unsub);
      }
    },
    [],
  );

  const toggleTopic = useCallback(
    (topic: string) => {
      if (!playerState) return;
      setActiveTopics((prev) => {
        const next = new Set(prev);
        if (next.has(topic)) next.delete(topic);
        else next.add(topic);
        setupSubscriptions(playerState.player, next);
        return next;
      });
    },
    [playerState, setupSubscriptions],
  );

  const handlePlayPause = () => {
    if (!playerState) return;
    if (playing) {
      playerState.player.pause();
      setPlaying(false);
      setScrubTime(playerState.player.currentTime);
    } else {
      playerState.player.play();
      setPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playerState) return;
    const sec = Number(e.target.value);
    const t = playerState.bagStartTime + BigInt(Math.floor(sec * 1e9));
    playerState.player.seek(t);
    setScrubTime(t);
    setLog([]);
  };

  const handleSpeed = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!playerState) return;
    const rate = Number(e.target.value);
    playerState.player.setSpeed(rate);
    setSpeed(rate);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void openFile(file);
  };
  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void openFile(file);
  };

  const totalSeconds = useMemo(() => {
    if (!playerState) return 0;
    return Number(playerState.bagEndTime - playerState.bagStartTime) / 1e9;
  }, [playerState]);
  const currentSeconds = playerState
    ? Number(scrubTime - playerState.bagStartTime) / 1e9
    : 0;

  return (
    <>
      <h2>MCAP rosbag player</h2>
      <p style={{ ...MUTED, fontSize: 12, margin: "0 0 16px" }}>
        Drop a <code>.mcap</code> file below. The player reads its index, lists the
        topics, and replays decoded ROS 2 messages in real wall-clock time. Built on{" "}
        <code>@heojeongbo/ts-ros2bag-replay</code>.
      </p>

      {error && (
        <section
          style={{
            background: "#2c1216",
            border: "1px solid #5a1d1d",
            borderRadius: 6,
            padding: 12,
            color: "#f85149",
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          {error}
        </section>
      )}

      <section
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? "#1f6feb" : "#2a313c"}`,
          background: dragOver ? "#11253a" : "#161a22",
          padding: 24,
          textAlign: "center",
          marginBottom: 16,
          transition: "background 80ms",
        }}
      >
        <p style={{ margin: "0 0 12px", fontSize: 13 }}>
          {playerState
            ? `loaded — ${playerState.topics.length} topics, ${totalSeconds.toFixed(2)}s long`
            : codecs
              ? "Drop a .mcap file here, or click to choose"
              : "Loading codecs…"}
        </p>
        <label
          style={{
            display: "inline-block",
            padding: "8px 16px",
            background: "#1f6feb",
            color: "white",
            borderRadius: 6,
            cursor: codecs ? "pointer" : "not-allowed",
            fontSize: 12,
            opacity: codecs ? 1 : 0.5,
          }}
        >
          Choose file…
          <input
            type="file"
            accept=".mcap"
            onChange={onFileInput}
            disabled={!codecs}
            style={{ display: "none" }}
          />
        </label>
      </section>

      {playerState && (
        <>
          <section>
            <h3>Timeline</h3>
            <div
              style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
            >
              <button
                type="button"
                onClick={handlePlayPause}
                style={{
                  padding: "6px 16px",
                  background: playing ? "#21262d" : "#1f6feb",
                  border: "1px solid #2a313c",
                  borderRadius: 6,
                  color: "white",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {playing ? "❚❚ Pause" : "▶ Play"}
              </button>
              <input
                type="range"
                min={0}
                max={totalSeconds}
                step={0.01}
                value={currentSeconds}
                onChange={handleSeek}
                style={{ flex: 1, minWidth: 200 }}
              />
              <span
                style={{ ...MUTED, fontSize: 12, fontVariantNumeric: "tabular-nums" }}
              >
                {currentSeconds.toFixed(2)} / {totalSeconds.toFixed(2)} s
              </span>
              <select
                value={speed}
                onChange={handleSpeed}
                style={{
                  background: "#0a0d12",
                  color: "#cad4df",
                  border: "1px solid #2a313c",
                  borderRadius: 6,
                  padding: "6px 8px",
                  fontSize: 12,
                }}
              >
                {SPEED_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section>
            <h3>Topics</h3>
            <p style={{ ...MUTED, fontSize: 12, margin: "0 0 12px" }}>
              Toggle topics to subscribe / unsubscribe. Decodable means a built-in codec
              was found for the schema.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 4,
                fontSize: 12,
              }}
            >
              {playerState.topics.map((t) => (
                <label
                  key={t.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr 1fr auto",
                    gap: 12,
                    alignItems: "center",
                    padding: "4px 8px",
                    borderRadius: 4,
                    cursor: t.hasCodec ? "pointer" : "not-allowed",
                    opacity: t.hasCodec ? 1 : 0.55,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={activeTopics.has(t.name)}
                    onChange={() => toggleTopic(t.name)}
                    disabled={!t.hasCodec}
                  />
                  <span style={{ fontFamily: '"SF Mono", Menlo, monospace' }}>
                    {t.name}
                  </span>
                  <span style={{ ...MUTED, fontSize: 11 }}>{t.schemaName}</span>
                  <span
                    style={{
                      ...MUTED,
                      fontSize: 11,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {t.messageCount} msg{t.hasCodec ? "" : " (no codec)"}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0 }}>Message log (last {MAX_LOG})</h3>
              <label style={{ ...MUTED, fontSize: 11, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />{" "}
                auto-scroll
              </label>
            </div>
            <div
              style={{
                background: "#0a0d12",
                border: "1px solid #1a1f27",
                borderRadius: 6,
                padding: 8,
                maxHeight: 320,
                overflowY: "auto",
                fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                fontSize: 11,
              }}
            >
              {log.length === 0 ? (
                <p style={{ ...MUTED, margin: 0, padding: 8 }}>
                  No messages yet — press play.
                </p>
              ) : (
                log.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px 200px 1fr",
                      gap: 8,
                      padding: "2px 4px",
                      borderBottom: "1px solid #11151b",
                    }}
                  >
                    <span
                      style={{ color: "#8b949e", fontVariantNumeric: "tabular-nums" }}
                    >
                      {nsToSec(entry.logTime, playerState.bagStartTime)}s
                    </span>
                    <span style={{ color: "#79c0ff" }}>{entry.topic}</span>
                    <span
                      style={{
                        color: "#cad4df",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {entry.preview}
                    </span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </section>
        </>
      )}
    </>
  );
}
