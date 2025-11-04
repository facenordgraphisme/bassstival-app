"use client";
import { useWarmup } from "@/hooks/useWarmup";

export default function WarmupClient() {
  useWarmup({ intervalMin: 8 });
  return null;
}
