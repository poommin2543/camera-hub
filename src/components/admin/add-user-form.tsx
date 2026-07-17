"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(data: FormData) {
    setBusy(true); setError("");
    const response = await fetch("/api/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email"), displayName: data.get("displayName"), password: data.get("password"), role: data.get("role"), canListenAudio: data.get("canListenAudio") === "on", isActive: true }) });
    setBusy(false);
    if (!response.ok) { setError("สร้างผู้ใช้ไม่สำเร็จ กรุณาตรวจข้อมูลหรืออีเมลซ้ำ"); return; }
    setOpen(false); router.refresh();
  }
  return <><button className="primary-button" onClick={() => setOpen(true)}><Plus size={17} />เพิ่มผู้ใช้</button>{open && <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title"><form action={submit} className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-900 p-6"><div className="mb-5 flex items-center justify-between"><h2 id="user-dialog-title" className="text-xl font-semibold">เพิ่มผู้ใช้งาน</h2><button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-lg hover:bg-slate-800" aria-label="ปิด"><X /></button></div><div className="space-y-4"><div><label className="form-label" htmlFor="display-name">ชื่อที่แสดง</label><input id="display-name" name="displayName" className="form-input" required /></div><div><label className="form-label" htmlFor="user-email">อีเมล</label><input id="user-email" name="email" type="email" autoComplete="email" className="form-input" required /></div><div><label className="form-label" htmlFor="new-password">รหัสผ่านเริ่มต้น</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} className="form-input" required /><p className="mt-2 text-xs text-slate-400">อย่างน้อย 12 ตัวอักษร</p></div><div><label className="form-label" htmlFor="user-role">บทบาท</label><select id="user-role" name="role" className="form-input" defaultValue="VIEWER"><option value="VIEWER">Viewer</option><option value="ADMIN">Admin</option></select></div><label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="canListenAudio" className="size-5" /><span>อนุญาตให้ฟังเสียงจากกล้อง</span></label>{error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}<button disabled={busy} className="primary-button w-full justify-center disabled:opacity-50">{busy ? "กำลังสร้าง…" : "สร้างผู้ใช้"}</button></div></form></div>}</>;
}
