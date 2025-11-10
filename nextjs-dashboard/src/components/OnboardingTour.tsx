"use client";
import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react";

interface OnboardingStep {
  title: string;
  description: string;
  target?: string;
  position?: "top" | "bottom" | "left" | "right";
}

const steps: OnboardingStep[] = [
  {
    title: "Welcome to Your Dashboard! 👋",
    description: "Let's take a quick tour to help you get started with managing your rental properties.",
  },
  {
    title: "Command Palette",
    description: "Press Cmd+K (or Ctrl+K) anytime to quickly search properties, reports, or navigate anywhere.",
  },
  {
    title: "Action Center",
    description: "Your Action Center shows what needs your attention right now - critical issues, upcoming inspections, and recent activity.",
  },
  {
    title: "AI Assistant",
    description: "Click the chat bubble in the bottom-right to ask questions like 'What needs my attention?' or 'Show me critical issues'.",
  },
  {
    title: "Property Management",
    description: "Navigate to 'Properties & Reports' to view all your properties, photos, and inspection reports in one place.",
  },
  {
    title: "You're All Set! 🎉",
    description: "You can restart this tour anytime from Settings. Let's get started!",
  },
];

export default function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem("hasSeenOnboardingTour");

    if (!hasSeenTour) {
      // Show tour after a short delay
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsActive(false);
    localStorage.setItem("hasSeenOnboardingTour", "true");
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  if (!isActive) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[rgb(20,20,20)] rounded-2xl max-w-lg w-full mx-4 shadow-xl border border-white/10 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
        {/* Progress Bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              {isLastStep ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <span className="text-white font-semibold">{currentStep + 1}</span>
              )}
            </div>
            <div>
              <div className="text-xs text-white/60">
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            Skip tour
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">{step.title}</h2>
          <p className="text-base text-white/80 leading-relaxed">{step.description}</p>

          {/* Special content for first step */}
          {isFirstStep && (
            <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-400">
                💡 Tip: This tour will only show once. You can access it again from Settings.
              </p>
            </div>
          )}

          {/* Special content for last step */}
          {isLastStep && (
            <div className="mt-6 space-y-3">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-400 font-medium">
                  ✓ You're ready to manage your properties like a pro!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-white/5">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "bg-blue-600 w-6"
                    : index < currentStep
                    ? "bg-blue-600/50"
                    : "bg-white/20"
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-all font-medium"
          >
            <span className="text-sm">{isLastStep ? "Get Started" : "Next"}</span>
            {isLastStep ? (
              <Check className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
