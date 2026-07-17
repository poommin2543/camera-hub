"use client";

import Hls from "hls.js";
import { LoaderCircle, Radio, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { connectWhep } from "@/lib/media/whep-client";

export type StreamState = "idle" | "connecting-webrtc" | "webrtc" | "connecting-hls" | "hls" | "failed";
type Grant = { url: string; token: string };
type Props = { cameraId: string; cameraName: string; allowAudio?: boolean; className?: string };

export function StreamPlayer({ cameraId, cameraName, allowAudio = false, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const whepCloseRef = useRef<null | (() => Promise<void>)>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<StreamState>("idle");
  const [muted, setMuted] = useState(true);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    void whepCloseRef.current?.();
    whepCloseRef.current = null;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  const grant = useCallback(async (protocol: "webrtc" | "hls") => {
    const response = await fetch(`/api/internal/media/authorize?cameraId=${cameraId}&protocol=${protocol}&audio=${allowAudio}`);
    if (!response.ok) throw new Error("STREAM_UNAVAILABLE");
    return response.json() as Promise<Grant>;
  }, [allowAudio, cameraId]);

  const startHls = useCallback(async (signal: AbortSignal) => {
    setState("connecting-hls");
    const access = await grant("hls");
    const source = `${access.url}?token=${encodeURIComponent(access.token)}`;
    const video = videoRef.current;
    if (!video || signal.aborted) return;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source;
      await video.play();
    } else if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(source);
      hls.attachMedia(video);
      await new Promise<void>((resolve, reject) => {
        hls.once(Hls.Events.MANIFEST_PARSED, () => resolve());
        hls.once(Hls.Events.ERROR, (_event, data) => data.fatal && reject(new Error(data.details)));
      });
      await video.play();
    } else throw new Error("HLS_NOT_SUPPORTED");
    setState("hls");
  }, [grant]);

  const start = useCallback(async () => {
    stop();
    const controller = new AbortController();
    abortRef.current = controller;
    const externalHls = process.env.NEXT_PUBLIC_EXTERNAL_STREAM_MODE === "hls" && window.location.hostname !== "localhost" && !/^192\.168\.|^10\./.test(window.location.hostname);
    try {
      if (!externalHls && "RTCPeerConnection" in window) {
        setState("connecting-webrtc");
        const access = await grant("webrtc");
        const timeout = window.setTimeout(() => controller.abort("WHEP_TIMEOUT"), Number(process.env.NEXT_PUBLIC_WEBRTC_TIMEOUT_MS || 7000));
        try {
          whepCloseRef.current = await connectWhep({
            url: `${access.url}?token=${encodeURIComponent(access.token)}`,
            token: access.token,
            signal: controller.signal,
            onTrack: (stream) => {
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
                void videoRef.current.play();
              }
            },
            onConnected: () => setState("webrtc"),
          });
          return;
        } finally {
          window.clearTimeout(timeout);
        }
      }
    } catch {
      stop();
    }
    const hlsController = new AbortController();
    abortRef.current = hlsController;
    await startHls(hlsController.signal);
  }, [grant, startHls, stop]);

  const retry = useCallback(() => {
    void start().catch(() => setState("failed"));
  }, [start]);

  useEffect(() => {
    const timer = window.setTimeout(retry, 0);
    return () => { window.clearTimeout(timer); stop(); };
  }, [retry, stop]);

  const label = state === "webrtc" ? "WebRTC" : state === "hls" ? "HLS" : state.replace("connecting-", "กำลังเชื่อมต่อ ");
  return <div className={`group relative isolate overflow-hidden rounded-xl bg-black ${className}`}>
    <video ref={videoRef} className="h-full w-full object-contain" muted={muted} playsInline preload="none" aria-label={`ภาพสดจาก ${cameraName}`} />
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-3"><span className="flex items-center gap-2 text-sm font-medium text-white"><Radio size={15} className={state === "hls" || state === "webrtc" ? "text-emerald-400" : "text-slate-400"} />{cameraName}</span><span className="rounded-full bg-black/60 px-2 py-1 font-mono text-[11px] uppercase text-slate-200">{label}</span></div>
    {(state === "connecting-webrtc" || state === "connecting-hls") && <div className="absolute inset-0 grid place-items-center bg-slate-950/70"><LoaderCircle className="animate-spin text-blue-400" aria-label="กำลังเชื่อมต่อ" /></div>}
    {state === "failed" && <div className="absolute inset-0 grid place-items-center bg-slate-950/90 p-6 text-center"><div><p className="font-medium text-white">เชื่อมต่อกล้องไม่สำเร็จ</p><button onClick={retry} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"><RefreshCw size={16} />ลองใหม่</button></div></div>}
    {allowAudio && <button type="button" onClick={() => setMuted((value) => !value)} className="absolute bottom-3 right-3 grid size-11 cursor-pointer place-items-center rounded-lg bg-black/70 text-white transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-blue-300" aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>}
  </div>;
}
