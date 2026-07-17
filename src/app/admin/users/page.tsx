import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";

import { AddUserForm } from "@/components/admin/add-user-form";

import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.isActive) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/live");
  const users = await db.user.findMany({ select: { id: true, displayName: true, email: true, role: true, canListenAudio: true, isActive: true, lastLoginAt: true }, orderBy: { displayName: "asc" } });
  return <AppShell admin><div className="page-heading"><div><p className="eyebrow">Access control</p><h1>ผู้ใช้งาน</h1><p>ควบคุมบทบาทและสิทธิ์การฟังเสียงจากกล้อง</p></div><AddUserForm /></div><div className="table-card"><table><thead><tr><th>ผู้ใช้</th><th>บทบาท</th><th>สิทธิ์เสียง</th><th>สถานะ</th><th>เข้าสู่ระบบล่าสุด</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-slate-800"><UserRound size={17} /></span><span><strong>{user.displayName}</strong><small>{user.email}</small></span></span></td><td>{user.role}</td><td>{user.role === "ADMIN" || user.canListenAudio ? "อนุญาต" : "ไม่อนุญาต"}</td><td>{user.isActive ? "Active" : "Disabled"}</td><td>{user.lastLoginAt?.toLocaleString("th-TH") || "ยังไม่เคย"}</td></tr>)}</tbody></table></div></AppShell>;
}
