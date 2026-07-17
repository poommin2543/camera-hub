import { db } from "@/lib/db";
import { verifyMediaGrant } from "@/lib/media/grants";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string; action?: string; path?: string; protocol?: string };
    if (!body.token) return new Response(null, { status: 403 });
    const grant = await verifyMediaGrant(body.token);
    if (body.action !== "read" || body.path !== grant.path || body.protocol !== grant.protocol || grant.action !== "read") return new Response(null, { status: 403 });
    const user = await db.user.findUnique({ where: { id: grant.sub }, select: { isActive: true, sessionVersion: true, canListenAudio: true, role: true } });
    if (!user?.isActive || user.sessionVersion !== grant.sessionVersion) return new Response(null, { status: 403 });
    if (grant.audio && user.role !== "ADMIN" && !user.canListenAudio) return new Response(null, { status: 403 });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 403 });
  }
}
