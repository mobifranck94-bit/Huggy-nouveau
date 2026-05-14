/**
 * ToughProblemIndicator — Shows when AI encounters a difficult problem
 * Animated flame/spark indicator with optional message
 */

import { motion } from 'motion/react';
import { Flame, AlertTriangle } from 'lucide-react';

interface ToughProblemIndicatorProps {
  message?: string;
  variant?: 'flame' | 'warning';
  className?: string;
}

export function ToughProblemIndicator({ 
  message = 'Complex problem detected', 
  variant = 'flame',
  className = '' 
}: ToughProblemIndicatorProps) {
  const Icon = variant === 'warning' ? AlertTriangle : Flame;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-dim border border-amber/30 ${className}`}
    >
      <motion.span
        animate={variant === 'flame' ? {
          scale: [1, 1.1, 1],
          opacity: [0.7, 1, 0.7],
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className="w-3.5 h-3.5 text-amber" strokeWidth={2} />
      </motion.span>
      <span className="text-[10px] font-medium text-amber">{message}</span>
    </motion.div>
  );
}

export default ToughProblemIndicator;
