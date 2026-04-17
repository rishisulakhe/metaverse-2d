import { PrismaClient } from "@prisma/client";

const client = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

export { client as prisma };
export default client;
