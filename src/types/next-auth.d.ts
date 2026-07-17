import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    canListenAudio: boolean;
    sessionVersion: number;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      canListenAudio: boolean;
      sessionVersion: number;
      isActive: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    canListenAudio: boolean;
    sessionVersion: number;
    invalid?: boolean;
  }
}
