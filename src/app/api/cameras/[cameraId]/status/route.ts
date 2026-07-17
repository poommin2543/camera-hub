import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageSystem } from "@/lib/rbac";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cameraId: string }> },
) {
  const session = await auth();
  if (!session?.user?.isActive) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { cameraId } = await context.params;
  const camera = await db.camera.findUnique({ where: { id: cameraId }, select: { status: true, statusReasonCode: true, lastProbeAt: true, hasAudio: true } });
  if (!camera) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  return Response.json(camera);
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ cameraId: string }> },
) {
  const session = await auth();
  if (!session?.user || !canManageSystem(session.user)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const { cameraId } = await context.params;
  await db.camera.update({ where: { id: cameraId },     data: { status: "PROBING", statusReasonCode: null, configRevision: { increment: 1 } }, });
  return Response.json({ accepted: true }, { status: 202 });
}
