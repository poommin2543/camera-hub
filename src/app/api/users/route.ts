import { hash } from "argon2";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageSystem } from "@/lib/rbac";
import { audit } from "@/lib/security/audit";
import { userInputSchema } from "@/lib/validation/schemas";

const userSelect = { id: true, email: true, displayName: true, role: true, canListenAudio: true, isActive: true, lastLoginAt: true, createdAt: true } as const;

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageSystem(session.user)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  return Response.json(await db.user.findMany({ select: userSelect, orderBy: { displayName: "asc" } }));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !canManageSystem(session.user)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = userInputSchema.safeParse(await request.json());
  if (!parsed.success || !parsed.data.password) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const { password, ...input } = parsed.data;
  const user = await db.user.create({
    data: { ...input, passwordHash: await hash(password, { type: 2 }) },
    select: userSelect,
  });
  await audit({ actorUserId: session.user.id, action: "USER_CREATED", targetType: "User", targetId: user.id });
  return Response.json(user, { status: 201 });
}
