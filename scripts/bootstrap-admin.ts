import { hash } from "argon2";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME ?? "Camera Hub Admin";

  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters)");
  }

  await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      displayName,
      passwordHash: await hash(password, { type: 2 }),
      role: "ADMIN",
      canListenAudio: true,
    },
  });

  process.stdout.write(`Admin account ready: ${email}\n`);
}

main().finally(() => db.$disconnect());
