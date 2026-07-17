import { describe, expect, it } from "vitest";

import { buildPathConfigurations } from "../../services/media-controller/src/config-renderer";

const base = {
  id: "camera_12345678",
  secret: { scheme: "rtsp" as const, host: "192.168.1.20", port: 554, path: "/stream", username: "admin", password: "secret" },
  transport: "TCP" as const,
  hasAudio: true,
};

describe("MediaMTX path configuration", () => {
  it("keeps credentials only in the internal raw path", () => {
    const paths = buildPathConfigurations({ ...base, transcodeMode: "COPY_H264" });
    expect(paths["_internal/raw/camera_12345678"].source).toContain("admin:secret@");
    expect(JSON.stringify(paths["view/camera_12345678/video"])).not.toContain("secret");
  });

  it("removes audio from video-only and transcodes H265 once", () => {
    const paths = buildPathConfigurations({ ...base, transcodeMode: "TRANSCODE_SOFTWARE" });
    expect(paths["view/camera_12345678/video"].runOnDemand).toContain("-an");
    expect(paths["view/camera_12345678/video"].runOnDemand).toContain("libx264");
    expect(paths["view/camera_12345678/webrtc-av"].runOnDemand).toContain("libopus");
    expect(paths["view/camera_12345678/hls-av"].runOnDemand).toContain("-c:a aac");
  });
});
