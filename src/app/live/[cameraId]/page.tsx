import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StreamPlayer } from "@/components/stream-player";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function CameraPage({ params }: { params: Promise<{ cameraId: string }> }) {
  const session = await auth();
  if (!session?.user?.isActive) redirect("/login");
  const { cameraId } = await params;
  const camera = await db.camera.findUnique({ where: { id: cameraId }, select: { id: true, name: true, description: true, enabled: true, hasAudio: true } });
  if (!camera?.enabled) notFound();
  return <AppShell admin={session.user.role === "ADMIN"}><Link href="/live" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={17} />กลับไป Live Grid</Link><div className="mb-4"><h1 className="text-2xl font-semibold">{camera.name}</h1>{camera.description && <p className="mt-1 text-slate-400">{camera.description}</p>}</div><StreamPlayer cameraId={camera.id} cameraName={camera.name} allowAudio={Boolean(camera.hasAudio) && (session.user.role === "ADMIN" || session.user.canListenAudio)} className="aspect-video max-h-[calc(100dvh-13rem)]" /></AppShell>;
}
