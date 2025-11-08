"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Wand2 } from "lucide-react";
import { createPublication, type CommChannel } from "@/lib/communication";
import BackButton from "@/components/BackButton";

type BotVariant = {
  post: string;
  hashtags?: string[];
  ctas?: string[];
  emoji?: string;
  notes?: string;
};

const CHANNELS: CommChannel[] = [
  "instagram_post",
  "instagram_story",
  "facebook_post",
  "tiktok",
  "linkedin",
  "email",
];

const TONES = ["enjoué","informatif","urgent","convivial","professionnel"] as const;
const LENGTHS = ["court","moyen","long"] as const;

export default function ChatbotPage() {
  const [brief, setBrief] = useState("");
  const [channel, setChannel] = useState<CommChannel>("instagram_post");
  const [ton, setTon] = useState<(typeof TONES)[number]>("enjoué");
  const [longueur, setLongueur] = useState<(typeof LENGTHS)[number]>("court");
  const [temperature, setTemperature] = useState(0.5);
  const [n, setN] = useState(3); // 🔥 3 variantes
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<BotVariant[]>([]);
  const [picked, setPicked] = useState<number | null>(null);

  function applyPreset(p: typeof TONES[number]) { setTon(p); }
  function applyLen(l: typeof LENGTHS[number]) { setLongueur(l); }

  async function onGenerate() {
    if (!brief.trim()) return toast.error("Décris le brief 😉");
    setLoading(true);
    setVariants([]);
    setPicked(null);
    try {
      const r = await fetch("/api/chatbot/generate", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ brief, channel, ton, longueur, temperature, n }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data?.error ?? "Erreur de génération");
        return;
      }
      setVariants(data as BotVariant[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function onSave(idx: number) {
    const v = variants[idx];
    if (!v) return;
    const hashtags = (v.hashtags ?? []).join(" ");
    const title = (v.post || "").slice(0, 80) || "Proposition";
    const t = toast.loading("Enregistrement…");
    try {
      await createPublication({
        title,
        channels: [channel],
        body: v.post,
        hashtags: hashtags || undefined,
      });
      toast.success("Modèle enregistré ✅", { id: t });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur enregistrement", { id: t });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
        <h1 className="text-2xl md:text-3xl font-extrabold title-underline" style={{ fontFamily: "var(--font-title)" }}>
          Assistant — Communication
        </h1>
      </div>

      <div className="
        group relative isolate overflow-hidden rounded-2xl
        border border-white/10 bg-white/5 backdrop-blur-md
        shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
        p-5 space-y-4
      ">
        {/* glows */}
        <div aria-hidden className="pointer-events-none absolute -inset-[28%] rounded-[22px] z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "radial-gradient(28rem 28rem at 30% 50%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 60%)" }} />
        <div aria-hidden className="pointer-events-none absolute -inset-[30%] rounded-[22px] z-0 opacity-0 transition-opacity duration-300 delay-75 group-hover:opacity-100"
          style={{ background: "radial-gradient(26rem 26rem at 80% 50%, color-mix(in srgb, var(--vio) 18%, transparent), transparent 60%)" }} />

        <div className="relative z-10 space-y-3">
          <textarea
            className="input min-h-32"
            placeholder="Insère ton prompt ici chef !"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />

          <div className="grid sm:grid-cols-2 gap-3">
            {/* Canal : select simple */}
            <select className="input capitalize" value={channel} onChange={(e) => setChannel(e.target.value as CommChannel)}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>{c.replaceAll("_", " ")}</option>
              ))}
            </select>

            {/* Ton : puces presets + fallback select accessible */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm opacity-80">Ton :</span>
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => applyPreset(t)}
                  className={`capitalize px-2 py-1 rounded-full border text-sm ${ton === t ? "bg-white/20 border-white/40" : "bg-white/10 border-white/10"}`}
                  title={t}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Longueur : puces */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm opacity-80">Longueur :</span>
              {LENGTHS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => applyLen(l)}
                  className={`capitalize px-2 py-1 rounded-full border text-sm ${longueur === l ? "bg-white/20 border-white/40" : "bg-white/10 border-white/10"}`}
                  title={l}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Créativité + variantes */}
            <div className="flex flex-col gap-2">
              <label className="text-sm opacity-80">Créativité</label>
              <input
                type="range"
                min={0} max={1} step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
              <div className="flex items-center gap-2">
                <label className="text-sm opacity-80">Variantes</label>
                <select className="input" value={n} onChange={(e) => setN(parseInt(e.target.value, 10))}>
                  {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button className="btn inline-flex items-center gap-2" onClick={onGenerate} disabled={loading}>
              <Wand2 size={16} /> {loading ? "Génération…" : "Générer"}
            </button>
          </div>
        </div>
      </div>

      {/* Variantes */}
      {variants.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-4">
          {variants.map((v, idx) => (
            <div
              key={idx}
              className={`card space-y-3 ${picked === idx ? "outline-[color-mix(in_srgb,var(--accent)_60%,transparent)]" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">Variante {idx + 1}</div>
                <button
                  className="btn-ghost"
                  onClick={() => setPicked(picked === idx ? null : idx)}
                  title={picked === idx ? "Désélectionner" : "Sélectionner"}
                >
                  {picked === idx ? "✓ Sélectionnée" : "Sélectionner"}
                </button>
              </div>

              <pre className="input min-h-40 whitespace-pre-wrap">{v.post}</pre>
              {(v.hashtags?.length ?? 0) > 0 && (
                <div className="opacity-90 text-sm">Hashtags : {v.hashtags!.join(" ")}</div>
              )}
              {(v.ctas?.length ?? 0) > 0 && (
                <div className="opacity-90 text-sm">CTAs : {v.ctas!.join(" • ")}</div>
              )}
              {v.emoji && <div className="text-2xl">{v.emoji}</div>}
              {v.notes && <div className="text-sm opacity-80">Notes : {v.notes}</div>}

              <div className="flex justify-end gap-2">
                <button className="btn" onClick={() => onSave(idx)}>
                  <Plus size={16} className="mr-2" /> Sauvegarder comme modèle
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
