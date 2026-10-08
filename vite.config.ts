import process from "node:process";
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({ adapter: adapter(), compilerOptions: { runes: true } }),
  ],
  define: {
    // GitHub sets this while building; the poster download link is built from it
    __REPOSITORY__: JSON.stringify(
      process.env.GITHUB_REPOSITORY ?? "hafacc/sport-genealogy",
    ),
  },
});
