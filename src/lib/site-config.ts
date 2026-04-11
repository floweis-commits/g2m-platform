import { env } from "@/env.mjs";

export const siteConfig = {
  title: "G2M Platform",
  description:
    "Automated B2B lead sourcing and enrichment platform. Find your ideal customers using AI-powered search and modular integrations.",
  keywords: ["B2B", "Lead Generation", "SaaS", "Sales", "AI"],
  url: env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  googleSiteVerificationId: process.env.GOOGLE_SITE_VERIFICATION_ID || "",
};
