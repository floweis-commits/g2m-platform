"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const WRITING_STYLES = [
  {
    value: "professional",
    label: "Professional",
    description: "Formal, corporate tone for enterprise audiences",
  },
  {
    value: "casual",
    label: "Casual",
    description: "Friendly, conversational tone",
  },
  {
    value: "bold",
    label: "Bold",
    description: "Direct, confident, and assertive",
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm, approachable, personable",
  },
  {
    value: "concise",
    label: "Concise",
    description: "Short, punchy, to-the-point",
  },
  {
    value: "storytelling",
    label: "Storytelling",
    description: "Narrative-driven, emotional appeal",
  },
  {
    value: "data-driven",
    label: "Data-Driven",
    description: "Numbers, stats, metrics focused",
  },
];

interface WritingStyleStepProps {
  data: any;
  onDataChange: (data: any) => void;
}

export function WritingStyleStep({
  data,
  onDataChange,
}: WritingStyleStepProps) {
  const selectedStyle = data.writing_style;

  const handleStyleSelect = (style: string) => {
    onDataChange({ writing_style: style });
  };

  const handleDoChange = (value: string) => {
    const dos = value.split("\n").filter((line: string) => line.trim());
    onDataChange({ dos });
  };

  const handleDontChange = (value: string) => {
    const donts = value.split("\n").filter((line: string) => line.trim());
    onDataChange({ donts });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-3 block text-sm font-medium text-slate-900">
          Outreach Style
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          {WRITING_STYLES.map((style) => (
            <Card
              key={style.value}
              onClick={() => handleStyleSelect(style.value)}
              className={`cursor-pointer border p-3 transition ${
                selectedStyle === style.value
                  ? "border-purple-500 bg-purple-50"
                  : "border-slate-200 hover:border-purple-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">
                    {style.label}
                  </h4>
                  <p className="text-xs text-slate-600">{style.description}</p>
                </div>
                {selectedStyle === style.value && (
                  <Check className="h-4 w-4 flex-shrink-0 text-purple-600" />
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900">
          Do&apos;s
        </label>
        <p className="mb-2 text-xs text-slate-500">
          Outreach guidelines to follow (one per line)
        </p>
        <Textarea
          placeholder="e.g. Personalize each message&#10;Mention specific pain points&#10;Include case studies"
          value={(data.dos || []).join("\n")}
          onChange={(e) => handleDoChange(e.target.value)}
          className="min-h-20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900">
          Don&apos;ts
        </label>
        <p className="mb-2 text-xs text-slate-500">
          Things to avoid in outreach (one per line)
        </p>
        <Textarea
          placeholder="e.g. Generic templates&#10;Too salesy language&#10;Long emails"
          value={(data.donts || []).join("\n")}
          onChange={(e) => handleDontChange(e.target.value)}
          className="min-h-20"
        />
      </div>
    </div>
  );
}
