import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const distDir = path.resolve("dist");
const cacheDir = path.resolve("tests", "build", ".cache");
const lockDir = path.join(cacheDir, "build.lock");
const stampFile = path.join(cacheDir, "build.stamp");
const lockTtlMs = 5 * 60 * 1000;

function getNewestMtimeMs(targetPath: string): number {
  const stats = fs.statSync(targetPath);

  if (!stats.isDirectory()) {
    return stats.mtimeMs;
  }

  return fs.readdirSync(targetPath).reduce((latest, entry) => {
    return Math.max(latest, getNewestMtimeMs(path.join(targetPath, entry)));
  }, stats.mtimeMs);
}

function getSourceVersion(): number {
  return Math.max(getNewestMtimeMs(path.resolve("src")), fs.statSync(path.resolve("package.json")).mtimeMs);
}

function hasFreshBuild() {
  if (!fs.existsSync(distDir) || !fs.existsSync(stampFile)) {
    return false;
  }

  const buildVersion = Number(fs.readFileSync(stampFile, "utf8"));
  return Number.isFinite(buildVersion) && buildVersion >= getSourceVersion();
}

function clearStaleLock() {
  if (!fs.existsSync(lockDir)) {
    return;
  }

  const ageMs = Date.now() - fs.statSync(lockDir).mtimeMs;
  if (ageMs > lockTtlMs) {
    fs.rmSync(lockDir, { force: true, recursive: true });
  }
}

async function acquireLock() {
  fs.mkdirSync(cacheDir, { recursive: true });

  while (true) {
    clearStaleLock();

    try {
      fs.mkdirSync(lockDir);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== "EEXIST") {
        throw error;
      }

      if (hasFreshBuild()) {
        return;
      }

      await delay(100);
    }
  }
}

export async function ensureSiteBuilt() {
  if (hasFreshBuild()) {
    return distDir;
  }

  await acquireLock();

  if (hasFreshBuild()) {
    return distDir;
  }

  try {
    execSync("npm run build", { stdio: "pipe" });
    fs.writeFileSync(stampFile, String(getSourceVersion()));
  } finally {
    if (fs.existsSync(lockDir)) {
      fs.rmSync(lockDir, { force: true, recursive: true });
    }
  }

  return distDir;
}
