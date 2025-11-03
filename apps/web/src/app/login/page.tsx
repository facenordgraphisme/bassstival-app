"use client";

import { Suspense, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ——— Fond léger façon aurora ——— */
function AuroraThin() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {/* grain */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-soft-light
                      [background-image:radial-gradient(#fff_1px,transparent_1px)]
                      [background-size:3px_3px]" />
      {/* blobs thémés */}
      <div className="absolute -top-40 -left-40 h-[42rem] w-[42rem]
                      blur-3xl animate-[spin_60s_linear_infinite]"
           style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--cyan) 35%, transparent), transparent)" }} />
      <div className="absolute -bottom-40 -right-40 h-[42rem] w-[42rem]
                      blur-3xl animate-[spin_80s_linear_infinite]"
           style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--vio) 35%, transparent), transparent)" }} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative max-w-sm mx-auto mt-20">
          <AuroraThin />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <div className="h-6 w-32 bg-white/10 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-white/10 rounded" />
              <div className="h-10 bg-white/10 rounded" />
              <div className="h-10 bg-white/10 rounded" />
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });
      if (res?.error) {
        toast.error("Identifiants invalides");
        return;
      }
      window.location.href = res?.url || "/";
    });
  };

  return (
    <div className="relative min-h-[70vh]">
      <AuroraThin />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-20 max-w-sm px-6"
      >
        {/* Carte “hover glow” cohérente avec le reste */}
        <div
          className="
            group relative isolate overflow-hidden rounded-2xl
            border border-white/10 bg-white/5 backdrop-blur-md
            shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
            transition-[transform,background,border-color] duration-300 will-change-transform
            hover:-translate-y-0.5 hover:bg-white/[0.07]
            hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)]
            before:content-[''] before:absolute before:inset-0 before:-z-0
            before:opacity-0 before:transition-opacity before:duration-300
            before:bg-[radial-gradient(36rem_36rem_at_30%_50%,var(--accent)/26,transparent_60%)]
            after:content-[''] after:absolute after:inset-0 after:-z-0
            after:opacity-0 after:transition-opacity after:duration-300 after:delay-75
            after:bg-[radial-gradient(30rem_30rem_at_80%_50%,var(--vio)/18,transparent_60%)]
            group-hover:before:opacity-100 group-hover:after:opacity-100
          "
        >
          <div className="relative z-10 p-6 space-y-4">
            <h1
              className="text-xl font-extrabold title-underline"
              style={{ fontFamily: "var(--font-title)" }}
            >
              Connexion
            </h1>

            <form onSubmit={submit} className="space-y-3">
              <input
                className="input"
                type="email"
                placeholder="Email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="input"
                type="password"
                placeholder="Mot de passe"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button className="btn w-full" type="submit" disabled={pending}>
                {pending ? "Connexion…" : "Se connecter"}
              </button>
            </form>

            {/* Petit lien d’aide (optionnel) */}
            <p className="text-xs opacity-70 pt-1">
              Besoin d’aide ? Contacte un admin pour réinitialiser ton accès.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
