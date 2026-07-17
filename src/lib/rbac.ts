import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  role: Role;
  canListenAudio: boolean;
  sessionVersion: number;
  isActive: boolean;
};

export function canManageSystem(user: SessionUser) {
  return user.isActive && user.role === "ADMIN";
}

export function canViewLive(user: SessionUser) {
  return user.isActive && (user.role === "ADMIN" || user.role === "VIEWER");
}

export function canListenToAudio(user: SessionUser) {
  return user.isActive && (user.role === "ADMIN" || user.canListenAudio);
}

export function requireAdmin(user: SessionUser | null | undefined) {
  if (!user || !canManageSystem(user)) throw new Error("FORBIDDEN");
  return user;
}
