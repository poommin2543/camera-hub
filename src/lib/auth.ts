import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "argon2";
import { z } from "zod";

import { db } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        if (!user || !user.isActive || (user.lockedUntil && user.lockedUntil > new Date())) return null;

        const valid = await verify(user.passwordHash, parsed.data.password);
        if (!valid) {
          const failures = user.failedLoginCount + 1;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: failures,
              lockedUntil: failures >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
            },
          });
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: user.role,
          canListenAudio: user.canListenAudio,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.canListenAudio = user.canListenAudio;
        token.sessionVersion = user.sessionVersion;
      }
      if (!token.sub) return token;
      const current = await db.user.findUnique({ where: { id: token.sub } });
      if (!current || !current.isActive || current.sessionVersion !== token.sessionVersion) {
        token.invalid = true;
        return token;
      }
      token.role = current.role;
      token.canListenAudio = current.canListenAudio;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role as "ADMIN" | "VIEWER";
      session.user.canListenAudio = Boolean(token.canListenAudio);
      session.user.sessionVersion = Number(token.sessionVersion);
      session.user.isActive = !token.invalid;
      return session;
    },
  },
});
