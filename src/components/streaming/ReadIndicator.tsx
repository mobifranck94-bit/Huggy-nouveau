/**
 * ReadIndicator — Shows that AI has read/acknowledged content
 * Small checkmark badge for message receipts
 */

import { motion } from 'motion/react';
import { Check } from 'lucide-react';

interface ReadIndicatorProps {
  count?: number;
  showText?: boolean;
  className?: string;
}

export function ReadIndicator({ count, showText = true, className = '' }: ReadIndicatorProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 text-[10px] text-text-muted ${className}`}
    >
      <Check className="w-3 h-3" strokeWidth={2} />
      {showText && <span>Read{count ? ` ${count}` : ''}</span>}
    </motion.span>
  );
}

export default ReadIndicator;
