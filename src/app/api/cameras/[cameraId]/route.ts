import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageSystem } from "@/lib/rbac";
import { audit } from "@/lib/security/audit";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ cameraId: string }> },
) {
  const session = await auth();
  if (!session?.user || !canManageSystem(session.user)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const { cameraId } = await context.params;
  const camera = await db.camera.findUnique({ where: { id: cameraId }, select: { id: true } });
  if (!camera) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  await db.camera.delete({ where: { id: cameraId } });
  await audit({ actorUserId: session.user.id, action: "CAMERA_DELETED", targetType: "Camera", targetId: cameraId });
  return new Response(null, { status: 204 });
}
