/**
 * ShimmerLine - skeleton placeholder with horizontal gradient sweep.
 * Used as a placeholder for incoming code lines or pending tool blocks.
 */

interface ShimmerLineProps {
  width?: string;
  height?: string;
  className?: string;
}

export function ShimmerLine({ width = '100%', height = '0.5rem', className = '' }: ShimmerLineProps) {
  return (
    <div
      aria-hidden="true"
      className={`rounded huggy-shimmer ${className}`}
      style={{ width, height }}
    />
  );
}

export default ShimmerLine;
