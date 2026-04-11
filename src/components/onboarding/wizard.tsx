"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface StepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

interface WizardStep {
  title: string;
  description: string;
  component: React.ComponentType<StepProps>;
}

interface WizardProps {
  steps: WizardStep[];
  currentStep: number;
  isLoading: boolean;
  onNext: () => void;
  onBack: () => void;
  children: React.ReactNode;
}

export function Wizard({
  steps,
  currentStep,
  isLoading,
  onNext,
  onBack,
  children,
}: WizardProps) {
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-2xl border-0 bg-white shadow-2xl">
        {/* Progress bar */}
        <div className="h-1 bg-slate-200">
          <div
            className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step header */}
          <div className="mb-8">
            <p className="text-sm font-medium text-purple-600">
              Step {currentStep + 1} of {steps.length}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {step.title}
            </h1>
            <p className="mt-2 text-slate-600">{step.description}</p>
          </div>

          {/* Step content */}
          <div className="mb-8 min-h-[300px]">{children}</div>

          {/* Navigation */}
          <div className="flex gap-4">
            <Button
              onClick={onBack}
              variant="outline"
              disabled={currentStep === 0 || isLoading}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={onNext}
              disabled={isLoading}
              className="ml-auto gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {currentStep === steps.length - 1
                    ? "Creating..."
                    : "Loading..."}
                </>
              ) : (
                <>
                  {currentStep === steps.length - 1 ? "Create Project" : "Next"}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
