"use client";

import { Suspense, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getTopLoadingSnapshot,
  startTopLoading,
  subscribeToTopLoading,
} from "@/lib/top-loading";

function TopLoadingBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationKey = `${pathname}?${searchParams.toString()}`;
  const previousLocation = useRef(locationKey);
  const navigationFinish = useRef<(() => void) | null>(null);
  const navigationTimeout = useRef<number | null>(null);
  const loadingState = useSyncExternalStore(
    subscribeToTopLoading,
    getTopLoadingSnapshot,
    () => "idle",
  );
  const active = loadingState !== "idle";
  useEffect(() => {
    if (previousLocation.current !== locationKey) {
      previousLocation.current = locationKey;
      navigationFinish.current?.();
      navigationFinish.current = null;
      if (navigationTimeout.current !== null) {
        window.clearTimeout(navigationTimeout.current);
        navigationTimeout.current = null;
      }
    }
  }, [locationKey]);

  useEffect(() => {
    function startNavigation() {
      navigationFinish.current?.();
      if (navigationTimeout.current !== null) {
        window.clearTimeout(navigationTimeout.current);
      }
      navigationFinish.current = startTopLoading();
      navigationTimeout.current = window.setTimeout(() => {
        navigationFinish.current?.();
        navigationFinish.current = null;
        navigationTimeout.current = null;
      }, 15000);
    }

    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        `${destination.pathname}?${destination.searchParams.toString()}` ===
        `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`
      ) {
        return;
      }

      startNavigation();
    }

    function handlePopState() {
      startNavigation();
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      navigationFinish.current?.();
      if (navigationTimeout.current !== null) {
        window.clearTimeout(navigationTimeout.current);
      }
    };
  }, []);

  return (
    <div
      className="top-loading-track pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-white/5"
      data-loading={active}
      aria-hidden={!active}
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={loadingState === "finishing" ? "Complete" : "Loading"}
      data-state={loadingState}
    >
      <div
        className="top-loading-progress relative h-full rounded-r-full bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-200 shadow-[0_0_12px_rgba(216,180,254,0.9)]"
      >
        <span className="absolute right-0 top-1/2 h-7 w-20 -translate-y-1/2 rounded-full bg-fuchsia-200/40 blur-md" />
      </div>
    </div>
  );
}

export default function TopLoadingBar() {
  return (
    <Suspense fallback={null}>
      <TopLoadingBarContent />
    </Suspense>
  );
}
