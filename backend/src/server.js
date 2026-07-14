import "dotenv/config";
import { z } from "zod";

const env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5050),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("8h"),
  FRONTEND_URL: z.string().default("http://localhost:3000,http://localhost:5173"),
}).parse(process.env);

Object.assign(process.env, env, { PORT: String(env.PORT) });
const { default: app } = await import("./app.js");
app.listen(env.PORT, () => console.log(`DokanDesk POS API running at http://localhost:${env.PORT}`));
