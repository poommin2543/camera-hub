import Link from "next/link";
import { Maximize2, VideoOff } from "lucide-react";

import { StreamPlayer } from "@/components/stream-player";

export type CameraCard = { id: string; name: string; status: string; hasAudio: boolean | null };

export function CameraGrid({ cameras, allowAudio }: { cameras: CameraCard[]; allowAudio: boolean }) {
  if (!cameras.length) return <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center"><div><VideoOff className="mx-auto text-slate-500" /><h2 className="mt-4 text-lg font-semibold">ยังไม่มีกล้องในระบบ</h2><p className="mt-1 text-sm text-slate-400">ให้ผู้ดูแลเพิ่ม RTSP camera จากหน้าจัดการกล้อง</p></div></div>;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {cameras.map((camera) => (
        <article key={camera.id} className="relative aspect-video min-h-48">
          <StreamPlayer cameraId={camera.id} cameraName={camera.name} allowAudio={allowAudio && Boolean(camera.hasAudio)} className="h-full" />
          <Link href={`/live/${camera.id}`} className="absolute bottom-3 left-3 grid size-11 cursor-pointer place-items-center rounded-lg bg-black/70 text-white transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-blue-300" aria-label={`เปิด ${camera.name} แบบเต็มจอ`}><Maximize2 size={18} /></Link>
        </article>
      ))}
    </div>
  );
}
