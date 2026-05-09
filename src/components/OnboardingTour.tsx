import { useState, useEffect } from 'react';
import Joyride, { Step, StoreHelpers } from 'react-joyride';
import { useAuth } from '../lib/useAuth';

interface OnboardingTourProps {
  isBuilder?: boolean;
  isDashboard?: boolean;
}

export default function OnboardingTour({ isBuilder = false, isDashboard = false }: OnboardingTourProps) {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [helpers, setHelpers] = useState<StoreHelpers | null>(null);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem(`huggy-onboarding-${user?.id}`);
    const hasStartedOnboarding = localStorage.getItem(`huggy-onboarding-started-${user?.id}`);
    
    if (!hasCompletedOnboarding && !hasStartedOnboarding && user) {
      // Delay slightly to let the UI render
      const timer = setTimeout(() => setRun(true), 1000);
      localStorage.setItem(`huggy-onboarding-started-${user?.id}`, 'true');
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleJoyrideCallback = (data: any) => {
    const { status, index, type } = data;
    
    if (['finished', 'skipped'].includes(status)) {
      setRun(false);
      localStorage.setItem(`huggy-onboarding-${user?.id}`, 'completed');
    } else if (type === 'step:after') {
      setStepIndex(index + (data.action === 'next' ? 1 : 0));
    }
  };

  const getSteps = (): Step[] => {
    if (isBuilder) {
      return [
        {
          target: 'body',
          content: '👋 Welcome to the Huggy Builder! Let\'s take a quick tour of the interface.',
          placement: 'center',
          disableBeacon: true,
        },
        {
          target: '[data-tour="chat-input"]',
          content: '💬 This is where you describe what you want to build. Our 8 AI agents will understand your requirements and build it for you.',
          placement: 'top',
        },
        {
          target: '[data-tour="preview-panel"]',
          content: '👁️ See your app come to life here in real-time. As our agents build, you\'ll see the preview update instantly.',
          placement: 'left',
        },
        {
          target: '[data-tour="code-editor"]',
          content: '💻 View and edit the generated code directly. All changes are reflected in the preview immediately.',
          placement: 'right',
        },
        {
          target: '[data-tour="deploy-btn"]',
          content: '🚀 When you\'re happy with your app, click here to deploy it to Vercel with one click!',
          placement: 'bottom',
        },
        {
          target: '[data-tour="agent-status"]',
          content: '🤖 Watch our 8 specialized agents work: Web Research, Product Manager, DBA, UX Designer, Coder, Security Auditor, QA, and i18n.',
          placement: 'bottom',
        },
      ];
    }

    if (isDashboard) {
      return [
        {
          target: 'body',
          content: '🎉 Welcome to your Huggy Dashboard! This is your command center.',
          placement: 'center',
          disableBeacon: true,
        },
        {
          target: '[data-tour="credits-widget"]',
          content: '💳 Track your credits here. Each build uses credits based on complexity. Upgrade anytime for more!',
          placement: 'bottom',
        },
        {
          target: '[data-tour="projects-list"]',
          content: '📁 All your projects are listed here. Click any project to open it in the builder.',
          placement: 'right',
        },
        {
          target: '[data-tour="new-project-btn"]',
          content: '➕ Start a new project anytime by clicking here. Describe your app idea and let AI do the rest!',
          placement: 'bottom',
        },
        {
          target: '[data-tour="help-menu"]',
          content: '❓ Need help? Access documentation, tutorials, and support here.',
          placement: 'left',
        },
      ];
    }

    // Default landing page tour
    return [
      {
        target: 'body',
        content: '🚀 Welcome to Huggy! The AI-powered platform that builds complete SaaS applications for you.',
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-tour="hero-input"]',
        content: '📝 Start by describing what you want to build. Be as specific as possible - include features, design preferences, and target users.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="model-selector"]',
        content: '🤖 Choose your AI model. We recommend Claude Sonnet for best results, or GPT-4 for faster builds.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="features-section"]',
        content: '✨ Our 8 specialized AI agents handle everything: research, design, coding, security, and deployment.',
        placement: 'top',
      },
      {
        target: '[data-tour="examples-section"]',
        content: '💡 Not sure what to build? Check out these example prompts for inspiration.',
        placement: 'top',
      },
    ];
  };

  const handleRestart = () => {
    setStepIndex(0);
    setRun(true);
  };

  return (
    <>
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        hideCloseButton
        run={run}
        scrollToFirstStep
        showProgress
        showSkipButton
        stepIndex={stepIndex}
        steps={getSteps()}
        styles={{
          options: {
            arrowColor: '#1488fc',
            backgroundColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            primaryColor: '#1488fc',
            textColor: '#333',
            zIndex: 10000,
            borderRadius: 12,
          },
          buttonNext: {
            backgroundColor: '#1488fc',
            borderRadius: 8,
            color: '#fff',
            fontSize: 14,
            padding: '10px 20px',
          },
          buttonSkip: {
            color: '#666',
            fontSize: 14,
          },
          tooltip: {
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          },
          tooltipTitle: {
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 8,
          },
          tooltipContent: {
            fontSize: 14,
            lineHeight: 1.6,
          },
        }}
        locale={{
          back: '← Back',
          close: 'Close',
          last: 'Finish 🎉',
          next: 'Next →',
          skip: 'Skip tour',
        }}
        getHelpers={(helpers) => setHelpers(helpers)}
      />
      
      {/* Restart button - shown after completion */}
      {!run && (
        <button
          onClick={handleRestart}
          className="fixed bottom-6 right-6 z-50 bg-[#1488fc] text-white px-4 py-2 rounded-lg shadow-lg hover:bg-[#1172e2] transition-all flex items-center gap-2 text-sm font-medium"
          title="Restart onboarding tour"
        >
          <span>❓</span>
          <span>Tour</span>
        </button>
      )}
    </>
  );
}
