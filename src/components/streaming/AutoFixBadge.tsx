/**
 * AutoFixBadge — Indicates automatic fix/repair is in progress or completed
 * Compact badge with wrench icon
 */

import { motion } from 'motion/react';
import { Wrench, Check } from 'lucide-react';

interface AutoFixBadgeProps {
  status: 'pending' | 'active' | 'completed';
  count?: number;
  className?: string;
}

export function AutoFixBadge({ status, count, className = '' }: AutoFixBadgeProps) {
  const isCompleted = status === 'completed';
  const isActive = status === 'active';

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
        isCompleted
          ? 'bg-green-dim text-green border-green/30'
          : isActive
          ? 'bg-accent-dim text-accent-text border-accent-border'
          : 'bg-bg-elevated text-text-muted border-border-default'
      } ${className}`}
    >
      {isCompleted ? (
        <Check className="w-3 h-3" strokeWidth={2} />
      ) : isActive ? (
        <motion.span
          animate={{ rotate: [0, -15, 15, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
        >
          <Wrench className="w-3 h-3" strokeWidth={2} />
        </motion.span>
      ) : (
        <Wrench className="w-3 h-3" strokeWidth={2} />
      )}
      <span>
        {isCompleted ? 'Fixed' : isActive ? 'Fixing' : 'Pending'}
        {count ? ` ${count}` : ''}
      </span>
    </motion.span>
  );
}

export default AutoFixBadge;
