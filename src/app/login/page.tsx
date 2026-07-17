import { redirect } from "next/navigation";
import { Camera } from "lucide-react";

import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.isActive) redirect("/live");
  return <main className="grid min-h-dvh place-items-center bg-slate-950 p-4"><section className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/30 sm:p-8"><div className="mb-8"><span className="grid size-11 place-items-center rounded-xl bg-blue-600 text-white"><Camera /></span><h1 className="mt-5 text-2xl font-semibold text-white">เข้าสู่ระบบ Camera Hub</h1><p className="mt-2 text-sm leading-6 text-slate-400">ระบบดูภาพกล้องวงจรปิดสำหรับผู้ได้รับอนุญาต</p></div><form action={async (formData) => { "use server"; await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: "/live" }); }} className="space-y-5"><div><label htmlFor="email" className="form-label">อีเมล</label><input id="email" name="email" type="email" autoComplete="email" required className="form-input" /></div><div><label htmlFor="password" className="form-label">รหัสผ่าน</label><input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} className="form-input" /></div><button type="submit" className="min-h-12 w-full cursor-pointer rounded-lg bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-slate-900">เข้าสู่ระบบ</button></form><p className="mt-6 text-center text-xs leading-5 text-slate-500">หากไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแลระบบ</p></section></main>;
}
