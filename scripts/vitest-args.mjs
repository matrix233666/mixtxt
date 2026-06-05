export function normalizeVitestArgs(args) {
  if (args.includes("--run")) {
    return args;
  }

  return ["--run", ...args];
}
