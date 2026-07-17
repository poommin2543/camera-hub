import { hash } from "argon2";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageSystem } from "@/lib/rbac";
import { audit } from "@/lib/security/audit";
import { userInputSchema } from "@/lib/validation/schemas";

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user || !canManageSystem(session.user)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const { userId } = await context.params;
  const current = await db.user.findUnique({ where: { id: userId } });
  if (!current) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const parsed = userInputSchema.partial().safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });

  if (current.role === "ADMIN" && current.isActive && (parsed.data.role === "VIEWER" || parsed.data.isActive === false)) {
    const admins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
    if (admins <= 1) return Response.json({ error: "LAST_ADMIN_REQUIRED" }, { status: 409 });
  }

  const { password, ...input } = parsed.data;
  const changedPermission = input.role !== undefined || input.canListenAudio !== undefined || input.isActive !== undefined || Boolean(password);
  const user = await db.user.update({
    where: { id: userId },
    data: {
      ...input,
      ...(password ? { passwordHash: await hash(password, { type: 2 }) } : {}),
      ...(changedPermission ? { sessionVersion: { increment: 1 } } : {}),
    },
    select: { id: true, email: true, displayName: true, role: true, canListenAudio: true, isActive: true },
  });
  await audit({ actorUserId: session.user.id, action: "USER_UPDATED", targetType: "User", targetId: userId });
  return Response.json(user);
}

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user || !canManageSystem(session.user)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const { userId } = await context.params;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (user.id === session.user.id) return Response.json({ error: "CANNOT_DELETE_SELF" }, { status: 409 });
  if (user.role === "ADMIN" && user.isActive) {
    const admins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
    if (admins <= 1) return Response.json({ error: "LAST_ADMIN_REQUIRED" }, { status: 409 });
  }
  await db.user.delete({ where: { id: userId } });
  await audit({ actorUserId: session.user.id, action: "USER_DELETED", targetType: "User", targetId: userId });
  return new Response(null, { status: 204 });
}
