import { randomUUID } from "node:crypto";

import { auth } from "@/lib/auth";
import { encryptCameraSecret } from "@/lib/crypto/camera-secrets";
import { db } from "@/lib/db";
import { canManageSystem } from "@/lib/rbac";
import { audit } from "@/lib/security/audit";
import { validateRtspTarget } from "@/lib/security/ssrf";
import { cameraInputSchema } from "@/lib/validation/schemas";

const publicSelect = {
  id: true,
  name: true,
  description: true,
  enabled: true,
  status: true,
  statusReasonCode: true,
  videoCodec: true,
  audioCodec: true,
  hasAudio: true,
  width: true,
  height: true,
  fps: true,
  configRevision: true,
  updatedAt: true,
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.isActive) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return Response.json(await db.camera.findMany({ select: publicSelect, orderBy: { name: "asc" } }));
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
        createdById: session.user.id,
        updatedById: session.user.id,
      },
      select: publicSelect,
    });
    await audit({ actorUserId: session.user.id, action: "CAMERA_CREATED", targetType: "Camera", targetId: id });
    return Response.json(camera, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "CAMERA_CREATE_FAILED";
    return Response.json({ error: code }, { status: 400 });
  }
}
