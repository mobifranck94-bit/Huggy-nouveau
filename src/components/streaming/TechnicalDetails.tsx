/**
 * TechnicalDetails — Collapsible wrapper for MetricsBadges + CapabilityBlock.
 * Hides the technical/diagnostic UI behind a small "▸ Détails techniques" link.
 * Lets the chat stay clean and human-readable, while still giving access to
 * scores, decisions, capability plan when the user wants them.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { MetricsBadges } from './MetricsBadges';
import { CapabilityBlock, type CapabilityPlan } from './CapabilityBlock';

interface TechnicalDetailsProps {
  securityScore?: number;
  qaScore?: number;
  complexity?: string;
  filesCount?: number;
  timestamp?: number;
  capabilityPlan?: CapabilityPlan;
}

export function TechnicalDetails({
  securityScore,
  qaScore,
  complexity,
  filesCount,
  timestamp,
  capabilityPlan,
}: TechnicalDetailsProps) {
  const [open, setOpen] = useState(false);

  // Nothing to show? render nothing.
  const hasMetrics =
    (typeof filesCount === 'number' && filesCount > 0) ||
    typeof securityScore === 'number' ||
    typeof qaScore === 'number' ||
    !!complexity;
  const hasPlan = !!capabilityPlan && (
    capabilityPlan.needsBackend ||
    capabilityPlan.needsDatabase ||
    capabilityPlan.needsAuth ||
    capabilityPlan.needsStorage ||
    capabilityPlan.needsPayments ||
    capabilityPlan.needsEmail ||
    capabilityPlan.needsExternalApi ||
    (Array.isArray(capabilityPlan.envVars) && capabilityPlan.envVars.length > 0) ||
    (Array.isArray(capabilityPlan.setupChecklist) && capabilityPlan.setupChecklist.length > 0)
  );

  if (!hasMetrics && !hasPlan) return null;

  return (
    <div className="pt-2">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={open ? 'Masquer les détails techniques' : 'Afficher les détails techniques'}
        className="flex items-center gap-1 text-[10px] font-medium text-zinc-600 hover:text-zinc-400 transition-colors group"
      >
        <ChevronRight
          className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          aria-hidden="true"
        />
        <span className="uppercase tracking-wider">
          {open ? 'Masquer les détails techniques' : 'Détails techniques'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {hasMetrics && (
                <MetricsBadges
                  securityScore={securityScore}
                  qaScore={qaScore}
                  complexity={complexity}
                  filesCount={filesCount}
                  timestamp={timestamp}
                />
              )}
              {hasPlan && <CapabilityBlock plan={capabilityPlan} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TechnicalDetails;
