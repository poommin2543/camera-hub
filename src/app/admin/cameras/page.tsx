import { redirect } from "next/navigation";

import { AddCameraForm } from "@/components/admin/add-camera-form";
import { CameraManagement, type CameraAdminDto } from "@/components/admin/camera-management";
import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth";
import { publicCameraSelect, toPublicCamera } from "@/lib/cameras/public-camera";
import { db } from "@/lib/db";

export default async function AdminCamerasPage() {
  const session = await auth();
  if (!session?.user?.isActive) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/live");
  const records = await db.camera.findMany({ select: publicCameraSelect, orderBy: { name: "asc" } });
  const cameras = records.map(toPublicCamera) as unknown as CameraAdminDto[];
  return <AppShell admin><div className="page-heading"><div><p className="eyebrow">Administration</p><h1>จัดการกล้อง</h1><p>แก้ไข ตรวจสอบ และติดตาม codec/status ของ RTSP cameras</p></div><AddCameraForm /></div><CameraManagement initialCameras={cameras} /></AppShell>;
}
