"use client";
import { useEffect, useRef } from "react";

export function useWarmup({ intervalMin = 8 }: { intervalMin?: number } = {}) {
  const timer = useRef<number | null>(null);

  async function ping() {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/warmup`, {
        cache: "no-store",
      });
    } catch (e) {
      console.warn("Warmup ping failed:", e);
    }
  }

  useEffect(() => {
    ping(); // au montage
    const onFocus = () => ping();
    window.addEventListener("focus", onFocus);
    timer.current = window.setInterval(ping, intervalMin * 60 * 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMin]);
}
