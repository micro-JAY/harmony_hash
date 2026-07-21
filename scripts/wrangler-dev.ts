import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const OPTIONAL_LOCAL_BINDINGS = ["ALLOWED_ORIGIN", "HH_VOICE_AGENT_ID"] as const;

type LocalEnvironment = Record<string, string | undefined>;

function environmentName(args: readonly string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--env" || argument === "-e") return args[index + 1];
    if (argument.startsWith("--env=")) return argument.slice("--env=".length);
    if (argument.startsWith("-e=")) return argument.slice("-e=".length);
  }
  return undefined;
}

export function localVarsPath(cwd: string, envName?: string): string | undefined {
  const candidates = envName
    ? [resolve(cwd, `.dev.vars.${envName}`), resolve(cwd, ".dev.vars")]
    : [resolve(cwd, ".dev.vars")];
  return candidates.find((candidate) => existsSync(candidate));
}

/** Build Wrangler's supported non-secret overrides without forwarding provider secrets. */
export function buildWranglerArgs(
  userArgs: readonly string[],
  environment: LocalEnvironment,
): string[] {
  const localOverrides = OPTIONAL_LOCAL_BINDINGS.flatMap((name) => {
    const value = environment[name]?.trim();
    return value ? ["--var", `${name}:${value}`] : [];
  });

  return ["wrangler", "dev", ...localOverrides, ...userArgs];
}

function main(): void {
  const userArgs = process.argv.slice(2);
  const varsPath = localVarsPath(process.cwd(), environmentName(userArgs));
  if (varsPath) process.loadEnvFile(varsPath);

  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(command, buildWranglerArgs(userArgs, process.env), {
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error("Unable to start Wrangler:", error.message);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 1;
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
