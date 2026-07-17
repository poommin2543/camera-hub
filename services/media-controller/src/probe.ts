import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ProbeResult = {
  videoCodec?: string;
  audioCodec?: string;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio: boolean;
  transcodeMode: "COPY_H264" | "TRANSCODE_SOFTWARE";
};

export function classifyProbe(raw: { streams?: Array<Record<string, unknown>> }): ProbeResult {
  const video = raw.streams?.find((stream) => stream.codec_type === "video");
  const audio = raw.streams?.find((stream) => stream.codec_type === "audio");
  const rate = String(video?.avg_frame_rate ?? "0/1").split("/").map(Number);
  const fps = rate[1] ? rate[0] / rate[1] : undefined;
  const videoCodec = video?.codec_name ? String(video.codec_name) : undefined;
  return {
    videoCodec,
    audioCodec: audio?.codec_name ? String(audio.codec_name) : undefined,
    width: typeof video?.width === "number" ? video.width : undefined,
    height: typeof video?.height === "number" ? video.height : undefined,
    fps,
    hasAudio: Boolean(audio),
    transcodeMode: videoCodec === "h264" ? "COPY_H264" : "TRANSCODE_SOFTWARE",
  };
}

export async function probeCamera(cameraId: string) {
  const source = `rtsp://mediamtx:8554/_internal/raw/${cameraId}`;
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-rtsp_transport", "tcp",
    "-show_streams",
    "-of", "json",
    source,
  ], { timeout: 15_000, maxBuffer: 1_000_000 });
  const result = classifyProbe(JSON.parse(stdout) as { streams?: Array<Record<string, unknown>> });
  if (!result.videoCodec) throw new Error("NO_VIDEO_TRACK");
  return result;
}
