import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Github, Mail, Lock, User, 
  ArrowRight, Loader2, CheckCircle2, AlertCircle,
  Chrome
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { HuggyLogo } from '../components/HuggyLogo';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGitHub } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
        navigate('/dashboard');
      } else {
        await signUpWithEmail(email, password, fullName);
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square bg-huggy-blue/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square bg-huggy-cyan/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo */}
        <div 
          className="flex items-center justify-center mb-10 cursor-pointer group hover:scale-105 transition-transform"
          onClick={() => navigate('/')}
        >
          <HuggyLogo size="xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-zinc-100 rounded-[40px] p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)]"
        >
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-display font-black text-huggy-dark mb-4 uppercase tracking-tight">Check your email</h2>
                <p className="text-zinc-500 text-sm font-medium mb-8 leading-relaxed">
                  We've sent a magic link to <span className="text-huggy-dark font-bold">{email}</span>. Click it to confirm your account.
                </p>
                <button 
                  onClick={() => setIsLogin(true)}
                  className="text-sm font-bold text-huggy-blue hover:underline uppercase tracking-widest"
                >
                  Back to Login
                </button>
              </motion.div>
            ) : (
              <motion.div key="form">
                <div className="text-center mb-10">
                  <h1 className="text-2xl font-display font-black text-huggy-dark mb-2 uppercase tracking-tight">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                  </h1>
                  <p className="text-sm text-zinc-400 font-medium tracking-wide">
                    {isLogin ? "Continue your AI journey" : "Start building your dreams today"}
                  </p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-center gap-3 text-red-600 text-xs font-bold uppercase tracking-wide"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-huggy-blue transition-colors" />
                        <input 
                          type="text" 
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-[20px] py-4 pl-12 pr-6 text-sm outline-none focus:border-huggy-blue/50 focus:bg-white transition-all font-medium"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-huggy-blue transition-colors" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="hello@example.com"
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-[20px] py-4 pl-12 pr-6 text-sm outline-none focus:border-huggy-blue/50 focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-huggy-blue transition-colors" />
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-[20px] py-4 pl-12 pr-6 text-sm outline-none focus:border-huggy-blue/50 focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>

                  <button 
                    disabled={loading}
                    className="huggy-button w-full py-4 mt-4 flex items-center justify-center gap-2 group shadow-xl shadow-huggy-blue/10"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <span className="uppercase tracking-widest text-sm">{isLogin ? 'Sign In' : 'Create Account'}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="relative my-10 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-100"></div>
                  </div>
                  <span className="relative bg-white px-4 text-[10px] font-black text-zinc-300 uppercase tracking-widest">Or continue with</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => signInWithGoogle()}
                    className="flex items-center justify-center gap-2 py-3.5 px-4 bg-white border border-zinc-100 rounded-2xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 transition-all hover:shadow-lg active:scale-95 uppercase tracking-widest"
                  >
                    <Chrome className="w-4 h-4 text-huggy-blue" />
                    Google
                  </button>
                  <button 
                    onClick={() => signInWithGitHub()}
                    className="flex items-center justify-center gap-2 py-3.5 px-4 bg-white border border-zinc-100 rounded-2xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 transition-all hover:shadow-lg active:scale-95 uppercase tracking-widest"
                  >
                    <Github className="w-4 h-4 text-huggy-dark" />
                    GitHub
                  </button>
                </div>

                <p className="mt-10 text-center text-[11px] font-bold text-zinc-400 uppercase tracking-[0.1em]">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-huggy-blue hover:underline"
                  >
                    {isLogin ? 'Sign Up Free' : 'Sign In'}
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        <p className="mt-8 text-center text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
          By continuing, you agree to our <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy</a>.
        </p>
      </div>
    </div>
  );
}
