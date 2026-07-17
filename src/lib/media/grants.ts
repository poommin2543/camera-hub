import { SignJWT, jwtVerify } from "jose";
import { readFile } from "node:fs/promises";

export type MediaProtocol = "webrtc" | "hls";
export type MediaGrant = {
  sub: string;
  sessionVersion: number;
  cameraId: string;
  path: string;
  protocol: MediaProtocol;
  audio: boolean;
};

async function signingKey() {
  const path = process.env.MEDIA_SIGNING_SECRET_FILE;
  if (!path) throw new Error("MEDIA_SIGNING_SECRET_FILE is required");
  return new TextEncoder().encode((await readFile(path, "utf8")).trim());
}

export async function signMediaGrant(grant: MediaGrant) {
  return new SignJWT({ ...grant, action: "read" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("camera-hub")
    .setAudience("mediamtx-reader")
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime(`${Number(process.env.MEDIA_GRANT_TTL_SECONDS || 45)}s`)
    .setSubject(grant.sub)
    .sign(await signingKey());
}

export async function verifyMediaGrant(token: string) {
  const { payload } = await jwtVerify(token, await signingKey(), {
    issuer: "camera-hub",
    audience: "mediamtx-reader",
  });
  return payload as typeof payload & MediaGrant & { action: "read" };
}
