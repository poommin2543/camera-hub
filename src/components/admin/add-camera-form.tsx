"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddCameraForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setBusy(true); setError("");
    const response = await fetch("/api/cameras", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: formData.get("name"), description: formData.get("description") || undefined, rtspUrl: formData.get("rtspUrl"), enabled: true, rtspTransport: formData.get("rtspTransport") }),
    });
    setBusy(false);
    if (!response.ok) { const body = await response.json(); setError(body.error ?? "เพิ่มกล้องไม่สำเร็จ"); return; }
    setOpen(false); router.refresh();
  }

  return <><button className="primary-button" onClick={() => setOpen(true)}><Plus size={17} />เพิ่มกล้อง</button>{open && <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="camera-dialog-title"><form action={submit} className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-900 p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 id="camera-dialog-title" className="text-xl font-semibold">เพิ่มกล้อง RTSP</h2><button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-lg hover:bg-slate-800" aria-label="ปิด"><X /></button></div><div className="space-y-4"><div><label className="form-label" htmlFor="camera-name">ชื่อกล้อง</label><input className="form-input" id="camera-name" name="name" required maxLength={80} /></div><div><label className="form-label" htmlFor="rtsp-url">RTSP URL</label><input className="form-input font-mono" id="rtsp-url" name="rtspUrl" type="url" required placeholder="rtsp://user:password@192.168.1.20:554/stream" autoComplete="off" /><p className="mt-2 text-xs text-slate-400">URL จะถูกเข้ารหัสก่อนเก็บลงฐานข้อมูล</p></div><div><label className="form-label" htmlFor="camera-description">คำอธิบาย</label><input className="form-input" id="camera-description" name="description" maxLength={240} /></div><div><label className="form-label" htmlFor="rtsp-transport">Transport</label><select className="form-input" id="rtsp-transport" name="rtspTransport" defaultValue="TCP"><option value="TCP">TCP (แนะนำ)</option><option value="AUTOMATIC">Automatic</option></select></div>{error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}<button disabled={busy} className="primary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-50">{busy ? "กำลังตรวจสอบและบันทึก…" : "เพิ่มกล้อง"}</button></div></form></div>}</>;
}
