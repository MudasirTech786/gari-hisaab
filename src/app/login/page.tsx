"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleAlert,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ── Intro Screen ────────────────────────────────────────────── */
/*
 * Single-stage cinematic logo reveal. Pure CSS keyframe animation
 * (opacity/transform/filter only — GPU-friendly, no rAF, no JS loops).
 * `exiting` triggers the fade-out transition into the login page,
 * which is already mounted underneath. `prefers-reduced-motion` is
 * respected both here (CSS override) and in the timing logic below.
 */

function Intro({ exiting }: { exiting: boolean }) {
  return (
    <section
      className={`intro-screen fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#060a08] px-5 text-white transition-[opacity,filter] duration-[600ms] ease-out ${
        exiting ? "pointer-events-none opacity-0 blur-[2px]" : "opacity-100"
      }`}
      aria-label="Gari Hisaab is loading"
    >
      <div className="intro-grid" />
      <div className="intro-vignette" aria-hidden="true" />
      <span className="intro-ambient" aria-hidden="true" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="intro-logo-stage relative inline-block">
          <img
            src="/images/logo.png"
            alt="Gari Hisaab"
            className="intro-logo mr-4 block h-auto w-[330px] object-contain sm:w-[165px] md:w-[195px] lg:w-[425px]"
          />
          <span className="intro-sweep" aria-hidden="true" />
        </div>
        <p className="intro-tagline mt-6 text-[0.7rem] tracking-[0.16em] text-white/35">
          Every Trip - Under Control.
        </p>
      </div>

      <style jsx>{`
        .intro-ambient {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 460px;
          height: 460px;
          transform: translate(-50%, -50%) scale(0.85);
          background: radial-gradient(
            circle,
            rgba(94, 233, 181, 0.15) 0%,
            rgba(94, 233, 181, 0.05) 45%,
            transparent 72%
          );
          filter: blur(38px);
          opacity: 0;
          pointer-events: none;
          animation:
            introAmbientForm 0.5s ease-out 0s forwards,
            introAmbientBreathe 0.6s ease-in-out 1.8s 1;
        }

        .intro-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at center,
            transparent 40%,
            rgba(0, 0, 0, 0.55) 100%
          );
          pointer-events: none;
        }

        .intro-logo {
          opacity: 0;
          animation: introLogoReveal 0.7s cubic-bezier(0.16, 0.8, 0.24, 1) 0.3s
            both;
        }

        .intro-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            100deg,
            transparent 32%,
            rgba(255, 255, 255, 0.5) 48%,
            rgba(94, 233, 181, 0.6) 52%,
            transparent 68%
          );
          background-size: 260% 100%;
          background-position: -130% 0;
          -webkit-mask-image: url("/images/logo.png");
          -webkit-mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-image: url("/images/logo.png");
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
          mix-blend-mode: screen;
          opacity: 0;
          pointer-events: none;
          animation: introSweepMove 0.9s cubic-bezier(0.4, 0, 0.2, 1) 1s 1 both;
        }

        .intro-tagline {
          opacity: 0;
          animation: introTaglineIn 0.6s ease-out 1s forwards;
        }

        @keyframes introAmbientForm {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.85);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes introAmbientBreathe {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.06);
            opacity: 0.85;
          }
        }

        @keyframes introLogoReveal {
          from {
            opacity: 0;
            transform: scale(0.92);
            filter: blur(10px);
          }
          to {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
        }

        @keyframes introSweepMove {
          0% {
            background-position: -130% 0;
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            background-position: 230% 0;
            opacity: 0;
          }
        }

        @keyframes introTaglineIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .intro-logo,
          .intro-ambient,
          .intro-sweep,
          .intro-tagline {
            animation: none !important;
          }
          .intro-logo {
            opacity: 1;
            filter: none;
            transform: none;
          }
          .intro-ambient {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          .intro-tagline {
            opacity: 1;
            transform: none;
          }
          .intro-sweep {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}

/* ── Login Page ──────────────────────────────────────────────── */

export default function LoginPage() {
  const [showIntro, setShowIntro] = useState(true);
  const [introExiting, setIntroExiting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Plays the cinematic intro exactly once, on initial mount. Respects
  // prefers-reduced-motion by shortening the hold + fade instead of
  // skipping straight to the login page (avoids a jarring hard cut).
  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const exitDelay = reduceMotion ? 150 : 2400;
    const hideDelay = reduceMotion ? 400 : 3000;

    const exitTimer = window.setTimeout(() => setIntroExiting(true), exitDelay);
    const hideTimer = window.setTimeout(() => setShowIntro(false), hideDelay);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  const onSubmit = useCallback(
    async (data: LoginInput) => {
      setIsSubmitting(true);
      setAuthError("");
      try {
        const result = await loginAction(data);
        if (result && !result.success) {
          setAuthError(
            "Please check your email and password, then try again."
          );
        }
      } catch {
        setAuthError("Please check your email and password, then try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const email = register("email");
  const password = register("password");

  return (
    <main className="login-dark-shell relative min-h-screen overflow-hidden bg-[#060a08] text-white">
      {/* ── Intro ── */}
      {showIntro && <Intro exiting={introExiting} />}

      {/* ── Login Scene ── */}
      <div
        className={`login-scene relative flex min-h-screen items-center justify-center px-4 py-10 transition-all duration-700 ease-out sm:px-6 ${
          showIntro && !introExiting
            ? "translate-y-2 opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        {/* Background layers */}
        <div className="login-grid" />
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />

        {/* Card */}
        <div className="relative z-10 w-full max-w-[440px]">
          <div className="login-card-anim rounded-[28px] border border-white/[0.06] bg-white/[0.035] p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,.55),0_0_1px_rgba(255,255,255,.06)_inset] backdrop-blur-xl sm:p-10">
            {/* Brand */}
            <div className="login-slide-up-1 relative flex justify-center">
              <span className="card-logo-glow" aria-hidden="true" />
              <img
                src="/images/logo.png"
                alt="Gari Hisaab"
                className="relative mr-6 h-auto w-[330px] object-contain sm:w-[150px] md:w-[168px] lg:w-[578px]"
              />
            </div>

            {/* Header */}
            <header className="login-slide-up-2 mt-6 text-center">
              <h1 className="mt-3.5 text-[1.6rem] font-semibold tracking-[-.04em] text-green/95">
                Login to your account
              </h1>
              {/* <p className="mx-auto mt-2.5 max-w-[260px] text-[0.82rem] leading-relaxed text-zinc-500">
                Sign in to manage your fleet
              </p> */}
            </header>

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="mt-8 space-y-5"
            >
              {/* Error */}
              {authError && (
                <div
                  role="alert"
                  className="login-slide-up-3 flex gap-3 rounded-2xl border border-red-400/15 bg-red-500/[0.06] p-3.5 text-sm text-red-100"
                >
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-400/80" />
                  <div>
                    <p className="font-medium text-red-200/90">
                      Unable to log in
                    </p>
                    <p className="mt-0.5 text-[0.78rem] text-red-300/60">
                      {authError}
                    </p>
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="login-slide-up-3 space-y-2">
                <Label
                  htmlFor="email"
                  className="text-[0.82rem] font-medium text-zinc-400"
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-600 transition-colors duration-200 peer-focus:text-emerald-400/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="email"
                    autoFocus
                    disabled={isSubmitting}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className="h-[50px] rounded-2xl border-white/[0.07] bg-white/[0.04] pl-11 pr-4 text-[0.9rem] text-white placeholder:text-zinc-600/70 focus-visible:border-emerald-400/40 focus-visible:ring-[3px] focus-visible:ring-emerald-400/[0.08] focus-visible:shadow-[0_0_20px_rgba(52,211,153,.06)]"
                    {...email}
                    onChange={(e) => {
                      setAuthError("");
                      email.onChange(e);
                    }}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="text-xs text-red-300/80">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="login-slide-up-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-[0.82rem] font-medium text-zinc-400"
                  >
                    Password
                  </Label>
                  <button
                    type="button"
                    tabIndex={-1}
                    className="text-[0.72rem] font-medium text-zinc-500 transition-colors hover:text-emerald-400/70"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-600 transition-colors duration-200" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    className="h-[50px] rounded-2xl border-white/[0.07] bg-white/[0.04] pl-11 pr-11 text-[0.9rem] text-white placeholder:text-zinc-600/70 focus-visible:border-emerald-400/40 focus-visible:ring-[3px] focus-visible:ring-emerald-400/[0.08] focus-visible:shadow-[0_0_20px_rgba(52,211,153,.06)]"
                    {...password}
                    onChange={(e) => {
                      setAuthError("");
                      password.onChange(e);
                    }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-500 transition-colors duration-150 hover:text-zinc-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs text-red-300/80">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember me */}
              <div className="login-slide-up-5 flex items-center gap-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={rememberMe}
                  onClick={() => setRememberMe((p) => !p)}
                  className={`flex size-4 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                    rememberMe
                      ? "border-emerald-400/50 bg-emerald-400/20"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  {rememberMe && (
                    <svg
                      className="size-2.5 text-emerald-400"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </button>
                <span
                  className="cursor-pointer text-[0.8rem] text-zinc-500"
                  onClick={() => setRememberMe((p) => !p)}
                >
                  Remember me
                </span>
              </div>

              {/* Submit */}
              <div className="login-slide-up-6 pt-1">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="relative h-[50px] w-full rounded-2xl bg-emerald-400 text-[0.9rem] font-semibold text-[#0a1f14] shadow-[0_8px_30px_rgba(52,211,153,.18)] transition-all duration-300 hover:bg-[#0de08f] hover:shadow-[0_12px_40px_rgba(52,211,153,.26)] hover:-translate-y-px active:scale-[.985] active:shadow-[0_4px_16px_rgba(52,211,153,.14)] disabled:pointer-events-none disabled:bg-emerald-400/40 disabled:shadow-none disabled:hover:translate-y-0"
                >
                  {isSubmitting && (
                    <span className="size-[18px] animate-spin rounded-full border-[2.5px] border-[#0a1f14]/25 border-t-[#0a1f14]" />
                  )}
                  {isSubmitting ? "Logging in..." : "Log In"}
                </Button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="login-slide-left mt-6 text-center">
            <p className="text-[0.7rem] text-zinc-600/70">
              Need access?{" "}
              <span className="text-zinc-500">
                Contact your administrator.
              </span>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .card-logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200px;
          height: 200px;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            circle,
            rgba(52, 211, 153, 0.14) 0%,
            rgba(52, 211, 153, 0.04) 45%,
            transparent 70%
          );
          filter: blur(14px);
          pointer-events: none;
        }
      `}</style>
    </main>
  );
}