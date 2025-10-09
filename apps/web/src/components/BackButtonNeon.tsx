"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function BackButtonNeon() {
  const router = useRouter();

  return (
    <motion.button
      whileHover={{ scale: 1.08, boxShadow: "0 0 12px #00eaff" }}
      whileTap={{ scale: 0.95 }}
      onClick={() => router.back()}
      className="group flex items-center gap-2 rounded-full border border-cyan-400/40 bg-black/30 px-3 py-2 text-sm font-semibold text-cyan-300 transition-all hover:text-white hover:border-cyan-300"
      style={{
        boxShadow: "0 0 6px rgba(0, 238, 255, 0.3), inset 0 0 6px rgba(0, 238, 255, 0.15)",
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
