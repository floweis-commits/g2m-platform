"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ProductStepProps {
  data: any;
  onDataChange: (data: any) => void;
}

export function ProductStep({ data, onDataChange }: ProductStepProps) {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    onDataChange({ [name]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-900">
          Product Name
        </label>
        <Input
          name="product_name"
          placeholder="e.g., Acme Analytics Platform"
          value={data.product_name || ""}
          onChange={handleChange}
          className="mt-1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900">
          What does it do?
        </label>
        <Textarea
          name="product_description"
          placeholder="Describe your product in 2-3 sentences"
          value={data.product_description || ""}
          onChange={handleChange}
          className="mt-1 min-h-24"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900">
          Who are your customers?
        </label>
        <Textarea
          name="target_customers"
          placeholder="e.g., B2B SaaS companies with 50-500 employees"
          value={data.target_customers || ""}
          onChange={handleChange}
          className="mt-1 min-h-20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900">
          Ideal Customer Profile (ICP)
        </label>
        <Textarea
          name="icp_description"
          placeholder="Describe your ideal customer in detail"
          value={data.icp_description || ""}
          onChange={handleChange}
          className="mt-1 min-h-24"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900">
          Unique Value Proposition
        </label>
        <Input
          name="unique_value_proposition"
          placeholder="What makes you different?"
          value={data.unique_value_proposition || ""}
          onChange={handleChange}
          className="mt-1"
        />
      </div>
    </div>
  );
}
