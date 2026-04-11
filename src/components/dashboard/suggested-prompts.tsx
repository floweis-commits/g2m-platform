"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const GENERIC_PROMPTS = [
  {
    text: "Find fast-growing tech startups in my industry",
    icon: "🚀",
  },
  {
    text: "Show me companies that recently raised funding",
    icon: "💰",
  },
  {
    text: "Find enterprises looking for solutions like ours",
    icon: "🏢",
  },
];

interface SuggestedPromptsProps {
  projectId?: string;
}

export function SuggestedPrompts({ projectId }: SuggestedPromptsProps) {
  const handlePromptClick = (prompt: string) => {
    // This would typically trigger the search bar
    const searchInput = document.querySelector(
      "input[placeholder*='Find']",
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = prompt;
      searchInput.focus();
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {GENERIC_PROMPTS.map((prompt, idx) => (
        <Card
          key={idx}
          className="cursor-pointer border-slate-200 p-4 transition hover:border-purple-300 hover:shadow-md"
        >
          <div className="space-y-3">
            <div className="text-3xl">{prompt.icon}</div>
            <p className="text-sm text-slate-900">{prompt.text}</p>
            <Button
              onClick={() => handlePromptClick(prompt.text)}
              variant="outline"
              size="sm"
              className="w-full gap-2 border-slate-300 text-purple-600 hover:bg-purple-50"
            >
              <Sparkles className="h-3 w-3" />
              Try this
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
