import { auth } from "@/lib/auth";
import { decryptCameraSecret, formatCameraSecret } from "@/lib/crypto/camera-secrets";
import { db } from "@/lib/db";
import { canManageSystem } from "@/lib/rbac";
import { audit } from "@/lib/security/audit";

export async function GET(_request: Request, context: { params: Promise<{ cameraId: string }> }) {
  const session = await auth();
  if (!session?.user || !canManageSystem(session.user)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const { cameraId } = await context.params;
  const camera = await db.camera.findUnique({ where: { id: cameraId }, select: { secretCiphertext: true } });
  if (!camera) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const secret = await decryptCameraSecret(cameraId, camera.secretCiphertext);
  await audit({ actorUserId: session.user.id, action: "CAMERA_SECRET_REVEALED", targetType: "Camera", targetId: cameraId });
  return Response.json({ rtspUrl: formatCameraSecret(secret) }, {
    headers: { "Cache-Control": "no-store, private", Pragma: "no-cache", "Referrer-Policy": "no-referrer" },
  });
}
