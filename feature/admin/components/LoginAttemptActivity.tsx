"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MapPin, RefreshCw, ShieldAlert } from "lucide-react";
import { getApi } from "@/lib/api-service";

type LoginAttempt = {
  id: string;
  ipAddress: string;
  attemptedUsername: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  locationSource: string | null;
  userAgent: string | null;
  stage: string;
  outcome: string;
  statusCode: number;
  createdAt: string;
};

type LoginAttemptResponse = {
  attempts: LoginAttempt[];
};

function attemptLocation(attempt: LoginAttempt) {
  return [attempt.city, attempt.region, attempt.country]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ");
}

function mapUrl(latitude: number, longitude: number) {
  const query = new URLSearchParams({ q: `${latitude},${longitude}` });
  return `https://www.google.com/maps/search/?${query.toString()}`;
}

function outcomeStyle(outcome: string) {
  if (outcome === "success") {
    return "border-emerald-200/20 bg-emerald-200/5 text-emerald-100";
  }
  if (outcome === "blocked" || outcome.endsWith("_failed")) {
    return "border-rose-200/20 bg-rose-200/5 text-rose-100";
  }
  if (outcome === "mfa_required") {
    return "border-amber-200/20 bg-amber-200/5 text-amber-100";
  }
  return "border-white/10 bg-white/5 text-white/60";
}

export default function LoginAttemptActivity({
  refreshCount,
}: {
  refreshCount: number;
}) {
  const [attempts, setAttempts] = useState<LoginAttempt[] | null>(null);
  const [error, setError] = useState("");
  const [manualRefreshCount, setManualRefreshCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getApi<LoginAttemptResponse>("/api/admin/login-attempts", {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setAttempts(data.attempts);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load login activity.",
          );
        }
      });

    return () => controller.abort();
  }, [manualRefreshCount, refreshCount]);

  return (
    <section className="glass overflow-hidden rounded-2xl">
      <div className="flex flex-col justify-between gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-lilac" />
            <h2 className="text-sm font-semibold">Login activity</h2>
          </div>
          <p className="mt-1 text-xs text-white/40">
            Latest 50 password and MFA sign-in requests
          </p>
        </div>
        <button
          type="button"
          onClick={() => setManualRefreshCount((current) => current + 1)}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/65 transition hover:border-lilac/30 hover:text-white"
        >
          <RefreshCw size={13} /> Reload activity
        </button>
      </div>

      {error ? (
        <p role="alert" className="px-5 py-6 text-sm text-rose-100 sm:px-6">
          {error}
        </p>
      ) : attempts === null ? (
        <p role="status" className="px-5 py-6 text-sm text-white/45 sm:px-6">
          Loading login activity…
        </p>
      ) : attempts.length === 0 ? (
        <p className="px-5 py-6 text-sm text-white/45 sm:px-6">
          No login requests have been recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-white/[0.025] text-[10px] uppercase tracking-[0.12em] text-white/35">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">Time</th>
                <th className="px-4 py-3 font-medium">IP / account</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Step</th>
                <th className="px-4 py-3 font-medium">Result</th>
                <th className="px-5 py-3 font-medium sm:px-6">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {attempts.map((attempt) => {
                const location = attemptLocation(attempt);
                const { latitude, longitude } = attempt;
                const hasCoordinates =
                  latitude !== null && longitude !== null;
                return (
                  <tr key={attempt.id} className="align-top text-white/70">
                    <td className="whitespace-nowrap px-5 py-4 text-white/50 sm:px-6">
                      <time dateTime={attempt.createdAt}>
                        {new Date(attempt.createdAt).toLocaleString()}
                      </time>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-mono text-white/85">{attempt.ipAddress}</p>
                      <p className="mt-1 max-w-36 truncate text-white/40">
                        {attempt.attemptedUsername || "Unknown account"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {hasCoordinates ? (
                        <a
                          href={mapUrl(latitude, longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`View approximate IP location at ${latitude}, ${longitude} on Google Maps`}
                          className="inline-flex max-w-48 items-start gap-1.5 text-lilac transition hover:text-white"
                        >
                          <MapPin size={13} className="mt-0.5 shrink-0" />
                          <span>
                            <span className="block text-[10px] uppercase tracking-wide text-white/40">
                              Approximate IP location
                            </span>
                            <span className="mt-0.5 block">
                              {location || "Estimated area"}
                            </span>
                            <span className="mt-1 block font-mono text-[10px] text-white/40">
                              {latitude}, {longitude}
                            </span>
                          </span>
                          <ExternalLink size={11} className="mt-0.5 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-white/35">
                          {location || "Coordinates unavailable"}
                        </span>
                      )}
                      {attempt.timezone && (
                        <p className="mt-1 pl-5 text-[10px] text-white/35">
                          {attempt.timezone}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 capitalize text-white/55">
                      {attempt.stage.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 capitalize ${outcomeStyle(attempt.outcome)}`}
                      >
                        {attempt.outcome.replaceAll("_", " ")}
                      </span>
                      <p className="mt-1 text-[10px] text-white/35">
                        HTTP {attempt.statusCode}
                      </p>
                    </td>
                    <td
                      className="max-w-36 truncate px-5 py-4 text-white/40 sm:px-6"
                      title={attempt.userAgent ?? undefined}
                    >
                      {attempt.userAgent || "Unknown"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-white/8 px-5 py-3 text-[10px] leading-5 text-white/35 sm:px-6">
        These map pins are IP-geolocation estimates (often an ISP or city
        center), not GPS or a precise location. Accuracy varies by network and
        VPN use. Login IPs are sent to ipwho.is for lookup. IP and account
        details are sensitive security data.
      </p>
    </section>
  );
}
