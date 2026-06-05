import { spawnSync } from "node:child_process";
import { normalizeVitestArgs } from "./vitest-args.mjs";

const forwardedArgs = process.argv.slice(2);
const vitestArgs = ["vitest", "--passWithNoTests", ...normalizeVitestArgs(forwardedArgs)];

const result = spawnSync("npx", vitestArgs, {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
