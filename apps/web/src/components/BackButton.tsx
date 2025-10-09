"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type Props = {
  className?: string;
  label?: string;
  /** Si l’historique est vide (ou désactivé), on redirige ici */
  fallbackHref?: string;
};

export default function BackButton({
  className = "",
  label = "Retour",
  fallbackHref = "/",
}: Props) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  // On ne peut vérifier l’historique que côté client
  useEffect(() => {
    // Certaines WebViews donnent history.length=1 même avec un historique réel,
    // mais c’est une heuristique raisonnable.
    setCanGoBack(typeof window !== "undefined" && window.history.length > 1);
  }, []);

  const onClick = () => {
    if (canGoBack) router.back();
    else router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group inline-flex items-center rounded-xl border border-white/15 px-3 py-1.5",
        "bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.98]",
        "backdrop-blur transition-transform duration-150",
        // petit glow “néon”
        "shadow-[0_0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_16px_0_rgba(126,220,255,0.25)]",
        className,
      ].join(" ")}
      aria-label={label}
    >
      <ArrowLeft
        size={18}
        className="mr-2 transition-transform group-hover:-translate-x-0.5"
        aria-hidden
      />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
