import { useState } from "react";
import { AdvancedFeaturesDemo } from "../pages/advanced-features-demo";
import { BagPlayerDemo } from "../pages/bag-player-demo";
import { BinarySamplesDemo } from "../pages/binary-samples-demo";
import { CustomMessageDemo } from "../pages/custom-message-demo";
import { GettingStartedDemo } from "../pages/getting-started-demo";
import { PrimitivesDemo } from "../pages/primitives-demo";
import { Ros2Demo } from "../pages/ros2-demo";

type PageId =
  | "getting-started"
  | "primitives"
  | "bag-player"
  | "ros2"
  | "binary-samples"
  | "custom-message"
  | "advanced-features";

const PAGES: ReadonlyArray<{ id: PageId; label: string }> = [
  { id: "getting-started", label: "Getting started" },
  { id: "primitives", label: "Primitives + hex dump" },
  { id: "bag-player", label: "ROS 2 rosbag player" },
  { id: "ros2", label: "ROS 2 — geometry_msgs/Twist" },
  { id: "binary-samples", label: "ROS 2 binary samples" },
  { id: "custom-message", label: "Custom message" },
  { id: "advanced-features", label: "Advanced features" },
];

export function App() {
  const [page, setPage] = useState<PageId>("getting-started");

  return (
    <>
      <aside id="nav">
        <h1>cdr-codec</h1>
        <p className="sub">CDR encode / decode demos</p>
        <nav>
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              className={p.id === page ? "active" : undefined}
              onClick={() => setPage(p.id)}
            >
              {p.label}
            </button>
          ))}
        </nav>
      </aside>
      <main id="output">
        {page === "getting-started" && <GettingStartedDemo />}
        {page === "primitives" && <PrimitivesDemo />}
        {page === "bag-player" && <BagPlayerDemo />}
        {page === "ros2" && <Ros2Demo />}
        {page === "binary-samples" && <BinarySamplesDemo />}
        {page === "custom-message" && <CustomMessageDemo />}
        {page === "advanced-features" && <AdvancedFeaturesDemo />}
      </main>
    </>
  );
}
