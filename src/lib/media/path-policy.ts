import type { MediaProtocol } from "@/lib/media/grants";

const CAMERA_ID = /^[a-zA-Z0-9_-]{8,64}$/;

export function mediaPath(cameraId: string, protocol: MediaProtocol, audio: boolean) {
  if (!CAMERA_ID.test(cameraId)) throw new Error("INVALID_CAMERA_ID");
  if (!audio) return `view/${cameraId}/video`;
  return `view/${cameraId}/${protocol === "webrtc" ? "webrtc-av" : "hls-av"}`;
}

export function parsePublicMediaPath(path: string) {
  const match = /^view\/([a-zA-Z0-9_-]{8,64})\/(video|webrtc-av|hls-av)$/.exec(path);
  if (!match) return null;
  return { cameraId: match[1], audio: match[2] !== "video", variant: match[2] };
}
