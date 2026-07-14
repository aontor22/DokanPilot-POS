import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://dokandesk:dokandesk_dev_password@localhost:5432/dokandesk?schema=public",
};
const prisma = resolve("node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
const commands = [
  [process.execPath, ["--check", "src/app.js"]],
  [process.execPath, ["--check", "src/routes/api.js"]],
  [prisma, ["validate"]],
  [prisma, ["generate"]],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status || 1);
}
