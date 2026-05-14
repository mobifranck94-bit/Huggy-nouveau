/**
 * ShimmerMessage — Skeleton loading state for AI messages
 * Animated shimmer effect while content is being generated
 */

import { motion } from 'motion/react';

interface ShimmerMessageProps {
  lines?: number;
  className?: string;
}

export function ShimmerMessage({ lines = 3, className = '' }: ShimmerMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col gap-2 ${className}`}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-gradient-to-r from-bg-surface via-bg-elevated to-bg-surface bg-[length:200%_100%] animate-shimmer"
          style={{ 
            width: i === lines - 1 ? '60%' : '100%',
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </motion.div>
  );
}

export default ShimmerMessage;
