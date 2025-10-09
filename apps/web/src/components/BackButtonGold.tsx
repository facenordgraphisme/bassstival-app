"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function BackButtonGold() {
  const router = useRouter();

  return (
    <motion.button
      whileHover={{ scale: 1.08, boxShadow: "0 0 14px #ffcc66" }}
      whileTap={{ scale: 0.95 }}
      onClick={() => router.back()}
      className="group flex items-center gap-2 rounded-full border border-yellow-500/50 bg-black/40 px-3 py-2 text-sm font-semibold text-yellow-400 transition-all hover:text-yellow-100 hover:border-yellow-400"
      style={{
        boxShadow:
          "0 0 8px rgba(255, 215, 0, 0.3), inset 0 0 6px rgba(255, 200, 0, 0.15)",
      }}
    >
      <ArrowLeft
        size={16}
        className="transition-transform group-hover:-translate-x-1"
      />
      Retour
    </motion.button>
  );
}
