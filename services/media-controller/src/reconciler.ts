import { PrismaClient } from "@prisma/client";

import { decryptCameraSecret } from "../../../src/lib/crypto/camera-secrets";
import { buildPathConfigurations } from "./config-renderer";
import { deletePath, listConfiguredPaths, upsertPath } from "./mediamtx-api";
import { probeCamera } from "./probe";

const db = new PrismaClient();
const PREFIXES = ["_internal/raw/", "view/"];

export async function reconcile() {
  const cameras = await db.camera.findMany({ where: { enabled: true } });
  const desired = new Map<string, Record<string, unknown>>();

  for (const camera of cameras) {
    const secret = await decryptCameraSecret(camera.id, camera.secretCiphertext);
    const paths = buildPathConfigurations({
      id: camera.id,
      secret,
      transport: camera.rtspTransport,
      transcodeMode: camera.transcodeMode,
      hasAudio: Boolean(camera.hasAudio),
    });
    for (const [name, config] of Object.entries(paths)) desired.set(name, config);
  }

  const existing = await listConfiguredPaths();
  for (const [name, config] of desired) await upsertPath(name, config, existing);
  for (const name of existing) {
    if (PREFIXES.some((prefix) => name.startsWith(prefix)) && !desired.has(name)) {
      await deletePath(name);
    }
  }

  for (const camera of cameras) {
    if (camera.status !== "PROBING") continue;
    try {
      const result = await probeCamera(camera.id);
      await db.camera.update({
        where: { id: camera.id },
        data: {
          ...result,
          status: "ONLINE",
          statusReasonCode: null,
          lastProbeAt: new Date(),
          configRevision: { increment: 1 },
        },
      });
    } catch {
      await db.camera.update({
        where: { id: camera.id },
        data: { status: "OFFLINE", statusReasonCode: "CAMERA_CONNECT_FAILED", lastProbeAt: new Date() },
      });
    }
  }

  await Promise.all(cameras.map((camera) => db.camera.update({
    where: { id: camera.id },
    data: { appliedRevision: camera.configRevision },
  })));
}
