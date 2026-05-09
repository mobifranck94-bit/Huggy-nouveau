import { useState, useEffect } from 'react';
import { useAuth } from '../lib/useAuth';

interface OnboardingTourProps {
  isBuilder?: boolean;
  isDashboard?: boolean;
}

interface Step {
  target: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export default function OnboardingTour({ isBuilder = false, isDashboard = false }: OnboardingTourProps) {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const getSteps = (): Step[] => {
    if (isBuilder) {
      return [
        { target: 'body', content: '👋 Welcome to the Huggy Builder! Let\'s take a quick tour.', position: 'center' },
        { target: '[data-tour="chat-input"]', content: '💬 Describe what you want to build here.', position: 'top' },
        { target: '[data-tour="preview-panel"]', content: '👁️ See your app come to life in real-time.', position: 'left' },
        { target: '[data-tour="code-editor"]', content: '💻 View and edit generated code here.', position: 'right' },
        { target: '[data-tour="deploy-btn"]', content: '🚀 Deploy to Vercel with one click!', position: 'bottom' },
      ];
    }
    if (isDashboard) {
      return [
        { target: 'body', content: '🎉 Welcome to your Dashboard!', position: 'center' },
        { target: '[data-tour="credits-widget"]', content: '💳 Track your credits here.', position: 'bottom' },
        { target: '[data-tour="projects-list"]', content: '📁 Your projects are listed here.', position: 'right' },
      ];
    }
    return [
      { target: 'body', content: '🚀 Welcome to Huggy! AI-powered SaaS builder.', position: 'center' },
      { target: '[data-tour="hero-input"]', content: '📝 Start by describing your app idea.', position: 'bottom' },
    ];
  };

  const steps = getSteps();

  useEffect(() => {
    const hasCompleted = localStorage.getItem(`huggy-onboarding-${user?.id || 'guest'}`);
    if (!hasCompleted && user) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    if (!isVisible || steps[currentStep].target === 'body') return;
    
    const target = document.querySelector(steps[currentStep].target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTooltipPosition({ 
        x: rect.left + rect.width / 2, 
        y: rect.top - 10 
      });
    }
  }, [isVisible, currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsVisible(false);
      localStorage.setItem(`huggy-onboarding-${user?.id || 'guest'}`, 'completed');
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem(`huggy-onboarding-${user?.id || 'guest'}`, 'completed');
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsVisible(true);
    localStorage.removeItem(`huggy-onboarding-${user?.id || 'guest'}`);
  };

  if (!isVisible) {
    return (
      <button
        onClick={handleRestart}
        className="fixed bottom-6 right-20 z-50 bg-[#1488fc] text-white px-3 py-2 rounded-lg shadow-lg hover:bg-[#1172e2] transition-all text-xs font-medium"
        title="Restart tour"
      >
        ? Tour
      </button>
    );
  }

  const currentStepData = steps[currentStep];
  const isCenter = currentStepData.position === 'center';

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleSkip} />
      
      {/* Tooltip */}
      <div 
        className={`fixed z-50 bg-white rounded-xl shadow-2xl p-6 max-w-sm ${
          isCenter ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''
        }`}
        style={!isCenter ? {
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
          transform: 'translate(-50%, -100%)'
        } : {}}
      >
        <div className="text-zinc-800 leading-relaxed mb-4">
          {currentStepData.content}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            {currentStep + 1} / {steps.length}
          </span>
          
          <div className="flex gap-2">
            <button 
              onClick={handleSkip}
              className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700"
            >
              Skip
            </button>
            <button 
              onClick={handleNext}
              className="px-4 py-1.5 bg-[#1488fc] text-white text-sm rounded-lg hover:bg-[#1172e2]"
            >
              {currentStep === steps.length - 1 ? 'Finish 🎉' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Highlight box for non-center steps */}
      {!isCenter && (
        <style>{`
          ${currentStepData.target} {
            position: relative !important;
            z-index: 51 !important;
            box-shadow: 0 0 0 4px #1488fc, 0 0 20px rgba(20, 136, 252, 0.5) !important;
            border-radius: 8px !important;
          }
        `}</style>
      )}
    </>
  );
}
