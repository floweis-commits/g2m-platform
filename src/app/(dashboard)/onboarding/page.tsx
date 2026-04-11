"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CompanyStep } from "@/components/onboarding/steps/company-step";
import { ProductStep } from "@/components/onboarding/steps/product-step";
import { WritingStyleStep } from "@/components/onboarding/steps/writing-style-step";
import { Wizard } from "@/components/onboarding/wizard";

interface ProjectData {
  name: string;
  website_url: string;
  company_name: string;
  company_description: string;
  industry: string;
  employee_count: string;
  headquarters: string;
  product_name: string;
  product_description: string;
  target_customers: string;
  icp_description: string;
  competitors: string[];
  unique_value_proposition: string;
  writing_style: string;
  dos: string[];
  donts: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [projectData, setProjectData] = useState<Partial<ProjectData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    {
      title: "Company Setup",
      description: "Tell us about your company",
      component: CompanyStep,
    },
    {
      title: "Product",
      description: "Describe your product and ICP",
      component: ProductStep,
    },
    {
      title: "Writing Style",
      description: "Choose your outreach style",
      component: WritingStyleStep,
    },
  ];

  const handleStepData = (data: Partial<ProjectData>) => {
    setProjectData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const { id } = await response.json();
      router.push(`/projects/${id}`);
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const CurrentStep = steps[currentStep]?.component;

  return (
    <Wizard
      steps={steps}
      currentStep={currentStep}
      isLoading={isLoading}
      onNext={handleNext}
      onBack={handleBack}
    >
      {CurrentStep && (
        <CurrentStep data={projectData} onDataChange={handleStepData} />
      )}
    </Wizard>
  );
}
