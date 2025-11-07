"use client";
import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/* FadeUp — fade/slide after mount (no SSR mismatch) */
export function FadeUp({
  children,
  className = "",
  duration = 0.25,
}: { children: ReactNode; className?: string; duration?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <motion.div
      className={className}
      /* Do not set a different "initial" than SSR output */
      initial={false}
      animate={mounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      transition={{ duration }}
      /* start visually hidden via CSS only if you really want; keeping at 1/0 avoids mismatch */
    >
      {children}
    </motion.div>
  );
}

/* ScaleIn — same pattern as above */
export function ScaleIn({
  children,
  className = "",
  duration = 0.3,
  delay = 0,
}: { children: ReactNode; className?: string; duration?: number; delay?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <motion.div
      className={className}
      initial={false}
      animate={mounted ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  );
}

/* StaggerList — no SSR-only "initial"; stagger when mounted */
export function StaggerList({
  children,
  className = "",
  gap = 0.1,
}: { children: ReactNode[] | ReactNode; className?: string; gap?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const items = Array.isArray(children) ? children : [children];

  return (
    <motion.div
      className={className}
      initial={false}
      animate={mounted ? "show" : "show"}
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {items.map((child, i) => (
        <motion.div
          key={i}
          variants={{
            show: { opacity: 1, y: 0 },
          }}
          initial={false}
          animate={mounted ? "show" : "show"}
          transition={{ duration: 0.25 }}
          style={{ opacity: 1, transform: "translateY(0px)" }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
