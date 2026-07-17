import { randomUUID } from "node:crypto";

import { auth } from "@/lib/auth";
import { publicCameraSelect, toPublicCamera } from "@/lib/cameras/public-camera";
import { encryptCameraSecret } from "@/lib/crypto/camera-secrets";
import { db } from "@/lib/db";
import { canManageSystem } from "@/lib/rbac";
import { audit } from "@/lib/security/audit";
import { validateRtspTarget } from "@/lib/security/ssrf";
import { cameraInputSchema } from "@/lib/validation/schemas";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isActive) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const cameras = await db.camera.findMany({ select: publicCameraSelect, orderBy: { name: "asc" } });
  return Response.json(cameras.map(toPublicCamera), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !canManageSystem(session.user)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = cameraInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });

  try {
    const target = await validateRtspTarget(parsed.data.rtspUrl);
    const id = randomUUID();
    const camera = await db.camera.create({
      data: {
        id,
        name: parsed.data.name,
        description: parsed.data.description,
        enabled: parsed.data.enabled,
        rtspTransport: parsed.data.rtspTransport,
        approvedHost: target.approvedHost,
        approvedPort: target.approvedPort,
        secretCiphertext: await encryptCameraSecret(id, target.secret),
        status: parsed.data.enabled ? "PROBING" : "UNKNOWN",
        createdById: session.user.id,
        updatedById: session.user.id,
      },
      select: publicCameraSelect,
    });
    await audit({ actorUserId: session.user.id, action: "CAMERA_CREATED", targetType: "Camera", targetId: id });
    return Response.json(toPublicCamera(camera), { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "CAMERA_CREATE_FAILED";
    return Response.json({ error: code }, { status: 400 });
  }
}
