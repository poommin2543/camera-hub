import type { Prisma } from "@prisma/client";

export const publicCameraSelect = {
  id: true,
  name: true,
  description: true,
  enabled: true,
  rtspTransport: true,
  approvedHost: true,
  approvedPort: true,
  status: true,
  statusReasonCode: true,
  videoCodec: true,
  audioCodec: true,
  width: true,
  height: true,
  fps: true,
  hasAudio: true,
  transcodeMode: true,
  lastProbeAt: true,
  configRevision: true,
  appliedRevision: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CameraSelect;

export type PublicCamera = Prisma.CameraGetPayload<{ select: typeof publicCameraSelect }>;

export function toPublicCamera(camera: PublicCamera) {
  return {
    id: camera.id,
    name: camera.name,
    description: camera.description,
    enabled: camera.enabled,
    rtspTransport: camera.rtspTransport,
    endpoint: `${camera.approvedHost}:${camera.approvedPort}`,
    status: camera.status,
    statusReasonCode: camera.statusReasonCode,
    videoCodec: camera.videoCodec,
    audioCodec: camera.audioCodec,
    width: camera.width,
    height: camera.height,
    fps: camera.fps,
    hasAudio: camera.hasAudio,
    transcodeMode: camera.transcodeMode,
    lastProbeAt: camera.lastProbeAt,
    configRevision: camera.configRevision,
    appliedRevision: camera.appliedRevision,
    createdAt: camera.createdAt,
    updatedAt: camera.updatedAt,
  };
}
