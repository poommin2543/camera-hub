"use client";

import { Eye, EyeOff, Pencil, Power, RefreshCw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type CameraAdminDto = {
  id: string; name: string; description: string | null; enabled: boolean;
  rtspTransport: "TCP" | "AUTOMATIC"; endpoint: string;
  status: "UNKNOWN" | "PROBING" | "ONLINE" | "OFFLINE" | "ERROR";
  statusReasonCode: string | null; videoCodec: string | null; audioCodec: string | null;
  width: number | null; height: number | null; fps: number | null; hasAudio: boolean | null;
  transcodeMode: string; lastProbeAt: string | null; updatedAt: string;
  configRevision: number; appliedRevision: number;
};

const reasonText: Record<string, string> = {
  CAMERA_CONNECT_FAILED: "เชื่อมต่อกล้องไม่ได้",
  CAMERA_CONNECT_TIMEOUT: "หมดเวลารอการเชื่อมต่อ",
  NO_VIDEO_TRACK: "ไม่พบวิดีโอใน Stream",
};

function StatusBadge({ camera }: { camera: CameraAdminDto }) {
  const tone = camera.status === "ONLINE" ? "bg-emerald-950 text-emerald-200" : camera.status === "PROBING" ? "bg-blue-950 text-blue-200" : camera.status === "OFFLINE" || camera.status === "ERROR" ? "bg-red-950 text-red-200" : "bg-slate-800 text-slate-300";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{camera.status}</span>;
}

export function CameraManagement({ initialCameras }: { initialCameras: CameraAdminDto[] }) {
  const [cameras, setCameras] = useState(initialCameras);
  const [editing, setEditing] = useState<CameraAdminDto | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const polling = useRef(false);

  const refresh = useCallback(async () => {
    if (polling.current || document.visibilityState !== "visible") return;
    polling.current = true;
    try {
      const response = await fetch("/api/cameras", { cache: "no-store" });
      if (response.ok) setCameras(await response.json());
    } finally { polling.current = false; }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 10_000);
    const visible = () => void refresh();
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);

  async function probe(camera: CameraAdminDto) {
    setBusyId(camera.id); setMessage("");
    const response = await fetch(`/api/cameras/${camera.id}/status`, { method: "POST" });
    setBusyId(null);
    if (!response.ok) { setMessage("สั่งตรวจสอบกล้องไม่สำเร็จ"); return; }
    setCameras((items) => items.map((item) => item.id === camera.id ? { ...item, status: "PROBING", statusReasonCode: null } : item));
    window.setTimeout(() => void refresh(), 2_000);
  }

  async function toggle(camera: CameraAdminDto) {
    setBusyId(camera.id);
    const response = await fetch(`/api/cameras/${camera.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: !camera.enabled }) });
    setBusyId(null);
    if (response.ok) { const updated = await response.json(); setCameras((items) => items.map((item) => item.id === camera.id ? updated : item)); }
    else setMessage("เปลี่ยนสถานะกล้องไม่สำเร็จ");
  }

  async function remove(camera: CameraAdminDto) {
    if (!window.confirm(`ลบกล้อง “${camera.name}” ถาวรหรือไม่?`)) return;
    setBusyId(camera.id);
    const response = await fetch(`/api/cameras/${camera.id}`, { method: "DELETE" });
    setBusyId(null);
    if (response.ok) setCameras((items) => items.filter((item) => item.id !== camera.id));
    else setMessage("ลบกล้องไม่สำเร็จ");
  }

  return <><div aria-live="polite" className="mb-3 min-h-6 text-sm text-amber-200">{message}</div><div className="table-card"><table><thead><tr><th>กล้อง</th><th>สถานะ</th><th>Video</th><th>Audio</th><th>ตรวจล่าสุด</th><th>จัดการ</th></tr></thead><tbody>{cameras.map((camera) => <tr key={camera.id}><td><strong>{camera.name}</strong><small>{camera.description || camera.endpoint}</small><span className="mt-1 block text-xs text-slate-500">{camera.enabled ? "Enabled" : "Disabled"}{camera.configRevision > camera.appliedRevision ? " · กำลัง apply" : ""}</span></td><td><StatusBadge camera={camera} /><small>{camera.statusReasonCode ? reasonText[camera.statusReasonCode] || camera.statusReasonCode : "—"}</small></td><td><span className="font-mono">{camera.videoCodec || "Unknown"}</span><small>{camera.width && camera.height ? `${camera.width}×${camera.height} · ${camera.fps?.toFixed(1) || "?"} FPS` : "ยังไม่ตรวจ"}</small></td><td>{camera.hasAudio === null ? "Unknown" : camera.hasAudio ? camera.audioCodec || "มีเสียง" : "ไม่มีเสียง"}</td><td>{camera.lastProbeAt ? new Date(camera.lastProbeAt).toLocaleString("th-TH") : "ยังไม่ตรวจ"}<small>แก้ไข {new Date(camera.updatedAt).toLocaleString("th-TH")}</small></td><td><div className="flex flex-wrap gap-2"><button className="action-button" onClick={() => setEditing(camera)} aria-label={`แก้ไข ${camera.name}`}><Pencil size={15} />แก้ไข</button><button className="action-button" onClick={() => void probe(camera)} disabled={!camera.enabled || busyId === camera.id}><RefreshCw size={15} />{camera.status === "OFFLINE" ? "ลองใหม่" : "ตรวจ"}</button><button className="action-button" onClick={() => void toggle(camera)} disabled={busyId === camera.id}><Power size={15} />{camera.enabled ? "ปิด" : "เปิด"}</button><button className="danger-button" onClick={() => void remove(camera)} disabled={busyId === camera.id}><Trash2 size={15} />ลบ</button></div></td></tr>)}</tbody></table>{!cameras.length && <p className="p-8 text-center text-slate-400">ยังไม่มีกล้องในระบบ</p>}</div>{editing && <CameraSettingsDialog camera={editing} onClose={() => setEditing(null)} onSaved={(updated) => { setCameras((items) => items.map((item) => item.id === updated.id ? updated : item)); setEditing(null); }} />}</>;
}

function CameraSettingsDialog({ camera, onClose, onSaved }: { camera: CameraAdminDto; onClose: () => void; onSaved: (camera: CameraAdminDto) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [revealed, setRevealed] = useState("");
  async function reveal() { if (revealed) { setRevealed(""); return; } const response = await fetch(`/api/cameras/${camera.id}/secret`, { cache: "no-store" }); if (response.ok) setRevealed((await response.json()).rtspUrl); else setError("เปิดเผย RTSP URL ไม่สำเร็จ"); }
  async function submit(data: FormData) { setBusy(true); setError(""); const response = await fetch(`/api/cameras/${camera.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: data.get("name"), description: data.get("description"), rtspUrl: data.get("rtspUrl"), rtspTransport: data.get("rtspTransport"), enabled: data.get("enabled") === "on" }) }); setBusy(false); if (!response.ok) { const body = await response.json(); setError(body.error || "บันทึกไม่สำเร็จ"); return; } onSaved(await response.json()); }
  return <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="settings-title"><form action={submit} className="w-full max-w-xl rounded-xl border border-white/10 bg-slate-900 p-6"><div className="mb-5 flex items-center justify-between"><h2 id="settings-title" className="text-xl font-semibold">ตั้งค่า {camera.name}</h2><button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-lg hover:bg-slate-800" aria-label="ปิด"><X /></button></div><div className="space-y-4"><div><label className="form-label" htmlFor="edit-name">ชื่อกล้อง</label><input className="form-input" id="edit-name" name="name" defaultValue={camera.name} required /></div><div><label className="form-label" htmlFor="edit-desc">คำอธิบาย</label><input className="form-input" id="edit-desc" name="description" defaultValue={camera.description || ""} /></div><div><span className="form-label">Endpoint ปัจจุบัน</span><div className="flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-slate-950 p-3 text-sm">{revealed || `rtsp://***:***@${camera.endpoint}/…`}</code><button type="button" className="action-button" onClick={() => void reveal()}>{revealed ? <EyeOff size={16} /> : <Eye size={16} />}{revealed ? "ซ่อน" : "Reveal"}</button></div></div><div><label className="form-label" htmlFor="replacement-url">RTSP URL ใหม่</label><input className="form-input font-mono" id="replacement-url" name="rtspUrl" type="url" autoComplete="off" placeholder="เว้นว่างเพื่อใช้ค่าเดิม" /></div><div><label className="form-label" htmlFor="edit-transport">Transport</label><select className="form-input" id="edit-transport" name="rtspTransport" defaultValue={camera.rtspTransport}><option value="TCP">TCP</option><option value="AUTOMATIC">Automatic</option></select></div><label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="enabled" className="size-5" defaultChecked={camera.enabled} /><span>เปิดใช้งานกล้อง</span></label>{error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-red-200">{error}</p>}<button disabled={busy} className="primary-button w-full justify-center disabled:opacity-50">{busy ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}</button></div></form></div>;
}
