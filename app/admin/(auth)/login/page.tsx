"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { profile } from "@/data/portfolio";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Authentication is not connected yet.");
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_42%,rgba(126,82,190,0.2),transparent_35rem)]" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.82fr] lg:gap-24">
        <section className="hidden max-w-xl lg:block">
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-white/80 transition hover:text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/6 text-lilac">
              HS
            </span>
            {profile.name}
          </Link>

          <p className="mt-20 text-xs font-semibold uppercase tracking-[0.22em] text-neon">
            Private workspace
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
            Good to have
            <br />
            you <span className="text-gradient">back.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/60">
            Sign in to manage your portfolio, projects, and the details that bring your work to life.
          </p>

          <div className="glass mt-12 flex max-w-md items-center gap-4 rounded-2xl p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lilac/15 bg-violet-300/10 text-lilac">
              <Fingerprint size={22} strokeWidth={1.5} />
            </span>
            <div>
              <p className="text-sm font-semibold">Your work, in one place</p>
              <p className="mt-1 text-xs leading-5 text-white/50">A focused space for your portfolio content.</p>
            </div>
            <ShieldCheck className="ml-auto shrink-0 text-lilac/60" size={19} />
          </div>
        </section>

        <section className="glass mx-auto w-full max-w-md rounded-3xl p-6 sm:p-9">
          <div className="mb-9 flex items-center justify-between lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-white/80">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/6 text-lilac">
                HS
              </span>
              {profile.name}
            </Link>
            <LockKeyhole size={18} className="text-lilac/70" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon">Admin access</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Sign in</h2>
            <p className="mt-2 text-sm text-white/55">Enter your details to continue.</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/80">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-lilac/50 focus:ring-2 focus:ring-violet-400/15"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-white/80">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 pr-12 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-lilac/50 focus:ring-2 focus:ring-violet-400/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/45 transition hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white/60">
              <input
                type="checkbox"
                name="remember"
                className="h-4 w-4 accent-violet-400"
              />
              Keep me signed in
            </label>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-500 to-purple-400 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/35 transition hover:-translate-y-0.5 hover:shadow-violet-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lilac"
            >
              Sign in <ArrowRight size={17} />
            </button>
            <p role="status" aria-live="polite" className="min-h-5 text-center text-xs text-lilac/80">
              {message}
            </p>
          </form>

          <p className="mt-4 border-t border-white/10 pt-5 text-center text-xs text-white/35">
            Protected workspace · {profile.name}
          </p>
        </section>
      </div>
    </main>
  );
}