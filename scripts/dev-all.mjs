import { spawn } from "node:child_process";
import process from "node:process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(npm, ["run", "dev"], { stdio: "inherit" }),
  spawn(npm, ["--prefix", "backend", "run", "dev"], { stdio: "inherit" }),
];

const stop = () => children.forEach((child) => child.kill("SIGTERM"));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
children.forEach((child) => child.on("exit", (code) => {
  if (code && code !== 0) {
    stop();
    process.exitCode = code;
  }
}));
