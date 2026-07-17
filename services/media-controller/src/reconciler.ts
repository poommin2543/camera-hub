import { PrismaClient, type Camera } from "@prisma/client";

import { decryptCameraSecret } from "../../../src/lib/crypto/camera-secrets";
import { buildPathConfigurations } from "./config-renderer";
import { addPath, deletePath, listConfiguredPaths, replacePath } from "./mediamtx-api";
import { probeCamera } from "./probe";

const db = new PrismaClient();
const PREFIXES = ["_internal/raw/", "view/"];
const cameraPathNames = (id: string) => [
  `_internal/raw/${id}`,
  `view/${id}/video`,
  `view/${id}/webrtc-av`,
  `view/${id}/hls-av`,
];

async function applyCamera(camera: Camera, existing: Set<string>) {
  const required = cameraPathNames(camera.id);
  const needsApply = camera.configRevision !== camera.appliedRevision || required.some((name) => !existing.has(name));
  if (!needsApply) return false;
  const revision = camera.configRevision;
  const secret = await decryptCameraSecret(camera.id, camera.secretCiphertext);
  const paths = buildPathConfigurations({
    id: camera.id,
    secret,
    transport: camera.rtspTransport,
    transcodeMode: camera.transcodeMode,
    hasAudio: Boolean(camera.hasAudio),
  });
  for (const [name, config] of Object.entries(paths)) {
    if (existing.has(name)) await replacePath(name, config);
    else {
      await addPath(name, config);
      existing.add(name);
    }
  }
  await db.camera.updateMany({
    where: { id: camera.id, configRevision: revision },
    data: { appliedRevision: revision },
  });
  return true;
}

async function probe(camera: Camera) {
  if (camera.status !== "PROBING") return;
  try {
    const result = await probeCamera(camera.id);
    const pipelineChanged = result.hasAudio !== camera.hasAudio || result.transcodeMode !== camera.transcodeMode;
    await db.camera.update({
      where: { id: camera.id },
      data: {
        ...result,
        status: "ONLINE",
        statusReasonCode: null,
        lastProbeAt: new Date(),
        ...(pipelineChanged ? { configRevision: { increment: 1 } } : {}),
      },
    });
  } catch (error) {
    const reason = error instanceof Error && error.message === "NO_VIDEO_TRACK"
      ? "NO_VIDEO_TRACK"
      : error instanceof Error && error.message.includes("timeout")
        ? "CAMERA_CONNECT_TIMEOUT"
        : "CAMERA_CONNECT_FAILED";
    await db.camera.update({
      where: { id: camera.id },
      data: { status: "OFFLINE", statusReasonCode: reason, lastProbeAt: new Date() },
    });
  }
}

export async function reconcile() {
  const cameras = await db.camera.findMany();
  const enabled = cameras.filter((camera) => camera.enabled);
  const desiredNames = new Set(enabled.flatMap((camera) => cameraPathNames(camera.id)));
  const existing = await listConfiguredPaths();
  let applied = 0;
  let failed = 0;
  let removed = 0;

  for (const camera of enabled) {
    try {
      if (await applyCamera(camera, existing)) applied++;
    } catch {
      failed++;
    }
  }

  for (const name of existing) {
    if (!PREFIXES.some((prefix) => name.startsWith(prefix)) || desiredNames.has(name)) continue;
    try {
      await deletePath(name);
      removed++;
    } catch {
      failed++;
    }
  }

  const probing = enabled.filter((camera) => camera.status === "PROBING");
  for (let index = 0; index < probing.length; index += 2) {
    await Promise.allSettled(probing.slice(index, index + 2).map(probe));
  }

  if (applied || failed || removed || probing.length) {
    process.stdout.write(`reconcile applied=${applied} probed=${probing.length} removed=${removed} failed=${failed}\n`);
  }
}
