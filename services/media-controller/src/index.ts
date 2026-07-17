import { PrismaClient } from "@prisma/client";

import { reconcile } from "./reconciler";

const db = new PrismaClient();
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    await db.$executeRaw`SELECT pg_advisory_lock(71402026)`;
    await reconcile();
  } catch (error) {
    process.stderr.write(`reconcile failed: ${error instanceof Error ? error.message : "unknown"}\n`);
  } finally {
    await db.$executeRaw`SELECT pg_advisory_unlock(71402026)`.catch(() => undefined);
    running = false;
  }
}

async function main() {
  process.stdout.write("media-controller started\n");
  await tick();
  setInterval(() => void tick(), 5_000);
}

async function shutdown() {
  await db.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
void main();
