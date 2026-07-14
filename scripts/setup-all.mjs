import { copyFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (args, cwd = process.cwd()) => {
  const result = spawnSync(npm, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
};

if (!existsSync(".env")) copyFileSync(".env.example", ".env");
if (!existsSync("backend/.env")) copyFileSync("backend/.env.example", "backend/.env");
run(["install"]);
run(["install"], "backend");
run(["run", "prisma:generate"], "backend");
console.log("Setup complete. Next: npm run db:up && npm run db:migrate:local && npm run db:seed && npm run dev:all");
