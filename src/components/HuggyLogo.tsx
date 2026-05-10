/**
 * HuggyLogo — composant logo réutilisable (mascotte SVG + texte)
 * sizes: 'sm' | 'md' | 'lg' | 'xl'
 * textColor: adaptatif selon le thème
 */

interface HuggyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  className?: string;
}

const SIZES = {
  sm:  { icon: 24, text: '14px', gap: 'gap-1.5' },
  md:  { icon: 36, text: '18px', gap: 'gap-2'   },
  lg:  { icon: 48, text: '26px', gap: 'gap-3'   },
  xl:  { icon: 64, text: '34px', gap: 'gap-4'   },
};

export function HuggyMascot({ size = 36 }: { size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Antennes */}
      <ellipse cx="13" cy="6.5" rx="3.2" ry="4.5" fill="#2563EB" transform="rotate(-18 13 6.5)"/>
      <ellipse cx="23" cy="6" rx="3.2" ry="4.5" fill="#2563EB" transform="rotate(18 23 6)"/>
      {/* Corps bleu arrondi */}
      <rect x="3" y="9" width="30" height="24" rx="13" fill="#3B82F6"/>
      {/* Dégradé brillance */}
      <ellipse cx="18" cy="14" rx="10" ry="4" fill="white" opacity="0.15"/>
      {/* Visage blanc */}
      <ellipse cx="18" cy="22" rx="10" ry="9" fill="white"/>
      {/* Oeil gauche */}
      <circle cx="14.5" cy="20" r="2.2" fill="#1E3A5F"/>
      <circle cx="15.3" cy="19.2" r="0.8" fill="white"/>
      {/* Oeil droit (clin d'oeil) */}
      <path d="M19.5 19.5 Q21.5 18 23.5 19.5" stroke="#1E3A5F" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      {/* Joues roses */}
      <ellipse cx="11.5" cy="23" rx="2.2" ry="1.4" fill="#FCA5A5" opacity="0.7"/>
      <ellipse cx="24.5" cy="23" rx="2.2" ry="1.4" fill="#FCA5A5" opacity="0.7"/>
      {/* Bouche sourire */}
      <path d="M14.5 25 Q18 28 21.5 25" stroke="#1E3A5F" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

export function HuggyLogo({ size = 'md', showText = true, textColor, className = '' }: HuggyLogoProps) {
  const cfg = SIZES[size];
  const color = textColor ?? '#3B82F6';

  return (
    <div className={`flex items-center ${cfg.gap} ${className}`}>
      <HuggyMascot size={cfg.icon} />
      {showText && (
        <span
          style={{ color, fontSize: cfg.text, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: 'system-ui, sans-serif' }}
        >
          huggy
        </span>
      )}
    </div>
  );
}

export default HuggyLogo;
