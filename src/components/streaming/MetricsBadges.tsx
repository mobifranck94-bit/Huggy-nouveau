/**
 * MetricsBadges - footer row of compact pills shown after a build completes:
 * Security / QA / Complexity / Files count. Subtle stagger animation.
 */

import { motion } from 'motion/react';
import { Shield, CheckCircle2, Zap, FileCode } from 'lucide-react';

interface MetricsBadgesProps {
  securityScore?: number;
  qaScore?: number;
  complexity?: string;
  filesCount?: number;
  timestamp?: number;
}

export function MetricsBadges({
  securityScore,
  qaScore,
  complexity,
  filesCount,
  timestamp,
}: MetricsBadgesProps) {
  const items: Array<{ key: string; node: React.ReactNode }> = [];

  if (typeof filesCount === 'number' && filesCount > 0) {
    items.push({
      key: 'files',
      node: (
        <Badge tone="blue" icon={<FileCode className="w-3 h-3" />}>
          <span className="text-zinc-300">Files</span>
          <span className="text-blue-300 font-bold">{filesCount}</span>
        </Badge>
      ),
    });
  }
  if (typeof securityScore === 'number') {
    const tone = securityScore >= 80 ? 'green' : securityScore >= 60 ? 'amber' : 'red';
    items.push({
      key: 'sec',
      node: (
        <Badge tone={tone} icon={<Shield className="w-3 h-3" />}>
          <span className="text-zinc-300">Security</span>
          <span className={`font-bold ${tone === 'green' ? 'text-green-300' : tone === 'amber' ? 'text-amber-300' : 'text-red-300'}`}>
            {securityScore}%
          </span>
        </Badge>
      ),
    });
  }
  if (typeof qaScore === 'number') {
    const tone = qaScore >= 80 ? 'green' : qaScore >= 60 ? 'amber' : 'red';
    items.push({
      key: 'qa',
      node: (
        <Badge tone={tone} icon={<CheckCircle2 className="w-3 h-3" />}>
          <span className="text-zinc-300">QA</span>
          <span className={`font-bold ${tone === 'green' ? 'text-green-300' : tone === 'amber' ? 'text-amber-300' : 'text-red-300'}`}>
            {qaScore}%
          </span>
        </Badge>
      ),
    });
  }
  if (complexity) {
    items.push({
      key: 'complexity',
      node: (
        <Badge tone="violet" icon={<Zap className="w-3 h-3" />}>
          <span className="text-zinc-300">Complexity</span>
          <span className="text-violet-300 font-bold capitalize">{complexity}</span>
        </Badge>
      ),
    });
  }

  if (!items.length) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {items.map((item, idx) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, scale: 0.85, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: idx * 0.06, type: 'spring', stiffness: 320, damping: 20 }}
        >
          {item.node}
        </motion.div>
      ))}
      {timestamp && (
        <span className="ml-auto text-[9px] text-zinc-600 font-mono">
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}

function Badge({
  tone,
  icon,
  children,
}: {
  tone: 'blue' | 'green' | 'amber' | 'red' | 'violet';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const borderMap: Record<string, string> = {
    blue: 'border-blue-500/25',
    green: 'border-green-500/25',
    amber: 'border-amber-500/25',
    red: 'border-red-500/25',
    violet: 'border-violet-500/25',
  };
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-500/5',
    green: 'bg-green-500/5',
    amber: 'bg-amber-500/5',
    red: 'bg-red-500/5',
    violet: 'bg-violet-500/5',
  };
  const iconColorMap: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    violet: 'text-violet-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] ${borderMap[tone]} ${bgMap[tone]}`}
    >
      <span className={iconColorMap[tone]}>{icon}</span>
      {children}
    </span>
  );
}

export default MetricsBadges;
