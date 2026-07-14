"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail, ShoppingBag } from "lucide-react";
import { api, authStore } from "@/lib/api";
import type { User } from "@/lib/types";
import { Button, ErrorNotice, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@dokandesk.local");
  const [password, setPassword] = useState("DokanDesk@123!");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (authStore.getToken()) router.replace("/dashboard"); }, [router]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const data = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
      authStore.set(data.token, data.user); router.replace("/dashboard");
    } catch (err) { setError(err instanceof Error ? err.message : "Login failed"); }
    finally { setLoading(false); }
  };

  return <main className="relative grid min-h-screen overflow-hidden bg-slate-50 lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-950 via-blue-900 to-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" /><div className="absolute -bottom-24 left-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="relative flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25"><ShoppingBag /></span><div><p className="text-xl font-bold">DokanDesk POS</p><p className="text-xs text-blue-200">Simple sales. Smarter stock.</p></div></div>
      <div className="relative max-w-xl"><span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">BUILT FOR BANGLADESH RETAIL</span><h1 className="mt-6 text-5xl font-bold leading-[1.08] tracking-tight">Run your whole shop from one calm workspace.</h1><p className="mt-5 text-lg leading-8 text-blue-100">Fast checkout, accurate stock, purchases, customers and reports—designed for everyday supershop operations.</p><div className="mt-10 grid grid-cols-3 gap-3"><div className="rounded-2xl border border-white/15 bg-white/10 p-4"><b className="text-2xl">3×</b><p className="mt-1 text-xs text-blue-200">faster checkout</p></div><div className="rounded-2xl border border-white/15 bg-white/10 p-4"><b className="text-2xl">Live</b><p className="mt-1 text-xs text-blue-200">stock tracking</p></div><div className="rounded-2xl border border-white/15 bg-white/10 p-4"><b className="text-2xl">Secure</b><p className="mt-1 text-xs text-blue-200">role access</p></div></div></div>
      <p className="relative text-xs text-blue-200">© 2026 DokanDesk POS</p>
    </section>
    <section className="flex min-h-screen items-center justify-center p-5 sm:p-10"><div className="w-full max-w-md"><div className="mb-8 flex items-center gap-3 lg:hidden"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white"><ShoppingBag /></span><b className="text-xl">DokanDesk POS</b></div><p className="text-sm font-semibold text-indigo-600">WELCOME BACK</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Sign in to your store</h2><p className="mt-2 text-sm text-slate-500">Use your admin, manager or cashier account.</p><form onSubmit={login} className="mt-8 space-y-4">{error && <ErrorNotice message={error} />}<label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</span><div className="relative"><Mail className="absolute left-3 top-3.5 text-slate-400" size={18} /><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required /></div></label><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Password</span><div className="relative"><LockKeyhole className="absolute left-3 top-3.5 text-slate-400" size={18} /><Input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="px-10" required minLength={8} /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-slate-400" aria-label="Toggle password visibility">{show ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></label><Button type="submit" className="mt-2 w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button></form><div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-6 text-indigo-900"><b>Demo:</b> admin@dokandesk.local / DokanDesk@123!</div></div></section>
  </main>;
}
