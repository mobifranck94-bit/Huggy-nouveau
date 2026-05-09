import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Book, MessageCircle, Video, FileText, 
  ChevronRight, X, HelpCircle, Zap, Shield, Code,
  Globe, Sparkles, Rocket, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'What is Huggy?',
    answer: 'Huggy is an AI-powered SaaS builder that uses 8 specialized agents to transform your ideas into complete, production-ready applications. From research to deployment, our agents handle everything.'
  },
  {
    category: 'Getting Started',
    question: 'How do I create my first app?',
    answer: 'Simply describe what you want to build in the chat input on the landing page or builder. Be specific about features, design preferences, and target users. Our AI agents will analyze your request and build it for you.'
  },
  {
    category: 'Building',
    question: 'How long does it take to build an app?',
    answer: 'Most simple apps are built in 2-5 minutes. Complex applications with multiple features may take 5-10 minutes. You can watch the progress in real-time as our agents work.'
  },
  {
    category: 'Building',
    question: 'What technologies are used?',
    answer: 'We generate modern React applications with TypeScript, Tailwind CSS for styling, and Supabase for backend/database when needed. The code follows best practices and is production-ready.'
  },
  {
    category: 'Building',
    question: 'Can I edit the generated code?',
    answer: 'Yes! Our builder includes a full code editor with syntax highlighting. You can edit any file and see changes reflected in the preview immediately. All changes are saved to your project.'
  },
  {
    category: 'Agents',
    question: 'What are the 8 AI agents?',
    answer: '1. Web Research - Analyzes requirements and competition\n2. Product Manager - Creates detailed specifications\n3. DBA Architect - Designs database schema\n4. UX Designer - Creates design system\n5. Coder - Writes the actual code\n6. Security Auditor - Checks for vulnerabilities\n7. QA Reviewer - Ensures quality\n8. i18n - Adds internationalization if needed'
  },
  {
    category: 'Pricing',
    question: 'How do credits work?',
    answer: 'Each build uses credits based on complexity: Simple (10 credits), Medium (25 credits), Complex (50 credits). You get 500 free credits monthly on the free plan. Upgrade for more credits and features.'
  },
  {
    category: 'Pricing',
    question: 'What plans are available?',
    answer: 'Free: 500 credits/month, basic features\nPro: 2,000 credits/month, priority builds, custom domains\nEnterprise: Unlimited credits, dedicated support, SLA'
  },
  {
    category: 'Deployment',
    question: 'Where can I deploy my apps?',
    answer: 'You can deploy directly to Vercel with one click from our builder. We\'ll also support Netlify and custom servers soon. All deployments include SSL certificates.'
  },
  {
    category: 'Security',
    question: 'Is my code secure?',
    answer: 'Yes! Every build goes through our Security Auditor agent that checks for vulnerabilities. We also validate all generated code for security issues before deployment.'
  },
];

const guides = [
  {
    title: 'Building Your First App',
    description: 'Step-by-step guide to creating your first application with Huggy.',
    icon: Rocket,
    color: '#1488fc',
    readTime: '5 min'
  },
  {
    title: 'Writing Effective Prompts',
    description: 'Learn how to describe your app idea so our AI agents understand perfectly.',
    icon: MessageCircle,
    color: '#10b981',
    readTime: '8 min'
  },
  {
    title: 'Understanding the Agent Pipeline',
    description: 'Deep dive into how our 8 AI agents collaborate to build your app.',
    icon: Zap,
    color: '#f59e0b',
    readTime: '10 min'
  },
  {
    title: 'Customizing Generated Code',
    description: 'How to edit and extend the code our agents generate for you.',
    icon: Code,
    color: '#8b5cf6',
    readTime: '6 min'
  },
  {
    title: 'Deploying to Production',
    description: 'Best practices for deploying your Huggy-built applications.',
    icon: Globe,
    color: '#ec4899',
    readTime: '4 min'
  },
  {
    title: 'Security Best Practices',
    description: 'How to ensure your applications are secure and follow best practices.',
    icon: Shield,
    color: '#ef4444',
    readTime: '7 min'
  },
];

export default function Help() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const categories = Array.from(new Set(faqs.map(f => f.category)));

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredGuides = guides.filter(guide =>
    searchQuery === '' || 
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-zinc-800 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#1488fc] rounded-lg flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Help Center</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowContactModal(true)}
              className="px-4 py-2 bg-[#1488fc] text-white rounded-lg font-medium hover:bg-[#1172e2] transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search for help articles, FAQs, or guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#1488fc] focus:border-transparent shadow-sm"
            />
          </div>
        </div>

        {/* Quick Guides */}
        {!searchQuery && !selectedCategory && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Book className="w-6 h-6 text-[#1488fc]" />
              Quick Guides
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGuides.map((guide, index) => (
                <motion.div
                  key={guide.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-6 border border-zinc-200 hover:border-[#1488fc] hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${guide.color}15` }}
                  >
                    <guide.icon className="w-6 h-6" style={{ color: guide.color }} />
                  </div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-[#1488fc] transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-zinc-600 text-sm mb-3">{guide.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">{guide.readTime} read</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#1488fc] group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* FAQs */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-[#1488fc]" />
              Frequently Asked Questions
            </h2>
            
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  !selectedCategory 
                    ? 'bg-[#1488fc] text-white' 
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#1488fc] text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredFAQs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl border border-zinc-200 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === faq.question ? null : faq.question)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
                >
                  <div>
                    <span className="text-xs font-medium text-[#1488fc] uppercase tracking-wider">
                      {faq.category}
                    </span>
                    <h3 className="font-semibold text-lg mt-1">{faq.question}</h3>
                  </div>
                  <ChevronRight 
                    className={`w-5 h-5 text-zinc-400 transition-transform ${
                      expandedFAQ === faq.question ? 'rotate-90' : ''
                    }`} 
                  />
                </button>
                <AnimatePresence>
                  {expandedFAQ === faq.question && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-zinc-100"
                    >
                      <div className="px-6 py-4 text-zinc-600 leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {filteredFAQs.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-500">No results found for "{searchQuery}"</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                className="mt-4 text-[#1488fc] hover:underline"
              >
                Clear search
              </button>
            </div>
          )}
        </section>

        {/* Video Tutorials Section */}
        {!searchQuery && !selectedCategory && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Video className="w-6 h-6 text-[#1488fc]" />
              Video Tutorials
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: 'Getting Started with Huggy', duration: '3:45' },
                { title: 'Advanced Prompt Engineering', duration: '8:20' },
                { title: 'Deploying to Production', duration: '5:15' },
                { title: 'Customizing Your Apps', duration: '6:30' },
              ].map((video, index) => (
                <div 
                  key={video.title}
                  className="bg-zinc-900 rounded-xl overflow-hidden flex items-center gap-4 p-4 cursor-pointer hover:bg-zinc-800 transition-colors group"
                >
                  <div className="w-24 h-16 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{video.title}</h3>
                    <p className="text-zinc-400 text-sm">{video.duration}</p>
                  </div>
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-[#1488fc] transition-colors">
                    <ChevronRight className="w-5 h-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContactModal(false)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Contact Support</h3>
                  <button 
                    onClick={() => setShowContactModal(false)}
                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1488fc]"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1488fc]"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Message</label>
                    <textarea 
                      rows={4}
                      className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1488fc] resize-none"
                      placeholder="How can we help you?"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Would send email here
                      setShowContactModal(false);
                      alert('Message sent! We\'ll get back to you soon.');
                    }}
                    className="w-full py-3 bg-[#1488fc] text-white rounded-lg font-medium hover:bg-[#1172e2] transition-colors"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
