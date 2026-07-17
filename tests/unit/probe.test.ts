import { describe, expect, it } from "vitest";

import { classifyProbe } from "../../services/media-controller/src/probe";

describe("camera probe classification", () => {
  it("copies browser-ready H264 and discovers audio", () => {
    expect(classifyProbe({ streams: [
      { codec_type: "video", codec_name: "h264", width: 1920, height: 1080, avg_frame_rate: "25/1" },
      { codec_type: "audio", codec_name: "aac" },
    ] })).toEqual({
      videoCodec: "h264",
      audioCodec: "aac",
      width: 1920,
      height: 1080,
      fps: 25,
      hasAudio: true,
      transcodeMode: "COPY_H264",
    });
  });

  it("transcodes H265 for browser playback", () => {
    const result = classifyProbe({ streams: [{ codec_type: "video", codec_name: "hevc", avg_frame_rate: "15/1" }] });
    expect(result.transcodeMode).toBe("TRANSCODE_SOFTWARE");
    expect(result.hasAudio).toBe(false);
  });
});
