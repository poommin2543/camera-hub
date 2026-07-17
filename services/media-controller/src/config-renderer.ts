import type { CameraSecret } from "../../../src/lib/crypto/camera-secrets";

export type CameraPipeline = {
  id: string;
  secret: CameraSecret;
  transport: "TCP" | "AUTOMATIC";
  transcodeMode: "UNKNOWN" | "COPY_H264" | "TRANSCODE_SOFTWARE" | "TRANSCODE_HARDWARE";
  hasAudio: boolean;
};

function sourceUrl(secret: CameraSecret) {
  const auth = secret.username
    ? `${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password ?? "")}@`
    : "";
  return `${secret.scheme}://${auth}${secret.host}:${secret.port}${secret.path}`;
}

function publishCommand(camera: CameraPipeline, variant: "video" | "webrtc-av" | "hls-av") {
  const input = `rtsp://127.0.0.1:8554/_internal/raw/${camera.id}`;
  const output = `rtsp://127.0.0.1:8554/view/${camera.id}/${variant}`;
  const copyVideo = camera.transcodeMode === "COPY_H264";
  const video = copyVideo
    ? "-c:v copy"
    : "-c:v libx264 -preset veryfast -tune zerolatency -pix_fmt yuv420p -bf 0 -g 30";
  const audio = variant === "video" || !camera.hasAudio
    ? "-an"
    : variant === "webrtc-av"
      ? "-c:a libopus -ar 48000 -ac 1 -b:a 64k"
      : "-c:a aac -ar 48000 -ac 1 -b:a 96k";
  return `ffmpeg -hide_banner -loglevel warning -rtsp_transport tcp -i '${input}' ${video} ${audio} -f rtsp -rtsp_transport tcp '${output}'`;
}

export function buildPathConfigurations(camera: CameraPipeline) {
  const base = {
    sourceOnDemand: true,
    sourceOnDemandStartTimeout: "15s",
    sourceOnDemandCloseAfter: "30s",
    record: false,
  };
  return {
    [`_internal/raw/${camera.id}`]: {
      ...base,
      source: sourceUrl(camera.secret),
      rtspTransport: camera.transport === "TCP" ? "tcp" : "automatic",
    },
    [`view/${camera.id}/video`]: {
      ...base,
      source: "publisher",
      runOnDemand: publishCommand(camera, "video"),
      runOnDemandRestart: true,
      runOnDemandStartTimeout: "20s",
      runOnDemandCloseAfter: "30s",
    },
    [`view/${camera.id}/webrtc-av`]: {
      ...base,
      source: "publisher",
      runOnDemand: publishCommand(camera, "webrtc-av"),
      runOnDemandRestart: true,
      runOnDemandStartTimeout: "20s",
      runOnDemandCloseAfter: "30s",
    },
    [`view/${camera.id}/hls-av`]: {
      ...base,
      source: "publisher",
      runOnDemand: publishCommand(camera, "hls-av"),
      runOnDemandRestart: true,
      runOnDemandStartTimeout: "20s",
      runOnDemandCloseAfter: "30s",
    },
  } as Record<string, Record<string, unknown>>;
}
