import { renderBinarySamplesDemo } from "../pages/binary-samples-demo";
import { renderPrimitivesDemo } from "../pages/primitives-demo";
import { renderRos2Demo } from "../pages/ros2-demo";
import { renderWorkerDemo } from "../pages/worker-demo";

const output = document.getElementById("output") as HTMLElement;
const buttons = document.querySelectorAll<HTMLButtonElement>("#nav button");

function activate(name: string): void {
  for (const button of buttons) {
    button.classList.toggle("active", button.dataset.demo === name);
  }
  output.innerHTML = "";
  switch (name) {
    case "primitives":
      renderPrimitivesDemo(output);
      return;
    case "worker":
      renderWorkerDemo(output);
      return;
    case "ros2":
      renderRos2Demo(output);
      return;
    case "binary-samples":
      renderBinarySamplesDemo(output);
      return;
  }
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    const name = button.dataset.demo;
    if (name) {
      activate(name);
    }
  });
}

activate("primitives");
