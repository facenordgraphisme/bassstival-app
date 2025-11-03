import { FadeUp } from "@/components/FX";
import HomeClient from "./HomeClient";

function AuroraThin() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-soft-light
                      [background-image:radial-gradient(#fff_1px,transparent_1px)]
                      [background-size:3px_3px]" />
      <div
        className="absolute -top-40 -left-40 h-[42rem] w-[42rem] blur-3xl animate-[spin_60s_linear_infinite]"
        style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--cyan) 35%, transparent), transparent)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 h-[42rem] w-[42rem] blur-3xl animate-[spin_80s_linear_infinite]"
        style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--vio) 35%, transparent), transparent)" }}
      />
    </div>
  );
}

export const dynamic = "force-dynamic";

export default function ToolsPage() {
  return (
    <div className="relative">
      <AuroraThin />
      <FadeUp className="space-y-6">
        <HomeClient initialOpen={[]} initialAll={[]} />
      </FadeUp>
    </div>
  );
}
