import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { CameraGrid } from "@/components/camera-grid";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function LivePage() {
  const session = await auth();
  if (!session?.user?.isActive) redirect("/login");
  const cameras = await db.camera.findMany({ where: { enabled: true }, select: { id: true, name: true, status: true, hasAudio: true }, orderBy: { name: "asc" } });
  const online = cameras.filter((camera) => camera.status === "ONLINE").length;
  return <AppShell admin={session.user.role === "ADMIN"}><section className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">ศูนย์เฝ้าระวัง</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">ภาพสดจากกล้อง</h1><p className="mt-1 text-sm text-slate-400">ดูสถานะและภาพสดจากกล้องทั้งหมดในจุดเดียว</p></div><div className="flex gap-2"><span className="status-pill"><i className="size-2 rounded-full bg-emerald-400" />ออนไลน์ {online}</span><span className="status-pill">ทั้งหมด {cameras.length}</span></div></section><CameraGrid cameras={cameras} allowAudio={session.user.role === "ADMIN" || session.user.canListenAudio} /></AppShell>;
}
