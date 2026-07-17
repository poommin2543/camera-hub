import { redirect } from "next/navigation";
import { Video } from "lucide-react";

import { AddCameraForm } from "@/components/admin/add-camera-form";

import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminCamerasPage() {
  const session = await auth();
  if (!session?.user?.isActive) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/live");
  const cameras = await db.camera.findMany({ select: { id: true, name: true, description: true, status: true, videoCodec: true, hasAudio: true, updatedAt: true }, orderBy: { name: "asc" } });
  return <AppShell admin><div className="page-heading"><div><p className="eyebrow">Administration</p><h1>จัดการกล้อง</h1><p>เพิ่ม ตรวจสอบ และติดตามสถานะ RTSP camera</p></div><AddCameraForm /></div><div className="table-card"><table><thead><tr><th>กล้อง</th><th>สถานะ</th><th>Codec</th><th>เสียง</th><th>อัปเดตล่าสุด</th></tr></thead><tbody>{cameras.map((camera) => <tr key={camera.id}><td><span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-slate-800"><Video size={17} /></span><span><strong>{camera.name}</strong><small>{camera.description || "ไม่มีคำอธิบาย"}</small></span></span></td><td>{camera.status}</td><td className="font-mono">{camera.videoCodec || "—"}</td><td>{camera.hasAudio ? "มี" : "ไม่มี"}</td><td>{camera.updatedAt.toLocaleString("th-TH")}</td></tr>)}</tbody></table>{!cameras.length && <p className="p-8 text-center text-slate-400">ยังไม่มีกล้องในระบบ</p>}</div></AppShell>;
}
