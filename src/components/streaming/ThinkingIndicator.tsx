/**
 * ThinkingIndicator — Claude Code style animated dots
 * Shows when AI is processing/thinking
 */

import { motion } from 'motion/react';

interface ThinkingIndicatorProps {
  text?: string;
  className?: string;
}

export function ThinkingIndicator({ text = 'Thinking', className = '' }: ThinkingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`inline-flex items-center gap-1.5 text-xs text-text-secondary ${className}`}
    >
      <span>{text}</span>
      <span className="flex gap-0.5">
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-1 h-1 rounded-full bg-accent"
        />
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
          className="w-1 h-1 rounded-full bg-accent"
        />
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          className="w-1 h-1 rounded-full bg-accent"
        />
      </span>
    </motion.div>
  );
}

export default ThinkingIndicator;
