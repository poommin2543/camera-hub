import { describe, expect, it } from "vitest";

import { mediaPath, parsePublicMediaPath } from "@/lib/media/path-policy";

describe("media path policy", () => {
  it("creates isolated audio paths", () => {
    const id = "camera_12345678";
    expect(mediaPath(id, "webrtc", false)).toBe(`view/${id}/video`);
    expect(mediaPath(id, "webrtc", true)).toBe(`view/${id}/webrtc-av`);
    expect(mediaPath(id, "hls", true)).toBe(`view/${id}/hls-av`);
  });

  it("rejects internal and malformed paths", () => {
    expect(parsePublicMediaPath("_internal/raw/secret")).toBeNull();
    expect(() => mediaPath("../secret", "hls", false)).toThrow();
  });
});
