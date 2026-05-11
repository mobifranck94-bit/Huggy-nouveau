/**
 * TemplateCarousel - Horizontal draggable carousel for empty state preview
 * Inspired by Lovable's template selector with 3D perspective effects
 */

import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform, PanInfo } from 'framer-motion';
import { 
  ListTodo, 
  BarChart3, 
  Sparkles, 
  ShoppingCart, 
  Shield, 
  Newspaper,
  ChevronLeft,
  ChevronRight,
  Clock,
  Zap
} from 'lucide-react';

export interface Template {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: React.ElementType;
  gradient: string;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTime: string;
  features: string[];
}

const TEMPLATES: Template[] = [
  {
    id: 'todo',
    title: 'Todo App',
    description: 'Task management with filters and animations',
    prompt: 'Crée une todo list complète avec ajout de tâches, suppression, marquage comme complété, filtres All/Active/Completed, et animations fluides. Utilise localStorage pour persister les données.',
    icon: ListTodo,
    gradient: 'from-violet-500/20 via-purple-500/10 to-fuchsia-500/20',
    complexity: 'simple',
    estimatedTime: '~2 min',
    features: ['Add/Delete', 'Filters', 'LocalStorage', 'Animations'],
  },
  {
    id: 'dashboard',
    title: 'Analytics Dashboard',
    description: 'KPI metrics with charts and dark mode',
    prompt: 'Crée un dashboard analytics moderne avec métriques KPI en temps réel, graphiques interactifs (line, bar, pie), sidebar navigation responsive, et toggle dark/light mode. Utilise des données mock réalistes.',
    icon: BarChart3,
    gradient: 'from-blue-500/20 via-cyan-500/10 to-teal-500/20',
    complexity: 'medium',
    estimatedTime: '~4 min',
    features: ['Charts', 'KPI Cards', 'Dark Mode', 'Sidebar'],
  },
  {
    id: 'landing',
    title: 'SaaS Landing Page',
    description: 'Modern marketing page with all sections',
    prompt: 'Crée une landing page SaaS moderne et responsive avec: hero section accrocheuse, grille de features, section pricing avec 3 plans, testimonials clients, FAQ accordion, et CTA finale. Style épuré avec gradients.',
    icon: Sparkles,
    gradient: 'from-amber-500/20 via-orange-500/10 to-rose-500/20',
    complexity: 'medium',
    estimatedTime: '~3 min',
    features: ['Hero', 'Pricing', 'Testimonials', 'FAQ'],
  },
  {
    id: 'ecommerce',
    title: 'Product Page',
    description: 'E-commerce with gallery and cart',
    prompt: 'Crée une page produit e-commerce complète avec: galerie d\'images zoomable, sélection de variants (taille/couleur), bouton ajouter au panier avec animation, avis clients avec étoiles, et produits similaires.',
    icon: ShoppingCart,
    gradient: 'from-emerald-500/20 via-green-500/10 to-lime-500/20',
    complexity: 'complex',
    estimatedTime: '~5 min',
    features: ['Gallery', 'Variants', 'Cart', 'Reviews'],
  },
  {
    id: 'auth',
    title: 'Auth Flow',
    description: 'Complete authentication screens',
    prompt: 'Crée un flow d\'authentification complet et sécurisé avec: login, signup, forgot password, et reset password. Validation de formulaire en temps réel, indicateurs de force mot de passe, et transitions animées entre écrans.',
    icon: Shield,
    gradient: 'from-rose-500/20 via-pink-500/10 to-purple-500/20',
    complexity: 'medium',
    estimatedTime: '~3 min',
    features: ['Login', 'Signup', 'Validation', 'Animations'],
  },
  {
    id: 'blog',
    title: 'Minimal Blog',
    description: 'Clean blog with reading experience',
    prompt: 'Crée un blog minimaliste et élégant avec: liste d\'articles avec images, page détail d\'article, système de tags/catégories, barre de recherche temps réel, et pagination. Typography soignée et espacements généreux.',
    icon: Newspaper,
    gradient: 'from-sky-500/20 via-blue-500/10 to-indigo-500/20',
    complexity: 'simple',
    estimatedTime: '~2 min',
    features: ['Articles', 'Search', 'Tags', 'Pagination'],
  },
];

const CARD_WIDTH = 280;
const CARD_GAP = 24;
const VISIBLE_CARDS = 3;

interface TemplateCarouselProps {
  onSelect: (template: Template) => void;
}

export function TemplateCarousel({ onSelect }: TemplateCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });

  // Calculate bounds
  const maxIndex = TEMPLATES.length - 1;
  const minOffset = -maxIndex * (CARD_WIDTH + CARD_GAP);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    // Determine direction based on drag
    if (Math.abs(velocity) > 500 || Math.abs(offset) > CARD_WIDTH / 3) {
      if (offset > 0 || velocity > 0) {
        setActiveIndex(prev => Math.max(0, prev - 1));
      } else {
        setActiveIndex(prev => Math.min(maxIndex, prev + 1));
      }
    }
  }, [maxIndex]);

  const goTo = useCallback((index: number) => {
    setActiveIndex(Math.max(0, Math.min(maxIndex, index)));
  }, [maxIndex]);

  const navigate = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setActiveIndex(prev => Math.max(0, prev - 1));
    } else {
      setActiveIndex(prev => Math.min(maxIndex, prev + 1));
    }
  }, [maxIndex]);

  // Update x position when activeIndex changes
  const targetX = -activeIndex * (CARD_WIDTH + CARD_GAP);
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h3 className="text-xl font-semibold text-zinc-100 mb-2">
          Commencez avec un template
        </h3>
        <p className="text-sm text-zinc-400">
          Glissez pour explorer, cliquez pour lancer
        </p>
      </motion.div>

      {/* Carousel Container */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-4xl perspective-1000"
        style={{ perspective: '1000px' }}
      >
        {/* Navigation Arrows */}
        <button
          onClick={() => navigate('prev')}
          disabled={activeIndex === 0}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 flex items-center justify-center text-zinc-300 hover:bg-zinc-700/80 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => navigate('next')}
          disabled={activeIndex === maxIndex}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 flex items-center justify-center text-zinc-300 hover:bg-zinc-700/80 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Cards Track */}
        <motion.div
          className="flex gap-6 cursor-grab active:cursor-grabbing py-4 px-12"
          drag="x"
          dragConstraints={{ left: minOffset, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          animate={{ x: targetX }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ x: springX }}
        >
          {TEMPLATES.map((template, index) => {
            const Icon = template.icon;
            const isActive = index === activeIndex;
            const distance = Math.abs(index - activeIndex);
            
            return (
              <motion.div
                key={template.id}
                onClick={() => onSelect(template)}
                className="relative flex-shrink-0 cursor-pointer group"
                style={{ width: CARD_WIDTH }}
                animate={{
                  scale: isActive ? 1 : 0.9 - distance * 0.05,
                  opacity: isActive ? 1 : Math.max(0.4, 0.7 - distance * 0.15),
                  rotateY: index < activeIndex ? 5 : index > activeIndex ? -5 : 0,
                  z: isActive ? 50 : -distance * 30,
                }}
                whileHover={isActive ? { 
                  scale: 1.03, 
                  y: -4,
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4)',
                } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                {/* Card */}
                <div className={`
                  relative h-[200px] rounded-2xl overflow-hidden 
                  bg-gradient-to-br ${template.gradient}
                  border border-white/10 backdrop-blur-sm
                  transition-shadow duration-300
                  ${isActive ? 'shadow-2xl shadow-black/30 ring-1 ring-white/20' : 'shadow-lg shadow-black/20'}
                `}>
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
                                       radial-gradient(circle at 70% 80%, rgba(255,255,255,0.08) 0%, transparent 40%)`,
                    }} />
                  </div>

                  {/* Content */}
                  <div className="relative h-full p-5 flex flex-col">
                    {/* Top: Icon + Time */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-white/60 font-mono">
                        <Clock className="w-3 h-3" />
                        {template.estimatedTime}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h4 className="text-lg font-semibold text-white mb-1 group-hover:text-white/90 transition-colors">
                      {template.title}
                    </h4>
                    <p className="text-xs text-white/60 line-clamp-2 mb-auto">
                      {template.description}
                    </p>

                    {/* Features Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {template.features.slice(0, 3).map((feature) => (
                        <span 
                          key={feature}
                          className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-white/10 text-white/70 border border-white/5"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* Complexity Badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`
                        px-2 py-0.5 rounded-full text-[9px] font-medium border
                        ${template.complexity === 'simple' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 
                          template.complexity === 'medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                          'bg-rose-500/20 text-rose-300 border-rose-500/30'}
                      `}>
                        {template.complexity}
                      </span>
                    </div>

                    {/* Hover Overlay with CTA */}
                    <motion.div 
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={false}
                    >
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-zinc-900 font-medium text-sm shadow-lg"
                      >
                        <Zap className="w-4 h-4" />
                        Use template
                      </motion.div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {TEMPLATES.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`
                h-2 rounded-full transition-all duration-300
                ${activeIndex === index 
                  ? 'w-8 bg-gradient-to-r from-blue-500 to-violet-500' 
                  : 'w-2 bg-zinc-600 hover:bg-zinc-500'}
              `}
            />
          ))}
        </div>
      </div>

      {/* Bottom Hint */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-xs text-zinc-500"
      >
        ou écrivez votre propre prompt ci-dessous
      </motion.p>
    </div>
  );
}

export default TemplateCarousel;
