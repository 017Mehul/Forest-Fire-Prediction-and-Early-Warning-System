import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Do not publish source maps to the production deployment.
    sourcemap: false,
  },
});