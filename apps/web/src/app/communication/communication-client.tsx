"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle } from "lucide-react";

export default function CommunicationClient() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Tile Timeline */}
        <Link
          href="/communication/timeline"
          className="
            group relative isolate overflow-hidden rounded-2xl
            border border-white/10 bg-white/5 backdrop-blur-md
            shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
            transition-[transform,background,border-color] duration-300 will-change-transform
            hover:-translate-y-0.5 hover:bg-white/[0.07]
            hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent))
          "
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-[28%] rounded-[22px] z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(28rem 28rem at 30% 50%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 60%)",
            }}
          />
          <div className="relative z-10 p-5 space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/10 ring-1 ring-white/15">
                <CalendarClock size={24} />
              </div>
              <div>
                <div className="font-semibold text-lg">Timeline</div>
                <div className="opacity-70 text-sm">
                  Planifier les posts & suivre l’avancement.
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Tile Publications */}
        <Link
          href="/communication/publications"
          className="
            group relative isolate overflow-hidden rounded-2xl
            border border-white/10 bg-white/5 backdrop-blur-md
            shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
            transition-[transform,background,border-color] duration-300 will-change-transform
            hover:-translate-y-0.5 hover:bg-white/[0.07]
            hover:[border-color:color-mix(in_srgb,var(--vio)_35%,transparent))
          "
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-[28%] rounded-[22px] z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(28rem 28rem at 70% 50%, color-mix(in srgb, var(--vio) 22%, transparent), transparent 60%)",
            }}
          />
          <div className="relative z-10 p-5 space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/10 ring-1 ring-white/15">
                <CheckCircle size={24} />
              </div>
              <div>
                <div className="font-semibold text-lg">Publications</div>
                <div className="opacity-70 text-sm">
                  Textes prêts à copier-coller, hashtags & liens.
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
