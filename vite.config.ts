import { defineConfig } from "vite";
import vinext from "vinext";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
  },
  plugins: [
    tailwindcss(),
    vinext(),
    nitro(),
  ],
});