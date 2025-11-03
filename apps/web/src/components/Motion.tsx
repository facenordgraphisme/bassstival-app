"use client";

import { motion, type MotionProps } from "framer-motion";
import type { HTMLAttributes } from "react";

type DivProps = MotionProps & HTMLAttributes<HTMLDivElement>;
export function MotionDiv(props: DivProps) {
  return <motion.div {...props} />;
}
