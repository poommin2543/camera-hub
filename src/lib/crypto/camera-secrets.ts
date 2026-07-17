import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

export type CameraSecret = {
  scheme: "rtsp" | "rtsps";
  host: string;
  port: number;
  path: string;
  username?: string;
  password?: string;
};

type Envelope = { v: number; iv: string; tag: string; data: string };

async function loadKey(path = process.env.CAMERA_ENCRYPTION_KEY_FILE) {
  if (!path) throw new Error("CAMERA_ENCRYPTION_KEY_FILE is required");
  const raw = (await readFile(path, "utf8")).trim();
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("Camera encryption key must be 32 bytes in base64");
  return key;
}

export async function encryptCameraSecret(cameraId: string, secret: CameraSecret, version = 1) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", await loadKey(), iv);
  cipher.setAAD(Buffer.from(`${cameraId}:${version}`));
  const data = Buffer.concat([cipher.update(JSON.stringify(secret), "utf8"), cipher.final()]);
  const envelope: Envelope = {
    v: version,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  };
  return Buffer.from(JSON.stringify(envelope)).toString("base64url");
}

export async function decryptCameraSecret(cameraId: string, encoded: string) {
  const envelope = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Envelope;
  const decipher = createDecipheriv("aes-256-gcm", await loadKey(), Buffer.from(envelope.iv, "base64"));
  decipher.setAAD(Buffer.from(`${cameraId}:${envelope.v}`));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const clear = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(clear.toString("utf8")) as CameraSecret;
}

export function formatCameraSecret(secret: CameraSecret, includeCredentials = true) {
  const auth = includeCredentials && secret.username
    ? `${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password ?? "")}@`
    : "";
  return `${secret.scheme}://${auth}${secret.host}:${secret.port}${secret.path}`;
}

export function redactRtspUrl(value: string) {
  return value.replace(/rtsps?:\/\/[^\s/]+/gi, "rtsp://[REDACTED]");
}
