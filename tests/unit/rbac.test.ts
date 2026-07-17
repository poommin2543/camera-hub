import { describe, expect, it } from "vitest";

import { canListenToAudio, canManageSystem, canViewLive } from "@/lib/rbac";

const viewer = { id: "u1", role: "VIEWER" as const, canListenAudio: false, sessionVersion: 1, isActive: true };

describe("RBAC", () => {
  it("allows active viewers to see live video without audio", () => {
    expect(canViewLive(viewer)).toBe(true);
    expect(canListenToAudio(viewer)).toBe(false);
    expect(canManageSystem(viewer)).toBe(false);
  });

  it("rejects inactive accounts", () => {
    expect(canViewLive({ ...viewer, isActive: false })).toBe(false);
  });

  it("allows admins to manage and hear audio", () => {
    const admin = { ...viewer, role: "ADMIN" as const };
    expect(canManageSystem(admin)).toBe(true);
    expect(canListenToAudio(admin)).toBe(true);
  });
});
