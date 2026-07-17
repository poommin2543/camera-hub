import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { signMediaGrant, type MediaProtocol } from "@/lib/media/grants";
import { mediaPath } from "@/lib/media/path-policy";
import { canListenToAudio, canViewLive } from "@/lib/rbac";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !canViewLive(session.user)) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const url = new URL(request.url);
  const cameraId = url.searchParams.get("cameraId") ?? "";
  const protocol = url.searchParams.get("protocol") as MediaProtocol;
  const wantsAudio = url.searchParams.get("audio") === "true";
  if (!(["webrtc", "hls"] as string[]).includes(protocol)) return Response.json({ error: "INVALID_PROTOCOL" }, { status: 400 });
  const camera = await db.camera.findUnique({ where: { id: cameraId }, select: { enabled: true, hasAudio: true } });
  if (!camera?.enabled) return Response.json({ error: "CAMERA_UNAVAILABLE" }, { status: 404 });
  const audio = wantsAudio && Boolean(camera.hasAudio) && canListenToAudio(session.user);
  const path = mediaPath(cameraId, protocol, audio);
  const token = await signMediaGrant({ sub: session.user.id, sessionVersion: session.user.sessionVersion, cameraId, path, protocol, audio });
  return Response.json({
    url: `/media/${protocol}/${path}/${protocol === "webrtc" ? "whep" : "index.m3u8"}`,
    token,
    audio,
    expiresIn: Number(process.env.MEDIA_GRANT_TTL_SECONDS || 45),
  });
}
