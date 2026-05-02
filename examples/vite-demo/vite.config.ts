import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  worker: {
    format: "es",
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ["@heojeongbo/cdr-codec"],
  },
});
