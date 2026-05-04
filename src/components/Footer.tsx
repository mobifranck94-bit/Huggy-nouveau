import { Mail, Linkedin, Twitter, Github, ExternalLink, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full bg-[#0A0B14] overflow-hidden">
      {/* ── Background Glows ─────────────────────────────────────────────── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 pt-24 pb-12">
        <div className="grid md:grid-cols-2 gap-16 mb-24">
          {/* Left Column: Contact */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Contactez-nous</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-display font-black text-white leading-tight max-w-md">
              Intéressé par une collaboration, essayer la plateforme ou simplement en savoir plus ?
            </h2>

            <div className="pt-4">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">Contactez-nous :</p>
              <a 
                href="mailto:contact@huggy.sbs" 
                className="group inline-flex items-center gap-2 text-lg md:text-xl font-bold text-white hover:text-blue-400 transition-all"
              >
                contact@huggy.sbs
                <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 transition-colors" />
              </a>
            </div>
          </div>

          {/* Right Column: Links */}
          <div className="flex flex-col md:items-end justify-center">
            <div className="grid grid-cols-2 md:flex md:items-center gap-8 md:gap-12">
              {[
                { label: 'À propos', href: '#' },
                { label: 'Tarifs', href: '#' },
                { label: 'Templates', href: '#' },
                { label: 'Contact', href: '#' }
              ].map((link) => (
                <a 
                  key={link.label} 
                  href={link.href} 
                  className="text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Large Central Logo */}
        <div className="py-20 text-center select-none pointer-events-none">
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-[15vw] md:text-[12vw] font-display font-black text-white leading-none tracking-tighter"
          >
            huggy
          </motion.h3>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs text-zinc-500 font-medium">
            © {currentYear} Huggy. Tous droits réservés.
          </p>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-6 text-xs text-zinc-500 font-bold uppercase tracking-widest">
              <a href="#" className="hover:text-white transition-colors">CGU</a>
              <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-white transition-colors">Mentions légales</a>
            </div>

            <div className="flex items-center gap-4 border-l border-zinc-800 pl-8 ml-2">
              <a href="#" className="text-zinc-500 hover:text-white transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors">
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
