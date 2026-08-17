"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CarFront, CircleAlert, LockKeyhole, Mail, TrendingUp } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Mark({ className = "" }: { className?: string }) {
  return <div className={`flex size-14 items-center justify-center rounded-[18px] border border-emerald-300/20 bg-emerald-400/10 text-emerald-300 shadow-[0_0_35px_rgba(52,211,153,.12)] ${className}`}><CarFront className="size-7" aria-hidden="true" /></div>;
}

function Intro() {
  return <section className="intro-screen fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#080b0a] px-5 text-white" aria-label="Gari Hisaab is loading">
    <div className="intro-grid" /><div className="intro-glow" />
    <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
      <div className="intro-mark"><Mark /></div>
      <div className="intro-car mt-10 flex w-full items-center gap-3"><span className="h-px flex-1 bg-gradient-to-r from-transparent to-emerald-400/50" /><CarFront className="size-8 text-emerald-300" aria-hidden="true" /><span className="h-px flex-1 bg-gradient-to-l from-transparent to-emerald-400/50" /></div>
      <div className="intro-brand mt-8"><h1 className="text-3xl font-semibold tracking-[-.055em]">Gari Hisaab</h1><p className="mt-3 text-sm text-zinc-400">Every Trip. Every Rupee. Under Control.</p></div>
      <div className="intro-earnings mt-10 flex items-center gap-3 rounded-full border border-white/8 bg-white/[.035] px-4 py-2 text-sm"><TrendingUp className="size-4 text-emerald-300" /><span className="font-medium text-zinc-200">Rs. 0</span><span className="text-zinc-600">→</span><span className="font-medium text-emerald-300">Rs. 10,000</span></div>
    </div>
  </section>;
}

export default function LoginPage() {
  const [showIntro, setShowIntro] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  async function onSubmit(data: LoginInput) {
    setIsSubmitting(true); setAuthError("");
    try { const result = await loginAction(data); if (result && !result.success) setAuthError("Please check your email and password, then try again."); }
    catch { setAuthError("Please check your email and password, then try again."); }
    finally { setIsSubmitting(false); }
  }
  const email = register("email"); const password = register("password");

  return <main className="login-dark-shell min-h-screen overflow-hidden bg-[#080b0a] text-white">
    {showIntro && <Intro />}
    <div className={`login-scene relative flex min-h-screen items-center justify-center px-4 py-7 transition-opacity duration-500 sm:px-6 ${showIntro ? "opacity-0" : "opacity-100"}`}>
      <div className="login-grid" /><div className="login-ambient login-ambient-one" /><div className="login-ambient login-ambient-two" />
      <div className="relative z-10 w-full max-w-[460px]">
        <section className="login-dark-card rounded-[30px] border border-white/10 bg-[#111413]/95 p-6 shadow-[0_30px_90px_rgba(0,0,0,.48)] backdrop-blur-sm sm:p-9">
          <div className="flex justify-center"><Mark /></div>
          <header className="mt-6 text-center"><p className="text-[11px] font-medium tracking-[.18em] text-emerald-300 uppercase">Gari Hisaab</p><h1 className="mt-3 text-[1.75rem] font-semibold tracking-[-.045em] text-white">Welcome back</h1><p className="mx-auto mt-3 max-w-[280px] text-sm leading-6 text-zinc-400">Sign in to manage your cars, drivers and daily accounts.</p></header>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            {authError && <div role="alert" className="flex gap-3 rounded-2xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-100"><CircleAlert className="mt-0.5 size-4 shrink-0 text-red-300" /><div><p className="font-medium">Unable to sign in</p><p className="mt-0.5 text-red-200/80">{authError}</p></div></div>}
            <div className="space-y-2"><Label htmlFor="email" className="text-sm font-medium text-zinc-200">Email</Label><div className="relative"><Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" /><Input id="email" type="email" placeholder="Enter your email" autoComplete="email" autoFocus disabled={isSubmitting} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} className="h-[52px] rounded-2xl border-white/10 bg-[#191d1b] pl-11 text-[15px] text-white placeholder:text-zinc-600 focus-visible:border-emerald-400/70 focus-visible:ring-4 focus-visible:ring-emerald-400/10" {...email} onChange={(event) => { setAuthError(""); email.onChange(event); }} /></div>{errors.email && <p id="email-error" className="text-xs text-red-300">{errors.email.message}</p>}</div>
            <div className="space-y-2"><Label htmlFor="password" className="text-sm font-medium text-zinc-200">Password</Label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" /><Input id="password" type="password" placeholder="Enter your password" autoComplete="current-password" disabled={isSubmitting} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} className="h-[52px] rounded-2xl border-white/10 bg-[#191d1b] pl-11 text-[15px] text-white placeholder:text-zinc-600 focus-visible:border-emerald-400/70 focus-visible:ring-4 focus-visible:ring-emerald-400/10" {...password} onChange={(event) => { setAuthError(""); password.onChange(event); }} /></div>{errors.password && <p id="password-error" className="text-xs text-red-300">{errors.password.message}</p>}</div>
            <Button type="submit" size="lg" disabled={isSubmitting} className="h-[52px] w-full rounded-2xl bg-emerald-400 text-[15px] font-semibold text-[#082019] shadow-[0_10px_28px_rgba(52,211,153,.2)] transition-transform hover:bg-emerald-300 active:scale-[.985] disabled:bg-emerald-400/50">{isSubmitting && <span className="size-4 animate-spin rounded-full border-2 border-[#082019]/30 border-t-[#082019]" />}{isSubmitting ? "Signing in..." : "Sign In"}</Button>
          </form>
        </section>
        <p className="mt-5 text-center text-xs text-zinc-600">Secure access to your Gari Hisaab workspace</p>
      </div>
    </div>
  </main>;
}
