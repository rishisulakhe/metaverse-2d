import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const rawUrl = process.env.DATABASE_URL ?? "";
const connectionString = rawUrl.replace(/^["']|["']$/g, "");

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const u = new URL(connectionString);
const pool = new pg.Pool({
  host: u.hostname,
  port: parseInt(u.port || "5432"),
  database: u.pathname.slice(1),
  user: u.username,
  password: u.password || "",
});

const adapter = new PrismaPg(pool);
const client = new PrismaClient({ adapter });

export { client as prisma };
export default client;
