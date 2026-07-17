import { auth } from "@/lib/auth";
import { publicCameraSelect, toPublicCamera } from "@/lib/cameras/public-camera";
import { encryptCameraSecret } from "@/lib/crypto/camera-secrets";
import { db } from "@/lib/db";
import { canManageSystem } from "@/lib/rbac";
import { audit } from "@/lib/security/audit";
import { validateRtspTarget } from "@/lib/security/ssrf";
import { cameraPatchSchema } from "@/lib/validation/schemas";

export async function PATCH(request: Request, context: { params: Promise<{ cameraId: string }> }) {
  const session = await auth();
  if (!session?.user || !canManageSystem(session.user)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const { cameraId } = await context.params;
  const current = await db.camera.findUnique({ where: { id: cameraId } });
  if (!current) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  const raw = await request.json() as Record<string, unknown>;
  if (typeof raw.rtspUrl === "string" && raw.rtspUrl.trim() === "") delete raw.rtspUrl;
  const parsed = cameraPatchSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });

  try {
    const { rtspUrl, description, ...fields } = parsed.data;
    const target = rtspUrl ? await validateRtspTarget(rtspUrl) : null;
    const transportChanged = fields.rtspTransport !== undefined && fields.rtspTransport !== current.rtspTransport;
    const enabledChanged = fields.enabled !== undefined && fields.enabled !== current.enabled;
    const mediaChanged = Boolean(target) || transportChanged || enabledChanged;
    const shouldProbe = (target || transportChanged || (fields.enabled === true && !current.enabled)) && fields.enabled !== false;
    const changedFields = Object.keys(parsed.data).filter((key) => key !== "rtspUrl");

    const camera = await db.camera.update({
      where: { id: cameraId },
      data: {
        ...fields,
        ...(description !== undefined ? { description: description || null } : {}),
        ...(target ? {
          secretCiphertext: await encryptCameraSecret(cameraId, target.secret),
          approvedHost: target.approvedHost,
          approvedPort: target.approvedPort,
        } : {}),
        ...(mediaChanged ? { configRevision: { increment: 1 } } : {}),
        ...(shouldProbe ? { status: "PROBING", statusReasonCode: null } : {}),
        updatedById: session.user.id,
      },
      select: publicCameraSelect,
    });
    await audit({
      actorUserId: session.user.id,
      action: "CAMERA_UPDATED",
      targetType: "Camera",
      targetId: cameraId,
      metadata: { fields: changedFields.join(","), urlReplaced: Boolean(target) },
    });
    return Response.json(toPublicCamera(camera));
  } catch (error) {
    const code = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "CAMERA_UPDATE_FAILED";
    return Response.json({ error: code }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ cameraId: string }> }) {
  const session = await auth();
  if (!session?.user || !canManageSystem(session.user)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const { cameraId } = await context.params;
  const camera = await db.camera.findUnique({ where: { id: cameraId }, select: { id: true } });
  if (!camera) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  await db.camera.delete({ where: { id: cameraId } });
  await audit({ actorUserId: session.user.id, action: "CAMERA_DELETED", targetType: "Camera", targetId: cameraId });
  return new Response(null, { status: 204 });
}
