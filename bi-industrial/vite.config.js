import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANTE: troque "bi-industrial" pelo nome exato do seu repositório GitHub
export default defineConfig({
  plugins: [react()],
  base: "/bi-industrial/",
});
