"use client";

import { FormEvent, Suspense, useState } from "react";
import { ArrowRight, Eye, EyeOff, Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { profile } from "@/data/portfolio";
import { encryptedFetch } from "@/lib/encrypted-fetch";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-white/50">
          Loading sign in...
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [setupUri, setSetupUri] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await encryptedFetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          requiresMfa
            ? { code, remember }
            : {
                name: formData.get("name"),
                password: formData.get("password"),
                remember: formData.get("remember") === "on",
              },
        ),
      });
      const result = (await response.json()) as {
        message?: string;
        data?: {
          requiresMfa?: boolean;
          setupRequired?: boolean;
          otpauthUrl?: string;
        };
      };

      if (!response.ok) {
        setMessage(result.message ?? "Unable to sign in.");
        return;
      }

      if (!requiresMfa && result.data?.requiresMfa) {
        setRequiresMfa(true);
        setSetupUri(result.data.otpauthUrl ?? "");
        setMessage(
          result.data.setupRequired
            ? "Scan the QR code, then enter the 6-digit code from your authenticator app."
            : "Enter the 6-digit code from your authenticator app.",
        );
        return;
      }

      const next = searchParams.get("next");
      router.replace(next?.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setMessage("Unable to connect. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon">
              {requiresMfa ? "Two-step verification" : "Admin access"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              {requiresMfa ? (setupUri ? "Set up authenticator" : "Verify it’s you") : "Sign in"}
            </h2>
            <p className="mt-2 text-sm text-white/55">
              {requiresMfa
                ? setupUri
                  ? "Scan this QR code with Google Authenticator or another TOTP app."
                  : "Enter the current code from your authenticator app."
                : "Enter your details to continue."}
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {!requiresMfa ? (
              <>
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium text-white/80">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="username"
                    placeholder="Admin name"
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-lilac/50 focus:ring-2 focus:ring-violet-400/15"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-white/80">
                    Password
                  </label>
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
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 accent-violet-400"
                  />
                  Keep me signed in
                </label>
              </>
            ) : (
              <>
                {setupUri && (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white p-4">
                    <QRCodeSVG value={setupUri} size={200} level="M" />
                    <p className="text-center text-xs text-black/70">
                      Scan with Google Authenticator, Authy, or another authenticator app.
                    </p>
                  </div>
                )}
                <div>
                  <label htmlFor="code" className="mb-2 block text-sm font-medium text-white/80">
                    6-digit authenticator code
                  </label>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center text-lg tracking-[0.4em] text-white outline-none transition placeholder:text-white/30 focus:border-lilac/50 focus:ring-2 focus:ring-violet-400/15"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRequiresMfa(false);
                    setSetupUri("");
                    setCode("");
                    setMessage("");
                  }}
                  className="w-full text-sm text-white/50 transition hover:text-white"
                >
                  Back to sign in
                </button>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-500 to-purple-400 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/35 transition hover:-translate-y-0.5 hover:shadow-violet-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lilac"
            >
              {isSubmitting
                ? requiresMfa ? "Verifying..." : "Signing in..."
                : requiresMfa ? "Verify and continue" : "Sign in"}{" "}
              <ArrowRight size={17} />
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