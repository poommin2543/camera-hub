import { auth } from "@/lib/auth";
import { publicCameraSelect, toPublicCamera } from "@/lib/cameras/public-camera";
import { db } from "@/lib/db";
import { canManageSystem } from "@/lib/rbac";
import { audit } from "@/lib/security/audit";

export async function GET(_request: Request, context: { params: Promise<{ cameraId: string }> }) {
  const session = await auth();
  if (!session?.user?.isActive) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { cameraId } = await context.params;
  const camera = await db.camera.findUnique({ where: { id: cameraId }, select: publicCameraSelect });
  if (!camera) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  return Response.json(toPublicCamera(camera), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(_request: Request, context: { params: Promise<{ cameraId: string }> }) {
  const session = await auth();
  if (!session?.user || !canManageSystem(session.user)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const { cameraId } = await context.params;
  const camera = await db.camera.findUnique({ where: { id: cameraId }, select: { enabled: true } });
  if (!camera) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!camera.enabled) return Response.json({ error: "CAMERA_DISABLED" }, { status: 409 });
  await db.camera.update({ where: { id: cameraId }, data: { status: "PROBING", statusReasonCode: null } });
  await audit({ actorUserId: session.user.id, action: "CAMERA_PROBE_REQUESTED", targetType: "Camera", targetId: cameraId });
  return Response.json({ accepted: true, status: "PROBING" }, { status: 202 });
}
