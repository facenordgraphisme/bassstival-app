"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

/* FadeUp — simple fade + slide */
export function FadeUp({
  children,
  className = "",
  duration = 0.25,
}: { children: ReactNode; className?: string; duration?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration }}
    >
      {children}
    </motion.div>
  );
}

/* ScaleIn — petit zoom */
export function ScaleIn({
  children,
  className = "",
  duration = 0.3,
  delay = 0,
}: { children: ReactNode; className?: string; duration?: number; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ✅ MAJ: StaggerList -> wrappers en <div> */
export function StaggerList({
  children,
  className = "",
  gap = 0.1,
}: { children: ReactNode[] | ReactNode; className?: string; gap?: number }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap } },
      }}
    >
      {items.map((child, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.25 }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}